/**
 * Mishkah PWA Auto
 * Automatic PWA configuration and setup following the Auto pattern
 * 
 * Usage:
 *   Mishkah.utils.pwa.auto(database, app, options);
 * 
 * Or via twcss.auto (auto-enabled when database.env.pwa.enabled = true):
 *   Mishkah.utils.twcss.auto(database, app);
 */

(function (global) {
    'use strict';

    var M = global.Mishkah;
    if (!M) {
        console.error('[mishkah.pwa] Mishkah core is required');
        return;
    }

    // ==========================================================================
    // Utilities
    // ==========================================================================

    function merge(target, source) {
        var result = {};
        for (var key in target) {
            result[key] = target[key];
        }
        for (var key in source) {
            if (source[key] !== undefined) {
                result[key] = source[key];
            }
        }
        return result;
    }

    function uuid() {
        return 'pwa-' + Math.random().toString(36).slice(2, 11);
    }

    // ==========================================================================
    // Default Configuration
    // ==========================================================================

    var DEFAULTS = {
        manifestInline: true,
        manifestUrl: './manifest.json',
        manifest: {
            name: 'Mishkah App',
            short_name: 'App',
            start_url: './',
            display: 'standalone',
            orientation: 'portrait-primary',
            theme_color: '#0b0f1a',
            background_color: '#0b0f1a',
            description: 'A Mishkah PWA Application',
            dir: 'auto',
            lang: 'ar'
        },
        icons: [
            { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: './icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: './icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        assets: [],
        offlineFallback: './offline.html',
        runtimeCaching: [],
        cache: {
            prefix: 'mishkah-pwa',
            version: 'v1'
        },
        registerDelay: 500,
        sw: {
            inline: true,
            strategy: 'networkFirst',
            scope: './',
            cleanupPrefix: 'mishkah-pwa'
        }
    };

    // ==========================================================================
    // Service Worker Template
    // ==========================================================================

    function generateServiceWorker(config) {
        var cacheName = config.cache.prefix + '-' + config.cache.version;
        var assets = config.assets || [];
        var offlineFallback = config.offlineFallback;
        var strategy = config.sw.strategy || 'networkFirst';
        var runtimeCaching = config.runtimeCaching || [];

        var template = [
            '// Mishkah PWA Service Worker',
            '// Generated: ' + new Date().toISOString(),
            '',
            'const CACHE_NAME = "' + cacheName + '";',
            'const OFFLINE_FALLBACK = "' + offlineFallback + '";',
            'const ASSETS_TO_CACHE = ' + JSON.stringify(assets) + ';',
            'const RUNTIME_CACHING = ' + JSON.stringify(runtimeCaching) + ';',
            '',
            '// Install event',
            'self.addEventListener("install", (event) => {',
            '  console.log("[SW] Installing...");',
            '  event.waitUntil(',
            '    caches.open(CACHE_NAME).then((cache) => {',
            '      console.log("[SW] Caching assets:", ASSETS_TO_CACHE);',
            '      return cache.addAll(ASSETS_TO_CACHE);',
            '    }).then(() => self.skipWaiting())',
            '  );',
            '});',
            '',
            '// Activate event',
            'self.addEventListener("activate", (event) => {',
            '  console.log("[SW] Activating...");',
            '  event.waitUntil(',
            '    caches.keys().then((cacheNames) => {',
            '      return Promise.all(',
            '        cacheNames',
            '          .filter((name) => name.startsWith("' + config.cache.prefix + '") && name !== CACHE_NAME)',
            '          .map((name) => {',
            '            console.log("[SW] Deleting old cache:", name);',
            '            return caches.delete(name);',
            '          })',
            '      );',
            '    }).then(() => self.clients.claim())',
            '  );',
            '});',
            '',
            '// Fetch event with strategy',
            'self.addEventListener("fetch", (event) => {',
            '  const { request } = event;',
            '  const url = new URL(request.url);',
            '',
            '  // Skip non-GET requests',
            '  if (request.method !== "GET") return;',
            '',
            '  // Apply runtime caching rules',
            '  for (const rule of RUNTIME_CACHING) {',
            '    const pattern = new RegExp(rule.pattern);',
            '    if (pattern.test(url.href)) {',
            '      event.respondWith(handleStrategy(request, rule.strategy, rule.sameOrigin !== false));',
            '      return;',
            '    }',
            '  }',
            '',
            '  // Default strategy: ' + strategy,
            '  event.respondWith(handleStrategy(request, "' + strategy + '", url.origin === self.location.origin));',
            '});',
            '',
            '// Strategy handlers',
            'async function handleStrategy(request, strategy, sameOrigin) {',
            '  switch (strategy) {',
            '    case "cacheFirst":',
            '      return cacheFirst(request);',
            '    case "networkFirst":',
            '      return networkFirst(request);',
            '    case "staleWhileRevalidate":',
            '      return staleWhileRevalidate(request);',
            '    default:',
            '      return networkFirst(request);',
            '  }',
            '}',
            '',
            'async function cacheFirst(request) {',
            '  const cached = await caches.match(request);',
            '  if (cached) return cached;',
            '  try {',
            '    const response = await fetch(request);',
            '    const cache = await caches.open(CACHE_NAME);',
            '    cache.put(request, response.clone());',
            '    return response;',
            '  } catch (error) {',
            '    return caches.match(OFFLINE_FALLBACK);',
            '  }',
            '}',
            '',
            'async function networkFirst(request) {',
            '  try {',
            '    const response = await fetch(request);',
            '    const cache = await caches.open(CACHE_NAME);',
            '    cache.put(request, response.clone());',
            '    return response;',
            '  } catch (error) {',
            '    const cached = await caches.match(request);',
            '    return cached || caches.match(OFFLINE_FALLBACK);',
            '  }',
            '}',
            '',
            'async function staleWhileRevalidate(request) {',
            '  const cached = await caches.match(request);',
            '  const fetchPromise = fetch(request).then((response) => {',
            '    const cache = caches.open(CACHE_NAME);',
            '    cache.then((c) => c.put(request, response.clone()));',
            '    return response;',
            '  });',
            '  return cached || fetchPromise;',
            '}'
        ].join('\n');

        return template;
    }

    // ==========================================================================
    // Manifest Generation
    // ==========================================================================

    function generateManifest(config) {
        var manifest = merge(DEFAULTS.manifest, config.manifest || {});

        // Add icons
        if (config.icons && config.icons.length > 0) {
            manifest.icons = config.icons;
        } else {
            manifest.icons = DEFAULTS.icons;
        }

        return manifest;
    }

    // ==========================================================================
    // Head Injection
    // ==========================================================================

    function injectMetaTags(config, manifestUrl) {
        if (!global.document) return;

        var head = global.document.head;

        // Theme color
        var themeColorMeta = global.document.querySelector('meta[name="theme-color"]');
        if (!themeColorMeta) {
            themeColorMeta = global.document.createElement('meta');
            themeColorMeta.setAttribute('name', 'theme-color');
            head.appendChild(themeColorMeta);
        }
        themeColorMeta.setAttribute('content', config.manifest.theme_color || DEFAULTS.manifest.theme_color);

        // Manifest link
        var manifestLink = global.document.querySelector('link[rel="manifest"]');
        if (!manifestLink) {
            manifestLink = global.document.createElement('link');
            manifestLink.setAttribute('rel', 'manifest');
            head.appendChild(manifestLink);
        }
        manifestLink.setAttribute('href', manifestUrl);

        // Apple touch icon (use first icon)
        if (config.icons && config.icons.length > 0) {
            var appleTouchIcon = global.document.querySelector('link[rel="apple-touch-icon"]');
            if (!appleTouchIcon) {
                appleTouchIcon = global.document.createElement('link');
                appleTouchIcon.setAttribute('rel', 'apple-touch-icon');
                head.appendChild(appleTouchIcon);
            }
            // Use the largest icon
            var largestIcon = config.icons.reduce(function (prev, curr) {
                var prevSize = parseInt(prev.sizes.split('x')[0]);
                var currSize = parseInt(curr.sizes.split('x')[0]);
                return currSize > prevSize ? curr : prev;
            });
            appleTouchIcon.setAttribute('href', largestIcon.src);
        }

        // Apple mobile web app capable
        var appleCapable = global.document.querySelector('meta[name="apple-mobile-web-app-capable"]');
        if (!appleCapable) {
            appleCapable = global.document.createElement('meta');
            appleCapable.setAttribute('name', 'apple-mobile-web-app-capable');
            appleCapable.setAttribute('content', 'yes');
            head.appendChild(appleCapable);
        }

        // Apple status bar style
        var appleStatusBar = global.document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (!appleStatusBar) {
            appleStatusBar = global.document.createElement('meta');
            appleStatusBar.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
            appleStatusBar.setAttribute('content', 'black-translucent');
            head.appendChild(appleStatusBar);
        }

        console.log('[PWA] Meta tags injected');
    }

    // ==========================================================================
    // Service Worker Registration
    // ==========================================================================

    function registerServiceWorker(swUrl, scope) {
        if (!global.navigator || !global.navigator.serviceWorker) {
            console.warn('[PWA] Service Workers not supported');
            return Promise.resolve(null);
        }

        return global.navigator.serviceWorker
            .register(swUrl, { scope: scope })
            .then(function (registration) {
                console.log('[PWA] Service Worker registered:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', function () {
                    console.log('[PWA] Service Worker update found');
                });

                return registration;
            })
            .catch(function (error) {
                console.error('[PWA] Service Worker registration failed:', error);
                return null;
            });
    }

    // ==========================================================================
    // PWA Orders
    // ==========================================================================

    var PWAOrders = {
        'pwa:install': {
            on: ['click'],
            gkeys: ['pwa:install'],
            handler: function (e, ctx) {
                var state = ctx.getState();
                var prompt = state.env && state.env.installPrompt;

                if (!prompt) {
                    console.warn('[PWA] No install prompt available');
                    return;
                }

                prompt.prompt();
                prompt.userChoice.then(function (choice) {
                    console.log('[PWA] Install choice:', choice.outcome);
                    ctx.setState(function (prev) {
                        return merge(prev, {
                            env: merge(prev.env, {
                                installPrompt: null,
                                showInstall: false
                            })
                        });
                    });
                });
            }
        },
        'pwa:dismiss': {
            on: ['click'],
            gkeys: ['pwa:dismiss'],
            handler: function (e, ctx) {
                ctx.setState(function (prev) {
                    return merge(prev, {
                        env: merge(prev.env, { showInstall: false })
                    });
                });
            }
        },
        'pwa:sw:refresh': {
            on: ['click'],
            gkeys: ['pwa:sw:refresh'],
            handler: function (e, ctx) {
                if (global.navigator && global.navigator.serviceWorker) {
                    global.navigator.serviceWorker.getRegistration().then(function (registration) {
                        if (registration) {
                            registration.update();
                            console.log('[PWA] Service Worker update triggered');
                        }
                    });
                }
            }
        },
        'pwa:cache:clear': {
            on: ['click'],
            gkeys: ['pwa:cache:clear'],
            handler: function (e, ctx) {
                if (global.caches) {
                    var state = ctx.getState();
                    var prefix = (state.env && state.env.pwa && state.env.pwa.cache && state.env.pwa.cache.prefix) || 'mishkah-pwa';

                    global.caches.keys().then(function (names) {
                        return Promise.all(
                            names
                                .filter(function (name) { return name.startsWith(prefix); })
                                .map(function (name) { return global.caches.delete(name); })
                        );
                    }).then(function () {
                        console.log('[PWA] Cache cleared');
                    });
                }
            }
        }
    };

    // ==========================================================================
    // Main Auto Function
    // ==========================================================================

    function pwaAuto(database, app, options) {
        options = options || {};

        // Check if PWA is enabled
        var pwaConfig = (database && database.env && database.env.pwa) || {};
        if (!pwaConfig.enabled && !options.force) {
            console.log('[PWA] PWA not enabled in database.env.pwa');
            return { enabled: false, orders: {} };
        }

        console.log('[PWA] Initializing auto PWA setup...');

        // Merge configuration
        var config = merge(DEFAULTS, pwaConfig);

        // Generate manifest
        var manifestData = generateManifest(config);
        var manifestUrl;

        if (config.manifestInline) {
            // Generate inline manifest via Blob URL
            var manifestBlob = new Blob([JSON.stringify(manifestData, null, 2)], { type: 'application/json' });
            manifestUrl = URL.createObjectURL(manifestBlob);
            console.log('[PWA] Inline manifest created');
        } else {
            // Use external manifest URL
            manifestUrl = config.manifestUrl;
            console.log('[PWA] Using external manifest:', manifestUrl);
        }

        // Collect assets to cache
        var assets = [manifestUrl, config.offlineFallback || './offline.html'].concat(config.assets || []);

        // Add icons to assets
        if (config.icons) {
            config.icons.forEach(function (icon) {
                if (icon.src && assets.indexOf(icon.src) === -1) {
                    assets.push(icon.src);
                }
            });
        }

        config.assets = assets;

        // Inject meta tags
        injectMetaTags(config, manifestUrl);

        // Generate and register service worker
        var swUrl;
        if (config.sw.inline) {
            var swCode = generateServiceWorker(config);
            var swBlob = new Blob([swCode], { type: 'application/javascript' });
            swUrl = URL.createObjectURL(swBlob);
            console.log('[PWA] Inline service worker created');
        } else {
            swUrl = './service-worker.js';
            console.log('[PWA] Using external service worker');
        }

        // Register SW after delay
        setTimeout(function () {
            if (global.document && global.document.readyState === 'complete') {
                registerServiceWorker(swUrl, config.sw.scope);
            } else {
                global.addEventListener('load', function () {
                    registerServiceWorker(swUrl, config.sw.scope);
                });
            }
        }, config.registerDelay || 500);

        // Watch for install prompt
        if (global.window) {
            global.window.addEventListener('beforeinstallprompt', function (e) {
                e.preventDefault();
                console.log('[PWA] Install prompt captured');

                // Update database if app is available
                if (app && app.setState) {
                    app.setState(function (prev) {
                        return merge(prev, {
                            env: merge(prev.env, {
                                installPrompt: e,
                                showInstall: true
                            })
                        });
                    });
                }
            });
        }

        // Expose PWA config globally
        M.env = M.env || {};
        M.env.PWA = {
            enabled: true,
            config: config,
            manifestUrl: manifestUrl,
            swUrl: swUrl
        };

        console.log('[PWA] Auto setup complete');

        return {
            enabled: true,
            config: config,
            orders: PWAOrders
        };
    }

    // ==========================================================================
    // Export
    // ==========================================================================

    M.utils = M.utils || {};
    M.utils.pwa = M.utils.pwa || {};
    M.utils.pwa.auto = pwaAuto;
    M.utils.pwa.generateServiceWorker = generateServiceWorker;
    M.utils.pwa.generateManifest = generateManifest;
    M.utils.pwa.registerServiceWorker = registerServiceWorker;

    console.log('[mishkah.pwa] Loaded');

})(window);
