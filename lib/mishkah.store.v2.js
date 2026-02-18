/**
 * mishkah.store.v2.js
 * Local-First Store with Outbox Sync (experimental)
 *
 * Goals:
 * - Always commit writes locally first
 * - Queue server sync in outbox
 * - Retry failed jobs with backoff
 * - Expose failure log + retry APIs for UI
 */
(function (global) {
  'use strict';

  const DEFAULTS = {
    namespace: 'default',
    moduleId: 'pos',
    offlineFirst: true,
    autoSync: true,
    syncIntervalMs: 2000,
    maxRetries: 7,
    backoffBaseMs: 1200,
    logger: console,
    endpoints: {
      upsertOrder: null,
      finalizeOrder: null,
      deleteOrder: null
    },
    syncExecutor: null,
    callbacks: {
      onSyncSuccess: null,
      onSyncError: null,
      onConflict: null
    }
  };

  function nowMs() { return Date.now(); }
  function nowIso() { return new Date().toISOString(); }
  function asArray(v) { return Array.isArray(v) ? v : []; }
  function plainObject(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
  function clone(v) {
    if (v == null) return v;
    if (typeof structuredClone === 'function') {
      try { return structuredClone(v); } catch (_err) { }
    }
    return JSON.parse(JSON.stringify(v));
  }
  function uid(prefix) {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return `${prefix}-${global.crypto.randomUUID()}`;
    }
    return `${prefix}-${nowMs().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
  }

  class Emitter {
    constructor() { this.map = new Map(); }
    on(type, handler) {
      if (typeof handler !== 'function') return function () { };
      if (!this.map.has(type)) this.map.set(type, new Set());
      this.map.get(type).add(handler);
      return () => this.map.get(type).delete(handler);
    }
    emit(type, payload) {
      const set = this.map.get(type);
      if (!set) return;
      set.forEach((fn) => {
        try { fn(payload); } catch (_err) { }
      });
    }
  }

  class MemoryKV {
    constructor() { this.tables = new Map(); }
    _table(name) {
      if (!this.tables.has(name)) this.tables.set(name, new Map());
      return this.tables.get(name);
    }
    async upsert(table, record) {
      if (!record || record.id == null) throw new Error('record.id required');
      this._table(table).set(String(record.id), clone(record));
      return clone(record);
    }
    async remove(table, id) { this._table(table).delete(String(id)); }
    async get(table, id) {
      const rec = this._table(table).get(String(id));
      return rec ? clone(rec) : null;
    }
    async list(table) {
      return Array.from(this._table(table).values()).map(clone);
    }
    async clear(table) { this._table(table).clear(); }
  }

  function createIndexedDbAdapter(options) {
    const factory = global.MishkahIndexedDB;
    if (!factory || typeof factory.createAdapter !== 'function') return null;
    try {
      return factory.createAdapter({
        namespace: options.namespace,
        name: `mishkah-v2-${options.moduleId}`,
        version: 1
      });
    } catch (_err) {
      return null;
    }
  }

  class LocalEngine {
    constructor(options) {
      this.options = options;
      this.mem = new MemoryKV();
      this.idb = createIndexedDbAdapter(options);
    }
    async _idbCall(methods, args, fallback) {
      if (!this.idb) return fallback();
      for (let i = 0; i < methods.length; i += 1) {
        const m = methods[i];
        if (typeof this.idb[m] === 'function') {
          try { return await this.idb[m].apply(this.idb, args); } catch (_err) { }
        }
      }
      return fallback();
    }
    async upsert(table, record) {
      await this._idbCall(['upsert', 'save', 'put', 'insert'], [table, record], async () => this.mem.upsert(table, record));
      return this.mem.upsert(table, record);
    }
    async remove(table, id) {
      await this._idbCall(['remove', 'delete'], [table, id], async () => this.mem.remove(table, id));
      return this.mem.remove(table, id);
    }
    async get(table, id) {
      const fromMem = await this.mem.get(table, id);
      if (fromMem) return fromMem;
      const idbValue = await this._idbCall(['get', 'read'], [table, id], async () => null);
      if (idbValue) {
        await this.mem.upsert(table, idbValue);
        return clone(idbValue);
      }
      return null;
    }
    async list(table) {
      const fromIdb = await this._idbCall(['list', 'query'], [table], async () => null);
      if (Array.isArray(fromIdb)) {
        for (let i = 0; i < fromIdb.length; i += 1) {
          const row = fromIdb[i];
          if (row && row.id != null) await this.mem.upsert(table, row);
        }
      }
      return this.mem.list(table);
    }
    async clear(table) {
      await this._idbCall(['clear'], [table], async () => this.mem.clear(table));
      await this.mem.clear(table);
    }
  }

  class MishkahStoreV2 extends Emitter {
    constructor(opts) {
      super();
      const globalDefaults = plainObject(global.__MISHKAH_STORE_V2_DEFAULTS__);
      const merged = Object.assign({}, globalDefaults, opts || {});
      this.config = Object.assign({}, DEFAULTS, merged);
      this.config.endpoints = Object.assign({}, DEFAULTS.endpoints, plainObject(globalDefaults.endpoints), plainObject(merged.endpoints));
      this.config.callbacks = Object.assign({}, DEFAULTS.callbacks, plainObject(globalDefaults.callbacks), plainObject(merged.callbacks));
      this.local = new LocalEngine(this.config);
      this.syncTimer = null;
      this.syncLock = false;
      this.started = false;
      this.tables = {
        orders: 'v2_order_header',
        outbox: 'v2_sync_outbox',
        failures: 'v2_sync_failures'
      };
      this.state = {
        modules: {
          [this.config.moduleId]: {
            tables: {}
          }
        }
      };
      this._knownTables = new Set(Object.values(this.tables));
    }

    updateConfig(nextConfig) {
      const patch = plainObject(nextConfig);
      this.config = Object.assign({}, this.config, patch);
      this.config.endpoints = Object.assign({}, this.config.endpoints || {}, plainObject(patch.endpoints));
      this.config.callbacks = Object.assign({}, this.config.callbacks || {}, plainObject(patch.callbacks));
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = null;
      }
      if (this.started && this.config.autoSync !== false) {
        this._startSyncLoop();
      }
      this.emit('status', { state: 'config-updated', mode: this.config.offlineFirst ? 'offline-first' : 'server-first' });
      return clone(this.config);
    }

    async start() {
      if (this.started) return;
      this.started = true;
      await this.requestSnapshot();
      if (this.config.autoSync) this._startSyncLoop();
      this.emit('status', { state: 'ready', mode: this.config.offlineFirst ? 'offline-first' : 'server-first' });
    }

    stop() {
      this.started = false;
      if (this.syncTimer) clearInterval(this.syncTimer);
      this.syncTimer = null;
      this.emit('status', { state: 'stopped' });
    }

    async saveOrder(orderPayload, options) {
      const payload = clone(orderPayload || {});
      const orderId = payload.id || uid('ord');
      const localVersion = Number(payload.localVersion || payload.version || 0) + 1;
      const record = Object.assign({}, payload, {
        id: orderId,
        localVersion: localVersion,
        updatedAt: nowIso(),
        dirty: true,
        syncState: 'queued'
      });
      await this.local.upsert(this.tables.orders, record);
      const job = this._buildOutboxJob('upsert', orderId, { order: record }, options);
      await this.local.upsert(this.tables.outbox, job);
      await this._publishTable(this.tables.orders);
      await this._publishTable(this.tables.outbox);
      this.emit('local:committed', { entity: 'order', record: clone(record), outbox: clone(job) });
      return { ok: true, localOnly: true, orderId: orderId, outboxId: job.id };
    }

    async finalizeOrder(orderId, finalizePayload) {
      const existing = await this.local.get(this.tables.orders, orderId);
      if (!existing) throw new Error('order-not-found-local');
      const next = Object.assign({}, existing, finalizePayload || {}, {
        status: 'finalized',
        updatedAt: nowIso(),
        localVersion: Number(existing.localVersion || 0) + 1,
        dirty: true,
        syncState: 'queued'
      });
      await this.local.upsert(this.tables.orders, next);
      const job = this._buildOutboxJob('finalize', orderId, { order: next });
      await this.local.upsert(this.tables.outbox, job);
      await this._publishTable(this.tables.orders);
      await this._publishTable(this.tables.outbox);
      this.emit('local:committed', { entity: 'order', record: clone(next), outbox: clone(job) });
      return { ok: true, localOnly: true, orderId: orderId, outboxId: job.id };
    }

    async deleteOrder(orderId) {
      await this.local.remove(this.tables.orders, orderId);
      const job = this._buildOutboxJob('delete', orderId, { id: orderId });
      await this.local.upsert(this.tables.outbox, job);
      await this._publishTable(this.tables.orders);
      await this._publishTable(this.tables.outbox);
      this.emit('local:committed', { entity: 'order', deletedId: orderId, outbox: clone(job) });
      return { ok: true, localOnly: true, orderId: orderId, outboxId: job.id };
    }

    async listFailedJobs() {
      const list = await this.local.list(this.tables.outbox);
      return asArray(list).filter((j) => j && j.status === 'failed').sort((a, b) => Number(b.updatedAtMs || 0) - Number(a.updatedAtMs || 0));
    }

    async retryJob(jobId) {
      const job = await this.local.get(this.tables.outbox, jobId);
      if (!job) return { ok: false, reason: 'job-not-found' };
      job.status = 'queued';
      job.nextRetryAtMs = nowMs();
      job.updatedAtMs = nowMs();
      await this.local.upsert(this.tables.outbox, job);
      await this._publishTable(this.tables.outbox);
      return { ok: true };
    }

    async retryAllFailed() {
      const failed = await this.listFailedJobs();
      for (let i = 0; i < failed.length; i += 1) {
        await this.retryJob(failed[i].id);
      }
      return { ok: true, count: failed.length };
    }

    async clearAndRebuild(seed) {
      await this.local.clear(this.tables.orders);
      await this.local.clear(this.tables.outbox);
      await this.local.clear(this.tables.failures);
      const rows = asArray(seed);
      for (let i = 0; i < rows.length; i += 1) {
        const r = rows[i];
        if (r && r.id != null) await this.local.upsert(this.tables.orders, Object.assign({}, r, { dirty: false, syncState: 'synced' }));
      }
      await this._publishTable(this.tables.orders);
      await this._publishTable(this.tables.outbox);
      await this._publishTable(this.tables.failures);
      this.emit('maintenance', { type: 'clear-rebuild', count: rows.length });
      return { ok: true, inserted: rows.length };
    }

    async syncNow() {
      if (this.syncLock) return { ok: false, reason: 'sync-busy' };
      this.syncLock = true;
      try {
        const outbox = await this.local.list(this.tables.outbox);
        const now = nowMs();
        const queue = asArray(outbox)
          .filter((j) => j && (j.status === 'queued' || (j.status === 'failed' && Number(j.nextRetryAtMs || 0) <= now)))
          .sort((a, b) => Number(a.createdAtMs || 0) - Number(b.createdAtMs || 0));

        let synced = 0;
        let failed = 0;
        for (let i = 0; i < queue.length; i += 1) {
          const job = queue[i];
          const result = await this._sendJob(job);
          if (result.ok) {
            synced += 1;
          } else {
            failed += 1;
          }
        }
        this.emit('sync:done', { synced: synced, failed: failed, queued: queue.length });
        return { ok: true, synced: synced, failed: failed, queued: queue.length };
      } finally {
        this.syncLock = false;
      }
    }

    _startSyncLoop() {
      if (this.syncTimer) clearInterval(this.syncTimer);
      this.syncTimer = setInterval(() => {
        this.syncNow().catch((err) => {
          this.config.logger.warn('[MishkahV2] sync loop error', err);
        });
      }, Math.max(500, Number(this.config.syncIntervalMs || 2000)));
    }

    _buildOutboxJob(op, entityId, payload, options) {
      const jobId = uid('job');
      const localVersion = Number(payload && payload.order && payload.order.localVersion || 0);
      return {
        id: jobId,
        entityType: 'order',
        entityId: entityId,
        operation: op,
        payload: clone(payload || {}),
        dedupeKey: `order:${entityId}:v${localVersion}`,
        status: 'queued',
        attemptCount: 0,
        maxRetries: Number(this.config.maxRetries || 7),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdAtMs: nowMs(),
        updatedAtMs: nowMs(),
        nextRetryAtMs: nowMs(),
        source: (options && options.source) || 'ui',
        lastError: null
      };
    }

    async _sendJob(job) {
      const payload = clone(job.payload || {});
      const requestBody = {
        clientMutationId: job.id,
        entityId: job.entityId,
        operation: job.operation,
        payload: payload
      };
      job.status = 'retrying';
      job.updatedAt = nowIso();
      job.updatedAtMs = nowMs();
      await this.local.upsert(this.tables.outbox, job);
      try {
        if (typeof this.config.syncExecutor === 'function') {
          const execResult = await this.config.syncExecutor(clone(job), {
            requestBody: clone(requestBody),
            config: this.config
          });
          if (!execResult || execResult.ok === false) {
            const reason = (execResult && execResult.reason) || { code: 'executor-failed', message: 'syncExecutor failed' };
            return this._failJob(job, reason);
          }
          await this._markSynced(job, execResult || {});
          return { ok: true };
        }
        const endpoint = this._resolveEndpoint(job.operation);
        if (!endpoint) {
          return this._failJob(job, { code: 'sync-driver-missing', message: `No sync executor/endpoint for ${job.operation}` });
        }
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        const raw = await res.text().catch(function () { return ''; });
        let body = null;
        try { body = raw ? JSON.parse(raw) : {}; } catch (_err) { body = { raw: raw }; }
        if (!res.ok || (body && body.ok === false)) {
          const reason = {
            code: body && body.code ? body.code : String(res.status),
            message: body && body.message ? body.message : (res.statusText || 'sync-failed'),
            body: body
          };
          return this._failJob(job, reason);
        }
        await this._markSynced(job, body || {});
        return { ok: true };
      } catch (error) {
        return this._failJob(job, { code: 'network', message: String(error && error.message || error || 'network-error') });
      }
    }

    _resolveEndpoint(operation) {
      if (operation === 'upsert') return this.config.endpoints.upsertOrder;
      if (operation === 'finalize') return this.config.endpoints.finalizeOrder;
      if (operation === 'delete') return this.config.endpoints.deleteOrder;
      return null;
    }

    async _markSynced(job, responseBody) {
      await this.local.remove(this.tables.outbox, job.id);
      const order = await this.local.get(this.tables.orders, job.entityId);
      if (order) {
        order.dirty = false;
        order.syncState = 'synced';
        order.serverVersion = responseBody && responseBody.serverVersion != null ? responseBody.serverVersion : order.serverVersion;
        order.updatedAt = nowIso();
        await this.local.upsert(this.tables.orders, order);
      }
      await this._publishTable(this.tables.outbox);
      await this._publishTable(this.tables.orders);
      this.emit('sync:success', { jobId: job.id, entityId: job.entityId, operation: job.operation });
      if (typeof this.config.callbacks.onSyncSuccess === 'function') {
        try { this.config.callbacks.onSyncSuccess(clone(job), clone(responseBody)); } catch (_err) { }
      }
    }

    async _failJob(job, reason) {
      job.attemptCount = Number(job.attemptCount || 0) + 1;
      job.lastError = clone(reason);
      job.updatedAt = nowIso();
      job.updatedAtMs = nowMs();
      const willRetry = job.attemptCount < Number(job.maxRetries || this.config.maxRetries || 7);
      job.status = willRetry ? 'failed' : 'failed';
      const wait = Math.pow(2, Math.max(0, job.attemptCount - 1)) * Number(this.config.backoffBaseMs || 1200);
      job.nextRetryAtMs = nowMs() + wait;
      await this.local.upsert(this.tables.outbox, job);
      const failLog = {
        id: uid('fail'),
        outboxId: job.id,
        entityId: job.entityId,
        operation: job.operation,
        reason: clone(reason),
        attemptCount: job.attemptCount,
        createdAt: nowIso(),
        createdAtMs: nowMs()
      };
      await this.local.upsert(this.tables.failures, failLog);
      await this._publishTable(this.tables.outbox);
      await this._publishTable(this.tables.failures);
      this.emit('sync:error', { job: clone(job), reason: clone(reason) });
      if (typeof this.config.callbacks.onSyncError === 'function') {
        try { this.config.callbacks.onSyncError(clone(job), clone(reason)); } catch (_err) { }
      }
      return { ok: false, reason: reason };
    }

    async save(table, record) {
      if (!table) throw new Error('table-required');
      if (!record || record.id == null) throw new Error('record.id required');
      await this.local.upsert(table, record);
      this._knownTables.add(String(table));
      await this._publishTable(table);
      return { ok: true, record: clone(record) };
    }

    async insert(table, record) {
      return this.save(table, record);
    }

    async update(table, record) {
      return this.save(table, record);
    }

    async remove(table, id) {
      if (!table) throw new Error('table-required');
      if (id == null) throw new Error('id-required');
      await this.local.remove(table, id);
      this._knownTables.add(String(table));
      await this._publishTable(table);
      return { ok: true, id: id };
    }

    async read(table, id) {
      return this.local.get(table, id);
    }

    async query(table) {
      return this.local.list(table);
    }

    watch(table, handler) {
      if (!table || typeof handler !== 'function') return function () { };
      const eventName = `table:${String(table)}`;
      const off = this.on(eventName, (rows) => {
        try { handler(clone(rows)); } catch (_err) { }
      });
      this.local.list(table).then((rows) => {
        try { handler(clone(rows)); } catch (_err) { }
      }).catch(() => { });
      return off;
    }

    async requestSnapshot() {
      const tableNames = Array.from(this._knownTables.values());
      for (let i = 0; i < tableNames.length; i += 1) {
        await this._publishTable(tableNames[i]);
      }
      const snapshot = clone(this.state.modules[this.config.moduleId].tables);
      this.emit('snapshot', { moduleId: this.config.moduleId, tables: snapshot });
      return { ok: true, tables: snapshot };
    }

    async _publishTable(table) {
      const tableName = String(table || '').trim();
      if (!tableName) return;
      this._knownTables.add(tableName);
      const rows = await this.local.list(tableName);
      if (!this.state.modules[this.config.moduleId]) {
        this.state.modules[this.config.moduleId] = { tables: {} };
      }
      if (!this.state.modules[this.config.moduleId].tables) {
        this.state.modules[this.config.moduleId].tables = {};
      }
      this.state.modules[this.config.moduleId].tables[tableName] = clone(rows);
      this.emit(`table:${tableName}`, clone(rows));
      this.emit('table', { table: tableName, rows: clone(rows) });
    }
  }

  function createStoreV2(options) {
    return new MishkahStoreV2(options || {});
  }

  global.MishkahStoreV2 = {
    createStoreV2: createStoreV2
  };
  global.createStoreV2 = createStoreV2;
})(typeof window !== 'undefined' ? window : this);
