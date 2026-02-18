(function (w) {
  'use strict';

  if (w.MishkahDashboard) return;

  const M = w.Mishkah;
  const U = M.utils;
  const UI = M.UI;
  const h = M.DSL;
  const { tw, cx, token, def } = U.twcss;

  /* =========================================================================
     1. Dashboard Tokens & Styles - MODERN GLASSMORPHISM
     ========================================================================= */
  def({
    'dash/shell': 'flex h-screen w-full overflow-hidden bg-[var(--background)]',
    'dash/sidebar': 'hidden md:flex flex-col w-64 border-e border-[var(--border)] bg-[var(--surface-1)] shadow-2xl',
    'dash/sidebar-mobile': 'fixed inset-y-0 z-50 flex flex-col w-72 bg-[var(--surface-1)] border-e border-[var(--border)] shadow-2xl transition-transform duration-300 ease-in-out',
    'dash/main': 'flex-1 flex flex-col h-full overflow-hidden relative',
    'dash/header': 'flex items-center justify-between h-16 px-6 border-b border-[var(--border)] bg-[var(--surface-0)]/80 backdrop-blur-md top-0 z-20',
    'dash/content': 'flex-1 overflow-y-auto p-6 scroll-smooth',
    'dash/nav-item': 'group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-[var(--foreground)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-all duration-200',
    'dash/nav-item-active': 'bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/40 shadow-lg shadow-[var(--primary)]/20 font-semibold',
    'dash/card-glass': 'backdrop-blur-xl bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl hover:shadow-2xl hover:border-[var(--primary)]/30 transition-all duration-300'
  });

  /* =========================================================================
     2. Components
     ========================================================================= */

  function Shell(props) {
    const { sidebarProps, header, content, mobileOpen, toggleGkey, sidebarMini } = props;

    // Instantiate Sidebar twice to avoid VNode duplication issues in DOM
    const sidebarMobile = Sidebar({ ...sidebarProps, mini: false }); // Mobile always full width
    const sidebarDesktop = Sidebar({ ...sidebarProps, mini: sidebarMini }); // Desktop respects mini state

    const overlay = mobileOpen
      ? h.div({
        attrs: {
          class: tw`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden`,
          gkey: toggleGkey
        }
      }, [])
      : null;

    const mobileAside = h.aside({
      attrs: {
        class: tw(cx(token('dash/sidebar-mobile'), mobileOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'))
      }
    }, [sidebarMobile]);

    // Dynamic desktop sidebar width
    const baseSidebar = token('dash/sidebar');
    const widthClass = sidebarMini ? 'w-20' : 'w-64';
    const desktopClass = baseSidebar.replace('w-64', '') + ` ${widthClass} transition-all duration-300 ease-in-out`;

    const desktopAside = h.aside({
      attrs: { class: tw(desktopClass) }
    }, [sidebarDesktop]);

    // Inject Toggle Button into Header if not present
    // Or better: Pass toggle button as part of the header "start" slot?
    // Since 'header' prop is likely a VNode, modifying it is hard.
    // But the user asked for the toggle button in the header "next to the title".
    // We can assume Dash.Header is used and modify Dash.Header to accept toggleGkey/mini state?
    // Let's modify Dash.Header definition below instead.

    return h.div({ attrs: { class: tw`dash/shell` } }, [
      overlay,
      mobileAside,
      desktopAside,
      h.div({ attrs: { class: tw`dash/main` } }, [
        header,
        h.main({ attrs: { class: tw`dash/content` } }, [content])
      ])
    ]);
  }

  function Sidebar(props) {
    const { brand, user, links, mini } = props;

    const brandArea = h.div({ attrs: { class: tw`h-16 flex items-center ${mini ? 'justify-center' : 'px-6 gap-3'} border-b border-[var(--border)]` } }, [
      brand.logo ? h.img({ attrs: { src: brand.logo, class: tw`w-8 h-8 rounded-lg` } }) : null,
      !mini ? h.span({ attrs: { class: tw`font-bold text-xl tracking-tight` } }, [brand.name]) : null
    ]);

    const renderLink = (link) => {
      const activeClass = link.active
        ? 'bg-[var(--surface-2)] text-[var(--primary)] ring-1 ring-[var(--border)] shadow-sm'
        : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-1)] hover:text-[var(--foreground)]';

      return h.button({
        attrs: {
          class: tw`group flex items-center ${mini ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 text-sm font-medium rounded-xl w-full transition-all duration-200 ${activeClass}`,
          title: mini ? link.label : ''
        },
        gkey: link.gkey
      }, [
        link.icon ? h.span({ attrs: { class: tw`text-xl transition-transform group-hover:scale-110 ${link.active ? 'opacity-100' : 'opacity-80'}` } }, [link.icon]) : null,
        !mini ? h.span({ attrs: { class: tw`whitespace-nowrap opacity-100 transition-opacity duration-200` } }, [link.label]) : null,
        // Active indicator dot - ONLY if not mini and active (optional, current user didn't want it, keeping removed)
        // !mini && link.active ? h.div({ attrs: { class: tw`ml-auto w-1.5 h-1.5 rounded-full bg-[var(--primary)]` } }) : null
      ]);
    };

    const navArea = h.nav({ attrs: { class: tw`flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide` } },
      (links || []).map(renderLink)
    );

    const userArea = user ? h.div({ attrs: { class: tw`p-4 border-t border-[var(--border)] bg-[var(--surface-2)]` } }, [
      h.div({ attrs: { class: tw`flex items-center ${mini ? 'justify-center' : 'gap-3'}` } }, [
        h.div({ attrs: { class: tw`w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center font-bold text-white shadow-lg overflow-hidden shrink-0` } }, [
          user.avatar
            ? h.img({ attrs: { src: user.avatar, class: 'w-full h-full object-cover' } })
            : (user.name || 'U')[0].toUpperCase()
        ]),
        !mini ? h.div({ attrs: { class: tw`flex-1 min-w-0 overflow-hidden` } }, [
          h.p({ attrs: { class: tw`text-sm font-semibold truncate text-[var(--foreground)]` } }, [user.name]),
          h.p({ attrs: { class: tw`text-xs text-[var(--muted)] truncate` } }, [user.role || 'Admin'])
        ]) : null
      ])
    ]) : null;

    return h.div({ attrs: { class: tw`flex flex-col h-full relative` } }, [
      brandArea,
      navArea,
      userArea
    ]);
  }

  function Header(props) {
    const { title, onToggleSidebar, onToggleMini, sidebarMini, end } = props;
    const labels = props.labels || {};

    return h.header({ attrs: { class: tw`dash/header` } }, [
      h.div({ attrs: { class: tw`flex items-center gap-4` } }, [
        // Mobile Toggle
        h.button({
          attrs: {
            class: tw`md:hidden hover:bg-[var(--primary)]/10 inline-flex items-center justify-center rounded-md p-2 text-[var(--foreground)]`
          },
          gkey: onToggleSidebar
        }, [
          h.svg({ attrs: { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" } }, [
            h.line({ attrs: { x1: "3", x2: "21", y1: "6", y2: "6" } }),
            h.line({ attrs: { x1: "3", x2: "21", y1: "12", y2: "12" } }),
            h.line({ attrs: { x1: "3", x2: "21", y1: "18", y2: "18" } })
          ])
        ]),

        // Desktop Mini Toggle (Hidden on mobile)
        onToggleMini ? h.button({
          attrs: {
            class: tw`hidden md:inline-flex items-center justify-center rounded-lg p-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--surface-2)] transition-colors`,
            title: labels.toggleSidebar || 'Toggle Sidebar'
          },
          gkey: onToggleMini
        }, [
          // Icon: Menu Fold / Unfold
          sidebarMini
            ? h.svg({ attrs: { xmlns: "http://www.w3.org/2000/svg", width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" } }, [h.polyline({ attrs: { points: "13 17 18 12 13 7" } }), h.polyline({ attrs: { points: "6 17 11 12 6 7" } })]) // Double Right (Open)
            : h.svg({ attrs: { xmlns: "http://www.w3.org/2000/svg", width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" } }, [h.polyline({ attrs: { points: "11 17 6 12 11 7" } }), h.polyline({ attrs: { points: "18 17 13 12 18 7" } })]) // Double Left (Close)
        ]) : null,

        h.h1({ attrs: { class: tw`text-lg font-bold text-[var(--foreground)]` } }, [title]),
      ]),
      h.div({ attrs: { class: tw`flex items-center gap-2` } }, end || [])
    ]);
  }

  /* --- MODERN STAT CARD with Glassmorphism ---  */
  function StatCard(props) {
    const { title, value, icon, trend, trendValue } = props;
    const trendCaption = (props.labels && props.labels.trendCaption) || props.trendCaption || 'from last month';

    const trendColor = trend === 'up' ? 'text-emerald-400' : (trend === 'down' ? 'text-rose-400' : 'text-slate-400');
    const trendIcon = trend === 'up' ? '↑' : (trend === 'down' ? '↓' : '→');
    const trendBg = trend === 'up' ? 'bg-emerald-500/10' : (trend === 'down' ? 'bg-rose-500/10' : 'bg-slate-500/10');

    return h.div({
      attrs: { class: tw`group dash/card-glass p-6 relative overflow-hidden` }
    }, [
      // Background gradient glow
      h.div({ attrs: { class: tw`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500` } }),

      h.div({ attrs: { class: tw`relative z-10` } }, [
        h.div({ attrs: { class: tw`flex justify-between items-start mb-4` } }, [
          h.div({}, [
            h.p({ attrs: { class: tw`text-xs font-semibold text-[var(--muted)] uppercase tracking-wider` } }, [title]),
            h.h3({ attrs: { class: tw`text-3xl font-bold mt-2 bg-gradient-to-r from-[var(--foreground)] to-[var(--primary)] bg-clip-text text-transparent` } }, [value])
          ]),
          icon ? h.div({ attrs: { class: tw`p-3 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/10 rounded-2xl text-[var(--primary)] text-2xl shadow-lg` } }, [icon]) : null
        ]),
        trendValue ? h.div({ attrs: { class: tw`flex items-center gap-2` } }, [
          h.span({ attrs: { class: tw`${trendBg} ${trendColor} px-2 py-1 rounded-lg text-xs font-bold` } }, [trendIcon, ' ', trendValue]),
          h.span({ attrs: { class: tw`text-xs text-[var(--muted)]` } }, [trendCaption])
        ]) : null
      ])
    ]);
  }

  /* --- Theme Switcher - FIXED with Click State --- */
  function ThemeSwitcher(props) {
    const active = props.active || 'dark';
    const isOpen = props.open === true;
    const themes = props.themes && props.themes.length ? props.themes : PRESETS.themes;
    const activeTheme = themes.find(t => t.id === active) || themes[0];
    const labels = props.labels || {};

    return h.div({ attrs: { class: tw`relative` } }, [
      h.button({
        attrs: {
          class: tw`flex items-center gap-2 hover:bg-[var(--primary)]/10 px-3 py-1.5 rounded-lg transition-colors`,
          title: labels.themeTitle || 'Change Theme'
        },
        gkey: 'ui:theme:menu:toggle'
      }, [
        h.span({ attrs: { class: 'text-xl' } }, [activeTheme.label]),
        h.span({ attrs: { class: 'hidden md:inline text-xs font-medium' } }, [activeTheme.name || activeTheme.id])
      ]),
      isOpen ? h.div({
        attrs: {
          class: tw`absolute top-full end-0 mt-2 w-36 backdrop-blur-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200 z-50`
        }
      },
        themes.map(t =>
          h.button({
            attrs: {
              class: tw(cx('flex items-center gap-2 w-full text-start px-3 py-2 text-sm font-medium rounded-xl transition-all', active === t.id ? 'bg-gradient-to-r from-[var(--primary)]/20 to-[var(--accent)]/10 text-[var(--primary)] shadow-lg' : 'hover:bg-[var(--surface-2)]'))
            },
            gkey: `ui:theme:select:${t.id}`
          }, [
            h.span({ attrs: { class: 'text-lg' } }, [t.label]),
            h.span({}, [t.name || t.id])
          ])
        )
      ) : null
    ]);
  }

  function LangSelect(props) {
    const labels = props.labels || {};
    return h.div({ attrs: { class: tw`flex items-center backdrop-blur-md bg-[var(--surface-2)]/50 rounded-xl p-1 border border-[var(--glass-border)]` } }, [
      h.button({
        attrs: {
          class: tw(cx('px-3 py-1.5 text-xs font-medium rounded-lg transition-all', props.active === 'en' ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-lg' : 'text-[var(--muted)] hover:text-[var(--foreground)]'))
        },
        gkey: 'ui:lang:select:en'
      }, [labels.enShort || 'EN']),
      h.button({
        attrs: {
          class: tw(cx('px-3 py-1.5 text-xs font-medium rounded-lg transition-all', props.active === 'ar' ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-lg' : 'text-[var(--muted)] hover:text-[var(--foreground)]'))
        },
        gkey: 'ui:lang:select:ar'
      }, [labels.arShort || 'AR'])
    ]);
  }

  /* --- Chart Card using UI.Chart.Canvas --- */
  function ChartCard(props) {
    const { title, type = 'bar', data, options } = props;
    const chartId = 'chart-' + Math.random().toString(36).substr(2, 9);

    // Use UI.Chart.Canvas for proper ChartBridge integration
    const canvas = UI.Chart.Canvas({
      type,
      data,
      options,
      height: 288, // h-72 = 288px
      id: chartId
    });

    return h.div({
      attrs: Object.assign({ class: tw`dash/card-glass p-6` }, props.attrs || {})
    }, [
      title ? h.h3({ attrs: { class: tw`text-lg font-bold mb-4 text-[var(--foreground)]` } }, [title]) : null,
      h.div({ attrs: { class: tw`relative h-72 w-full` } }, [canvas])
    ]);
  }

  /* =========================================================================
     3. Design Lab
     ========================================================================= */

  const PRESETS = {
    fontScales: [90, 100, 110],
    themes: [
      { id: 'light', label: '☀️', name: 'Light' },
      { id: 'dark', label: '🌙', name: 'Dark' },
      { id: 'brown', label: '🟤', name: 'Brown' },
      { id: 'pink', label: '🌸', name: 'Pink' },
      { id: 'oasis', label: '🌴', name: 'Oasis' },
      { id: 'dawn', label: '🌅', name: 'Dawn' }
    ]
  };

  function DesignLab(props) {
    const { open, config } = props;
    const labels = props.labels || {};
    const themes = props.themes && props.themes.length ? props.themes : PRESETS.themes;
    const fontScales = props.fontScales && props.fontScales.length ? props.fontScales : PRESETS.fontScales;
    const languages = props.languages && props.languages.length ? props.languages : [
      { id: 'en', label: labels.enLabel || 'English' },
      { id: 'ar', label: labels.arLabel || 'العربية' }
    ];

    if (config.theme && typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') !== config.theme) {
      document.documentElement.setAttribute('data-theme', config.theme);
    }

    if (!open) return null;

    const set = (key, val) => `designlab:set:${key}:${val}`;

    return h.div({
      attrs: { class: tw`fixed bottom-0 end-0 m-4 w-80 backdrop-blur-2xl bg-[var(--glass-bg)] border border-[var(--primary)]/30 rounded-3xl shadow-2xl z-50 animate-in slide-in-from-bottom duration-300` }
    }, [
      h.div({ attrs: { class: tw`p-6` } }, [
        h.div({ attrs: { class: tw`flex items-center justify-between pb-4 border-b border-[var(--glass-border)]` } }, [
          h.span({ attrs: { class: tw`font-bold text-sm bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent` } }, [labels.designLabTitle || '🎨 Design Lab']),
          h.button({
            attrs: { class: tw`px-2 py-1 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-[var(--foreground)]` },
            gkey: 'designlab:toggle'
          }, [labels.close || '✕'])
        ]),
        h.div({ attrs: { class: tw`space-y-6 pt-4` } }, [
          h.div({}, [
            h.label({ attrs: { class: tw`text-xs font-bold text-[var(--primary)] uppercase tracking-wider` } }, [labels.theme || 'Theme']),
            h.div({ attrs: { class: tw`grid grid-cols-3 gap-2 mt-3` } }, themes.map(t =>
              h.button({
                attrs: {
                  class: tw(cx('flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex flex-col items-center gap-1 bg-[var(--surface-2)]/50 border border-transparent', config.theme === t.id ? 'border-[var(--primary)] bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent)]/5 shadow-lg' : 'hover:bg-[var(--surface-2)]'))
                },
                gkey: set('theme', t.id)
              }, [
                h.span({ attrs: { class: 'text-2xl' } }, [t.label]),
                h.span({ attrs: { class: 'text-[10px] font-medium' } }, [t.name || t.id])
              ])
            ))
          ]),
          h.div({}, [
            h.label({ attrs: { class: tw`text-xs font-bold text-[var(--primary)] uppercase tracking-wider` } }, [labels.fontScale || 'Font Scale']),
            h.div({ attrs: { class: tw`flex items-center gap-2 mt-3 bg-[var(--surface-2)]/50 backdrop-blur-md rounded-xl p-1 border border-[var(--glass-border)]` } }, fontScales.map(s =>
              h.button({
                attrs: {
                  class: tw(cx('flex-1 py-2 text-xs font-bold rounded-lg transition-all', config.fontScale === s ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-lg' : 'text-[var(--muted)]'))
                },
                gkey: set('fontScale', s)
              }, [s + '%'])
            ))
          ]),
          h.div({}, [
            h.label({ attrs: { class: tw`text-xs font-bold text-[var(--primary)] uppercase tracking-wider` } }, [labels.language || 'Language']),
            h.div({ attrs: { class: tw`flex gap-2 mt-3` } }, languages.map(lang =>
              UI.Button({
                variant: config.lang === lang.id ? 'solid' : 'soft',
                size: 'sm',
                attrs: { class: 'flex-1' },
                gkey: set('lang', lang.id)
              }, [lang.label || lang.id])
            ))
          ])
        ])
      ])
    ]);
  }

  function DesignLabTrigger(props) {
    const labels = (props && props.labels) || {};
    return UI.Button({
      variant: 'solid',
      attrs: {
        class: tw`fixed bottom-6 end-6 rounded-full w-14 h-14 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-2xl shadow-[var(--primary)]/50 z-40 p-0 hover:scale-110 transition-transform`,
        title: labels.triggerTitle || 'Customize UI'
      },
      gkey: 'designlab:toggle'
    }, [h.span({ attrs: { class: 'text-2xl' } }, [labels.triggerIcon || '🎨'])]);
  }

  /* =========================================================================
     4. Controller - SAFE EVENT HANDLING
     ========================================================================= */

  function createController(db) {
    const defaults = {
      ui: {
        sidebarOpen: false,
        designLabOpen: false,
        themeMenuOpen: false,
        sidebarMini: localStorage.getItem('mk-sidebar-mini') === 'true'
      },
      env: {
        theme: localStorage.getItem('mk-theme') || 'dark',
        fontScale: parseInt(localStorage.getItem('mk-font-scale') || '100'),
        lang: localStorage.getItem('mk-lang') || 'en'
      }
    };

    if (db && db.env) {
      defaults.env = Object.assign({}, defaults.env, db.env);
    }
    if (db && db.ui) {
      defaults.ui = Object.assign({}, defaults.ui, db.ui);
    }

    // NOTE: twcss.auto will be called AFTER app creation in dashboard-example.html

    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--user-font-scale', defaults.env.fontScale);
      document.documentElement.setAttribute('data-theme', defaults.env.theme);
      document.documentElement.setAttribute('dir', defaults.env.lang === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', defaults.env.lang);
    }

    const getParts = (e) => {
      const el = e.target ? e.target.closest('[data-m-gkey]') : null;
      const key = el ? el.getAttribute('data-m-gkey') : '';
      return key ? key.split(':') : [];
    };

    // Standard Mishkah Orders (Object format with proper structure)
    return {
      'designlab:toggle': {
        id: 'designlab-toggle',
        on: ['click'],
        gkeys: ['designlab:toggle'],
        // 
        handler: (e, ctx) => {
          ctx.setState(s => ({ ...s, ui: { ...s.ui, designLabOpen: !s.ui.designLabOpen } }));
        }
      },
      'dash:sidebar:toggle': {
        id: 'sidebar-toggle',
        on: ['click'],
        gkeys: ['dash:sidebar:toggle'],
        handler: (e, ctx) => {
          ctx.setState(s => ({ ...s, ui: { ...s.ui, sidebarOpen: !s.ui.sidebarOpen } }));
        }
      },
      'dash:sidebar:mini': {
        id: 'sidebar-mini',
        on: ['click'],
        gkeys: ['dash:sidebar:mini'],
        handler: (e, ctx) => {
          ctx.setState(s => {
            const nextMini = !s.ui.sidebarMini;
            localStorage.setItem('mk-sidebar-mini', nextMini);
            return { ...s, ui: { ...s.ui, sidebarMini: nextMini } };
          });
        }
      },
      'ui:theme:menu:toggle': {
        id: 'theme-menu-toggle',
        on: ['click'],
        gkeys: ['ui:theme:menu:toggle'],
        handler: (e, ctx) => ctx.setState(s => ({ ...s, ui: { ...s.ui, themeMenuOpen: !s.ui.themeMenuOpen } }))
      },
      'designlab:set': {
        id: 'designlab-settings',
        on: ['click'],
        gkeys: ['designlab:set:*'],  // Matches any setting

        handler: (e, ctx) => {
          const parts = getParts(e);
          if (parts.length < 4) return;
          const key = parts[2];
          const val = parts[3];

          if (key === 'theme') {
            U.twcss.setTheme(val);
            document.documentElement.setAttribute('data-theme', val);
            localStorage.setItem('mk-theme', val);
            ctx.setState(s => ({ ...s, env: { ...s.env, theme: val } }));
          }
          else if (key === 'fontScale') {
            const scale = parseInt(val);
            document.documentElement.style.setProperty('--user-font-scale', scale);
            localStorage.setItem('mk-font-scale', scale);
            ctx.setState(s => ({ ...s, env: { ...s.env, fontScale: scale } }));
          }
          else if (key === 'lang') {
            const dir = val === 'ar' ? 'rtl' : 'ltr';
            U.twcss.setDir(dir);
            document.documentElement.setAttribute('dir', dir);
            document.documentElement.setAttribute('lang', val);
            localStorage.setItem('mk-lang', val);
            ctx.setState(s => ({ ...s, env: { ...s.env, lang: val } }));
          }
        }
      },
      'ui:theme:select': {
        id: 'theme-select',
        on: ['click'],
        gkeys: ['ui:theme:select:*'],  // Matches any theme

        handler: (e, ctx) => {
          const parts = getParts(e);
          const val = parts[3];
          if (val) {
            U.twcss.setTheme(val);
            document.documentElement.setAttribute('data-theme', val);
            localStorage.setItem('mk-theme', val);
            ctx.setState(s => ({
              ...s,
              env: { ...s.env, theme: val },
              ui: { ...s.ui, themeMenuOpen: false }
            }));
          }
        }
      },
      'ui:lang:select': {
        id: 'lang-select',
        on: ['click'],
        gkeys: ['ui:lang:select:*'],  // Matches any language

        handler: (e, ctx) => {
          const parts = getParts(e);
          const val = parts[3];
          if (val) {
            const dir = val === 'ar' ? 'rtl' : 'ltr';
            U.twcss.setDir(dir);
            document.documentElement.setAttribute('dir', dir);
            document.documentElement.setAttribute('lang', val);
            localStorage.setItem('mk-lang', val);
            ctx.setState(s => ({ ...s, env: { ...s.env, lang: val } }));
          }
        }
      },
      'nav': {
        id: 'navigate',
        on: ['click'],
        gkeys: ['nav:*'],  // Matches any nav item
        //  <--- REMOVED: keysPath is empty so this fails!
        handler: (e, ctx) => {
          const parts = getParts(e);
          const id = parts[1];
          if (!id) return;

          ctx.setState(s => ({
            ...s,
            links: s.links.map(l => ({ ...l, active: l.gkey === `nav:${id}` })),
            ui: { ...s.ui, sidebarOpen: false }
          }));
        }
      }
    };
  }

  /* =========================================================================
     EXPORT
     ========================================================================= */
  w.MishkahDashboard = {
    Shell,
    Sidebar,
    Header,
    StatCard,
    ChartCard,
    ThemeSwitcher,
    LangSelect,
    DesignLab,
    DesignLabTrigger,
    createController
  };

})(window);
