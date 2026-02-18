(function (window) {
  'use strict';

  function clone(value) {
    if (value == null) return value;
    if (typeof structuredClone === 'function') {
      try { return structuredClone(value); } catch (_err) { }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeTablePolicies(policies) {
    var out = Object.create(null);
    if (!policies || typeof policies !== 'object') return out;
    Object.keys(policies).forEach(function (k) {
      var mode = String(policies[k] || '').trim().toLowerCase();
      if (!mode) return;
      if (mode !== 'remote-first' && mode !== 'local-first' && mode !== 'remote-only' && mode !== 'local-only') return;
      out[String(k)] = mode;
    });
    return out;
  }

  function createLocalFallback() {
    var tables = new Map();
    function getTable(name) {
      if (!tables.has(name)) tables.set(name, []);
      return tables.get(name);
    }
    return {
      async save(table, record) {
        var rows = getTable(table);
        var id = record && record.id != null ? String(record.id) : null;
        if (!id) throw new Error('record.id required for local save');
        var idx = rows.findIndex(function (r) { return String(r.id) === id; });
        if (idx >= 0) rows[idx] = clone(record);
        else rows.push(clone(record));
        return { ok: true, record: clone(record) };
      },
      async remove(table, id) {
        var rows = getTable(table);
        var key = String(id);
        var idx = rows.findIndex(function (r) { return String(r.id) === key; });
        if (idx >= 0) rows.splice(idx, 1);
        return { ok: true, id: id };
      },
      async query(table) {
        return clone(getTable(table));
      },
      async read(table, id) {
        var rows = getTable(table);
        var key = String(id);
        var row = rows.find(function (r) { return String(r.id) === key; }) || null;
        return clone(row);
      },
      watch: function () { return function () { }; }
    };
  }

  function createHybridDbV2(schema, entries, options) {
    var opts = options || {};
    if (typeof window.createDBAuto !== 'function') {
      throw new Error('createDBAuto is required before createDBAutoHybridV2');
    }

    var remoteDb = window.createDBAuto(schema, entries, opts);
    var localDriver = (window.createStoreV2 && opts.useStoreV2Local !== false)
      ? window.createStoreV2({
        namespace: opts.branchId || 'default',
        moduleId: opts.moduleId || 'pos',
        autoSync: opts.localAutoSync === true
      })
      : createLocalFallback();

    var tablePolicies = normalizeTablePolicies(opts.tablePolicies);
    var watchers = new Map();
    var remoteCache = new Map();
    var localCache = new Map();

    function modeFor(table) {
      return tablePolicies[table] || 'remote-first';
    }

    function mergeRows(table) {
      var mode = modeFor(table);
      var remoteRows = remoteCache.get(table) || [];
      var localRows = localCache.get(table) || [];
      if (mode === 'remote-only') return clone(remoteRows);
      if (mode === 'local-only') return clone(localRows);

      var out = [];
      var index = new Map();
      var first = mode === 'local-first' ? localRows : remoteRows;
      var second = mode === 'local-first' ? remoteRows : localRows;

      first.forEach(function (row) {
        var key = row && row.id != null ? String(row.id) : null;
        if (!key) return;
        index.set(key, out.length);
        out.push(clone(row));
      });
      second.forEach(function (row) {
        var key = row && row.id != null ? String(row.id) : null;
        if (!key) return;
        if (index.has(key)) {
          var i = index.get(key);
          out[i] = Object.assign({}, clone(out[i]), clone(row));
        } else {
          index.set(key, out.length);
          out.push(clone(row));
        }
      });
      return out;
    }

    function emitWatch(table) {
      var set = watchers.get(table);
      if (!set || !set.size) return;
      var rows = mergeRows(table);
      set.forEach(function (handler) {
        try { handler(clone(rows), { table: table }); } catch (_err) { }
      });
    }

    function upsertCache(cacheMap, table, record) {
      if (!record || record.id == null) return;
      var key = String(record.id);
      var rows = Array.isArray(cacheMap.get(table)) ? cacheMap.get(table).slice() : [];
      var idx = rows.findIndex(function (row) {
        return row && row.id != null && String(row.id) === key;
      });
      var next = clone(record);
      if (idx >= 0) {
        rows[idx] = Object.assign({}, rows[idx], next);
      } else {
        rows.push(next);
      }
      cacheMap.set(table, rows);
    }

    function removeFromCache(cacheMap, table, id) {
      if (id == null) return;
      var key = String(id);
      var rows = Array.isArray(cacheMap.get(table)) ? cacheMap.get(table) : [];
      cacheMap.set(table, rows.filter(function (row) {
        return !(row && row.id != null && String(row.id) === key);
      }));
    }

    function attachRemoteWatch(table) {
      if (!remoteDb || typeof remoteDb.watch !== 'function') return function () { };
      return remoteDb.watch(table, function (rows) {
        remoteCache.set(table, Array.isArray(rows) ? clone(rows) : []);
        emitWatch(table);
      });
    }

    var remoteUnsubs = new Map();

    var api = {
      config: Object.assign({}, opts, { mode: 'hybrid-v2' }),
      store: remoteDb && remoteDb.store ? remoteDb.store : (remoteDb || null),
      getRegisteredNames: function () {
        if (remoteDb && typeof remoteDb.getRegisteredNames === 'function') return remoteDb.getRegisteredNames();
        return Array.isArray(entries) ? entries.slice() : [];
      },
      connect: async function () {
        if (remoteDb && typeof remoteDb.connect === 'function') {
          await remoteDb.connect();
        }
        return api.ready();
      },
      disconnect: function () {
        if (remoteDb && typeof remoteDb.disconnect === 'function') remoteDb.disconnect();
      },
      ready: function () {
        if (remoteDb && typeof remoteDb.ready === 'function') return remoteDb.ready();
        return Promise.resolve(true);
      },
      watch: function (table, handler, options) {
        if (typeof handler !== 'function') return function () { };
        var set = watchers.get(table) || new Set();
        set.add(handler);
        watchers.set(table, set);

        if (!remoteUnsubs.has(table)) {
          remoteUnsubs.set(table, attachRemoteWatch(table));
        }

        if (!options || options.immediate !== false) {
          handler(mergeRows(table), { table: table });
        }
        return function () {
          var s = watchers.get(table);
          if (!s) return;
          s.delete(handler);
          if (!s.size) watchers.delete(table);
        };
      },
      query: async function (table, filter, moduleId) {
        var mode = modeFor(table);
        if (mode === 'local-only') return localDriver.query(table, filter, moduleId);
        if (mode === 'remote-only' && remoteDb && typeof remoteDb.query === 'function') return remoteDb.query(table, filter, moduleId);

        var remoteRows = [];
        if (remoteDb && typeof remoteDb.query === 'function') {
          try { remoteRows = await remoteDb.query(table, filter, moduleId); } catch (_err) { remoteRows = []; }
        }
        remoteCache.set(table, Array.isArray(remoteRows) ? clone(remoteRows) : []);
        var localRows = [];
        try { localRows = await localDriver.query(table, filter, moduleId); } catch (_err) { localRows = []; }
        localCache.set(table, Array.isArray(localRows) ? clone(localRows) : []);
        return mergeRows(table);
      },
      read: async function (table, id, moduleId) {
        var mode = modeFor(table);
        if (mode === 'local-only') return localDriver.read(table, id, moduleId);
        if (mode === 'remote-only' && remoteDb && typeof remoteDb.read === 'function') return remoteDb.read(table, id, moduleId);

        if (mode === 'local-first') {
          var localFirst = await localDriver.read(table, id, moduleId);
          if (localFirst) return localFirst;
          if (remoteDb && typeof remoteDb.read === 'function') return remoteDb.read(table, id, moduleId);
          return null;
        }
        if (remoteDb && typeof remoteDb.read === 'function') {
          var remoteFirst = await remoteDb.read(table, id, moduleId);
          if (remoteFirst) return remoteFirst;
        }
        return localDriver.read(table, id, moduleId);
      },
      insert: async function (table, record, meta) {
        var mode = modeFor(table);
        if (mode === 'local-only') {
          var localOnlyResult = await localDriver.save(table, record, meta);
          upsertCache(localCache, table, record);
          emitWatch(table);
          return localOnlyResult;
        }
        if (mode === 'remote-only' && remoteDb && typeof remoteDb.insert === 'function') {
          var remoteOnlyResult = await remoteDb.insert(table, record, meta);
          upsertCache(remoteCache, table, record);
          emitWatch(table);
          return remoteOnlyResult;
        }
        if (mode === 'local-first') {
          var localResult = await localDriver.save(table, record, meta);
          try { if (remoteDb && typeof remoteDb.insert === 'function') remoteDb.insert(table, record, meta); } catch (_err) { }
          upsertCache(localCache, table, record);
          emitWatch(table);
          return localResult;
        }
        if (remoteDb && typeof remoteDb.insert === 'function') {
          var remoteResult = await remoteDb.insert(table, record, meta);
          upsertCache(remoteCache, table, record);
          emitWatch(table);
          return remoteResult;
        }
        var fallbackSave = await localDriver.save(table, record, meta);
        upsertCache(localCache, table, record);
        emitWatch(table);
        return fallbackSave;
      },
      save: async function (table, record, meta) {
        if (remoteDb && typeof remoteDb.save === 'function') {
          return api.insert(table, record, meta);
        }
        return api.insert(table, record, meta);
      },
      update: async function (table, record, meta) {
        if (remoteDb && typeof remoteDb.update === 'function' && modeFor(table) !== 'local-only') {
          if (modeFor(table) === 'local-first') {
            var localRes = await localDriver.save(table, record, meta);
            try { remoteDb.update(table, record, meta); } catch (_err) { }
            upsertCache(localCache, table, record);
            emitWatch(table);
            return localRes;
          }
          var remoteRes = await remoteDb.update(table, record, meta);
          upsertCache(remoteCache, table, record);
          emitWatch(table);
          return remoteRes;
        }
        var localUpdate = await localDriver.save(table, record, meta);
        upsertCache(localCache, table, record);
        emitWatch(table);
        return localUpdate;
      },
      deleteRecord: async function (table, id, meta) {
        var mode = modeFor(table);
        if (mode === 'local-only') {
          var localOnlyDelete = await localDriver.remove(table, id, meta);
          removeFromCache(localCache, table, id);
          emitWatch(table);
          return localOnlyDelete;
        }
        if (mode === 'remote-only' && remoteDb && typeof remoteDb.delete === 'function') {
          var remoteOnlyDelete = await remoteDb.delete(table, id, meta);
          removeFromCache(remoteCache, table, id);
          emitWatch(table);
          return remoteOnlyDelete;
        }
        if (mode === 'local-first') {
          var localResult = await localDriver.remove(table, id, meta);
          try {
            if (remoteDb && typeof remoteDb.delete === 'function') remoteDb.delete(table, id, meta);
          } catch (_err) { }
          removeFromCache(localCache, table, id);
          emitWatch(table);
          return localResult;
        }
        if (remoteDb && typeof remoteDb.delete === 'function') {
          var remoteDelete = await remoteDb.delete(table, id, meta);
          removeFromCache(remoteCache, table, id);
          emitWatch(table);
          return remoteDelete;
        }
        var fallbackDelete = await localDriver.remove(table, id, meta);
        removeFromCache(localCache, table, id);
        emitWatch(table);
        return fallbackDelete;
      }
    };

    return api;
  }

  function createDBAutoV2(schema, entries, options) {
    if (typeof window.createDBAuto !== 'function') {
      throw new Error('createDBAuto is required before createDBAutoV2');
    }
    return window.createDBAuto(schema, entries, options || {});
  }

  window.createDBAutoV2 = createDBAutoV2;
  window.createDBAutoHybridV2 = createHybridDbV2;
})(window);
