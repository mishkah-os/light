# Mishkah Playground

This directory contains experimental applications and examples built using the **Mishkah Framework**. It serves as a testing ground for new features, components, and architectural patterns.

## 📚 Wiki App

The **Mishkah Wiki App** (`wiki-app.js`) is a fully functional, offline-capable knowledge base application. It demonstrates the power of Mishkah's architecture in building complex, data-driven applications without heavy build tools.

### Key Features

* **Bilingual Support**: Native support for English and Arabic content (`en` / `ar`), with UI direction switching (`ltr` / `rtl`).
* **Offline-First**: Uses `IndexedDB` (via `MishkahIndexedDB`) to store articles locally.
* **Recursive Structure**: Articles can have parents and siblings, forming a knowledge graph.
* **Theming**: Built-in Dark/Light mode support.
* **No Build Step**: Runs directly in the browser using ES5/ES6.

### File Structure

* `wiki-app.js`: Contains the core application logic, state management, and UI rendering (via Mishkah DSL).
* `wiki-data.js`: Contains seed data (initial articles) covering frontend frameworks (React, Vue, Angular, etc.).
* `wiki.html`: The entry point HTML file.
* `wiki-ui.js`: (If present) Additional UI components for the wiki.

### How to Use

1. Open `wiki.html` in your browser.
2. Use the sidebar to navigate topics.
3. Click "New Article" to add content.
4. Toggle Language/Theme from the sidebar or header.
5. Data is persisted to your browser's IndexedDB.

## 🧪 Other Experiments

* **Counters**: `example-counter.js`, `wiki-counter.js` - Simple state management demos.
* **CPS**: `example-cps.js`, `wiki-cps.js` - Continuation-Passing Style experiments or complex flow control examples.

## 🤝 Contributing

Feel free to add your own experiments here. Please follow the existing pattern of self-contained JavaScript files.
