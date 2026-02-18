(function (global) {
    'use strict';

    var M = global.Mishkah || {};
    global.Mishkah = M;

    var API_BASE = '/api/v1';
    var BOOT_CONFIG = global.MISHKAH_REST_CONFIG || {};
    var BASE_DOMAIN = BOOT_CONFIG.baseDomain || global.MISHKAH_BASE_DOMAIN || global.BASE_DOMAIN || global.basedomain || '';
    var HydrationConfig = {
        mode: BOOT_CONFIG.hydration || 'hydrated' // hydrated | raw
    };
    var HydrationResolver = typeof BOOT_CONFIG.hydrationResolver === 'function'
        ? BOOT_CONFIG.hydrationResolver
        : null;
    var DEFAULT_BRANCH = global.MISHKAH_BRANCH || global.BRANCH_ID || 'pt';
    var Utils = (global.Mishkah && global.Mishkah.utils) || {};
    var StableStringify = Utils.JSON && typeof Utils.JSON.stableStringify === 'function'
        ? Utils.JSON.stableStringify
        : function (obj) { try { return JSON.stringify(obj); } catch (_e) { return ''; } };

    var AdapterRegistry = new Map();
    function getAdapter(namespace) {
        if (!global.MishkahIndexedDB || typeof global.MishkahIndexedDB.createAdapter !== 'function') return null;
        var ns = namespace || 'default';
        if (AdapterRegistry.has(ns)) return AdapterRegistry.get(ns);
        var adapter = global.MishkahIndexedDB.createAdapter({
            namespace: ns,
            name: 'mishkah-rest-cache',
            version: 1
        });
        AdapterRegistry.set(ns, adapter);
        return adapter;
    }

    var CacheConfig = {
        enabled: true,
        policy: 'stale-while-revalidate', // cache-only | network-first | stale-while-revalidate | network-only
        ttlMs: 60 * 1000
    };

    var QueueConfig = {
        enabled: true,
        maxRetries: 5,
        baseDelayMs: 2000,
        maxDelayMs: 60000,
        retryIntervalMs: 50000,
        logLimit: 200
    };

    var QueueRegistry = new Map();
    var QueueListeners = new Set();
    var PolicyResolver = null;
    var Inflight = new Map();

    function getQueueState(branch) {
        var key = branch || 'default';
        if (!QueueRegistry.has(key)) {
            QueueRegistry.set(key, {
                branch: key,
                items: [],
                logs: [],
                loading: null,
                processing: false
            });
        }
        return QueueRegistry.get(key);
    }

    function emitQueueUpdate(branch) {
        var state = getQueueState(branch);
        var stats = {
            pending: state.items.filter(function (it) { return it.status === 'pending'; }).length,
            failed: state.items.filter(function (it) { return it.status === 'failed'; }).length
        };
        QueueListeners.forEach(function (handler) {
            try { handler({ branch: branch, stats: stats, items: state.items.slice(), logs: state.logs.slice() }); }
            catch (_e) { }
        });
    }

    function computeBackoff(retries) {
        var base = QueueConfig.baseDelayMs;
        var delay = base * Math.pow(2, Math.max(0, retries - 1));
        var jitter = Math.floor(delay * (0.8 + Math.random() * 0.4));
        return Math.min(QueueConfig.maxDelayMs, jitter);
    }

    function isAbsoluteUrl(url) {
        return /^https?:\/\//i.test(String(url || ''));
    }

    function joinUrl(base, path) {
        if (!base) return path;
        if (!path) return base;
        var b = String(base).replace(/\/+$/, '');
        var p = String(path);
        if (!p.startsWith('/')) p = '/' + p;
        return b + p;
    }

    function buildApiUrl(endpoint, options) {
        var effectiveEndpoint = withBranch(endpoint, options);
        if (isAbsoluteUrl(effectiveEndpoint)) return effectiveEndpoint;
        var baseDomain = (options && options.baseDomain) || BASE_DOMAIN || '';
        if (isAbsoluteUrl(API_BASE)) {
            return joinUrl(API_BASE, effectiveEndpoint.replace(/^\//, ''));
        }
        if (baseDomain) {
            return joinUrl(baseDomain, API_BASE) + effectiveEndpoint;
        }
        return API_BASE + effectiveEndpoint;
    }

    function requestRaw(endpoint, method, data, options) {
        options = options || {};
        var headers = Object.assign({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }, options.headers || {});
        if (!headers.Authorization) {
            try {
                var token = global.localStorage ? global.localStorage.getItem('mishkah_token') : null;
                if (token) headers.Authorization = 'Bearer ' + token;
            } catch (_e) { }
        }

        var config = { method: method, headers: headers };
        if (data) config.body = JSON.stringify(data);
        var url = buildApiUrl(endpoint, options);
        return fetch(url, config).then(function (response) {
            if (!response.ok) {
                return response.json().catch(function () { return {}; }).then(function (err) {
                    var msg = err.error || err.message || ('HTTP ' + response.status);
                    throw new Error(msg);
                });
            }
            return response.json();
        });
    }

    async function loadQueue(branch) {
        var state = getQueueState(branch);
        if (state.loading) return state.loading;
        var adapter = getAdapter(branch);
        if (!adapter) {
            state.items = state.items || [];
            state.logs = state.logs || [];
            emitQueueUpdate(branch);
            return Promise.resolve(state);
        }
        state.loading = Promise.all([
            adapter.load('queue'),
            adapter.load('queue_logs')
        ]).then(function (results) {
            var queuePayload = results[0];
            var logPayload = results[1];
            state.items = (queuePayload && queuePayload.data && queuePayload.data.items) || [];
            state.logs = (logPayload && logPayload.data && logPayload.data.logs) || [];
            emitQueueUpdate(branch);
            return state;
        }).catch(function () {
            state.items = state.items || [];
            state.logs = state.logs || [];
            emitQueueUpdate(branch);
            return state;
        });
        return state.loading;
    }

    async function saveQueue(branch) {
        var state = getQueueState(branch);
        var adapter = getAdapter(branch);
        if (!adapter) return;
        await adapter.save('queue', { items: state.items }, { metadata: { savedAt: Date.now() }, mergeMetadata: false });
        await adapter.save('queue_logs', { logs: state.logs }, { metadata: { savedAt: Date.now() }, mergeMetadata: false });
    }

    function logQueueFailure(branch, item, error) {
        var state = getQueueState(branch);
        var entry = {
            id: 'log-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            time: new Date().toISOString(),
            method: item.method,
            endpoint: item.endpoint,
            error: (error && error.message) || String(error || 'unknown-error'),
            retries: item.retries || 0,
            itemId: item.id
        };
        state.logs.unshift(entry);
        if (state.logs.length > QueueConfig.logLimit) state.logs.length = QueueConfig.logLimit;
    }

    async function processQueue(branch) {
        var state = getQueueState(branch);
        if (state.processing) return;
        state.processing = true;
        try {
            await loadQueue(branch);
            var now = Date.now();
            for (var i = 0; i < state.items.length; i++) {
                var item = state.items[i];
                if (!item || item.status === 'failed') continue;
                if (item.nextRetryAt && item.nextRetryAt > now) continue;
                try {
                    await requestRaw(item.endpoint, item.method, item.data, item.options || {});
                    state.items.splice(i, 1);
                    i -= 1;
                } catch (err) {
                    item.retries = (item.retries || 0) + 1;
                    item.lastError = (err && err.message) || String(err || 'error');
                    item.updatedAt = Date.now();
                    if (item.retries >= QueueConfig.maxRetries) {
                        item.status = 'failed';
                        logQueueFailure(branch, item, err);
                    } else {
                        item.status = 'pending';
                        item.nextRetryAt = Date.now() + computeBackoff(item.retries);
                        logQueueFailure(branch, item, err);
                    }
                }
            }
            await saveQueue(branch);
            emitQueueUpdate(branch);
        } finally {
            state.processing = false;
        }
    }

    function enqueueRequest(branch, method, endpoint, data, options, error) {
        if (!QueueConfig.enabled) return null;
        var state = getQueueState(branch);
        var item = {
            id: 'q-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            method: method,
            endpoint: endpoint,
            data: data,
            options: { branch: branch, headers: (options && options.headers) ? Object.assign({}, options.headers) : {} },
            status: 'pending',
            retries: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastError: error ? (error.message || String(error)) : null,
            nextRetryAt: Date.now() + computeBackoff(1)
        };
        state.items.push(item);
        logQueueFailure(branch, item, error || new Error('queued'));
        saveQueue(branch);
        emitQueueUpdate(branch);
        return item;
    }

    function resolveBranchFromSession() {
        try {
            var raw = global.localStorage ? global.localStorage.getItem('mishkah_user') : null;
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            return parsed && (parsed.brname || parsed.branch_id) || null;
        } catch (_e) {
            return null;
        }
    }

    function getEffectiveBranch(options) {
        return (options && options.branch) || resolveBranchFromSession() || DEFAULT_BRANCH;
    }

    function resolveTablePolicy(tableName) {
        if (typeof PolicyResolver === 'function') {
            try { return PolicyResolver(tableName) || null; } catch (_e) { }
        }
        return null;
    }

    function withBranch(endpoint, options) {
        var branch = getEffectiveBranch(options);
        if (!branch) return endpoint;

        // Avoid duplicating branch param
        if (endpoint.indexOf('branch=') !== -1) return endpoint;

        var separator = endpoint.indexOf('?') === -1 ? '?' : '&';
        return endpoint + separator + 'branch=' + encodeURIComponent(branch);
    }

    function buildQuery(params) {
        if (!params || typeof params !== 'object') return '';
        var entries = Object.entries(params).filter(function (pair) {
            return pair[1] !== undefined && pair[1] !== null;
        });
        if (!entries.length) return '';
        var query = entries.map(function (pair) {
            return encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1]);
        }).join('&');
        return query ? ('?' + query) : '';
    }

    function isCrudRead(method, endpoint) {
        if (!endpoint) return false;
        if (method === 'GET') return endpoint.indexOf('/crud/') === 0;
        if (method === 'POST' && endpoint.indexOf('/crud/') === 0 && endpoint.indexOf('/search') !== -1) return true;
        return false;
    }

    function isSafeRead(method, endpoint) {
        if (method === 'GET') return true;
        if (endpoint === '/languages') return true;
        if (endpoint === '/crud/tables') return true;
        return isCrudRead(method, endpoint);
    }

    function getCrudTableName(endpoint) {
        if (!endpoint || endpoint.indexOf('/crud/') !== 0) return null;
        var parts = endpoint.split('/');
        return parts.length >= 3 ? parts[2] : null;
    }

    function buildCacheKey(method, endpoint, data) {
        var bodyKey = data ? StableStringify(data) : '';
        return [method, endpoint, bodyKey].join('::');
    }

    async function cacheLoad(adapter, key) {
        if (!adapter || !CacheConfig.enabled) return null;
        var payload = await adapter.load(key).catch(function () { return null; });
        if (!payload || !payload.data) return null;
        var meta = payload.meta || {};
        var savedAt = meta.savedAt || payload.updatedAt || 0;
        var ttl = meta.ttlMs || CacheConfig.ttlMs;
        var isExpired = ttl && savedAt ? (Date.now() - savedAt > ttl) : false;
        return { data: payload.data, meta: meta, expired: isExpired };
    }

    async function maybeHydratePayload(endpoint, payload, options) {
        if (!payload || options && options.hydration === 'raw') return payload;
        if (typeof HydrationResolver !== 'function') return payload;
        var tableName = getCrudTableName(endpoint);
        if (!tableName) return payload;
        try {
            return await HydrationResolver(tableName, payload, options || {});
        } catch (_e) {
            return payload;
        }
    }

    async function cacheSave(adapter, key, data, options) {
        if (!adapter || !CacheConfig.enabled) return null;
        var meta = {
            savedAt: Date.now(),
            ttlMs: (options && options.ttlMs) || CacheConfig.ttlMs,
            source: 'rest'
        };
        return adapter.save(key, data, { metadata: meta, mergeMetadata: false });
    }

    async function cacheClearByTable(adapter, tableName) {
        if (!adapter || !CacheConfig.enabled) return;
        var keys = await adapter.keys().catch(function () { return []; });
        var tag = '::/crud/' + tableName + '/';
        var tasks = keys.filter(function (k) {
            return k.indexOf(tag) !== -1;
        }).map(function (k) { return adapter.clear(k); });
        await Promise.all(tasks);
    }

    var REST = {
        configure: function (opts) {
            opts = opts || {};
            if (opts.apiBase) API_BASE = opts.apiBase;
            if (opts.baseDomain) BASE_DOMAIN = opts.baseDomain;
            if (opts.hydration) HydrationConfig.mode = opts.hydration;
            if (typeof opts.hydrationResolver === 'function') HydrationResolver = opts.hydrationResolver;
            if (opts.defaultBranch) DEFAULT_BRANCH = opts.defaultBranch;
            if (typeof opts.policyResolver === 'function') PolicyResolver = opts.policyResolver;
            if (opts.cache && typeof opts.cache === 'object') {
                if (opts.cache.enabled !== undefined) CacheConfig.enabled = !!opts.cache.enabled;
                if (opts.cache.policy) CacheConfig.policy = opts.cache.policy;
                if (Number.isFinite(opts.cache.ttlMs)) CacheConfig.ttlMs = opts.cache.ttlMs;
            }
            if (opts.queue && typeof opts.queue === 'object') {
                if (opts.queue.enabled !== undefined) QueueConfig.enabled = !!opts.queue.enabled;
                if (Number.isFinite(opts.queue.maxRetries)) QueueConfig.maxRetries = opts.queue.maxRetries;
                if (Number.isFinite(opts.queue.baseDelayMs)) QueueConfig.baseDelayMs = opts.queue.baseDelayMs;
                if (Number.isFinite(opts.queue.maxDelayMs)) QueueConfig.maxDelayMs = opts.queue.maxDelayMs;
                if (Number.isFinite(opts.queue.retryIntervalMs)) QueueConfig.retryIntervalMs = opts.queue.retryIntervalMs;
                if (Number.isFinite(opts.queue.logLimit)) QueueConfig.logLimit = opts.queue.logLimit;
            }
        },
        setPolicyResolver: function (fn) {
            PolicyResolver = typeof fn === 'function' ? fn : null;
        },
        setHydrationResolver: function (fn) {
            HydrationResolver = typeof fn === 'function' ? fn : null;
        },
        request: async function (endpoint, method, data, options) {
            options = options || {};
            var cacheMode = options.cacheMode || options.cache || null;
            if (cacheMode === false) cacheMode = 'no-store';
            var headers = Object.assign({
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }, options.headers || {});

            var config = {
                method: method,
                headers: headers
            };

            if (data) {
                config.body = JSON.stringify(data);
            }

            var url = buildApiUrl(endpoint, options);
            var canCache = CacheConfig.enabled && cacheMode !== 'no-store' && isSafeRead(method, endpoint);
            var branch = getEffectiveBranch(options);
            var adapter = canCache ? getAdapter(branch) : null;
            var cacheKey = canCache ? buildCacheKey(method, endpoint, data) : null;
            var policy = cacheMode || CacheConfig.policy;
            var cached = null;

            if (canCache && policy !== 'network-only') {
                cached = await cacheLoad(adapter, cacheKey);
                if (cached && policy === 'cache-only') {
                    return await maybeHydratePayload(endpoint, cached.data, options);
                }
                if (!cached && options.seed && policy === 'cache-only') {
                    policy = 'network-first';
                }
                if (cached && policy === 'stale-while-revalidate') {
                    // Return cached now; refresh in background
                    (async function () {
                        try {
                            var resp = await fetch(url, config);
                            if (!resp.ok) return;
                            var json = await resp.json();
                            await cacheSave(adapter, cacheKey, json, { ttlMs: options.ttlMs });
                            if (typeof options.onCacheUpdate === 'function') {
                                options.onCacheUpdate(json, { source: 'network' });
                            }
                        } catch (_e) { }
                    })();
                    return await maybeHydratePayload(endpoint, cached.data, options);
                }
            }

            var inflightKey = branch + '::' + cacheKey;
            if (canCache && policy !== 'network-only' && Inflight.has(inflightKey)) {
                return Inflight.get(inflightKey);
            }

            try {
                var inflightPromise = (async function () {
                var response = await fetch(url, config);

                if (!response.ok) {
                    var errorData = await response.json().catch(function () { return {}; });
                    if (cached && (policy === 'network-first' || policy === 'stale-while-revalidate')) {
                        return cached.data;
                    }
                    throw new Error(errorData.message || ('HTTP ' + response.status));
                }

                var json = await response.json();
                if (canCache) {
                    await cacheSave(adapter, cacheKey, json, { ttlMs: options.ttlMs });
                } else if (method !== 'GET' && endpoint.indexOf('/crud/') === 0) {
                    var tableName = getCrudTableName(endpoint);
                    if (tableName) {
                        await cacheClearByTable(getAdapter(getEffectiveBranch(options)), tableName);
                    }
                }
                return await maybeHydratePayload(endpoint, json, options);
                })();
                if (canCache && policy !== 'network-only') {
                    Inflight.set(inflightKey, inflightPromise);
                }
                var inflightResult = await inflightPromise;
                Inflight.delete(inflightKey);
                return inflightResult;
            } catch (error) {
                Inflight.delete(inflightKey);
                if (cached && policy !== 'network-only') {
                    return await maybeHydratePayload(endpoint, cached.data, options);
                }
                if (QueueConfig.enabled && method !== 'GET' && options.queue !== false) {
                    enqueueRequest(branch, method, endpoint, data, options, error);
                    processQueue(branch);
                    if (options.queue === 'throw') throw error;
                    return { queued: true, error: error.message || String(error) };
                }
                throw error;
            }
        },

        get: function (url, opts) { return this.request(url, 'GET', null, opts); },
        post: function (url, data, opts) { return this.request(url, 'POST', data, opts); },
        put: function (url, data, opts) { return this.request(url, 'PUT', data, opts); },
        del: function (url, opts) { return this.request(url, 'DELETE', null, opts); },

        repo: function (tableName) {
            var root = '/crud/' + tableName;

            return {
                search: function (params) {
                    var body = Object.assign({}, params || {});
                    var tablePolicy = resolveTablePolicy(tableName) || {};
                    var defaultRead = (tablePolicy.read || (tablePolicy.mode === 'offline-first' ? 'cache-only' : null)) || CacheConfig.policy || null;
                    var cacheMode = body.cacheMode || body.cache || (body.fresh ? 'network-only' : (defaultRead || 'network-first'));
                    var seed = tablePolicy.initial_seed === true;
                    var hydration = body.hydration || HydrationConfig.mode;
                    delete body.cacheMode;
                    delete body.cache;
                    delete body.fresh;
                    delete body.hydration;
                    var queryParams = {};
                    if (body.q !== undefined) {
                        queryParams.q = body.q;
                    }
                    if (body.withMeta !== undefined) {
                        queryParams.withMeta = body.withMeta;
                    }
                    if (hydration === 'raw') {
                        queryParams.raw = 1;
                    }
                    var qs = buildQuery(queryParams);
                    return REST.post(root + '/search' + qs, body, { cacheMode: cacheMode, seed: seed });
                },
                get: function (id, params) {
                    var opts = Object.assign({}, params || {});
                    var tablePolicy = resolveTablePolicy(tableName) || {};
                    var defaultRead = (tablePolicy.read || (tablePolicy.mode === 'offline-first' ? 'cache-only' : null)) || CacheConfig.policy || null;
                    var cacheMode = (opts && (opts.cacheMode || opts.cache)) || defaultRead || null;
                    var seed = tablePolicy.initial_seed === true;
                    var hydration = opts.hydration || HydrationConfig.mode;
                    delete opts.cacheMode;
                    delete opts.cache;
                    delete opts.hydration;
                    if (hydration === 'raw') {
                        opts.raw = 1;
                    }
                    var qs = buildQuery(opts);
                    return REST.get(root + '/' + id + qs, { cacheMode: cacheMode, seed: seed });
                },
                create: function (data, params) {
                    var qs = buildQuery(params);
                    return REST.post(root + qs, data);
                },
                update: function (id, data, params) {
                    var qs = buildQuery(params);
                    return REST.put(root + '/' + id + qs, data);
                },
                delete: function (id, params) {
                    var qs = buildQuery(params);
                    return REST.del(root + '/' + id + qs);
                }
            };
        },

        system: {
            tables: function () {
                return REST.get('/crud/tables');
            }
        },

        languages: function () {
            return REST.get('/languages', { cacheMode: 'stale-while-revalidate' });
        },

        rpc: async function (methodName, data, options) {
            options = options || {};
            var headers = Object.assign({
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }, options.headers || {});

            var config = {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data || {})
            };

            // RPC Router expects /api/rpc/:method
            // We reuse withBranch logic but apply it manually
            var endpoint = '/api/rpc/' + methodName;
            var branch = getEffectiveBranch(options);

            // Re-implement withBranch logic locally or expose it?
            // It's private in this closure. let's just implement simple logic.
            if (branch && endpoint.indexOf('branch=') === -1) {
                var separator = endpoint.indexOf('?') === -1 ? '?' : '&';
                endpoint = endpoint + separator + 'branch=' + encodeURIComponent(branch);
            }

            try {
                var response = await fetch(endpoint, config);

                if (!response.ok) {
                    var errorData = await response.json().catch(function () { return {}; });
                    throw new Error(errorData.error || errorData.message || ('HTTP ' + response.status));
                }

                return await response.json();
            } catch (error) {
                throw error;
            }
        }
    };

    REST.queue = {
        ready: function (branch) {
            return loadQueue(branch || getEffectiveBranch({}));
        },
        list: function (branch) {
            var b = branch || getEffectiveBranch({});
            var state = getQueueState(b);
            return { items: state.items.slice(), logs: state.logs.slice() };
        },
        stats: function (branch) {
            var b = branch || getEffectiveBranch({});
            var state = getQueueState(b);
            return {
                pending: state.items.filter(function (it) { return it.status === 'pending'; }).length,
                failed: state.items.filter(function (it) { return it.status === 'failed'; }).length
            };
        },
        retryAll: function (branch) {
            var b = branch || getEffectiveBranch({});
            var state = getQueueState(b);
            state.items.forEach(function (it) {
                if (!it || it.status !== 'failed') return;
                it.status = 'pending';
                it.nextRetryAt = Date.now();
            });
            saveQueue(b);
            emitQueueUpdate(b);
            return processQueue(b);
        },
        clear: function (branch) {
            var b = branch || getEffectiveBranch({});
            var state = getQueueState(b);
            state.items = [];
            state.logs = [];
            saveQueue(b);
            emitQueueUpdate(b);
        },
        onUpdate: function (handler) {
            if (typeof handler !== 'function') return function () { };
            QueueListeners.add(handler);
            return function () { QueueListeners.delete(handler); };
        },
        process: function (branch) {
            return processQueue(branch || getEffectiveBranch({}));
        }
    };

    REST.cache = {
        clearAll: async function (branch) {
            var b = branch || getEffectiveBranch({});
            var adapter = getAdapter(b);
            if (!adapter) return;
            var keys = await adapter.keys().catch(function () { return []; });
            await Promise.all(keys.map(function (k) { return adapter.clear(k); }));
        },
        clearTable: async function (tableName, branch) {
            var b = branch || getEffectiveBranch({});
            await cacheClearByTable(getAdapter(b), tableName);
        },
        rebuildTable: async function (tableName, options) {
            options = options || {};
            var repo = REST.repo(tableName);
            var res = await repo.search(Object.assign({}, options, { cacheMode: 'network-only', fresh: true }));
            return res;
        },
        destroy: async function (branch) {
            var b = branch || getEffectiveBranch({});
            var adapter = getAdapter(b);
            if (!adapter) return;
            await adapter.destroy().catch(function () { });
            AdapterRegistry.delete(b);
        }
    };

    if (typeof window !== 'undefined') {
        window.addEventListener('online', function () {
            processQueue(getEffectiveBranch({}));
        });
        setInterval(function () {
            processQueue(getEffectiveBranch({}));
        }, QueueConfig.retryIntervalMs);
    }

    M.REST = REST;

})(window);
