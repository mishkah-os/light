# Mishkah Core: The Essentials 💎

A minimalist guide to the Mishkah Core DSL. No fluff, just the syntax.

## 1. Orders (Event Logic) ⚡

Events are improved in v1.1 with **Shorthand Syntax** (~60% less code).

```javascript
const orders = {
  // ✅ 1. Shorthand: event:gkey
  // Matches <div gkey="btn:inc">
  'click:btn:inc': (e, ctx) => {
    ctx.setState(s => ({ ...s, data: { count: s.data.count + 1 } }));
  },
  
  // Example: Toggle Theme
  'click:sys:theme': (e, ctx) => {
    ctx.setState(s => ({ 
      ...s, 
      env: { ...s.env, theme: s.env.theme === 'light' ? 'dark' : 'light' } 
    }));
  },

  // Example: Input Binding
  'input:search': (e, ctx) => {
    ctx.setState(s => ({ ...s, data: { ...s.data, query: e.target.value } }));
  },

  // ✅ 2. Shorthand: event@key
  // Matches <div key="tpl:myform"> (Scope/Template keys)
  'click@tpl:myform': (e, ctx) => {
    console.log('Matched template key');
  },

  // ✅ 3. Full Notation (Complex Cases)
  // Use for multiple events, debounce, or complex matching
  'advanced.save': {
    on: ['click', 'keydown'],
    gkeys: ['btn:save', 'shortcut:save'],
    handler: (e, ctx) => {
      if (e.type === 'keydown' && !(e.ctrlKey && e.key === 's')) return;
      e.preventDefault();
      // Complex logic...
    }
  }
};
```

## 2. View (The DSL) 🦴

Pure JavaScript. Function signature: `D.Tag(Config, Children)`

- **Tag**: `D.Div`, `D.Button`, `D.H1`, etc.
- **Config**: `{ attrs: {...}, events: {...}, ... }`
- **Children**: Array of strings or other nodes `[...]`

```javascript
// Example: A Button that triggers an Order
D.Button({ 
  attrs: { 
    class: 'btn-primary',
    gkey: 'btn:inc' // 👈 Binds to 'counter.increment' order
  } 
}, [
  'Increment' // Text Child
])
```

### When to use `events` vs `orders`?

- **Use `gkey` + `orders`**: For logic that changes state (database)
- **Use `events`**: For UI effects only (animations, sounds, DOM manipulation)

```javascript
// ✅ State Change → Use gkey + orders
D.Button({ attrs: { gkey: 'btn:save' } }, ['Save'])

// ✅ UI Effect Only → Use events
D.Button({ 
  events: { 
    click: (e) => { 
      e.target.classList.add('pulse'); 
      setTimeout(() => e.target.classList.remove('pulse'), 300);
    } 
  } 
}, ['Animate Me'])
```

## 3. Initialization 🚀

Booting the app is a 2-step process.

```javascript
// 1. Define Body
const body = (db) => D.Div({}, ['Hello World']);

// 2. Register & Mount
Mishkah.app.setBody(body);
Mishkah.app.create(database, orders).mount('#app');
```

## 4. Theming (Tailwind & Dark Mode) 🌗

Mishkah loves Tailwind. Just map your state to classes.

```javascript
// 1. Logic (Order)
'click:toggle_theme': (e, ctx) => {
  const next = ctx.getState().env.theme === 'dark' ? 'light' : 'dark';
  ctx.setState(s => ({ ...s, env: { ...s.env, theme: next } }));
}

// 2. View (Dynamic Class)
// In your body function:
D.Div({ 
  attrs: { 
    class: `min-h-screen ${db.env.theme}` // 'light' or 'dark'
  } 
}, [
  D.Div({ 
    attrs: { 
      // Tailwind 'dark:' prefix works automatically when parent has 'dark' class
      class: 'bg-white dark:bg-slate-900 text-black dark:text-white' 
    } 
  }, ['I change with theme!'])
])
```

> **Note**: For advanced auto-theming (auto-load fonts, palette management), see `Mishkah Utils` (`U.twcss`). For Core, simply use standard CSS or Tailwind classes.

## 5. i18n (Translation Helper) 🌍

Keep text separate from UI. Use a simple `t()` helper.

```javascript
// Database with i18n dictionary
const db = {
  env: { lang: 'ar' },
  i18n: {
    dict: {
      'welcome': { ar: 'مرحبا', en: 'Welcome' },
      'btn_save': { ar: 'حفظ', en: 'Save' }
    }
  }
};

// Helper function (define once in body)
const body = (db) => {
  const t = (key) => db.i18n.dict[key]?.[db.env.lang] || key;
  
  return D.Div({}, [
    D.H1({}, [ t('welcome') ]),  // ← Displays 'مرحبا' or 'Welcome'
    D.Button({ attrs: { gkey: 'save' } }, [ t('btn_save') ])
  ]);
};
```

## ⚡ Quick Start (Single File HTML)

A complete, copy-paste example using the CDN.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://ws.mas.com.eg/lib/mishkah.core.js"></script>
</head>
<body id="app">
    <script>
        const { app, DSL: D } = Mishkah;

        // 1. Database (State)
        const db = { 
            count: 0,
            env: { lang: 'ar' },
            i18n: {
                dict: {
                    'counter': { ar: 'العداد', en: 'Counter' },
                    'increment': { ar: 'زيادة', en: 'Increment' },
                    'decrement': { ar: 'تقليل', en: 'Decrement' }
                }
            }
        };

        // 2. Orders (Logic)
        const orders = {
            'click:inc': (e, ctx) => ctx.setState(s => ({ ...s, count: s.count + 1 })),
            'click:dec': (e, ctx) => ctx.setState(s => ({ ...s, count: s.count - 1 })),
        };

        // 3. Body (View)
        const body = (db) => {
            const t = (key) => db.i18n.dict[key]?.[db.env.lang] || key;
            
            return D.Div({ attrs: { class: 'fixed inset-0 flex items-center justify-center bg-gray-900 text-white' } },
             [
                D.Div({ attrs: { class: 'text-center space-y-4' } }, [
                    D.H2({ attrs: { class: 'text-2xl font-bold mb-2' } }, [ t('counter') ]),
                    D.H1({ attrs: { class: 'text-6xl font-black' } }, [ String(db.count) ]),
                    D.Div({ attrs: { class: 'flex gap-4' } }, [
                        D.Button({ attrs: { gkey: 'dec', class: 'px-6 py-2 bg-red-500 rounded hover:bg-red-600 transition' } }, [ 
                          t('decrement') ]),
                        D.Button({ attrs: { gkey: 'inc', class: 'px-6 py-2 bg-green-500 rounded hover:bg-green-600 transition' } }, [ t('increment') ])
                    ])
                ])
            ]
            
            );
        };

        // Mount
        app.setBody(body);
        app.create(db, orders).mount('#app');
    </script>
</body>
</html>
```
