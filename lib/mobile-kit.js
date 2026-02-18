/**
 * Mishkah Mobile Kit (AppKit v2)
 * High-fidelity mobile UI kit for schema-first PWAs.
 *
 * Dependencies: mishkah.core.js, mishkah-ui.js, tailwindcss
 */

(function (global) {
  'use strict';

  var M = global.Mishkah;

  if (!M || !M.DSL) {
    console.error('Mishkah Mobile Kit requires mishkah.core.js and mishkah-ui.js');
    return;
  }

  var D = M.DSL;

  // ==========================================================================
  // Utilities
  // ==========================================================================
  var Utils = {
    uuid: function (prefix) {
      return (prefix || 'id') + '-' + Math.random().toString(36).slice(2, 11);
    },
    cls: function () {
      var args = Array.prototype.slice.call(arguments);
      return args.filter(Boolean).join(' ');
    },
    clamp: function (value, min, max) {
      return Math.min(Math.max(value, min), max);
    },
    formatNumber: function (value, locale) {
      try {
        return new Intl.NumberFormat(locale || 'ar-EG').format(value || 0);
      } catch (e) {
        return String(value || 0);
      }
    },
    safeJSON: function (raw, fallback) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return fallback || null;
      }
    }
  };

  // ==========================================================================
  // Base Styles
  // ==========================================================================
  var styleInjected = false;

  function injectBaseStyles() {
    if (styleInjected || !global.document) return;
    styleInjected = true;
    var style = global.document.createElement('style');
    style.setAttribute('data-mishkah-mobile-kit', 'base');
    style.textContent = [
      ':root { --mk-bg: #0b0f1a; --mk-surface: #101726; --mk-surface-2: #182033; --mk-border: rgba(148,163,184,.18);',
      '--mk-text: #e2e8f0; --mk-muted: #94a3b8; --mk-primary: #38bdf8; --mk-primary-weak: rgba(56,189,248,.15);',
      '--mk-positive: #22c55e; --mk-warning: #f59e0b; --mk-danger: #f43f5e; --mk-radius-lg: 22px; --mk-radius-md: 16px; --mk-radius-sm: 12px; }\n',
      ':root[data-mk-theme="light"] { --mk-bg: #f8fafc; --mk-surface: #ffffff; --mk-surface-2: #f1f5f9;',
      '--mk-border: rgba(15,23,42,.12); --mk-text: #0f172a; --mk-muted: #64748b; --mk-primary: #2563eb;',
      '--mk-primary-weak: rgba(37,99,235,.12); }\n',
      'body { background: var(--mk-bg); color: var(--mk-text); }\n',
      '.mk-glass { backdrop-filter: blur(18px); background: color-mix(in srgb, var(--mk-surface) 75%, transparent); }\n',
      '.mk-safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }\n',
      '.mk-safe-top { padding-top: env(safe-area-inset-top, 0px); }\n',
      '.mk-scroll { scrollbar-width: none; }\n',
      '.mk-scroll::-webkit-scrollbar { width: 0; height: 0; }\n',
      '.mk-shadow { box-shadow: 0 20px 45px -35px rgba(15, 23, 42, 0.6); }\n',
      '.mk-gradient { background: radial-gradient(circle at top left, rgba(56,189,248,.15), transparent 45%), radial-gradient(circle at bottom right, rgba(244,63,94,.12), transparent 42%); }\n'
    ].join('');
    global.document.head.appendChild(style);
  }

  // ==========================================================================
  // Theme & Environment
  // ==========================================================================
  function applyEnv(env) {
    if (!global.document) return;
    var root = global.document.documentElement;
    root.setAttribute('lang', env.lang || 'ar');
    root.setAttribute('dir', env.dir || (env.lang === 'ar' ? 'rtl' : 'ltr'));
    root.setAttribute('data-mk-theme', env.theme || 'dark');
  }

  // ==========================================================================
  // State
  // ==========================================================================
  var State = {
    initial: function (config) {
      var lang = (config && config.lang) || 'ar';
      var theme = (config && config.theme) || 'dark';
      var env = {
        theme: theme,
        lang: lang,
        dir: lang === 'ar' ? 'rtl' : 'ltr',
        view: (config && config.homeView) || 'home',
        history: [],
        modal: null,
        sheet: null,
        toast: null,
        installPrompt: null,
        params: {}
      };
      if (config && config.env && typeof config.env === 'object') {
        Object.keys(config.env).forEach(function (key) {
          env[key] = config.env[key];
        });
      }
      return {
        env: env,
        data: (config && config.data) || {},
        i18n: (config && config.i18n) || { dict: {} }
      };
    }
  };

  // ==========================================================================
  // Location & PWA Services
  // ==========================================================================
  var LocationService = {
    getCurrent: function (opts) {
      return new Promise(function (resolve, reject) {
        if (!global.navigator || !global.navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        global.navigator.geolocation.getCurrentPosition(resolve, reject, opts || { enableHighAccuracy: true, timeout: 15000 });
      });
    },
    reverseGeocodeGoogle: async function (lat, lng, apiKey) {
      if (!apiKey) return null;
      var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + lat + ',' + lng + '&key=' + apiKey + '&language=ar';
      var res = await fetch(url);
      if (!res.ok) return null;
      var payload = await res.json();
      var first = payload && payload.results && payload.results[0];
      return first ? first.formatted_address : null;
    },
    resolveLabel: async function (coords, config) {
      if (!coords) return null;
      var key = config && config.googleApiKey;
      var label = await LocationService.reverseGeocodeGoogle(coords.latitude, coords.longitude, key);
      return label || (coords.latitude.toFixed(4) + ', ' + coords.longitude.toFixed(4));
    }
  };

  var PWAService = {
    watchInstallPrompt: function (handler) {
      if (!global.window) return;
      global.window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        if (handler) handler(e);
      });
    },
    promptInstall: async function (promptEvent) {
      if (!promptEvent) return null;
      promptEvent.prompt();
      var choice = await promptEvent.userChoice;
      return choice && choice.outcome;
    },
    registerServiceWorker: function (path) {
      if (!global.navigator || !global.navigator.serviceWorker) return;
      global.navigator.serviceWorker.register(path || '/service-worker.js').catch(function () { });
    }
  };

  // ==========================================================================
  // Core Orders
  // ==========================================================================
  var CoreOrders = {
    'nav:go': {
      handler: function (e, ctx) {
        var target = e.target.closest('[data-view]');
        var view = target ? target.getAttribute('data-view') : null;
        if (!view) return;
        ctx.setState(function (prev) {
          var s = Object.assign({}, prev);
          s.env.history.push(s.env.view);
          s.env.view = view;
          s.env.params = Utils.safeJSON(target.getAttribute('data-params'), {}) || {};
          return s;
        });
      }
    },
    'nav:back': {
      on: ['click'],
      gkeys: ['nav:back'],
      handler: function (e, ctx) {
        ctx.setState(function (prev) {
          var s = Object.assign({}, prev);
          if (s.env.history.length > 0) {
            s.env.view = s.env.history.pop();
          }
          return s;
        });
      }
    },
    'app:toggle-theme': {
      on: ['click'],
      gkeys: ['app:toggle-theme'],
      handler: function (e, ctx) {
        ctx.setState(function (prev) {
          var s = Object.assign({}, prev);
          s.env.theme = s.env.theme === 'light' ? 'dark' : 'light';
          return s;
        });
      }
    },
    'app:toggle-lang': {
      on: ['click'],
      gkeys: ['app:toggle-lang'],
      handler: function (e, ctx) {
        ctx.setState(function (prev) {
          var s = Object.assign({}, prev);
          s.env.lang = s.env.lang === 'ar' ? 'en' : 'ar';
          s.env.dir = s.env.lang === 'ar' ? 'rtl' : 'ltr';
          return s;
        });
      }
    },
    'modal:close': {
      on: ['click'],
      gkeys: ['modal:close'],
      handler: function (e, ctx) {
        ctx.setState(function (prev) {
          var s = Object.assign({}, prev);
          s.env.modal = null;
          return s;
        });
      }
    },
    'sheet:close': {
      on: ['click'],
      gkeys: ['sheet:close'],
      handler: function (e, ctx) {
        ctx.setState(function (prev) {
          var s = Object.assign({}, prev);
          s.env.sheet = null;
          return s;
        });
      }
    },
    'toast:hide': {
      on: ['click'],
      gkeys: ['toast:hide'],
      handler: function (e, ctx) {
        ctx.setState(function (prev) {
          var s = Object.assign({}, prev);
          s.env.toast = null;
          return s;
        });
      }
    }
  };

  // ==========================================================================
  // UI Components
  // ==========================================================================
  var UI = {
    Shell: function (props, children) {
      return D.Div({
        attrs: {
          class: Utils.cls(
            'flex flex-col h-screen w-full overflow-hidden mk-gradient',
            'bg-[var(--mk-bg)] text-[var(--mk-text)]',
            props && props.class
          )
        }
      }, [
        props && props.header ? props.header : null,
        D.Main({
          attrs: {
            class: Utils.cls('flex-1 relative overflow-y-auto overflow-x-hidden mk-scroll', props && props.mainClass)
          }
        }, children || (props && props.children)),
        props && props.nav ? props.nav : null
      ]);
    },

    Header: function (props) {
      var backBtn = props && props.back
        ? D.Button({
          attrs: {
            gkey: 'nav:back',
            class: 'p-2 -ml-2 rounded-full hover:bg-[var(--mk-primary-weak)] active:scale-95 transition-all text-xl'
          }
        }, ['←'])
        : null;

      return D.Header({
        attrs: {
          class: Utils.cls(
            'sticky top-0 z-40 flex items-center justify-between px-4 py-4 mk-safe-top',
            'border-b border-[var(--mk-border)] mk-glass',
            props && props.class
          )
        }
      }, [
        D.Div({ attrs: { class: 'flex items-center gap-3 min-w-0' } }, [
          backBtn,
          D.Div({ attrs: { class: 'flex flex-col min-w-0' } }, [
            D.H1({ attrs: { class: 'text-lg font-bold truncate' } }, [props && props.title ? props.title : '']),
            props && props.subtitle ? D.Span({ attrs: { class: 'text-xs text-[var(--mk-muted)] truncate' } }, [props.subtitle]) : null
          ])
        ]),
        D.Div({ attrs: { class: 'flex items-center gap-2' } }, (props && props.actions) || [])
      ]);
    },

    TabBar: function (props) {
      var items = (props && props.items) || [];
      return D.Nav({
        attrs: {
          class: Utils.cls('flex items-center justify-around px-2 py-2 mk-safe-bottom', 'bg-[var(--mk-surface)] border-t border-[var(--mk-border)]')
        }
      }, items.map(function (item) {
        var isActive = props && props.activeId === item.id;
        var baseClass = 'flex flex-col items-center justify-center px-3 py-2 rounded-2xl transition-all duration-200';
        var activeClass = isActive
          ? 'text-[var(--mk-primary)] bg-[var(--mk-primary-weak)]'
          : 'text-[var(--mk-muted)] hover:text-[var(--mk-text)]';
        return D.Button({
          attrs: {
            class: Utils.cls(baseClass, activeClass),
            'data-view': item.to,
            gkey: 'nav:go'
          }
        }, [
          D.Span({ attrs: { class: 'text-xl mb-0.5' } }, [item.icon || '●']),
          D.Span({ attrs: { class: 'text-[11px] font-semibold' } }, [item.label || item.id])
        ]);
      }));
    },

    SideDrawer: function (props) {
      if (!props || !props.open) return D.Div({ attrs: { class: 'hidden' } }, []);
      return D.Div({
        attrs: { class: 'fixed inset-0 z-50 flex' }
      }, [
        D.Div({
          attrs: { class: 'absolute inset-0 bg-black/50', gkey: props.onClose || 'sheet:close' }
        }),
        D.Div({
          attrs: {
            class: Utils.cls('relative w-72 max-w-[85vw] h-full bg-[var(--mk-surface)] border-r border-[var(--mk-border)]', props.class)
          }
        }, props.children || [])
      ]);
    },

    Card: function (props, children) {
      return D.Div({
        attrs: {
          class: Utils.cls('bg-[var(--mk-surface)] rounded-[var(--mk-radius-lg)] p-4 border border-[var(--mk-border)] mk-shadow', props && props.class)
        }
      }, children || (props && props.children));
    },

    Section: function (props, children) {
      return D.Section({
        attrs: { class: Utils.cls('px-4 py-4', props && props.class) }
      }, [
        props && props.title
          ? D.Div({ attrs: { class: 'flex items-center justify-between mb-3' } }, [
            D.H3({ attrs: { class: 'text-base font-semibold' } }, [props.title]),
            props && props.action ? props.action : null
          ])
          : null,
        D.Div({}, children || (props && props.children))
      ]);
    },

    ListItem: function (props) {
      return D.Div({
        attrs: {
          class: Utils.cls('flex items-center gap-3 p-3 rounded-[var(--mk-radius-md)] hover:bg-[var(--mk-surface-2)] transition-colors cursor-pointer', props && props.class),
          gkey: props && props.gkey,
          'data-id': props && props.id
        }
      }, [
        props && props.icon ? D.Div({ attrs: { class: 'text-2xl opacity-70' } }, [props.icon]) : null,
        D.Div({ attrs: { class: 'flex-1 min-w-0' } }, [
          D.Div({ attrs: { class: 'font-medium truncate' } }, [props && props.title ? props.title : '']),
          props && props.subtitle ? D.Div({ attrs: { class: 'text-sm text-[var(--mk-muted)] truncate' } }, [props.subtitle]) : null
        ]),
        props && props.action ? D.Div({}, [props.action]) : null
      ]);
    },

    Badge: function (props) {
      return D.Span({
        attrs: {
          class: Utils.cls('inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold', props && props.class)
        }
      }, [props && props.label ? props.label : '']);
    },

    Chip: function (props) {
      return D.Span({
        attrs: {
          class: Utils.cls('inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border border-[var(--mk-border)] bg-[var(--mk-surface-2)]', props && props.class)
        }
      }, [props && props.label ? props.label : '']);
    },

    Avatar: function (props) {
      var initials = (props && props.name ? props.name.split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('') : '•');
      return D.Div({
        attrs: {
          class: Utils.cls('flex items-center justify-center rounded-full bg-[var(--mk-primary-weak)] text-[var(--mk-primary)] font-bold', props && props.class || 'h-10 w-10')
        }
      }, [initials]);
    },

    Input: function (props) {
      var extra = (props && props.attrs) || {};
      var attrs = {
        type: props && props.type || 'text',
        placeholder: props && props.placeholder,
        value: props && props.value,
        class: Utils.cls('px-4 py-3 rounded-[var(--mk-radius-md)] bg-[var(--mk-surface)] border border-[var(--mk-border)] outline-none focus:ring-2 focus:ring-[var(--mk-primary)]/40', props && props.class),
        'data-m-key': props && props.key
      };
      for (var key in extra) attrs[key] = extra[key];
      return D.Div({ attrs: { class: Utils.cls('flex flex-col gap-2', props && props.wrapperClass) } }, [
        props && props.label ? D.Label({ attrs: { class: 'text-xs text-[var(--mk-muted)]' } }, [props.label]) : null,
        D.Input({
          attrs: attrs
        })
      ]);
    },

    Button: function (props, children) {
      return D.Button({
        attrs: {
          class: Utils.cls('px-4 py-3 rounded-[var(--mk-radius-md)] font-semibold transition-all active:scale-95', props && props.class),
          gkey: props && props.gkey,
          type: props && props.type
        }
      }, children || (props && props.children));
    },

    InstallBanner: function (props) {
      if (!props || !props.visible) return null;
      return UI.Card({ class: 'mx-4 my-3' }, [
        D.Div({ attrs: { class: 'flex items-start justify-between gap-3' } }, [
          D.Div({}, [
            D.H4({ attrs: { class: 'font-semibold' } }, [props.title || 'ثبت التطبيق']),
            D.P({ attrs: { class: 'text-sm text-[var(--mk-muted)]' } }, [props.subtitle || 'احصل على تجربة تطبيق كاملة على موبايلك.'])
          ]),
          D.Button({
            attrs: {
              class: 'text-sm text-[var(--mk-muted)] px-2 py-1 rounded-full hover:bg-[var(--mk-surface-2)]',
              gkey: props.closeKey || 'pwa:dismiss'
            }
          }, ['✕'])
        ]),
        D.Div({ attrs: { class: 'mt-3' } }, [
          UI.Button({
            class: 'w-full bg-[var(--mk-primary)] text-white',
            gkey: props.gkey || 'pwa:install'
          }, [props.actionLabel || 'تثبيت'])
        ])
      ]);
    },

    StoryStrip: function (props) {
      var items = (props && props.items) || [];
      return D.Div({
        attrs: { class: 'flex items-center gap-3 overflow-x-auto mk-scroll px-4' }
      }, items.map(function (item) {
        return D.Div({
          attrs: {
            class: 'flex flex-col items-center gap-2 min-w-[64px]'
          }
        }, [
          D.Div({
            attrs: {
              class: 'h-16 w-16 rounded-full p-[2px] bg-gradient-to-tr from-sky-400 via-indigo-500 to-fuchsia-500'
            }
          }, [
            D.Div({
              attrs: {
                class: 'h-full w-full rounded-full bg-[var(--mk-surface)] flex items-center justify-center text-xs font-semibold'
              }
            }, [item.label || '...'])
          ]),
          D.Span({ attrs: { class: 'text-[11px] text-[var(--mk-muted)]' } }, [item.label || ''])
        ]);
      }));
    },

    ReelCard: function (props) {
      var reel = props && props.reel;
      if (!reel) return null;
      var mediaUrls = reel.mediaUrls || [];
      var cover = reel.coverUrl || reel.mediaUrl || mediaUrls[0] || '';
      var counter = mediaUrls.length > 1 ? mediaUrls.length : 0;
      return D.Div({
        attrs: {
          class: 'relative rounded-[var(--mk-radius-lg)] overflow-hidden bg-[var(--mk-surface)] border border-[var(--mk-border)]'
        }
      }, [
        D.Div({
          attrs: {
            class: 'h-72 w-full bg-cover bg-center',
            style: 'background-image: url(' + cover + ')'
          }
        }),
        D.Div({ attrs: { class: 'absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent' } }),
        counter
          ? D.Div({ attrs: { class: 'absolute top-3 right-3 px-2 py-1 rounded-full text-xs bg-black/60 text-white' } }, ['+' + counter])
          : null,
        D.Div({ attrs: { class: 'absolute bottom-0 left-0 right-0 p-4 text-white' } }, [
          D.Div({ attrs: { class: 'text-sm font-semibold truncate' } }, [reel.title || 'Reel']),
          D.Div({ attrs: { class: 'text-xs opacity-80 flex items-center gap-2 mt-2' } }, [
            D.Span({}, ['❤ ' + (reel.stats && reel.stats.likes || 0)]),
            D.Span({}, ['💬 ' + (reel.stats && reel.stats.comments || 0)])
          ])
        ])
      ]);
    },

    FeedCard: function (props) {
      var post = props && props.post;
      if (!post) return null;
      var mediaUrls = post.mediaUrls || [];
      if ((!mediaUrls || !mediaUrls.length) && post.mediaUrl) {
        mediaUrls = [post.mediaUrl];
      }
      return UI.Card({ class: 'p-0 overflow-hidden' }, [
        mediaUrls.length
          ? D.Div({ attrs: { class: 'flex gap-3 overflow-x-auto mk-scroll px-4 pt-4' } }, mediaUrls.map(function (url) {
            return D.Div({
              attrs: { class: 'min-w-[240px] h-52 rounded-[var(--mk-radius-md)] bg-cover bg-center', style: 'background-image: url(' + url + ')' }
            });
          }))
          : null,
        D.Div({ attrs: { class: 'p-4' } }, [
          D.Div({ attrs: { class: 'flex items-center gap-3 mb-3' } }, [
            UI.Avatar({ name: post.author || '...' }),
            D.Div({}, [
              D.Div({ attrs: { class: 'font-semibold' } }, [post.author || '']),
              D.Div({ attrs: { class: 'text-xs text-[var(--mk-muted)]' } }, [post.date || ''])
            ])
          ]),
          D.P({ attrs: { class: 'text-sm leading-relaxed' } }, [post.caption || '']),
          D.Div({ attrs: { class: 'flex items-center gap-4 mt-4 text-sm text-[var(--mk-muted)]' } }, [
            D.Span({}, ['❤ ' + (post.likes || 0)]),
            D.Span({}, ['💬 ' + (post.comments || 0)]),
            D.Span({}, ['↗ مشاركة'])
          ])
        ])
      ]);
    },

    Modal: function (props, children) {
      if (!props || !props.open) return D.Div({ attrs: { class: 'hidden' } }, []);
      return D.Div({
        attrs: { class: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm' }
      }, [
        D.Div({
          attrs: {
            class: 'bg-[var(--mk-surface)] w-full max-w-sm rounded-[var(--mk-radius-lg)] shadow-2xl overflow-hidden border border-[var(--mk-border)] relative'
          }
        }, [
          D.Div({ attrs: { class: 'p-4 border-b border-[var(--mk-border)] flex justify-between items-center' } }, [
            D.H3({ attrs: { class: 'font-bold text-lg' } }, [props.title || '']),
            D.Button({ attrs: { class: 'p-1 rounded-full hover:bg-[var(--mk-surface-2)]', gkey: props.onClose || 'modal:close' } }, ['✕'])
          ]),
          D.Div({ attrs: { class: 'p-4 max-h-[60vh] overflow-y-auto mk-scroll' } }, children || [])
        ])
      ]);
    },

    Sheet: function (props, children) {
      if (!props || !props.open) return D.Div({ attrs: { class: 'hidden' } }, []);
      return D.Div({ attrs: { class: 'fixed inset-0 z-50 flex justify-center items-end bg-black/50' } }, [
        D.Div({ attrs: { class: 'absolute inset-0', gkey: props.onClose || 'sheet:close' } }),
        D.Div({
          attrs: {
            class: 'bg-[var(--mk-surface)] w-full max-w-md rounded-t-[28px] shadow-[0_-5px_20px_rgba(0,0,0,0.2)] border-t border-[var(--mk-border)]'
          }
        }, [
          D.Div({ attrs: { class: 'w-full flex justify-center pt-3 pb-1' } }, [
            D.Div({ attrs: { class: 'w-12 h-1.5 bg-[var(--mk-border)] rounded-full' } })
          ]),
          D.Div({ attrs: { class: 'p-5 max-h-[80vh] overflow-y-auto mk-scroll' } }, children || [])
        ])
      ]);
    },

    PullToRefresh: function (props, children) {
      var onRefresh = props && props.onRefresh;
      var threshold = (props && props.threshold) || 80;

      return D.Div({
        attrs: {
          class: Utils.cls('relative overflow-hidden', props && props.class),
          'data-pull-refresh': 'true',
          'data-threshold': threshold
        },
        events: {
          touchstart: function (e) {
            var el = e.currentTarget;
            var touch = e.touches[0];
            el.dataset.startY = touch.clientY;
            el.dataset.currentY = touch.clientY;
          },
          touchmove: function (e) {
            var el = e.currentTarget;
            if (el.scrollTop > 0) return;

            var touch = e.touches[0];
            var startY = parseFloat(el.dataset.startY || 0);
            var currentY = touch.clientY;
            var diff = currentY - startY;

            if (diff > 0) {
              e.preventDefault();
              var indicator = el.querySelector('[data-refresh-indicator]');
              if (indicator) {
                var progress = Math.min(diff / threshold, 1);
                indicator.style.transform = 'translateY(' + (diff * 0.5) + 'px) rotate(' + (progress * 360) + 'deg)';
                indicator.style.opacity = progress;
              }
            }
          },
          touchend: function (e) {
            var el = e.currentTarget;
            var startY = parseFloat(el.dataset.startY || 0);
            var currentY = parseFloat(el.dataset.currentY || 0);
            var diff = currentY - startY;

            var indicator = el.querySelector('[data-refresh-indicator]');
            if (indicator) {
              indicator.style.transform = '';
              indicator.style.opacity = '0';
            }

            if (diff > threshold && onRefresh) {
              onRefresh();
            }
          }
        }
      }, [
        D.Div({
          attrs: {
            'data-refresh-indicator': 'true',
            class: 'absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 flex items-center justify-center text-[var(--mk-primary)] opacity-0 transition-opacity z-50',
            style: 'transform-origin: center;'
          }
        }, ['↻']),
        D.Div({ attrs: { class: 'min-h-full' } }, children || (props && props.children))
      ]);
    },

    BottomSheet: function (props, children) {
      if (!props || !props.open) return D.Div({ attrs: { class: 'hidden' } }, []);

      var height = (props && props.height) || 'auto';
      var maxHeight = (props && props.maxHeight) || '85vh';

      return D.Div({
        attrs: {
          class: 'fixed inset-0 z-50 flex justify-center items-end',
          'data-sheet-backdrop': 'true'
        }
      }, [
        D.Div({
          attrs: {
            class: 'absolute inset-0 bg-black/50 backdrop-blur-sm',
            gkey: props.onClose || 'sheet:close'
          }
        }),
        D.Div({
          attrs: {
            class: 'bg-[var(--mk-surface)] w-full rounded-t-[28px] shadow-[0_-5px_20px_rgba(0,0,0,0.2)] border-t border-[var(--mk-border)] animate-slide-up',
            style: 'max-height: ' + maxHeight + '; height: ' + height + ';',
            'data-sheet-content': 'true'
          }
        }, [
          D.Div({ attrs: { class: 'w-full flex justify-center pt-3 pb-1' } }, [
            D.Div({ attrs: { class: 'w-12 h-1.5 bg-[var(--mk-border)] rounded-full' } })
          ]),
          D.Div({
            attrs: {
              class: 'overflow-y-auto mk-scroll',
              style: 'max-height: calc(' + maxHeight + ' - 40px);'
            }
          }, [
            D.Div({ attrs: { class: 'p-5' } }, children || [])
          ])
        ])
      ]);
    },

    ActionSheet: function (props) {
      if (!props || !props.open) return D.Div({ attrs: { class: 'hidden' } }, []);

      var actions = (props && props.actions) || [];
      var title = props && props.title;

      return UI.BottomSheet({
        open: true,
        onClose: props.onClose || 'sheet:close',
        height: 'auto'
      }, [
        title ? D.H3({ attrs: { class: 'text-lg font-bold mb-4 px-2' } }, [title]) : null,
        D.Div({ attrs: { class: 'space-y-1' } }, actions.map(function (action) {
          var isDanger = action.variant === 'danger';
          var isCancel = action.variant === 'cancel';

          return D.Button({
            attrs: {
              class: Utils.cls(
                'w-full text-left px-4 py-4 rounded-[var(--mk-radius-md)] transition-colors font-medium',
                isDanger ? 'text-red-500 hover:bg-red-500/10' : '',
                isCancel ? 'text-[var(--mk-muted)] hover:bg-[var(--mk-surface-2)]' : '',
                !isDanger && !isCancel ? 'text-[var(--mk-text)] hover:bg-[var(--mk-surface-2)]' : ''
              ),
              gkey: action.gkey
            }
          }, [
            action.icon ? D.Span({ attrs: { class: 'mr-3 text-xl' } }, [action.icon]) : null,
            action.label || ''
          ]);
        }))
      ]);
    },

    FloatingActionButton: function (props) {
      return D.Button({
        attrs: {
          class: Utils.cls(
            'fixed bottom-20 right-6 z-40 w-14 h-14 rounded-full shadow-lg',
            'bg-[var(--mk-primary)] text-white flex items-center justify-center',
            'active:scale-95 transition-transform hover:shadow-xl',
            'mk-safe-bottom',
            props && props.class
          ),
          gkey: props && props.gkey,
          'aria-label': props && props.label
        }
      }, [
        D.Span({ attrs: { class: 'text-2xl' } }, [props && props.icon ? props.icon : '+']),
        props && props.badge ? D.Span({
          attrs: {
            class: 'absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold'
          }
        }, [props.badge]) : null
      ]);
    },

    SnackBar: function (props) {
      if (!props || !props.visible) return D.Div({ attrs: { class: 'hidden' } }, []);

      var variant = (props && props.variant) || 'default';
      var duration = (props && props.duration) || 3000;

      var bgColors = {
        default: 'bg-[var(--mk-surface)]',
        success: 'bg-[var(--mk-positive)]',
        error: 'bg-[var(--mk-danger)]',
        warning: 'bg-[var(--mk-warning)]',
        info: 'bg-[var(--mk-primary)]'
      };

      return D.Div({
        attrs: {
          class: Utils.cls(
            'fixed bottom-20 left-4 right-4 z-50 mk-safe-bottom',
            'rounded-[var(--mk-radius-md)] shadow-lg p-4',
            'flex items-center justify-between gap-3',
            'animate-slide-up text-white',
            bgColors[variant] || bgColors.default,
            props.class
          ),
          'data-snackbar': 'true'
        }
      }, [
        D.Div({ attrs: { class: 'flex items-center gap-3 flex-1' } }, [
          props.icon ? D.Span({ attrs: { class: 'text-xl' } }, [props.icon]) : null,
          D.Span({ attrs: { class: 'text-sm font-medium' } }, [props.message || ''])
        ]),
        props.action ? D.Button({
          attrs: {
            class: 'text-sm font-bold px-3 py-1 rounded-full hover:bg-white/20 transition-colors',
            gkey: props.action.gkey
          }
        }, [props.action.label || 'Action']) : null,
        D.Button({
          attrs: {
            class: 'text-xl opacity-70 hover:opacity-100 w-8 h-8 flex items-center justify-center',
            gkey: props.onClose || 'toast:hide'
          }
        }, ['×'])
      ]);
    },

    SearchBar: function (props) {
      var value = (props && props.value) || '';
      var placeholder = (props && props.placeholder) || 'Search...';

      return D.Div({
        attrs: {
          class: Utils.cls('relative flex items-center', props && props.wrapperClass)
        }
      }, [
        D.Div({
          attrs: {
            class: 'absolute left-4 text-[var(--mk-muted)] pointer-events-none'
          }
        }, ['🔍']),
        D.Input({
          attrs: {
            type: 'search',
            value: value,
            placeholder: placeholder,
            class: Utils.cls(
              'w-full pl-12 pr-12 py-3 rounded-full',
              'bg-[var(--mk-surface-2)] border border-[var(--mk-border)]',
              'outline-none focus:ring-2 focus:ring-[var(--mk-primary)]/40',
              'transition-all',
              props && props.class
            ),
            'data-field': props && props.field,
            gkey: props && props.gkey
          }
        }),
        value ? D.Button({
          attrs: {
            class: 'absolute right-4 w-6 h-6 flex items-center justify-center text-[var(--mk-muted)] hover:text-[var(--mk-text)]',
            gkey: props && props.onClear
          }
        }, ['×']) : null
      ]);
    },

    Skeleton: function (props) {
      var variant = (props && props.variant) || 'text';
      var count = (props && props.count) || 1;

      var baseClass = 'bg-gradient-to-r from-[var(--mk-surface-2)] via-[var(--mk-border)] to-[var(--mk-surface-2)] bg-[length:200%_100%] animate-shimmer';

      var variants = {
        text: 'h-4 w-full rounded',
        title: 'h-6 w-3/4 rounded',
        avatar: 'h-12 w-12 rounded-full',
        card: 'h-32 w-full rounded-[var(--mk-radius-lg)]',
        button: 'h-10 w-24 rounded-[var(--mk-radius-md)]'
      };

      var items = [];
      for (var i = 0; i < count; i++) {
        items.push(
          D.Div({
            attrs: {
              class: Utils.cls(baseClass, variants[variant] || variants.text, props && props.class),
              'aria-hidden': 'true'
            }
          })
        );
      }

      return D.Div({
        attrs: { class: Utils.cls('space-y-3', props && props.wrapperClass) }
      }, items);
    },

    Divider: function (props) {
      return D.Div({
        attrs: {
          class: Utils.cls('h-px bg-[var(--mk-border)] my-4', props && props.class)
        }
      });
    },

    EmptyState: function (props) {
      return D.Div({
        attrs: {
          class: Utils.cls('flex flex-col items-center justify-center py-12 px-4 text-center', props && props.class)
        }
      }, [
        props && props.icon ? D.Div({ attrs: { class: 'text-6xl mb-4 opacity-50' } }, [props.icon]) : null,
        props && props.title ? D.H3({ attrs: { class: 'text-lg font-semibold mb-2' } }, [props.title]) : null,
        props && props.description ? D.P({ attrs: { class: 'text-[var(--mk-muted)] text-sm mb-4' } }, [props.description]) : null,
        props && props.action ? UI.Button({
          class: 'bg-[var(--mk-primary)] text-white',
          gkey: props.action.gkey
        }, [props.action.label]) : null
      ]);
    }
  };

  // ==========================================================================
  // Enhanced Utilities with Gesture Support
  // ==========================================================================
  Utils.viewport = function () {
    return {
      width: global.innerWidth || 0,
      height: global.innerHeight || 0,
      isMobile: (global.innerWidth || 0) < 768,
      isTablet: (global.innerWidth || 0) >= 768 && (global.innerWidth || 0) < 1024,
      isDesktop: (global.innerWidth || 0) >= 1024
    };
  };

  Utils.isMobile = function () {
    try {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(global.navigator.userAgent);
    } catch (e) {
      return false;
    }
  };

  Utils.isStandalone = function () {
    try {
      return (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) || !!global.navigator.standalone;
    } catch (e) {
      return false;
    }
  };

  Utils.haptic = function (type) {
    if (!global.navigator || !global.navigator.vibrate) return;
    var patterns = {
      light: 10,
      medium: 20,
      heavy: 30,
      success: [10, 50, 10],
      error: [10, 50, 10, 50, 10],
      warning: [20, 100, 20]
    };
    var pattern = patterns[type] || patterns.light;
    global.navigator.vibrate(pattern);
  };

  // Enhanced base styles with animations
  function injectBaseStyles() {
    if (styleInjected || !global.document) return;
    styleInjected = true;
    var style = global.document.createElement('style');
    style.setAttribute('data-mishkah-mobile-kit', 'base');
    style.textContent = [
      ':root { --mk-bg: #0b0f1a; --mk-surface: #101726; --mk-surface-2: #182033; --mk-border: rgba(148,163,184,.18);',
      '--mk-text: #e2e8f0; --mk-muted: #94a3b8; --mk-primary: #38bdf8; --mk-primary-weak: rgba(56,189,248,.15);',
      '--mk-positive: #22c55e; --mk-warning: #f59e0b; --mk-danger: #f43f5e; --mk-radius-lg: 22px; --mk-radius-md: 16px; --mk-radius-sm: 12px; }\\n',
      ':root[data-mk-theme="light"] { --mk-bg: #f8fafc; --mk-surface: #ffffff; --mk-surface-2: #f1f5f9;',
      '--mk-border: rgba(15,23,42,.12); --mk-text: #0f172a; --mk-muted: #64748b; --mk-primary: #2563eb;',
      '--mk-primary-weak: rgba(37,99,235,.12); }\\n',
      'body { background: var(--mk-bg); color: var(--mk-text); }\\n',
      '.mk-glass { backdrop-filter: blur(18px); background: color-mix(in srgb, var(--mk-surface) 75%, transparent); }\\n',
      '.mk-safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }\\n',
      '.mk-safe-top { padding-top: env(safe-area-inset-top, 0px); }\\n',
      '.mk-scroll { scrollbar-width: none; }\\n',
      '.mk-scroll::-webkit-scrollbar { width: 0; height: 0; }\\n',
      '.mk-shadow { box-shadow: 0 20px 45px -35px rgba(15, 23, 42, 0.6); }\\n',
      '.mk-gradient { background: radial-gradient(circle at top left, rgba(56,189,248,.15), transparent 45%), radial-gradient(circle at bottom right, rgba(244,63,94,.12), transparent 42%); }\\n',
      '@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }\\n',
      '.animate-shimmer { animation: shimmer 2s ease-in-out infinite; }\\n',
      '@keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }\\n',
      '.animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1); }\\n',
      '@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }\\n',
      '.animate-fade-in { animation: fade-in 0.2s ease-in-out; }\\n',
      '* { -webkit-tap-highlight-color: transparent; }\\n',
      'button, a, [role="button"] { min-width: 44px; min-height: 44px; }\\n'
    ].join('');
    global.document.head.appendChild(style);
  }

  // Update injectBaseStyles call location
  var styleInjected = false;

  // ==========================================================================
  // AppKit API
  // ==========================================================================
  var AppKit = {
    create: function (config) {
      config = config || {};

      injectBaseStyles();

      var db = State.initial(config);
      var userOrders = config.orders || {};
      var orders = Object.assign({}, CoreOrders, userOrders);

      if (config.body) {
        M.app.setBody(function (db, dsl) {
          if (db && db.env) applyEnv(db.env);
          return config.body(db, dsl);
        });
      } else {
        console.warn('[AppKit] No body function provided in config.');
      }

      var app = M.app.create(db, orders);

      if (config.mount) {
        app.mount(config.mount);
      }

      return app;
    },

    defineSchema: function (schema) {
      return schema;
    },

    UI: UI,
    Utils: Utils,
    Location: LocationService,
    PWA: PWAService
  };

  global.AppKit = AppKit;
})(window);
