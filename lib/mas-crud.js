(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MasCrud = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    console.log('%c[MasCrud] v2.4.1 — 2026-02-17', 'color:#3b82f6;font-weight:bold;');

    function safeDefine(name, cls) {
        if (!customElements.get(name)) {
            customElements.define(name, cls);
        }
    }

    function _postData(url, data, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                try { callback(JSON.parse(xhr.responseText)); }
                catch (e) { callback(xhr.responseText); }
            }
        };
        var clean = {};
        for (var k in data) {
            if (data[k] != null && data[k] !== '' && typeof data[k] !== 'undefined') {
                clean[k] = data[k];
            }
        }
        var params = new URLSearchParams(clean).toString();
        xhr.send(params);
    }

    function _postJSON(url, data, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                try { callback(JSON.parse(xhr.responseText)); }
                catch (e) { callback(xhr.responseText); }
            }
        };
        xhr.send(JSON.stringify(data));
    }

    // ── Built-in Loading Overlay ──────────────────────────────────────
    // Provides loading(id) / unloading(id) if not already defined by the host app.
    (function () {
        if (typeof window.loading === 'function' && typeof window.unloading === 'function') return;

        var _style = document.createElement('style');
        _style.textContent = [
            '.mascrud-loading-overlay{position:fixed;inset:0;z-index:9999999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,14,23,0.85);backdrop-filter:blur(6px);opacity:0;transition:opacity .25s ease;pointer-events:all;}',
            '.mascrud-loading-overlay.show{opacity:1;}',
            '.mascrud-spinner{width:48px;height:48px;border:4px solid rgba(255,255,255,0.1);border-top-color:#3b82f6;border-radius:50%;animation:mascrudSpin .7s linear infinite;}',
            '@keyframes mascrudSpin{to{transform:rotate(360deg)}}',
            '.mascrud-loading-text{margin-top:16px;color:#a0aec0;font-size:14px;font-weight:500;font-family:"Segoe UI",system-ui,sans-serif;letter-spacing:0.3px;}'
        ].join('\n');
        document.head.appendChild(_style);

        var _overlays = {};

        window.loading = function (id) {
            if (_overlays[id]) return;
            var el = document.createElement('div');
            el.className = 'mascrud-loading-overlay';
            el.innerHTML = '<div class="mascrud-spinner"></div><div class="mascrud-loading-text">Loading…</div>';
            document.body.appendChild(el);
            // trigger reflow for transition
            void el.offsetWidth;
            el.classList.add('show');
            _overlays[id] = el;
        };

        window.unloading = function (id) {
            var el = _overlays[id];
            if (!el) return;
            el.classList.remove('show');
            setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 300);
            delete _overlays[id];
        };
    })();

    // ── Built-in Confirm & Alert Dialogs ─────────────────────────────
    // Replaces Swal.fire for confirm prompts and simple alerts.
    (function () {
        var _dStyle = document.createElement('style');
        _dStyle.textContent = [
            '.mascrud-dialog-overlay{position:fixed;inset:0;z-index:10000000;display:flex;align-items:center;justify-content:center;background:rgba(10,14,23,0.85);backdrop-filter:blur(6px);opacity:0;transition:opacity .2s ease;}',
            '.mascrud-dialog-overlay.show{opacity:1;}',
            '.mascrud-dialog{background:linear-gradient(145deg,#1e293b,#0f172a);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px 28px 24px;max-width:400px;width:90%;text-align:center;transform:scale(0.9);transition:transform .25s ease;font-family:"Segoe UI",system-ui,sans-serif;}',
            '.mascrud-dialog-overlay.show .mascrud-dialog{transform:scale(1);}',
            '.mascrud-dialog-icon{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;}',
            '.mascrud-dialog-icon.warning{background:rgba(251,191,36,0.15);color:#fbbf24;}',
            '.mascrud-dialog-icon.success{background:rgba(34,197,94,0.15);color:#22c55e;}',
            '.mascrud-dialog-icon.error{background:rgba(239,68,68,0.15);color:#ef4444;}',
            '.mascrud-dialog-icon.info{background:rgba(59,130,246,0.15);color:#3b82f6;}',
            '.mascrud-dialog h3{color:#f1f5f9;font-size:18px;font-weight:600;margin:0 0 8px;}',
            '.mascrud-dialog p{color:#94a3b8;font-size:14px;margin:0 0 24px;line-height:1.5;}',
            '.mascrud-dialog-btns{display:flex;gap:10px;justify-content:center;}',
            '.mascrud-dialog-btn{padding:10px 24px;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:inherit;}',
            '.mascrud-dialog-btn.confirm{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;}',
            '.mascrud-dialog-btn.confirm:hover{background:linear-gradient(135deg,#60a5fa,#3b82f6);}',
            '.mascrud-dialog-btn.cancel{background:rgba(255,255,255,0.06);color:#94a3b8;border:1px solid rgba(255,255,255,0.1);}',
            '.mascrud-dialog-btn.cancel:hover{background:rgba(255,255,255,0.1);color:#e2e8f0;}',
            '.mascrud-dialog-btn.danger{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;}',
            '.mascrud-dialog-btn.danger:hover{background:linear-gradient(135deg,#f87171,#ef4444);}'
        ].join('\n');
        document.head.appendChild(_dStyle);

        var icons = { warning: '⚠️', success: '✅', error: '❌', info: 'ℹ️', danger: '⚠️' };

        function createOverlay() {
            var ov = document.createElement('div');
            ov.className = 'mascrud-dialog-overlay';
            document.body.appendChild(ov);
            void ov.offsetWidth;
            ov.classList.add('show');
            return ov;
        }

        function closeOverlay(ov) {
            ov.classList.remove('show');
            setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 250);
        }

        /**
         * _mascrudConfirm({ title, text, icon, confirmText, cancelText, confirmClass })
         * Returns a Promise that resolves true (confirmed) or false (cancelled).
         */
        window._mascrudConfirm = function (opts) {
            return new Promise(function (resolve) {
                var ov = createOverlay();
                var d = document.createElement('div');
                d.className = 'mascrud-dialog';
                var iconType = opts.icon || 'warning';
                d.innerHTML = '<div class="mascrud-dialog-icon ' + iconType + '">' + (icons[iconType] || '') + '</div>' +
                    '<h3>' + (opts.title || '') + '</h3>' +
                    '<p>' + (opts.text || '') + '</p>' +
                    '<div class="mascrud-dialog-btns">' +
                    '<button class="mascrud-dialog-btn cancel">' + (opts.cancelText || 'Cancel') + '</button>' +
                    '<button class="mascrud-dialog-btn ' + (opts.confirmClass || 'confirm') + '">' + (opts.confirmText || 'OK') + '</button>' +
                    '</div>';
                ov.appendChild(d);
                d.querySelector('.cancel').onclick = function () { closeOverlay(ov); resolve(false); };
                d.querySelector('.confirm,.danger').onclick = function () { closeOverlay(ov); resolve(true); };
                ov.addEventListener('click', function (e) { if (e.target === ov) { closeOverlay(ov); resolve(false); } });
            });
        };

        /**
         * _mascrudAlert(title, text, icon)
         * Shows a simple alert with an OK button. Returns a Promise.
         */
        window._mascrudAlert = function (title, text, icon) {
            return new Promise(function (resolve) {
                var ov = createOverlay();
                var d = document.createElement('div');
                d.className = 'mascrud-dialog';
                var iconType = icon || 'info';
                d.innerHTML = '<div class="mascrud-dialog-icon ' + iconType + '">' + (icons[iconType] || '') + '</div>' +
                    '<h3>' + (title || '') + '</h3>' +
                    '<p>' + (text || '') + '</p>' +
                    '<div class="mascrud-dialog-btns">' +
                    '<button class="mascrud-dialog-btn confirm">OK</button>' +
                    '</div>';
                ov.appendChild(d);
                d.querySelector('.confirm').onclick = function () { closeOverlay(ov); resolve(); };
                ov.addEventListener('click', function (e) { if (e.target === ov) { closeOverlay(ov); resolve(); } });
            });
        };
    })();

    function cudbuild(dataCrud, tbname, options) {
        options = options || {};
        var container = document.getElementById(dataCrud);
        if (tbname == "") {
            container.innerHTML = "<h1 style='text-align:center;color:red;'>No Data !</h1>";
        } else {
            var _cols = options.cols || getpar("cols") || '';
            var _cond = options.cond || getpar("cond") || '';
            var _top = options.top || (Number(getpar("top")) > 0 ? getpar("top") : 25);
            var _page = options.page || (Number(getpar("page")) > 0 ? getpar("page") : 1);
            container.innerHTML = '<crud-table name="' + tbname + '" top="' + _top + '" page="' + _page + '" cond="' + _cond + '" cols="' + _cols + '"></crud-table>';

            let searchObjectsData = {};

            class AutoCompleteTable extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: 'open' });
                    this._instanceId = 'ac_' + Math.random().toString(36).substr(2, 9);
                    this.name = this.getAttribute('name');
                    this.records = parseInt(this.getAttribute('records')) || 10;
                    this.page = 1;
                    this._referencedTableName = null;
                    this.data = [];
                    this.filteredData = [];
                    this.selectedIndex = -1;
                    this.isClickOutsideListenerAdded = false;

                    this.shadowRoot.innerHTML = `
            <style>
                :host {
                    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                }
                .autocomplete-container {
                    position: absolute;
                    border: 1px solid rgba(255,255,255,0.08);
                    background: linear-gradient(145deg, #1e2a3a, #1a2035);
                    color: #e8ecf1;
                    border-radius: 8px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
                    overflow: hidden;
                    animation: acSlideIn 0.15s ease-out;
                }
                @keyframes acSlideIn {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                .autocomplete-input {
                    width: 100%;
                    padding: 10px 12px;
                    box-sizing: border-box;
                    color: #e8ecf1;
                    background: transparent;
                    border: none;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    outline: none;
                    font-size: 15px;
                    font-family: inherit;
                }
                .autocomplete-input:focus {
                    border-bottom-color: #3b82f6;
                }

                .autocomplete-results {
                    max-height: 350px;
                    overflow: auto;
                    scrollbar-width: thin;
                    scrollbar-color: #3b4a5a #1a2035;
                }
                .autocomplete-results::-webkit-scrollbar { width: 6px; }
                .autocomplete-results::-webkit-scrollbar-track { background: #1a2035; }
                .autocomplete-results::-webkit-scrollbar-thumb { background: #3b4a5a; border-radius: 3px; }
                .autocomplete-results::-webkit-scrollbar-thumb:hover { background: #4e6378; }

                .autocomplete-results table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .autocomplete-results th, .autocomplete-results td {
                    padding: 8px 12px;
                    border: none;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    text-align: left;
                    font-size: 14px;
                }

                .autocomplete-results th {
                    background: linear-gradient(135deg, #2d3748, #343a40);
                    color: #a0aec0;
                    font-weight: 600;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    position: sticky;
                    top: 0;
                    z-index: 2;
                }

                .autocomplete-results tr {
                    cursor: pointer;
                    transition: background-color 0.15s ease;
                }
                .autocomplete-results tbody tr:hover {
                    background-color: rgba(59, 130, 246, 0.15);
                }

                .pagination {
                    display: flex;
                    justify-content: center;
                    padding: 8px 0;
                    gap: 4px;
                    border-top: 1px solid rgba(255,255,255,0.06);
                }

                .pagination button {
                    padding: 6px 14px;
                    cursor: pointer;
                    background: rgba(255,255,255,0.06);
                    color: #a0aec0;
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 600;
                    transition: all 0.15s ease;
                }

                .pagination button:hover {
                    background: #3b82f6;
                    color: #fff;
                    border-color: #3b82f6;
                }

                .selected {
                    background-color: rgba(59, 130, 246, 0.25) !important;
                    color: #93c5fd;
                }
            </style>
            <div class="autocomplete-container" style="display: none;">
                <div class="autocomplete-results">
                    <table>
                        <thead>
                            <tr></tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                    <div class="pagination">
                        <button class="prev-page">&lt;&lt;</button>
                        <button class="next-page">&gt;&gt;</button>
                    </div>
                </div>
            </div>
        `;

                    this.resultsContainer = this.shadowRoot.querySelector('.autocomplete-container');
                    this.thead = this.shadowRoot.querySelector('thead tr');
                    this.tbody = this.shadowRoot.querySelector('tbody');
                    this.prevPageButton = this.shadowRoot.querySelector('.prev-page');
                    this.nextPageButton = this.shadowRoot.querySelector('.next-page');

                    this.prevPageButton.addEventListener('click', () => this.changePage(-1));
                    this.nextPageButton.addEventListener('click', () => this.changePage(1));
                    this.handleClickOutsideBound = this.handleClickOutside.bind(this);
                }

                connectedCallback() {
                    setStopPropagationForChildren(this.shadowRoot);
                }

                set data(newData) {
                    this._data = newData;
                    this.filteredData = newData.slice();
                    this.updateResults();
                }

                get data() {
                    return this._data;
                }

                setInput(input, data, column) {
                    this.data = data;
                    this.filteredData = this.data;
                    this.input = input;
                    this.column = column;

                    setStopPropagationForChildren(this.input);

                    if (!this.isKeyDownListenerAdded) {
                        input.addEventListener('keydown', (e) => {
                            e.stopPropagation();
                            this.onKeyDown(e);
                        });
                        this.isKeyDownListenerAdded = true;
                        input.addEventListener('input', () => this.onInput(input));

                    }


                    this.updateResults();
                }


                onInput(input) {
                    let query = input.value ? input.value : input.querySelector("input") ? input.querySelector("input").value || "" : "";
                    query = query.toLowerCase();
                    // console.log(input)
                    this.filteredData = this.data.filter(item =>
                        Object.values(item).some(value =>
                            typeof value === 'string' && value.toLowerCase().includes(query)
                        )
                    );
                    this.page = 1;
                    this.updateResults();
                }

                onKeyDown(e) {
                    e.stopPropagation();

                    const rows = this.tbody.querySelectorAll('tr');
                    if (rows.length === 0) return;  // التأكد من أن هناك صفوف

                    switch (e.key) {
                        case 'ArrowDown':
                            e.preventDefault();
                            // زيادة selectedIndex ولكن بدون تخطي الحدود
                            let selectednumber = (this.selectedIndex + 1) < rows.length ? this.selectedIndex + 1 : rows.length - 1;
                            console.log('selectednumber', selectednumber);
                            this.selectedIndex = selectednumber;
                            this.updateHighlight();
                            break;
                        case 'ArrowUp':
                            e.preventDefault();
                            let selectednumber2 = (this.selectedIndex - 1) >= 0 ? this.selectedIndex - 1 : 0;
                            console.log('selectednumber2', selectednumber2);
                            this.selectedIndex = selectednumber2;
                            this.updateHighlight();
                            break;
                        case 'Enter':
                            e.preventDefault();
                            if (this.selectedIndex >= 0 && this.selectedIndex < rows.length) {
                                this.selectItem(rows[this.selectedIndex]);
                            }
                            break;
                    }
                }

                updateHighlight() {
                    const rows = this.tbody.querySelectorAll('tr');
                    rows.forEach((row, index) => {
                        row.classList.toggle('selected', index === this.selectedIndex);
                    });
                }

                changePage(direction) {
                    const totalPages = Math.ceil(this.filteredData.length / this.records);
                    this.page = Math.max(1, Math.min(this.page + direction, totalPages));
                    this.updateResults();
                }

                updateResults() {
                    if (!this.thead || !this.tbody) {
                        return;
                    }

                    const start = (this.page - 1) * this.records;
                    const end = this.page * this.records;
                    const pageData = this.filteredData.slice(start, end);

                    this.tbody.innerHTML = '';
                    this.thead.innerHTML = '';

                    if (pageData.length > 0) {
                        let countcol = 0;
                        Object.keys(pageData[0]).forEach(key => {
                            if (key.toLowerCase() !== 'id') {
                                const th = document.createElement('th');
                                if (countcol == 0) {
                                    const thspantext = document.createElement('span');
                                    const thspanclose = document.createElement('span');
                                    const thspanrefresh = document.createElement('span');
                                    thspanclose.style.position = 'absolute';
                                    thspanclose.style.zIndex = '999999';
                                    thspanclose.style.cursor = 'pointer';
                                    thspanclose.style.padding = '0 4px';
                                    thspanclose.title = 'Close';
                                    thspanclose.addEventListener('click', (e) => {
                                        this.remove();
                                    });
                                    thspanrefresh.textContent = ' \u21BB ';
                                    thspanrefresh.style.cursor = 'pointer';
                                    thspanrefresh.style.padding = '0 4px';
                                    thspanrefresh.style.fontSize = '16px';
                                    thspanrefresh.title = 'Refresh data from server';
                                    thspanrefresh.addEventListener('click', (e) => {
                                        e.stopPropagation();
                                        this.refreshData();
                                    });
                                    thspantext.textContent = key;
                                    thspanclose.textContent = ' \u2715 ';
                                    thspantext.style.paddingLeft = '20px';
                                    thspantext.style.paddingRight = '20px';
                                    th.appendChild(thspanclose);
                                    th.appendChild(thspanrefresh);
                                    th.appendChild(thspantext);
                                } else {
                                    th.textContent = key;
                                }
                                countcol += 1;
                                this.thead.appendChild(th);
                            }
                        });

                        pageData.forEach(item => {
                            const tr = document.createElement('tr');
                            tr.dataset.id = item.ID;
                            Object.entries(item).forEach(([key, value]) => {
                                if (key.toLowerCase() !== 'id') {
                                    const td = document.createElement('td');
                                    td.textContent = value;
                                    tr.appendChild(td);
                                    td.addEventListener('click', () => this.selectItem(tr));
                                }
                            });
                            tr.addEventListener('click', () => this.selectItem(tr));
                            this.tbody.appendChild(tr);
                        });
                    }

                    this.resultsContainer.style.display = pageData.length > 0 ? 'block' : 'none';

                    if (pageData.length > 0 && !this.isClickOutsideListenerAdded) {
                        document.addEventListener('click', this.handleClickOutsideBound);
                        this.isClickOutsideListenerAdded = true;
                    } else if (pageData.length === 0 && this.isClickOutsideListenerAdded) {
                        document.removeEventListener('click', this.handleClickOutsideBound);
                        this.isClickOutsideListenerAdded = false;
                    }
                }

                selectItem(row) {
                    const id = row.dataset.id;
                    const selectedItem = this.filteredData.find(item => item.ID.toString() === id);

                    if (selectedItem) {
                        const value = Object.values(selectedItem).find((val, index) => index > 0); // القيمة الأولى بعد الـ ID

                        if (value) {
                            this.input.value = value.toString().trim();
                        } else {
                            this.input.value = row.textContent.trim();
                        }
                        this.input.dataset.id = id;
                        this.input.dataset.val = this.input.value;
                        this.resultsContainer.style.display = 'none';
                        this.dispatchEvent(new CustomEvent('itemSelected', { detail: { id, value: this.input.value } }));
                        document.removeEventListener('click', this.handleClickOutsideBound);
                    } else {
                        console.error("Item not found!");
                    }
                }

                handleClickOutside(event) {
                    if (!isEventInChild(this.resultsContainer, event) && !isEventInChild(this.input, event)) {
                        this.resultsContainer.style.display = 'none';
                        document.removeEventListener('click', this.handleClickOutsideBound);
                        this.isClickOutsideListenerAdded = false;
                    }
                }

                refreshData() {
                    if (this._referencedTableName && searchObjectsData[this._referencedTableName]) {
                        delete searchObjectsData[this._referencedTableName];
                    }
                    if (this._referencedTableName && this._lastColumn && this.input) {
                        this.generateSearch(this.input, this._referencedTableName, this._lastColumn, this._lastItemObject, this._lastCallback || function () { });
                    }
                }

                generateSearch(input, referencedTableName, column, itemObject, callback) {
                    this.column = column;
                    this.input = input;
                    this._referencedTableName = referencedTableName;
                    this._lastColumn = column;
                    this._lastItemObject = itemObject;
                    this._lastCallback = callback;

                    if (searchObjectsData[referencedTableName]) {
                        if (Object.keys(searchObjectsData[referencedTableName]).length == 2) {
                            this.populateAutocomplete(input, searchObjectsData[referencedTableName], itemObject);
                        } else {
                            this.tablepopulateAutocomplete(input, searchObjectsData[referencedTableName], column, itemObject);
                        }
                        try {
                            callback(searchObjectsData[referencedTableName]);
                        } catch (err) {
                            console.error(err);
                        }
                    } else {
                        var self = this;
                        _postJSON('../../API/invoice?id=get', { name: referencedTableName, top: 1000, page: 1, cols: "ID," + column.search_columns }, function (data) {
                            if (data.error) {
                                console.error('AutoComplete fetch error:', data.error);
                                return;
                            }
                            searchObjectsData[referencedTableName] = data.data;
                            if (Object.keys(data.data).length == 2) {
                                self.populateAutocomplete(input, data.data, itemObject);
                            } else {
                                self.tablepopulateAutocomplete(input, data.data, column, itemObject);
                            }
                            try {
                                callback(searchObjectsData[referencedTableName]);
                            } catch (err) {
                                console.error(err);
                            }
                        });
                    }
                }

                populateAutocomplete(td, data, itemObject) {
                    const existingDatalist = this.shadowRoot.querySelector(`#datalist_${td.dataset.column}`);
                    if (existingDatalist) {
                        existingDatalist.remove();
                    }
                    const datalist = document.createElement('datalist');
                    datalist.id = `datalist_${td.dataset.column}`;

                    data.forEach(item => {
                        const option = document.createElement('option');
                        let idval = Object.keys(item)
                            .filter(key => key.toLocaleLowerCase() == 'id')
                            .map(key => item[key])[0];
                        option.dataset.id = idval;
                        let concatenatedValue = Object.keys(item)
                            .filter(key => key !== 'ID')
                            .map(key => item[key])
                            .join(' ');
                        option.value = concatenatedValue;
                        datalist.appendChild(option);
                    });

                    this.shadowRoot.appendChild(datalist);

                    let input = td.tagName.toUpperCase() == "INPUT" ? td : td.querySelector('input');
                    if (!input) {
                        input = document.createElement('input');
                        input.setAttribute('list', datalist.id);
                        input.value = td.textContent.trim();

                        input.style.width = '100%';
                        input.style.height = '100%';
                        input.style.margin = '0';
                        input.style.padding = '10px 4px 10px 4px';
                        input.style.border = 'none';
                        input.style.outline = 'none';
                        input.style.boxSizing = 'border-box';
                        input.style.fontSize = '19px';
                        td.style.padding = '0';
                        td.textContent = '';
                        td.appendChild(input);
                    } else {
                        input.setAttribute('list', datalist.id);
                    }

                    input.onblur = () => {
                        const newValue = input.value.trim();
                        if (input && input.tagName.toLowerCase() != 'input') {
                            td.removeChild(input);
                        }
                        if (itemObject) {
                            if (input.tagName.toLowerCase() == 'input') {
                                td.value = itemObject.value;
                            } else {
                                td.textContent = itemObject.value;
                            }
                        } else {
                            if (input.tagName.toLowerCase() == 'input') {
                                td.value = '';
                            } else {
                                td.textContent = '';
                            }
                        }
                        td.style.padding = '';
                        //  console.log("newValue2", itemObject)

                    };

                    input.onchange = () => {
                        const selectedOption = Array.from(datalist.options).find(option => option.value === input.value);
                        console.log("onchange selectedOption input")

                        if (selectedOption) {
                            input.value = selectedOption.value;

                            if (itemObject) {
                                itemObject.value = selectedOption.value;
                                itemObject.id = selectedOption.dataset.id;
                            }
                        }
                    };
                }

                removeallpopulateAutocomplete() {
                    const existingAutoCompletes = this.shadowRoot.querySelectorAll('auto-complete-table');
                    existingAutoCompletes.forEach(autoComplete => {
                        autoComplete.remove();
                    });
                }

                tablepopulateAutocomplete(td, data, column, itemObject) {
                    this.removeallpopulateAutocomplete();

                    // console.log(td);
                    // console.log(data);
                    // console.log(column);
                    td.onclick = (e) => {
                        e.stopPropagation();
                    };

                    // console.log(td);
                    // console.log(data);
                    // console.log(column);
                    const autoCompleteTable = this;

                    const rect = td.getBoundingClientRect();

                    autoCompleteTable.style.position = 'absolute';
                    autoCompleteTable.style.width = `${rect.width}px`;
                    autoCompleteTable.style.zIndex = getMaxZindex() + 99999;
                    autoCompleteTable.setInput(td, data, column);

                    const tableRect = this.shadowRoot.host.getBoundingClientRect();
                    autoCompleteTable.style.position = 'absolute';
                    autoCompleteTable.style.top = `${rect.bottom + window.scrollY}px`;
                    autoCompleteTable.style.left = `${rect.left + window.scrollX}px`;
                    autoCompleteTable.style.width = `${rect.width}px`;

                    let input = td.tagName.toUpperCase() == "INPUT" ? td : td.querySelector('input');
                    if (!input) {
                        input = document.createElement('input');
                        input.value = td.textContent.trim();
                        input.style.width = '100%';
                        input.style.height = '100%';
                        input.style.margin = '0';
                        input.style.padding = '10px 4px';
                        input.style.border = 'none';
                        input.style.outline = 'none';
                        input.style.boxSizing = 'border-box';
                        input.style.fontSize = '19px';
                        td.style.padding = '0';
                        td.textContent = '';
                        td.appendChild(input);
                        input.onclick = (e) => {
                            e.stopPropagation();
                        };

                        input.onblur = () => {
                            const newValue = input.value.trim();
                            if (input && input.tagName.toLowerCase() != 'input') {
                                td.removeChild(input);
                            }
                            if (itemObject == null) {
                                itemObject = { id: input.dataset.id, vlaue: input.dataset.val }


                            }
                            if (td.tagName.toLowerCase() != 'input') {
                                td.textContent = itemObject ? itemObject.value : '';
                                td.style.padding = '';
                            } else {
                                td.value = itemObject ? itemObject.value : '';
                            }
                        };

                        input.onchange = () => {
                            const selectedOption = Array.from(autoCompleteTable.shadowRoot.querySelectorAll('tr')).find(option => option.textContent.trim() === input.value.trim());
                            //console.log("selectedOption", selectedOption);
                            // console.log("onchange selectedOption2 input")

                            if (selectedOption) {
                                input.value = selectedOption.textContent.trim();
                                if (itemObject) {
                                    itemObject.value = selectedOption.textContent.trim();
                                    itemObject.id = selectedOption.dataset.id;
                                }
                            } else {
                                if (itemObject) {
                                    itemObject = null;
                                }

                            }
                        };
                    }

                    if (!autoCompleteTable.iseventitemSelected) {
                        autoCompleteTable.addEventListener('itemSelected', (e) => {
                            autoCompleteTable.iseventitemSelected = true;
                            const { value, id } = e.detail;
                            input.value = value;
                            if (itemObject) {
                                itemObject.value = value;
                                itemObject.id = id;
                            }

                            if (td.tagName.toUpperCase() != "INPUT") {
                                input.remove();
                                td.textContent = value;
                                td.style.padding = '';
                            }

                            autoCompleteTable.remove();
                        });
                    }

                    input.focus();
                }
            }

            class MultiSelect extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: 'open' });
                    this.shadowRoot.innerHTML = `
            <style>
                #multiSelectSearchInput{
                font-size:17px;
                }


                .multi-select {
                    position: relative;
                    display: inline-block;
                    width: 200px;
                    color: #000;
                }
                .select-box {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border: 1px solid #ccc;
                    padding: 5px;
                    background-color: #fff;
                    cursor: pointer;
                }
                .options-container {
                    position: absolute;
                    top: 40px;
                    left: 0;
                    width: 100%;
                    border: 1px solid #ccc;
                    border-top: none;
                    background-color: #fff;
                    height: 500px;
                    max-height: 500px;
                    overflow: auto;
                    z-index: 9999;
                    display: none;
                }
                .option {
                    padding: 5px;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                }
                .option:hover {
                    background-color: #f1f1f1;
                }
                .option .checkbox {
                    width: 20px;
                    height: 20px;
                    margin-right: 10px;
                }
                .option.selected {
                    background-color: #0000ff;
                    color: #ffffff;
                }
                .selected-items {
                    display: none;
                    flex-wrap: wrap;
                    gap: 5px;
                    margin-top: 5px;
                }
                .selected-item {
                    background-color: #007bff;
                    color: #fff;
                    padding: 3px 5px;
                    border-radius: 3px;
                }
                .selected-item span {
                    cursor: pointer;
                    margin-left: 5px;
                }
                .search-input {
                    width: 100%;
                    padding: 3px;
                    margin-bottom: 5px;
                    font-size: 16px;
                }
            </style>
            <div class="multi-select">
                <div class="select-box" id="selectBox">
                    <span id="selected-columns">${getCookie("UserLang") == "ar" ? "اختر القيم" : "Select values"}</span>
                    <span>&#9660;</span>
                </div>
                <div class="options-container" id="optionsContainer">
                    <input type="text" id="multiSelectSearchInput" class="search-input" placeholder="${getCookie("UserLang") == "ar" ? "بحث .." : "Search .."}">
                    <div class="option selectalloption ${this.getAttribute("checked") == "checked" ? "selected" : ""}">
                        <input type="checkbox" class="checkbox" ${this.getAttribute("checked") == "checked" ? "checked" : ""} id="selectAll" />
                        <label for="selectAll">${getCookie("UserLang") == "ar" ? "تحديد الكل" : "Select All"}</label>
                        </hr>
                    </div>
                </div>
                <div class="selected-items" id="selectedItems"></div>
            </div>
        `;

                    this.selectedItems = [];

                    this.shadowRoot.getElementById('selectBox').onclick = (event) => this.toggleOptions(event);
                    this.shadowRoot.getElementById('selectAll').addEventListener('click', (e) => this.selectAllOptions(e));
                    this.shadowRoot.getElementById('multiSelectSearchInput').addEventListener('input', (e) => this.filterOptions(e));
                    this.shadowRoot.getElementById('multiSelectSearchInput').onclick = (event) => this.onclickMultiSelectOptions(event);

                    document.addEventListener('click', (event) => this.handleClickOutside(event));
                }

                connectedCallback() {
                    // No need to call this.populateOptions() here.
                }

                populateOptions(columns) {
                    const optionsContainer = this.shadowRoot.getElementById('optionsContainer');
                    columns.forEach(column => {
                        const option = document.createElement('div');
                        option.classList.add('option');
                        if (this.getAttribute("checked") == "checked") {
                            option.classList.add('selected');
                        }
                        if (this.getAttribute("checked") == "checked") {
                            this.shadowRoot.getElementById('selected-columns').textContent = (getCookie("UserLang") == "ar" ? "البيانات المختارة " : "Selected data") + `(${columns.length})`;
                        }
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.classList.add('checkbox');

                        checkbox.value = column.trans_name || column.name;
                        checkbox.setAttribute("name", column.name);
                        if (this.getAttribute("checked") == "checked") {
                            checkbox.checked = true;
                        }

                        checkbox.onclick = (e) => {
                            e.stopPropagation();
                            option.classList.toggle('selected', checkbox.checked); // السطر المحدث
                            this.updateSelectedItems(e.target);
                        };
                        const label = document.createElement('label');
                        label.textContent = column.trans_name || column.name;

                        option.appendChild(checkbox);
                        option.appendChild(label);
                        optionsContainer.appendChild(option);

                        checkbox.addEventListener('change', () => this.updateSelectedColumns());

                        option.addEventListener('click', (e) => {
                            e.stopPropagation();
                            checkbox.checked = !checkbox.checked;
                            option.classList.toggle('selected', checkbox.checked); // السطر المحدث
                            this.updateSelectedColumns();
                        });
                    });
                }

                toggleOptions(event) {
                    event.stopPropagation();
                    const optionsContainer = this.shadowRoot.getElementById('optionsContainer');
                    optionsContainer.style.display = optionsContainer.style.display === 'block' ? 'none' : 'block';
                }

                selectAllOptions(event) {
                    event.stopPropagation();
                    const isChecked = event.target.checked;
                    const checkboxes = this.shadowRoot.querySelectorAll('.option .checkbox');
                    checkboxes.forEach(checkbox => {
                        checkbox.checked = isChecked;
                        checkbox.closest('.option').classList.toggle('selected', isChecked);
                    });
                    this.updateSelectedColumns();
                }
                onclickMultiSelectOptions(event) {
                    event.stopPropagation();
                }
                filterOptions(event) {
                    const query = event.target.value.toLowerCase();
                    const options = this.shadowRoot.querySelectorAll('.option');
                    options.forEach(option => {
                        const label = option.querySelector('label').textContent.toLowerCase();
                        option.style.display = label.includes(query) ? 'flex' : 'none';
                    });
                }

                handleClickOutside(event) {
                    const multiSelect = this.shadowRoot.querySelector('.multi-select');
                    const optionsContainer = this.shadowRoot.getElementById('optionsContainer');
                    if (optionsContainer.style.display === 'block' && !multiSelect.contains(event.target)) {
                        optionsContainer.style.display = 'none';
                    }
                }

                updateSelectedColumns() {
                    const selectedItems = [];
                    const selectedItemsContainer = this.shadowRoot.getElementById('selectedItems');
                    selectedItemsContainer.innerHTML = ''; // Clear previous items

                    this.shadowRoot.querySelectorAll('.option .checkbox').forEach(checkbox => {
                        if (checkbox.checked) {
                            selectedItems.push(checkbox.value);
                            const selectedItem = document.createElement('div');
                            selectedItem.classList.add('selected-item');
                            selectedItem.textContent = checkbox.value;
                            selectedItem.innerHTML += `<span>&times;</span>`;
                            selectedItemsContainer.appendChild(selectedItem);

                            selectedItem.querySelector('span').addEventListener('click', () => {
                                checkbox.checked = false;
                                selectedItemsContainer.removeChild(selectedItem);
                                this.updateSelectedColumns();
                            });
                        }
                    });

                    this.selectedItems = selectedItems;
                    this.shadowRoot.getElementById('selected-columns').textContent = (getCookie("UserLang") == "ar" ? "البيانات المختارة " : "Selected data") + `(${selectedItems.length})`;
                    this.shadowRoot.getElementById('selected-columns').setAttribute('value', selectedItems.join(','));
                }
            }

            class CrudNavBar extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: 'open' });

                    this.name = this.getAttribute("name");
                    this.shadowRoot.innerHTML = `
        <style>
            :host {
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            }
            .btn {
                border: none;
                cursor: pointer;
                background: none;
                color: #c9d1d9;
                margin: 0 4px;
                padding: 6px;
                border-radius: 6px;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            .btn:hover {
                transform: scale(1.1);
                background: rgba(59, 130, 246, 0.15);
                color: #60a5fa;
            }
            .btn:active {
                transform: scale(0.95);
            }

            .btn-insert svg {
                width: 28px;
                height: 28px;
                fill: #3b82f6;
            }
            .btn-insert:hover svg {
                fill: #60a5fa;
            }
            #tablesChildsSearch {
                font-size: 15px;
                padding: 4px 8px;
                background: rgba(255,255,255,0.06);
                color: #e8ecf1;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 6px;
            }
            #searchInputcrud {
                font-size: 15px;
                background: rgba(255,255,255,0.06);
                color: #e8ecf1;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 6px;
                padding: 6px 12px;
                transition: border-color 0.2s ease;
            }
            #searchInputcrud:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
            }
            #searchInputcrud::placeholder {
                color: #6b7280;
            }

            .navbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: linear-gradient(135deg, #2d3748, #343a40);
                color: #e8ecf1;
                padding: 10px 16px;
                border-radius: 8px;
                margin-bottom: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                flex-wrap: wrap;
                gap: 8px;
            }
            .navbar .left-buttons {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-wrap: wrap;
            }
            .buttonspageing {
                direction: ltr;
                display: flex;
                align-items: center;
                gap: 2px;
                min-width: 120px;
            }
            .navbar .left-buttons input {
                text-align: center;
                font-size: 15px;
                font-family: inherit;
            }
            .navbar .right-buttons {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .navbar .btn svg {
                width: 22px;
                height: 22px;
            }

            .navbar .input-group {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .navbar input[type="text"],
            .navbar input[type="number"] {
                padding: 5px 8px;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 6px;
                margin: 0 2px;
                background: rgba(255,255,255,0.06);
                color: #e8ecf1;
                font-family: inherit;
                font-size: 14px;
            }
            .navbar input[type="number"]:focus,
            .navbar input[type="text"]:focus {
                outline: none;
                border-color: #3b82f6;
            }

            .navbar label {
                margin: 0 4px;
                color: #a0aec0;
                font-size: 13px;
            }

            .btn-advanced-search { background: rgba(23, 162, 184, 0.15); border-radius: 6px; }
            .btn-export-excel    { background: rgba(40, 167, 69, 0.15); border-radius: 6px; }
            .btn-print           { background: rgba(255, 193, 7, 0.15); border-radius: 6px; }
            .btn-save            { background: rgba(59, 130, 246, 0.15); border-radius: 6px; }
            .btn-advanced-search:hover { background: rgba(23, 162, 184, 0.3); }
            .btn-export-excel:hover    { background: rgba(40, 167, 69, 0.3); }
            .btn-print:hover           { background: rgba(255, 193, 7, 0.3); }
            .btn-save:hover            { background: rgba(59, 130, 246, 0.3); }

            #lastBtn, #nextBtn, #prevBtn, #firstBtn {
                padding: 4px 6px;
                margin: 0;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 4px;
                font-size: 13px;
                color: #a0aec0;
                transition: all 0.15s ease;
            }
            #lastBtn:hover, #nextBtn:hover, #prevBtn:hover, #firstBtn:hover {
                background: rgba(59, 130, 246, 0.2);
                border-color: #3b82f6;
                color: #60a5fa;
            }
            .selectalloption {
                border: solid 1px rgba(26, 32, 53, 0.5);
            }
            #tableSearchInput {
                padding: 6px 12px;
                border-radius: 12px;
                font-size: 15px;
                background: rgba(255,255,255,0.06);
                color: #e8ecf1;
                border: 1px solid rgba(255,255,255,0.1);
                transition: border-color 0.2s ease;
            }
            #tableSearchInput:focus {
                outline: none;
                border-color: #3b82f6;
            }
        </style>

        <div class="navbar">
            <div class="left-buttons" >


                    <button class="btn btn-insert" id="insertBtn" title="${getCookie("UserLang") == "ar" ? "إضافة سجل جديد" : "Insert"}">
    <span style='color:#ffff;font-size:30px;font-weight:600'>+</span>
</button>
                       <input type="text" id="searchInputcrud" placeholder="${getCookie("UserLang") == "ar" ? "البحث السريع ..." : "Quick Search..."}" autocomplete="off" >

                            <button class="btn" id="searchBtnadvanced">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
    <path d="M9.5 3C5.36 3 2 6.36 2 10.5S5.36 18 9.5 18c1.47 0 2.84-.47 3.94-1.27l5.96 5.96 1.41-1.41-5.96-5.96c.8-1.1 1.27-2.47 1.27-3.94C17 6.36 13.64 3 9.5 3zm0 2c2.48 0 4.5 2.02 4.5 4.5S11.98 14 9.5 14 5 11.98 5 9.5 7.02 5 9.5 5z" fill="#17a2b8"></path>
</svg>
                            </button>
                 <input list="tablesChildsSearch" id="tableSearchInput" placeholder="${getCookie("UserLang") == "ar" ? "ملفات مرتبطة" : "related documents"}">
        <datalist id="tablesChildsSearch">
            <!-- Options will be populated here -->
        </datalist>
                <div class="buttonspageing" >
                       <button class="btn" id="lastBtn" title ="${getCookie("UserLang") == "ar" ? "الأخير" : "last"}">
                                    |&lt;
                        </button>
                        <button class="btn" id="nextBtn" title= "${getCookie("UserLang") == "ar" ? "التالي" : "next"}">
                                    <<
                        </button>
                        <button class="btn" id="prevBtn" title= "${getCookie("UserLang") == "ar" ? "السابق" : "previous"}">
                                    >>
                        </button>
                        <button class="btn" id="firstBtn" title = "${getCookie("UserLang") == "ar" ? "الأول" : "first"}">
                                    &gt;|
                        </button>
                         </div>
  <label for="pageNumber">${getCookie("UserLang") == "ar" ? "صفحة" : "page"}:</label>
                    <input type="number" id="pageNumber" min="1" value="1" style="width: 60px;">
                 <label for="pageNumber">${getCookie("UserLang") == "ar" ? "من" : "from"}:</label>
                       <label id="pagescount"></label>
                           <div class="input-group">
                         <label for="maxRows">${getCookie("UserLang") == "ar" ? "عدد السجلات" : "Max rows"}:</label>
                <input type="number" id="maxRows" min="1" data-val="${this.getAttribute("top") ? this.getAttribute("top") : 25}" value="${this.getAttribute("top") ? this.getAttribute("top") : 25}" style="width: 60px;">
                <label id="countdata"></label>



                    </div>


                    </div>
                    <div class="right-buttons">
                        



                                                 <multi-select checked="checked" name="${this.name}"></multi-select>

    <button class="btn btn-advanced-search" id="uploadFilesdataBtn" title="${getCookie("UserLang") == "ar" ? "رفع بيانات" : "upload file"}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="fill: #17a2b8;"><path d="M23 19v2H1v-2h22zM12 7l-8 8h16z"></path></svg>
    </button>
    <button class="btn btn-export-excel" id="exportExcelBtn" title="${getCookie("UserLang") == "ar" ? "تصدير إكسل" : "Export to Excel"}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="fill: #28a745;"><path d="M16 1H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h5v2H5v2h14v-2h-4v-2h5c1.1 0 2-.9 2-2V9l-6-8zM4 19V3h11v5h5v11H4z"></path></svg>
    </button>
    <button class="btn btn-print" id="printBtn" title="${getCookie("UserLang") == "ar" ? "طباعة" : "Print"}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="fill: #ffc107;"><path d="M19 8H5V3h14v5zm-4 9h-6v-1h6v1zm3-8H6c-1.1 0-2 .9-2 2v7h2v4h12v-4h2v-7c0-1.1-.9-2-2-2zm0 8h-2v2H7v-2H5v-5c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v5z"></path></svg>
    </button>
    <button class="btn btn-save" id="saveBtn" title="${getCookie("UserLang") == "ar" ? "حفظ" : "Save"}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="fill: #007bff;"><path d="M17 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-2.21 0-4-1.79-4-4 0-2.21 1.79-4 4-4 2.21 0 4 1.79 4 4 0 2.21-1.79 4-4 4zm3-10H6V5h9v4z"></path></svg>
    </button>
</div>
            </div>
            `;

                    // Event listeners for the buttons
                    this.shadowRoot.getElementById('searchInputcrud').oninput = () => this.search();
                    this.shadowRoot.getElementById('searchBtnadvanced').onclick = (e) => this.searchBtnadvancedfun(e);
                    this.shadowRoot.getElementById('insertBtn').onclick = () => this.insertData();
                    this.shadowRoot.getElementById('firstBtn').onclick = () => this.first();
                    this.shadowRoot.getElementById('prevBtn').onclick = () => this.prev();
                    this.shadowRoot.getElementById('nextBtn').onclick = () => this.next();
                    this.shadowRoot.getElementById('lastBtn').onclick = () => this.last();
                    this.shadowRoot.getElementById('uploadFilesdataBtn').onclick = () => this.uploadFilesdata();
                    this.shadowRoot.getElementById('exportExcelBtn').onclick = () => this.exportExcel();
                    this.shadowRoot.getElementById('printBtn').onclick = () => this.print();
                    this.shadowRoot.getElementById('saveBtn').onclick = () => this.save();

                    // Set default values for pagination inputs
                    const maxRowsInput = this.shadowRoot.getElementById('maxRows');
                    const pageNumberInput = this.shadowRoot.getElementById('pageNumber');

                    pageNumberInput.value = this.getAttribute('page') || 1;

                    maxRowsInput.onkeydown = (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            maxRowsInput.setAttribute("data-val", maxRowsInput.value);
                            this.updatePagination();
                        }
                    };

                    pageNumberInput.onchange = () => {
                        this.updatePagination();
                    };



                }




                searchBtnadvancedfun(e) {
                    // console.log(log('searchBtnadvancedfun')
                    let crudModal = this.shadowRoot.querySelector('crud-modal');

                    if (crudModal) {
                        crudModal.remove();
                    }


                    const crudModalString = `<crud-modal name="${this.name}" title="${getCookie("UserLang") == "ar" ? "البحث المتقدم" : "Advanced Search"}"></crud-modal>`;
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = crudModalString;
                    crudModal = wrapper.firstElementChild;
                    this.shadowRoot.appendChild(crudModal);
                    crudModal = this.shadowRoot.querySelector('crud-modal');

                    const modalBody = crudModal.shadowRoot.querySelector('.modal-body');


                    const crudTable = document.querySelector(`crud-table[name="${this.name}"]`);
                    const columns = crudTable.info.columns;

                    const columnOptions = columns.map(column => `
            <option value="${column.name}" data-type="${column.type}" "${column.referencedTable ? `data-reftb="${column.referencedTable}"` : ''}">
                ${column.trans_name || column.name}
            </option>
        `).join('');


                    const conditionOptions = `

            <option value="like">any</option>
            <option value="startwith">begin with</option>
            <option value="between">between</option>
            <option value="endwith">end with</option>
            <option value="=">=</option>
            <option value="<"><</option>
            <option value=">">></option>
            <option value="<="><=</option>
            <option value=">=">>=</option>
            <option value="<>">!=</option>
            <option value="=len">=len</option>
            <option value="<len"><len</option>
            <option value=">len">>len</option>
            <option value="<=len"><=len</option>
            <option value=">=len">>=len</option>
            <option value="in">in</option>

        `;

                    const crudModalBodyString = `
                <div class="advanced-search">
                    <h3 id="searchalert" style='color:red;text-align:ceneter'></h3>
                    <button id="clearBtn">clear</button>
                    <button id="addBtn">add</button>
                    <input id="searchInput" list="columnList" placeholder="${getCookie('UserLang') == 'ar' ? 'اختر حقل البحث' : 'Select filed name'}">
                    <datalist id="columnList">${columnOptions}</datalist>
                    <select id="conditionSelect">${conditionOptions}</select>
                     <span id="valueInputContainer">
               <input id="valueInput" class="valueInput" placeholder="${getCookie('UserLang') == 'ar' ? 'ادخل قيمة البحث' : 'Enter search value'}">
              </span>
                    <select id="condTypeSelect">
                        <option value="and">And</option>
                        <option value="or">Or</option>
                    </select>
                    <button id="searchBtn">search</button>
                    <table id="conditionTable">
                        <thead>
                            <tr>
                                <th>Column</th>
                                <th>Condition</th>
                                <th>Value</th>
                                <th>Type</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </crud-modal>
        `;

                    modalBody.innerHTML = crudModalBodyString





                    crudModal.openModal();
                    const saveChangesbtn = crudModal.shadowRoot.querySelector('#saveChanges');
                    if (saveChangesbtn) {
                        saveChangesbtn.remove();
                    }

                    crudModal.shadowRoot.getElementById('addBtn').onclick = () => this.addCondition(crudModal);




                    crudModal.shadowRoot.getElementById('searchBtn').onclick = () => {
                        if (crudModal.shadowRoot.getElementById('valueInput').val != "") {
                            this.addCondition(crudModal);
                        }
                        this.performSearch(crudModal);
                    };
                    crudModal.shadowRoot.getElementById('clearBtn').onclick = () => this.clearSearch(crudModal);
                    crudModal.shadowRoot.getElementById('searchInput').onchange = (e) => this.changeInputType(crudModal);
                    crudModal.shadowRoot.getElementById('conditionSelect').onchange = (e) => this.changeInputType(crudModal);
                    // Use onkeyup to ensure the value is up to date after key press
                    crudModal.shadowRoot.getElementById('valueInput').onkeyup = (e) => {
                        this.addConditionvalue(crudModal, e);
                        console.log("valueInput enter onkeyup", e.key, e.keyCode, e);
                    };

                    // Use onkeydown only for key press detection, but not for value handling
                    crudModal.shadowRoot.getElementById('valueInput').onkeydown = (e) => {
                        console.log("Keydown detected:", e.key, e.keyCode); // key is detected here
                        // Note: value might not be updated yet
                    };



                }

                changeInputType(crudModal) {

                    const condition = crudModal.shadowRoot.getElementById('conditionSelect').value;
                    const valueInputContainer = crudModal.shadowRoot.getElementById('valueInputContainer');

                    valueInputContainer.innerHTML = ''; // Clear existing inputs

                    const createInput = (type) => {
                        const input = document.createElement('input');
                        input.type = type;
                        input.className = 'valueInput';
                        return input;
                    };

                    let valueInput1, valueInput2, valueInput;
                    const crudTable = document.querySelector(`crud-table[name="${this.name}"]`);
                    const columns = crudTable.info.columns;
                    const selectedColumnName = crudModal.shadowRoot.getElementById('searchInput').value;
                    const columnObject = columns.find(col => col.name.toLowerCase().trim() === selectedColumnName.trim().toLowerCase() || col.trans_name === selectedColumnName);

                    if (!columnObject) {
                        // console.log('not found columnObject')
                        return;
                    }
                    if (!columnObject.type) {
                        // console.log('not found columnObject.type')
                        return;
                    }
                    const columnType = columnObject.type;
                    valueInputContainer.innerHTML = '';

                    if (condition === 'between') {

                        valueInput1 = createInputField(columnObject, null);
                        valueInput2 = createInputField(columnObject, null);
                        valueInput = document.createElement('input');

                        valueInput1.oninput = () => {
                            if (valueInput1.value > valueInput2.value) {
                                valueInput2.value = valueInput1.value;
                            }
                            valueInput.value = valueInput1.value + ' and ' + valueInput2.value


                        };

                        valueInput2.oninput = () => {
                            if (valueInput2.value < valueInput1.value) {
                                valueInput1.value = valueInput2.value;
                            }
                            valueInput.value = valueInput1.value + ' and ' + valueInput2.value
                        };
                        valueInput1.classList.add('valueInput');
                        valueInput2.classList.add('valueInput');
                        valueInput.type = 'hidden';
                        valueInput.id = 'valueInput';
                        valueInputContainer.appendChild(valueInput1);
                        valueInputContainer.appendChild(valueInput);
                        valueInputContainer.appendChild(valueInput2);
                    } else {
                        valueInput = createInputField(columnObject, null);
                        valueInput.id = "valueInput";

                        valueInputContainer.appendChild(valueInput);
                    }
                }

                clearSearch(crudModal) {
                    const tbody = crudModal.shadowRoot.getElementById('conditionTable').querySelector('tbody');
                    tbody.innerHTML = '';

                }
                addConditionvalue(crudModal, e) {
                    console.log("valueInput enter onkeyup xx 2", e.key, e.keyCode, e)

                    if (e.key === 'Enter') {
                        this.addCondition(crudModal);
                    }
                }
                addCondition(crudModal) {
                    const searchalert = crudModal.shadowRoot.getElementById('searchalert');
                    const searchInput = crudModal.shadowRoot.getElementById('searchInput');
                    const conditionSelect = crudModal.shadowRoot.getElementById('conditionSelect');
                    const valueInput = crudModal.shadowRoot.getElementById('valueInput');

                    const column = searchInput.value;
                    const condition = conditionSelect.value;
                    const value = valueInput.value;

                    const condType = crudModal.shadowRoot.getElementById('condTypeSelect').value;
                    searchalert.textContent = '';




                    if (value == null || value == '') {
                        searchalert.textContent = getCookie('UserLang') == 'ar' ? 'يجب أضافة قيمة البحث أولا' : 'You must add value to search to get results!';
                        setTimeout(() => {
                            searchalert.textContent = '';
                        }, 3000);
                        return;
                    }

                    const crudTable = document.querySelector(`crud-table[name="${this.name}"]`);
                    const columns = crudTable.info.columns;
                    const columnObject = columns.find(col => col.name.toLowerCase().trim() === column.trim().toLowerCase() || col.trans_name == column);

                    if (columnObject.name == null) {
                        searchalert.textContent = getCookie('UserLang') == 'ar' ? 'يجب ختيار حقل البحث أولا' : 'You must add field to search to get results!';
                        setTimeout(() => {
                            searchalert.textContent = '';
                        }, 3000);
                        return;
                    }

                    const tbody = crudModal.shadowRoot.getElementById('conditionTable').querySelector('tbody');
                    const rows = tbody.querySelectorAll('tr');

                    // Check if the condition already exists
                    for (let row of rows) {
                        const cells = row.querySelectorAll('td');
                        if (cells[0].textContent.trim().toLowerCase() === column.trim().toLowerCase() &&
                            cells[1].textContent.trim() === condition &&
                            cells[2].textContent.trim() === value &&
                            cells[3].textContent.trim() === condType) {
                            searchalert.textContent = getCookie('UserLang') == 'ar' ? 'الشرط موجود بالفعل' : 'Condition already exists';
                            setTimeout(() => {
                                searchalert.textContent = '';
                            }, 3000);
                            return;
                        }
                    }

                    // If the condition does not exist, add it
                    const row = document.createElement('tr');
                    row.innerHTML = `
        <td>${column}</td>
        <td>${condition}</td>
        <td>${value}</td>
        <td>${condType}</td>
        <td><button class="removeBtn">remove</button></td>
    `;
                    tbody.appendChild(row);

                    row.querySelector('.removeBtn').onclick = () => {
                        tbody.removeChild(row);
                    };

                    valueInput.value = '';
                    searchInput.value = '';
                }

                performSearch(crudModal) {
                    let tbody = crudModal.shadowRoot.getElementById('conditionTable').querySelector('tbody');
                    let rows = tbody.querySelectorAll('tr');
                    if (rows.length == 0) {
                        this.addCondition(crudModal);
                        tbody = crudModal.shadowRoot.getElementById('conditionTable').querySelector('tbody');
                        rows = tbody.querySelectorAll('tr');
                    }
                    if (rows.length == 0) {
                        return;
                    }
                    const crudTable = document.querySelector(`crud-table[name="${this.name}"]`);
                    const columns = crudTable.info.columns;

                    const conditions = Array.from(rows).map(row => {
                        const cells = row.querySelectorAll('td');
                        const column = columns.find(col => col.name.toLowerCase().trim() === cells[0].textContent.trim().toLowerCase() || col.trans_name == cells[0].textContent);
                        const column_name_type = column.ReferencedTable ? 'name' : 'id';
                        return {
                            column_name: cells[0].textContent,
                            cond: cells[1].textContent,
                            value: cells[2].textContent,
                            cond_type: cells[3].textContent,
                            column_name_type: column_name_type
                        };
                    });

                    let name1 = this.name;
                    let crudnav = crudTable.shadowRoot.querySelector('crud-navbar');
                    let top1 = Number(crudnav.shadowRoot.getElementById('maxRows').getAttribute("data-val")) > 0 ? crudnav.shadowRoot.getElementById('maxRows').getAttribute("data-val") : crudnav.shadowRoot.getElementById('maxRows').value;
                    let page1 = crudnav.shadowRoot.getElementById('pageNumber').value;
                    let cond1 = JSON.stringify(conditions);
                    let cols1 = crudTable.cols;
                    crudTable.updateTable(name1, top1, page1, cond1, cols1);
                    crudModal.closeModal();
                }


                getDatatype(columnName) {
                    const crudTable = document.querySelector(`crud-table[name="${this.name}"]`);
                    const column = crudTable.info.columns.find(col => col.name === columnName);
                    return column ? column.type : 'nvarchar(max)';
                }
                getQueryParameter(name) {
                    let urlParams = new URLSearchParams(window.location.search);
                    return urlParams.get(name);
                }

                updatePagination() {
                    // Update the pagination based on input values
                    let top1 = Number(this.shadowRoot.getElementById('maxRows').getAttribute("data-val")) > 0 ? this.shadowRoot.getElementById('maxRows').getAttribute("data-val") : this.shadowRoot.getElementById('maxRows').value;
                    let page1 = this.shadowRoot.getElementById('pageNumber').value;
                    let name1 = this.getAttribute("name");
                    //  let cond1 =  this.getAttribute("cond") ? decodeFromBase64( this.getAttribute("cond")) : null;
                    //  let cols1 = this.getAttribute("cols");
                    let crudTable = document.querySelector(`crud-table[name="${name1}"]`);

                    if (crudTable) {
                        let cond1 = crudTable.cond;
                        let cols1 = crudTable.cols;

                        crudTable.updateTable(name1, top1, page1, cond1, cols1);
                    } else {
                        console.error(`No crud-table found with name attribute "${name1}"`);
                    }
                }

                search() {
                    // Function to handle search input
                    const query = this.shadowRoot.getElementById('searchInputcrud').value;

                    document.querySelector(`crud-table[name="${this.name}"]`).filterTable(query);
                }

                first() {
                    // Function to handle first button click
                    this.shadowRoot.getElementById('pageNumber').value = 1;
                    this.updatePagination();
                }


                insertData() {
                    let crudModal = this.shadowRoot.querySelector('crud-modal');
                    if (!crudModal) {
                        const crudModalString = `<crud-modal name="${this.name}" title="${getCookie("UserLang") == "ar" ? "سجل بيانات جديد" : "Add New Record !"}"></crud-modal>`;
                        const wrapper = document.createElement('div');
                        wrapper.innerHTML = crudModalString;
                        crudModal = wrapper.firstElementChild;
                        this.shadowRoot.appendChild(crudModal);
                    }

                    let form = crudModal.shadowRoot.getElementById('editForm');
                    if (!form) {
                        const modalBody = crudModal.shadowRoot.querySelector('.modal-body');
                        form = document.createElement('form');
                        form.id = 'editForm';
                        modalBody.appendChild(form);
                    }
                    form.addEventListener("submit", function (event) {
                        event.preventDefault();
                    });
                    form.setAttribute('data-id', '');
                    form.innerHTML = '';

                    const crudTable = document.querySelector(`crud-table[name="${this.name}"]`);
                    if (!crudTable || !crudTable.info || !crudTable.info.columns) {
                        alert(getCookie('UserLang') == 'ar' ? 'لم يتم تحميل بيانات الجدول بعد. تأكد من الاتصال بالسيرفر.' : 'Table data not loaded yet. Check server connection.');
                        return;
                    }
                    const columns = crudTable.info.columns;

                    const excludedColumns = ['branch_id', 'user_insert', 'begin_date', 'last_update', 'company_id'];

                    columns.forEach(column => {
                        if (!excludedColumns.includes(column.name.toLowerCase())) {
                            const formGroup = document.createElement('div');
                            formGroup.className = 'form-group';
                            if (column.name.toLowerCase() === 'id') {
                                formGroup.classList.add('hidden-field');
                                formGroup.setAttribute('data-field-name', 'id');
                            }
                            const label = document.createElement('label');
                            label.textContent = (column.trans_name || column.name) + (column.is_nullable ? '' : ' *');

                            let input;

                            if (column.ReferencedTable) {
                                input = document.createElement('input');
                                input.type = 'text';
                                input.className = 'form-control';
                                input.setAttribute('data-column', column.name);
                                input.dataset.isReferencedTable = 1;

                                input.setAttribute('data-original-value', '');
                                input.setAttribute('data-original-id', null);
                                input.required = !column.is_nullable;
                                const spanAdd = document.createElement('button');
                                spanAdd.style.marginLeft = '5px';
                                spanAdd.style.padding = '5px';
                                spanAdd.classList.add('btn')
                                spanAdd.classList.add('btn-th')
                                spanAdd.classList.add('btn-add')
                                spanAdd.innerHTML = '+';
                                spanAdd.onclick = (e) => { e.preventDefault(); crudTable.modalOpenTable(column.ReferencedTable, column.trans_name || column.name) }; // Add onclick event
                                formGroup.appendChild(spanAdd);
                                formGroup.appendChild(label);
                                formGroup.appendChild(input);
                                input.onfocus = (e) => {

                                    const autoCompleteTable = document.createElement('auto-complete-table');

                                    let itemObject = { id: null, value: null }
                                    autoCompleteTable.generateSearch(input, column.ReferencedTable, column, itemObject, (data) => {
                                        autoCompleteTable.setInput(input, data, column);
                                    });
                                    this.shadowRoot.appendChild(autoCompleteTable);

                                };
                            } else {

                                input = createInputField(column, null, this.name)
                                formGroup.appendChild(label);
                                formGroup.appendChild(input);
                            }


                            form.appendChild(formGroup);
                        }
                    });

                    crudModal.openModal();
                }



                prev() {
                    // Function to handle previous button click
                    if (Number(this.shadowRoot.getElementById('pageNumber').value) == 1)
                        return;
                    var pageNum = Number(this.shadowRoot.getElementById('pageNumber').value) - 1;

                    this.shadowRoot.getElementById('pageNumber').value = pageNum;
                    this.updatePagination();

                }

                next() {
                    // Function to handle next button click
                    let count = document.querySelector(`crud-table[name="${this.name}"]`).info.count;
                    let top = document.querySelector(`crud-table[name="${this.name}"]`).info.top;
                    //// console.log(top,count);

                    let maxpages = Math.ceil(Number(count) / Number(top))

                    if (Number(this.shadowRoot.getElementById('pageNumber').value) + 1 > maxpages) {
                        this.shadowRoot.getElementById('pageNumber').value = maxpages;
                    } else {
                        var pageNum = Number(this.shadowRoot.getElementById('pageNumber').value) + 1;
                        this.shadowRoot.getElementById('pageNumber').value = pageNum;
                        this.updatePagination();
                    }

                }

                last() {
                    // Function to handle last button click

                    let count = document.querySelector(`crud-table[name="${this.name}"]`).info.count;
                    let top = document.querySelector(`crud-table[name="${this.name}"]`).info.top;
                    //// console.log(top,count);

                    let maxpages = Math.ceil(Number(count) / Number(top))
                    this.shadowRoot.getElementById('pageNumber').value = maxpages;
                    this.updatePagination();
                }

                uploadFilesdata() {
                    // Function to handle advanced search button click
                }

                exportExcel() {
                    // Function to handle export to Excel button click
                }

                print() {
                    // Function to handle print button click
                }
                getModifiedData(dataMemory, dataOriginal) {
                    return dataMemory.filter((row, index) => {
                        return JSON.stringify(row) !== JSON.stringify(dataOriginal[index]);
                    });
                }

                save() {
                    _mascrudConfirm({
                        title: getCookie('UserLang') == 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?',
                        text: getCookie('UserLang') == 'ar' ? 'سيتم حفظ التعديلات' : 'You want to save changes!',
                        icon: 'warning',
                        confirmText: getCookie('UserLang') == 'ar' ? 'نعم، احفظ' : 'Yes, save it!',
                        cancelText: getCookie('UserLang') == 'ar' ? 'إلغاء' : 'Cancel'
                    }).then((confirmed) => {
                        if (!confirmed) return;
                        const crudTable = document.querySelector(`crud-table[name="${this.name}"]`);
                        const modifiedData = this.getModifiedData(crudTable.dataMemory, crudTable.dataOriginal);

                        if (modifiedData.length === 0) {
                            _mascrudAlert(
                                getCookie('UserLang') == 'ar' ? 'لا توجد تغييرات' : 'No Changes!',
                                getCookie('UserLang') == 'ar' ? 'لا يوجد تعديلات للحفظ.' : 'There are no changes to save.',
                                'info'
                            );
                            return;
                        }
                        let dataToSave = [];
                        let saveObj = { columns: crudTable.info.columns, data: modifiedData, name: this.name };
                        dataToSave.push(saveObj);
                        loading('saveobj' + this.name);
                        let savedapiobject = { id: "save", data: JSON.stringify(dataToSave) };
                        _postData('../../API/invoice', savedapiobject, (data) => {
                            unloading('saveobj' + this.name);

                            if (!(Number(data[0].updateResult) >= 0)) {
                                _mascrudAlert(
                                    getCookie('UserLang') == 'ar' ? 'فشل الحفظ!' : 'Not Saved!',
                                    data[0].updateResult,
                                    'error'
                                );
                            } else if (!(Number(data[0].insertResult) >= 0)) {
                                _mascrudAlert(
                                    getCookie('UserLang') == 'ar' ? 'فشل الحفظ!' : 'Not Saved!',
                                    data[0].insertResult,
                                    'error'
                                );
                            } else {
                                crudTable.dataOriginal = JSON.parse(JSON.stringify(crudTable.dataMemory));
                                _mascrudAlert(
                                    getCookie('UserLang') == 'ar' ? 'تم الحفظ!' : 'Saved!',
                                    getCookie('UserLang') == 'ar' ? 'تم حفظ التعديلات بنجاح.' : 'Your changes have been saved.',
                                    'success'
                                );
                            }
                        });
                    });
                }
            }


            class CrudTable extends HTMLElement {
                constructor() {
                    super();



                    this.attachShadow({ mode: 'open' });

                    this.name = this.getAttribute('name');
                    this.top = this.getAttribute('top') || 25;
                    this.page = this.getAttribute('page') || 1;
                    if (this.getAttribute('cond') && this.getAttribute('cond') != "") {
                        this.cond = decodeFromBase64(this.getAttribute('cond'));

                    }
                    this.cols = this.getAttribute('cols');

                    const style = `
            <style>
                :host {
                    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                }
                .btn {
                    border: none;
                    cursor: pointer;
                    background: none;
                    color: #c9d1d9;
                    margin: 0 3px;
                    padding: 4px;
                    border-radius: 5px;
                    transition: all 0.2s ease;
                    display: inline-flex;
                    align-items: center;
                }
                .btn:hover {
                    transform: scale(1.15);
                    background: rgba(59, 130, 246, 0.12);
                }

                #dataContainer_${this.name} {
                    overflow-x: auto;
                    overflow-y: auto;
                    height: 650px;
                    width: 100%;
                    position: relative;
                    border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.06);
                    scrollbar-width: thin;
                    scrollbar-color: #3b4a5a #1a2035;
                }
                #dataContainer_${this.name}::-webkit-scrollbar { width: 6px; height: 6px; }
                #dataContainer_${this.name}::-webkit-scrollbar-track { background: #1a2035; }
                #dataContainer_${this.name}::-webkit-scrollbar-thumb { background: #3b4a5a; border-radius: 3px; }
                #dataContainer_${this.name}::-webkit-scrollbar-thumb:hover { background: #4e6378; }

                .loading-spinner {
                    position: absolute;
                    top: 20%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 24px;
                    display: none;
                    z-index: 100;
                }

                #spinner_${this.name} {
                    border: 3px solid rgba(255,255,255,0.08);
                    border-top: 3px solid #3b82f6;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                #dataContainer_${this.name} table {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: auto;
                }

                #dataContainer_${this.name} th,
                #dataContainer_${this.name} td {
                    padding: 6px 10px;
                    border: none;
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                }

                #dataContainer_${this.name} td {
                    white-space: nowrap;
                    max-width: 500px;
                    overflow: auto;
                    font-size: 14px;
                }

                #dataContainer_${this.name} th {
                    background: linear-gradient(135deg, #2d3748, #343a40);
                    color: #a0aec0;
                    font-weight: 600;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    position: sticky;
                    top: 0;
                    z-index: 1;
                }

                #dataContainer_${this.name} td {
                    background-color: #1a2035;
                    color: #e8ecf1;
                    transition: background-color 0.15s ease;
                }

                #dataContainer_${this.name} tr:hover td {
                    background-color: rgba(59, 130, 246, 0.08);
                }

                /* Hide the ID column */
                #dataContainer_${this.name} td:nth-child(2),
                #dataContainer_${this.name} th:nth-child(2) {
                    display: none;
                }
                #dataContainer_${this.name} td:nth-child(1),
                #dataContainer_${this.name} th:nth-child(1) {
                    overflow: visible;
                }
                .righttable {
                    text-align: right;
                    direction: rtl;
                }
                .righttable td {
                    text-align: right;
                    direction: rtl;
                }

                .btn-info svg {
                    fill: #38bdf8;
                }
                .btn-warning svg {
                    fill: #fbbf24;
                }
                .btn-danger svg {
                    fill: #f87171;
                }
                .btn-info:hover { background: rgba(56, 189, 248, 0.12); }
                .btn-warning:hover { background: rgba(251, 191, 36, 0.12); }
                .btn-danger:hover { background: rgba(248, 113, 113, 0.12); }

                .icon {
                    width: 16px;
                    height: 16px;
                }
                .editable-input {
                    width: 100%;
                    margin: 0;
                    padding: 4px 6px;
                    border: 1px solid transparent;
                    background: transparent;
                    color: #e8ecf1;
                    font-family: inherit;
                    font-size: 14px;
                    border-radius: 4px;
                    transition: border-color 0.15s ease;
                }
                .editable-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    background: rgba(59, 130, 246, 0.06);
                }
            </style>
        `;

                    this.shadowRoot.innerHTML = `
            <crud-navbar name="${this.name}" top="${this.top}" ${this.cols ? `cols="${this.cols}"` : ``} ${this.cond ? `cond="${encodeToBase64(this.cond)}"` : ''}></crud-navbar>
            <div id="dataContainer_${this.name}"></div>
            <div class="loading-spinner" id="spinner_${this.name}"></div>
            <crud-modal name="${this.name}" title="${getCookie("UserLang") == "ar" ? "تعديل بيانات سجل" : "Edit Record Data"}"></crud-modal>
            ${style}
        `;

                    this.dataMemory = [];
                }

                connectedCallback() {
                    console.log("updateTable 32");

                    this.updateTable(this.name, this.top, this.page, this.cond, this.cols);
                }

                updateTable(name, top, page, cond, cols) {
                    const dataContainer = this.shadowRoot.getElementById(`dataContainer_${this.name}`);
                    const spinner = this.shadowRoot.getElementById(`spinner_${this.name}`);
                    spinner.style.display = 'block';
                    try {
                        _postData('../../API/invoice?id=get', { name: name, top: top, page: page, cond: cond, cols: cols }, (data) => {
                            data = parseJsonValues(data);
                            console.log(data);

                            if (data.error) {


                                dataContainer.innerHTML = `<h1 style="color:#f87171;font-size:16px;text-align:center;padding:20px;"> Error : ${data.error}</h1>`
                                spinner.style.display = 'none';

                            } else {

                                if (data.data) {
                                    const updatedData = data.data.map(item => {
                                        const newItem = {};
                                        for (const key in item) {
                                            if (item.hasOwnProperty(key) && key.toLowerCase() !== "company_id") {
                                                newItem[key] = item[key];
                                            }
                                        }
                                        return newItem;
                                    });

                                    data.data = updatedData;
                                    this.dataMemory = data.data;
                                    this.dataOriginal = JSON.parse(JSON.stringify(data.data));

                                    this.info = data;
                                    // //// console.log(data);

                                    this.buildTable(data.data);
                                    spinner.style.display = 'none';

                                    this.shadowRoot.querySelector('crud-navbar').shadowRoot.getElementById("maxRows").value = data.data.length > 0 ? data.data.length : data.top ? data.top : 25;
                                    this.shadowRoot.querySelector('crud-navbar').shadowRoot.getElementById("countdata").innerHTML = (getCookie("UserLang") == "ar" ? ` من (${data.count})` : ` from (${data.count})`);
                                    this.shadowRoot.querySelector('crud-navbar').shadowRoot.getElementById("pagescount").innerHTML = Math.ceil(Number(data.count) / Number(data.top));
                                    const tablesChildsSearch = this.shadowRoot.querySelector('crud-navbar').shadowRoot.getElementById('tablesChildsSearch');
                                    this.info.table_childs.forEach(child => {
                                        const option = document.createElement('option');
                                        option.value = child.trans_tb_name || child.tb_name;
                                        option.setAttribute('data-tbname', child.tb_name);
                                        tablesChildsSearch.appendChild(option);
                                    });

                                    this.shadowRoot.querySelector('crud-navbar').shadowRoot.querySelector('multi-select').populateOptions(data.columns)

                                }
                                else {
                                    dataContainer.innerHTML = `<h1> Error : No Data </h1>`
                                    spinner.style.display = 'none';

                                }
                            }



                        });



                    } catch (err) {
                        document.getElementById(dataCrud).innerHTML = '<h1 style="text-align:center;color:red;">' + err + ' !</h1>';

                    }


                }


                updateSelectedItems(checkbox) {
                    const selectedItemsContainer = this.shadowRoot.querySelector('crud-navbar').shadowRoot.getElementById('selectedItems');
                    const selectedItem = document.createElement('div');

                    const optionDiv = checkbox.parentElement;
                    if (checkbox.checked) {
                        optionDiv.classList.add('selected');
                    } else {
                        optionDiv.classList.remove('selected');
                    }
                    selectedItem.classList.add('selected-item');


                    selectedItem.textContent = checkbox.value;

                    if (checkbox.checked) {
                        selectedItem.innerHTML += `<span>&times;</span>`;
                        selectedItemsContainer.appendChild(selectedItem);

                        selectedItem.querySelector('span').onclick = () => {
                            checkbox.checked = false;
                            selectedItemsContainer.removeChild(selectedItem);
                        };
                    } else {
                        const itemToRemove = Array.from(selectedItemsContainer.children).find(item => item.textContent === checkbox.value + '×');
                        if (itemToRemove) {
                            selectedItemsContainer.removeChild(itemToRemove);
                        }
                    }
                }


                filterTable(query) {
                    const filteredData = this.dataMemory.filter(item => {
                        return Object.values(item).some(value =>
                            value ? value.value ? String(value.value).toLowerCase().includes(query.toLowerCase()) : String(value).toLowerCase().includes(query.toLowerCase()) : false
                        );
                    });
                    this.buildTable(filteredData);
                }

                handleViewButtonClick(item) {
                    //// console.log("handleViewButtonClick event fired"); // Confirm event firing

                    const tableName = this.shadowRoot.querySelector('crud-navbar').shadowRoot.getElementById('tableSearchInput').value;
                    const selectedOption = Array.from(this.shadowRoot.querySelector('crud-navbar').shadowRoot.querySelectorAll('#tablesChildsSearch option')).find(option => option.value === tableName);
                    if (!selectedOption) {
                        _mascrudAlert(
                            getCookie('UserLang') == 'ar' ? 'خطأ' : 'Error',
                            getCookie('UserLang') == 'ar' ? 'يرجى اختيار جدول صحيح.' : 'Please select a valid table.',
                            'error'
                        );
                        return;
                    }

                    const tbName = selectedOption.getAttribute('data-tbname');
                    const findedObj = this.info.table_childs.find(obj => obj.tb_name === tbName);

                    if (!findedObj) {
                        _mascrudAlert(
                            getCookie('UserLang') == 'ar' ? 'خطأ' : 'Error',
                            getCookie('UserLang') == 'ar' ? 'الجدول غير موجود.' : 'Table not found.',
                            'error'
                        );
                        return;
                    }

                    const cond = [{ column_name: findedObj.column_name, value: item.ID }];

                    this.modalOpenTable(findedObj.tb_name, findedObj.trans_tb_name, cond)

                }

                modalOpenTable(tb_name, trans_tb_name, cond) {

                    const modal = document.createElement('div');

                    modal.classList.add('modal');
                    const modalsytle = document.createElement('style');
                    modalsytle.innerHTML = `   .modal {
                    display: none;
                    position: fixed;
                    z-index: 9999999;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    overflow: auto;
                    justify-content: center;
                    align-items: center;
                    background: rgba(10, 14, 23, 0.92);
                    backdrop-filter: blur(4px);
                    color: #e8ecf1;
                }

                .modal-content {
                    margin: 2% auto;
                    padding: 24px;
                    border: 1px solid rgba(255,255,255,0.06);
                    width: 92%;
                    max-width: 1400px;
                    border-radius: 12px;
                    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.04);
                    animation: modalSlideIn 0.3s ease-out;
                    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                    background: linear-gradient(145deg, #1e2a3a, #1a2035);
                    color: #e8ecf1;
                }

                @keyframes modalSlideIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                .modal-header {
                    padding: 8px 16px;
                    background: linear-gradient(135deg, #2d3748, #343a40);
                    color: #e8ecf1;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-radius: 8px;
                    margin-bottom: 12px;
                }
                .modal-header h2 {
                    font-size: 16px;
                    font-weight: 600;
                    margin: 0;
                }

                .modal-body {
                    padding: 4px 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .modal-footer {
                    padding: 12px 16px 4px;
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    border-top: 1px solid rgba(255,255,255,0.06);
                    margin-top: 12px;
                }

                .close {
                    background: rgba(255,255,255,0.06);
                    color: #a0aec0;
                    border: none;
                    font-size: 22px;
                    font-weight: 600;
                    cursor: pointer;
                    border-radius: 6px;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.15s ease;
                }

                .close:hover,
                .close:focus {
                    background: rgba(248, 113, 113, 0.15);
                    color: #f87171;
                }
`;
                    modal.appendChild(modalsytle)

                    modal.style.zIndex = getMaxZindex();
                    const modalContent = document.createElement('div');
                    modalContent.classList.add('modal-content');

                    const modalHeader = document.createElement('div');
                    modalHeader.classList.add('modal-header');
                    modalHeader.innerHTML = `
    <h2>${getCookie("UserLang") == "ar" ? "عرض بيانات" : "View data"}  ${trans_tb_name || tb_name}</h2>
    <span class="close" id="closeBtn">&times;</span>
`;

                    const modalBody = document.createElement('div');
                    modalBody.classList.add('modal-body');
                    modalBody.innerHTML = `<crud-table  name="${tb_name}"   "${cond ? ` cond="${encodeToBase64(JSON.stringify(cond))}"` : ""}" ></crud-table>`



                    const modalFooter = document.createElement('div');
                    modalFooter.classList.add('modal-footer');
                    const closeButton = document.createElement('button');
                    closeButton.textContent = 'Close';
                    closeButton.classList.add('btn', 'btn-secondary');
                    closeButton.onclick = () => {
                        modal.style.display = 'none';
                        document.body.removeChild(modal);
                    };

                    modalFooter.appendChild(closeButton);

                    modalContent.appendChild(modalHeader);
                    modalContent.appendChild(modalBody);
                    modalContent.appendChild(modalFooter);
                    modal.appendChild(modalContent);

                    document.body.appendChild(modal);
                    modal.style.display = 'flex';

                    document.getElementById('closeBtn').onclick = () => {
                        modal.style.display = 'none';
                        document.body.removeChild(modal);
                    };
                }


                buildTable(data) {

                    if (!data[0]) {
                        return
                    }
                    const container = this.shadowRoot.getElementById(`dataContainer_${this.name}`);

                    const table = document.createElement('table');
                    const thead = document.createElement('thead');
                    const tbody = document.createElement('tbody');

                    // Generate table headers based on keys of the first object
                    const headers = Object.keys(data[0]);
                    const headerRow = document.createElement('tr');



                    // Add CRUD column header
                    const crudTh = document.createElement('th');
                    crudTh.textContent = "Actions";
                    crudTh.isnotedit = true;
                    // Create the edit button and append it to the crudTh
                    const editBtn = document.createElement('button');
                    editBtn.innerHTML = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 16px; height: 16px;"><path d="M3 17.25V21h3.75l11.01-11.01-3.75-3.75L3 17.25zM21 7.24c0-.39-.15-.76-.44-1.06l-2.34-2.34a1.492 1.492 0 0 0-2.12 0l-1.83 1.83 3.75 3.75 1.83-1.83c.3-.3.45-.67.45-1.06z"></path></svg>';
                    editBtn.className = 'btn btn-warning btn-sm';
                    editBtn.onclick = () => this.toggleEditableHeaders();

                    crudTh.appendChild(editBtn);
                    headerRow.appendChild(crudTh);
                    headers.forEach(header => {

                        const th = document.createElement('th');
                        let columnObject = this.info.columns.find(obj => obj.name.toLowerCase() === header.toLowerCase());
                        //// console.log(columnObject)
                        th.setAttribute('data-colname', header); // Add data-colname attribute
                        let tranname = columnObject ? (columnObject.trans_name || header) : header;
                        th.setAttribute('data-transname', tranname); // Add data-colname attribute
                        //// console.log(columnObject)
                        if (columnObject && columnObject.ReferencedTable) {
                            th.setAttribute('data-reftable', columnObject.ReferencedTable)
                        }
                        this.addThdata(th);
                        headerRow.appendChild(th);
                    });
                    thead.appendChild(headerRow);
                    table.appendChild(thead);

                    // Generate table rows
                    data.forEach(item => {
                        const row = document.createElement('tr');
                        row.setAttribute('data-id', item.ID);

                        // Add CRUD buttons
                        const crudTd = document.createElement('td');
                        const viewBtn = document.createElement('button');
                        const editBtn = document.createElement('button');
                        const deleteBtn = document.createElement('button');

                        viewBtn.className = "btn btn-info btn-sm";
                        viewBtn.innerHTML = `
 <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 32px; height: 32px;">
            <path d="M12 4.5c-4.69 0-8.5 3.61-8.5 8s3.81 8 8.5 8 8.5-3.61 8.5-8-3.81-8-8.5-8zm0 14.5c-3.59 0-6.5-2.91-6.5-6.5s2.91-6.5 6.5-6.5 6.5 2.91 6.5 6.5-2.91 6.5-6.5 6.5zm1-6.5h-2v-5h2v5zm0 2h-2v-2h2v2z"></path>
        </svg>`;
                        viewBtn.onclick = () => this.handleViewButtonClick(item);


                        editBtn.className = "btn btn-warning btn-sm";
                        editBtn.innerHTML = `
<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 32px; height: 32px;">
            <path d="M3 17.25V21h3.75l11.01-11.01-3.75-3.75L3 17.25zM21 7.24c0-.39-.15-.76-.44-1.06l-2.34-2.34a1.492 1.492 0 0 0-2.12 0l-1.83 1.83 3.75 3.75 1.83-1.83c.3-.3.45-.67.45-1.06z"></path>
        </svg>`;
                        editBtn.onclick = () => this.editData(item);

                        deleteBtn.className = "btn btn-danger btn-sm";
                        deleteBtn.innerHTML = `
<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 32px; height: 32px;">
    <path d="M5 3h14c1.1 0 2 .9 2 2H3c0-1.1.9-2 2-2zm2 3v13c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V6H7zm2-3h6v2h-6V3zm6 0h-6v2h6V3z"/>

        </svg>`;
                        deleteBtn.onclick = () => this.deleteData(item.ID, this.info.name.toLowerCase(), row);

                        crudTd.appendChild(viewBtn);
                        crudTd.appendChild(editBtn);
                        crudTd.appendChild(deleteBtn);
                        row.appendChild(crudTd);

                        headers.forEach(header => {
                            const td = document.createElement('td');
                            let value = item[header];

                            if (typeof value === 'object' && value !== null && value.value) {
                                td.textContent = value.value;
                            } else {
                                value = value !== null ? value : '';
                                value = (typeof value === 'string') ? value.replace('T00:00:00', '') : value;
                                td.textContent = value;
                            }

                            if (header.toLowerCase() !== "branch_id" && header.toLowerCase() !== "user_insert" && header.toLowerCase() !== "begin_date") {


                                td.setAttribute('contenteditable', true);

                                this.tdConvertText(td, header, value);

                                const eventHandler = (e) => {

                                    this.clearalldivstd();
                                    e.target.style.backgroundColor = '#fff'; // Highlight cell on focus
                                    e.target.style.color = '#000'; // Highlight cell on focus
                                    e.target.style.whiteSpace = 'pre-wrap'
                                    const columnObject = this.info.columns.find(obj => obj.name.toLowerCase() === header.toLowerCase());

                                    if (columnObject && columnObject.ReferencedTable) {
                                        if (item[header] == null) {

                                            item[header] = { id: null, value: '' };
                                        }

                                        if (e.target.dataset.handled == '1') {

                                        } else {
                                            e.target.dataset.handled = '1';

                                            this.handleAutocomplete(td, columnObject, header, item[header]);
                                        }


                                    }


                                    this.tdbuildfile(td, header, item[header], item);




                                };


                                td.addEventListener('click', eventHandler);
                                td.addEventListener('focus', eventHandler);

                                td.onblur = (e) => {
                                    e.target.dataset.handled = '0';
                                    this.clearalldivstd();
                                    let newValue = ''

                                    if (e.target.querySelector('input')) {
                                        newValue = e.target.querySelector('input').value ? e.target.querySelector('input').value : '';

                                    } else {
                                        newValue = e.target.textContent.trim();

                                    }

                                    //console.log("newValue1", newValue)
                                    if (header !== 'ID') {
                                        // Update the item in memory
                                        if (typeof item[header] === 'object' && item[header] !== null) {

                                            // item[header].value = newValue;
                                        }
                                        else {


                                            item[header] = newValue;
                                        }
                                    }
                                    e.target.style.backgroundColor = ''; // Remove highlight on blur
                                    e.target.style.color = ''; // Highlight cell on focus
                                    e.target.style.whiteSpace = '';
                                    this.tdConvertText(e.target, header, newValue);

                                };



                            }

                            row.appendChild(td);
                        });
                        //  row.onmouseover = () => this.makeRowEditable(row, item, headers);
                        //   row.onmouseout = () => this.makeRowNonEditable(row, item, headers);
                        tbody.appendChild(row);
                    });

                    table.appendChild(tbody);
                    if (getCookie("UserLang") == "ar") {
                        container.classList.add("righttable");
                    }
                    container.innerHTML = ''; // Clear any existing content
                    container.appendChild(table);
                }


                toggleEditableHeaders() {
                    const thElements = this.shadowRoot.querySelectorAll('th');
                    const isEditable = Array.from(thElements).some(th => th.isContentEditable);

                    thElements.forEach(th => {

                        if (th.isnotedit) {
                            return;
                        }
                        if (!isEditable) {
                            th.contentEditable = true;
                            th.style.backgroundColor = '#fff';
                            th.style.color = '#000';
                            th.textContent = th.getAttribute("data-transname");
                            th.addEventListener('focus', (event) => this.thfocus(event));
                            th.addEventListener('blur', (event) => this.saveTranslatedText(event));
                        } else {
                            th.contentEditable = false;
                            th.style.backgroundColor = '';
                            th.style.color = '';
                            th.removeEventListener('focus', this.thfocus);
                            th.removeEventListener('blur', this.saveTranslatedText);
                            this.addThdata(th);


                        }
                    });
                }
                tdConvertText(td, header, value) {
                    if (header.toLowerCase().indexOf('image') > -1 || header.toLowerCase().indexOf('img') > -1 || header.toLowerCase().indexOf('photo') > -1 || header.toLowerCase().indexOf('attached') > -1) {


                        td.classList.add('phototd');
                        td.setAttribute('contenteditable', false);
                    } else if (header.toLowerCase().indexOf('url') > -1 || header.toLowerCase().indexOf('link') > -1) {
                        td.classList.add('linktd');
                        td.classList.add('divtd');
                        td.setAttribute("data-colname", header);

                        td.setAttribute('contenteditable', false);


                    }
                    if (value == null || value == "") {

                        return;
                    }
                    if (!header) {
                        return;
                    }
                    if (!td) {
                        return;
                    }
                    if (header.toLowerCase().indexOf('image') > -1 || header.toLowerCase().indexOf('img') > -1 || header.toLowerCase().indexOf('photo') > -1 || header.toLowerCase().indexOf('attached') > -1) {
                        if (value) {
                            let tdhtml = value;
                            if (value.toLowerCase().indexOf(".pdf") > -1) {

                                let aElement = document.createElement('a');
                                aElement.className = 'removeelm';
                                aElement.href = value;
                                aElement.target = '_blank';
                                aElement.onclick = (e) => { e.stopPropagation(); }

                                let iconElement = document.createElement('i');
                                iconElement.className = 'ace-icon fa fa-file-photo-o bigger-230';
                                iconElement.onclick = (e) => { e.stopPropagation(); }

                                let iframeElement = document.createElement('iframe');
                                iframeElement.className = 'removeelm';
                                iframeElement.src = value;
                                iframeElement.title = 'file upload';
                                iframeElement.style.width = '150px';
                                iframeElement.style.height = 'auto';
                                iframeElement.onload = function () {
                                    this.width = screen.width;
                                };
                                iframeElement.onclick = (e) => { e.stopPropagation(); }


                                aElement.appendChild(iconElement);

                                td.appendChild(aElement);
                                td.appendChild(iframeElement);

                            } else {


                                let aElement = document.createElement('a');
                                aElement.className = 'removeelm';
                                aElement.href = value;
                                aElement.target = '_blank';
                                aElement.onclick = (e) => {
                                    e.stopPropagation();
                                    //e.preventDefault();
                                    //let href =

                                }
                                aElement.style.cursor = 'pointer';
                                aElement.padding = '5px;'
                                let imgElement = document.createElement('img');
                                imgElement.className = 'removeelm';
                                imgElement.src = value;
                                imgElement.style.width = '100px';
                                imgElement.style.height = 'auto';
                                imgElement.style.maxHeight = '100px';
                                imgElement.onclick = (e) => {
                                    e.stopPropagation();
                                    //e.preventDefault();
                                }
                                td.innerHTML = '';
                                aElement.appendChild(imgElement)
                                td.appendChild(aElement);


                            }


                        }


                    }


                    if (header.toLowerCase().indexOf('url') > -1 || header.toLowerCase().indexOf('link') > -1) {


                        let aLink = document.createElement('a');
                        aLink.setAttribute("targer", "blank");
                        aLink.setAttribute("href", value);
                        aLink.classList.add("removeelm");
                        aLink.textContent = "Link";
                        aLink.onclick = (e) => { e.stopPropagation(); }
                        td.appendChild(aLink)




                    }
                }

                clearalldivstd() {
                    let divstds = this.shadowRoot.querySelectorAll('.divtd')

                    divstds.forEach(td => {
                        let tr = td.parentElement;
                        while (tr && tr.tagName !== 'TR') {
                            tr = tr.parentElement;
                        }

                        let id = tr.dataset.id;
                        // console.log(id);
                        const curitem = this.dataMemory.find(item => item.ID === id);
                        // console.log(curitem);
                        let header = td.getAttribute("data-colname");

                        let imageval = "";
                        let imgeelm = td.querySelector(".mastervalue");

                        if (imgeelm) {
                            imageval = imageval.value ? imageval.value : '';
                        }



                        // console.log(imageval)
                        // console.log(curitem[header])


                        td.style.backgroundColor = ''; // Remove highlight on blur
                        td.style.color = ''; // Highlight cell on focus
                        td.style.whiteSpace = '';
                        td.innerHTML = curitem[header] ? curitem[header] : '';
                        this.tdConvertText(td, header, td.innerHTML, curitem);

                    });




                }
                tdbuildfile(td, header, value, item) {
                    if (!header) {
                        return;
                    }
                    if (header.toLowerCase().indexOf('image') > -1 || header.toLowerCase().indexOf('img') > -1 || header.toLowerCase().indexOf('photo') > -1 || header.toLowerCase().indexOf('attached') > -1) {

                        td.classList.add('phototd');
                        td.classList.add('divtd');
                        td.setAttribute("data-colname", header);

                        let inputtext = document.createElement('input');
                        inputtext.classList.add('mastervalue');
                        inputtext.classList.add('removeelm');
                        inputtext.oninput = (e) => {

                            // console.log(item)
                            // console.log(item[header]);
                            // console.log(e.target.value?e.target.value:'');
                            item[header] = e.target.value ? e.target.value : '';
                            // console.log(item[header]);

                        }

                        inputtext.value = value;
                        inputtext.onclick = (e) => { e.stopPropagation(); }

                        let inputfiles = document.createElement('input');
                        inputfiles.setAttribute("type", "file");
                        inputfiles.classList.add('imagefile');
                        inputfiles.classList.add('removeelm');
                        inputfiles.onclick = (e) => { e.stopPropagation(); }

                        let imgfile = document.createElement('img');
                        imgfile.classList.add("imagesrc");
                        inputfiles.classList.add('removeelm');
                        imgfile.style.maxWidth = "100px;";
                        imgfile.style.height = "auto";
                        imgfile.style.maxHeight = '100px';

                        imgfile.onclick = (e) => {
                            e.stopPropagation();
                        }
                        inputfiles.onchange = (e) => {
                            // console.log("upload photo")
                            savephoto(inputtext, inputfiles, imgfile, this)
                        }
                        let spanclose = document.createElement('span');
                        spanclose.classList.add('removeelm');
                        spanclose.textContent = "X";
                        spanclose.style.padding = "5px;"
                        spanclose.onclick = (e) => {
                            e.stopPropagation();

                            this.clearalldivstd()

                        }



                        td.innerHTML = '';
                        td.appendChild(spanclose);

                        td.appendChild(inputtext);
                        td.appendChild(inputfiles);
                        td.appendChild(imgfile);




                    }


                }


                thfocus(event) {
                    const th = event.target;

                    th.getAttribute('data-transname')

                    th.textContent = th.getAttribute('data-transname');
                }
                saveTranslatedText(event) {
                    const th = event.target;

                    let oldval = th.getAttribute('data-transname').trim();


                    const translatedText = th.textContent.trim();
                    const word = th.dataset.colname;
                    const objecttype = this.name;
                    const langto = getCookie('UserLang');
                    const langfrom = 'en';
                    const compid = getCookie("CompId")
                    if (langto !== langfrom && translatedText !== word && oldval != translatedText) {
                        _postData('../../API/invoice?id=proc', {
                            name: "trans_fix_all",
                            parms: [word, objecttype, langfrom, langto, translatedText, compid]
                        }, function (data) {
                            // console.log(data);
                            if (Number(data) > 0) {
                                th.setAttribute('data-transname', translatedText);
                                // this.addThdata(th);
                            }
                        });
                    } else {

                        //  this.addThdata(th);
                    }


                }

                addThdata(th) {
                    let coltext = th.getAttribute('data-transname').trim();

                    const spanSort = document.createElement('span');
                    spanSort.style.marginLeft = '5px';
                    spanSort.style.padding = '5px';

                    spanSort.classList.add('btn')
                    spanSort.classList.add('btn-th')
                    spanSort.classList.add('btn-sort')
                    // console.log(spanSort.innerHTML);
                    if (spanSort.innerHTML == '' || spanSort.innerHTML == null) {
                        spanSort.innerHTML = '>';

                    }
                    spanSort.onclick = (e) => this.sortTable(th.getAttribute('data-colname'), spanSort, e);
                    th.innerHTML = '';
                    th.appendChild(spanSort);
                    if (th.getAttribute('data-reftable')) {
                        const spanAdd = document.createElement('span');
                        spanAdd.style.marginLeft = '5px';
                        spanAdd.style.padding = '5px';
                        spanAdd.classList.add('btn')
                        spanAdd.classList.add('btn-th')
                        spanAdd.classList.add('btn-add')
                        spanAdd.innerHTML = '+';
                        spanAdd.onclick = () => this.modalOpenTable(th.getAttribute('data-reftable'), coltext); // Add onclick event
                        th.appendChild(spanAdd);
                    }
                    const spanname = document.createElement('span');
                    spanname.textContent = coltext;

                    th.appendChild(spanname);


                }
                handleAutocomplete(td, columnObject, columnName, itemObject) {
                    td.dataset.column = columnName;
                    const referencedTableName = columnObject.ReferencedTable;
                    const query = td.textContent.trim();
                    const autoCompleteTable = document.createElement('auto-complete-table');
                    autoCompleteTable.generateSearch(td, referencedTableName, columnObject, itemObject, (data) => {
                        autoCompleteTable.setInput(td, data, columnObject);

                    });
                    this.shadowRoot.appendChild(autoCompleteTable);
                }

                sortTable(column, span, e) {
                    const isAscending = this.isAscending || false;
                    this.dataMemory.sort((a, b) => {
                        const valueA = a[column] !== null ? (a[column].value ? a[column].value : a[column]) : '';
                        const valueB = b[column] !== null ? (b[column].value ? b[column].value : b[column]) : '';

                        if (valueA > valueB) {
                            return isAscending ? 1 : -1;
                        } else if (valueA < valueB) {
                            return isAscending ? -1 : 1;
                        } else {
                            return 0;
                        }
                    });
                    this.isAscending = !isAscending; // Toggle the sorting order for next click

                    // Update the span icon
                    //// console.log(isAscending);
                    //// console.log(span)
                    if (isAscending) {
                        e.target.innerHTML = '&#9650;'; // Up arrow
                    } else {
                        e.target.innerHTML = '&#9660;'; // Down arrow
                    }

                    this.buildTable(this.dataMemory); // Rebuild table with sorted data
                }



                viewData(item) {
                    // Implement view functionality if needed
                }

                editData(item) {
                    let crudModal = this.shadowRoot.querySelector('crud-modal');
                    if (!crudModal) {
                        const crudModalString = `<crud-modal name="${this.name}" title="${getCookie("UserLang") == "ar" ? "تعديل بيانات سجل" : "Edit Record Data"}"></crud-modal>`;
                        const wrapper = document.createElement('div');
                        wrapper.innerHTML = crudModalString;
                        crudModal = wrapper.firstElementChild;
                        this.shadowRoot.appendChild(crudModal);
                    }

                    let form = crudModal.shadowRoot.getElementById('editForm');
                    if (!form) {
                        const modalBody = crudModal.shadowRoot.querySelector('.modal-body');
                        form = document.createElement('form');
                        form.id = 'editForm';
                        modalBody.appendChild(form);
                    }

                    form.setAttribute('data-id', item.ID);
                    form.innerHTML = '';

                    const crudTable = document.querySelector(`crud-table[name="${this.name}"]`);
                    const columns = crudTable.info.columns;

                    const excludedColumns = ['branch_id', 'user_insert', 'begin_date', 'last_update', 'company_id'];

                    columns.forEach(column => {
                        if (!excludedColumns.includes(column.name.toLowerCase())) {
                            const formGroup = document.createElement('div');
                            formGroup.className = 'form-group';
                            const label = document.createElement('label');
                            label.textContent = (column.trans_name || column.name) + (column.is_nullable ? '' : ' *');

                            let input;

                            if (column.ReferencedTable) {
                                input = document.createElement('input');
                                input.type = 'text';
                                input.className = 'form-control';
                                //input.setAttribute('list', `datalist_${column.name}`);

                                input.dataset.isReferencedTable = 1
                                input.setAttribute('data-column', column.name);
                                input.setAttribute('data-original-value', item[column.name] ? item[column.name].value : '');
                                input.setAttribute('data-original-id', item[column.name] ? item[column.name].id : null);
                                input.value = item[column.name] ? item[column.name].value : '';
                                input.required = !column.is_nullable;
                                input.setAttribute('data-id', item[column.name] ? item[column.name].id : '');
                                input.setAttribute('data-val', item[column.name] ? item[column.name].value : '');
                                const spanAdd = document.createElement('button');
                                spanAdd.style.marginLeft = '5px';
                                spanAdd.style.padding = '5px';
                                spanAdd.classList.add('btn')
                                spanAdd.classList.add('btn-th')
                                spanAdd.classList.add('btn-add')
                                spanAdd.innerHTML = '+';
                                spanAdd.onclick = (e) => { e.preventDefault(); this.modalOpenTable(column.ReferencedTable, column.trans_name || column.name) }; // Add onclick event
                                formGroup.appendChild(spanAdd);
                                formGroup.appendChild(label);
                                formGroup.appendChild(input);

                                //// console.log(item[column.name]);

                                let itemObject;

                                if (item[column.name]) {
                                    itemObject = { id: item[column.name].id, value: item[column.name].value }
                                }
                                input.onfocus = (e) => {
                                    const autoCompleteTable = document.createElement('auto-complete-table');
                                    autoCompleteTable.generateSearch(input, column.ReferencedTable, column, itemObject, (data) => {
                                        autoCompleteTable.setInput(input, data, column);
                                    });
                                    this.shadowRoot.appendChild(autoCompleteTable);
                                };

                            } else {

                                input = createInputField(column, item, this.name)
                                formGroup.appendChild(label);
                                formGroup.appendChild(input);
                            }


                            form.appendChild(formGroup);
                        }
                    });

                    crudModal.openModal();
                }



                deleteData(id, name, rowElement) {
                    _mascrudConfirm({
                        title: getCookie('UserLang') == 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?',
                        text: getCookie('UserLang') == 'ar' ? 'لن تتمكن من التراجع عن هذا!' : "You won't be able to revert this!",
                        icon: 'warning',
                        confirmText: getCookie('UserLang') == 'ar' ? 'نعم، احذف' : 'Yes, delete it!',
                        cancelText: getCookie('UserLang') == 'ar' ? 'إلغاء' : 'Cancel',
                        confirmClass: 'danger'
                    }).then((confirmed) => {
                        if (!confirmed) return;
                        _postData('../../API/invoice?id=delete&name=' + name + '&rowid=' + id, {}, function (response) {
                            if (response.error) {
                                _mascrudAlert(
                                    getCookie('UserLang') == 'ar' ? 'خطأ!' : 'Error!',
                                    response.error,
                                    'error'
                                );
                            } else {
                                _mascrudAlert(
                                    getCookie('UserLang') == 'ar' ? 'تم الحذف!' : 'Deleted!',
                                    getCookie('UserLang') == 'ar' ? 'تم حذف السجل بنجاح.' : 'Your record has been deleted.',
                                    'success'
                                ).then(function () {
                                    if (rowElement) {
                                        rowElement.remove();
                                    }
                                });
                            }
                        });

                    });
                }
            }

            class CrudModal extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: 'open' });

                    if (this.getAttribute("title")) {
                        this.title = this.getAttribute("title");
                    }
                    if (this.title == null) {
                        this.title = getCookie("UserLang") == "ar" ? "سجل بيانات" : "Data Record"
                    }
                    if (this.name == null && this.getAttribute("name") != null) {
                        this.name = this.getAttribute("name");

                    }
                    this.shadowRoot.innerHTML = `
<style>
                .modal {
    display: none;
    position: fixed;
    z-index: 99999;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: rgba(10, 14, 23, 0.95);
    backdrop-filter: blur(8px);
    justify-content: center;
    align-items: center;
}

                .modal-content {
                    background: linear-gradient(145deg, #1e2a3a, #1a2035);
                    color: #e8ecf1;
                    margin: 0;
                    padding: 0;
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    width: 100%;
                    height: 100%;
                    max-width: 100%;
                    border-radius: 0;
                    box-shadow: none;
                    animation: modalFadeIn 0.2s ease-out;
                    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                    display: flex;
                    flex-direction: column;
                }

                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }

                .modal-header {
                    padding: 16px 24px;
                    background: rgba(30, 42, 58, 0.95);
                    color: #e8ecf1;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    flex-shrink: 0;
                }

                .modal-header h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                    color: #fff;
                }

                .modal-body {
                    padding: 30px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    overflow-y: auto;
                    flex-grow: 1;
                    scrollbar-width: thin;
                    scrollbar-color: #4a5568 #1a2035;
                }

                .modal-body::-webkit-scrollbar { width: 8px; }
                .modal-body::-webkit-scrollbar-track { background: #1a2035; }
                .modal-body::-webkit-scrollbar-thumb { background: #4a5568; border-radius: 4px; }
                .modal-body::-webkit-scrollbar-thumb:hover { background: #718096; }

                .modal-footer {
                    padding: 16px 24px;
                    background: rgba(30, 42, 58, 0.95);
                    color: #e8ecf1;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    flex-shrink: 0;
                }

                .footer-start {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .footer-end {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .close {
                    color: #a0aec0;
                    font-size: 24px;
                    font-weight: 600;
                    cursor: pointer;
                    background: rgba(255, 255, 255, 0.06);
                    border: none;
                    border-radius: 8px;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    line-height: 1;
                }

                .close:hover,
                .close:focus {
                    background: rgba(248, 113, 113, 0.2);
                    color: #f87171;
                }

                .form-group {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    background: rgba(255, 255, 255, 0.02);
                    padding: 8px 12px;
                    border-radius: 8px;
                    border: 1px solid transparent;
                    transition: border-color 0.2s;
                }
                
                .form-group:focus-within {
                    border-color: rgba(59, 130, 246, 0.3);
                    background: rgba(255, 255, 255, 0.04);
                }

                .form-group label {
                    flex: 0 0 auto;
                    min-width: 160px;
                    font-weight: 500;
                    font-size: 14px;
                    color: #a0aec0;
                    text-align: right;
                }

                .form-group input,
                .form-group textarea,
                .form-group select {
                    flex: 1;
                    padding: 10px 14px;
                    font-size: 15px;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    color: #e8ecf1;
                    transition: all 0.2s ease;
                    outline: none;
                    font-family: inherit;
                }

                .form-group input:focus,
                .form-group textarea:focus,
                .form-group select:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                    background: rgba(0, 0, 0, 0.3);
                }

                .form-group input::placeholder,
                .form-group textarea::placeholder {
                    color: #718096;
                }

                .form-group input[type="checkbox"] {
                    flex: 0 0 auto;
                    width: 20px;
                    height: 20px;
                    accent-color: #3b82f6;
                    background: rgba(0,0,0,0.3);
                    cursor: pointer;
                }

                .form-group input[type="date"],
                .form-group input[type="datetime-local"] {
                    color-scheme: dark;
                }

                .form-group textarea {
                    min-height: 80px;
                    resize: vertical;
                }

                /* Toggle Switch for ID */
                .id-toggle-label {
                    color: #a0aec0;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    user-select: none; 
                }
                
                .id-toggle-checkbox {
                    appearance: none;
                    width: 36px;
                    height: 20px;
                    background: #4a5568;
                    border-radius: 20px;
                    position: relative;
                    cursor: pointer;
                    transition: background 0.3s;
                }
                
                .id-toggle-checkbox::after {
                    content: '';
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 16px;
                    height: 16px;
                    background: #fff;
                    border-radius: 50%;
                    transition: transform 0.3s;
                }
                
                .id-toggle-checkbox:checked {
                    background: #3b82f6;
                }
                
                .id-toggle-checkbox:checked::after {
                    transform: translateX(16px);
                }

                .hidden-field {
                    display: none !important;
                }

                .btn {
                    padding: 10px 24px;
                    border: none;
                    cursor: pointer;
                    border-radius: 8px;
                    font-size: 15px;
                    font-weight: 600;
                    transition: all 0.2s ease;
                    font-family: inherit;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    letter-spacing: 0.3px;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: #fff;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                }

                .btn-primary:hover {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
                    transform: translateY(-1px);
                }

                .btn-secondary {
                    background: rgba(255, 255, 255, 0.08);
                    color: #cbd5e0;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .btn-secondary:hover {
                    background: rgba(248, 113, 113, 0.15);
                    color: #f87171;
                    border-color: rgba(248, 113, 113, 0.3);
                }

                /* Custom Notification */
                .custom-toast {
                    position: absolute;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%) translateY(-20px);
                    background: rgba(16, 185, 129, 0.95);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
                    opacity: 0;
                    transition: all 0.3s ease;
                    z-index: 100000;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 500;
                    pointer-events: none;
                }
                .custom-toast.show {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
                .custom-toast.error {
                    background: rgba(239, 68, 68, 0.95);
                }
                .custom-toast-icon {
                    font-size: 18px;
                }
</style>

<div id="editModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2>${this.title}</h2>
            <span class="close" id="closeBtn">&times;</span>
        </div>
        <div class="modal-body" id="modalBody">
            <div id="toastNotification" class="custom-toast">
                <span class="custom-toast-icon">✓</span>
                <span id="toastMessage">Saved Successfully</span>
            </div>
            <div onsubmit="return false;" id="editForm"></div>
        </div>
        <div class="modal-footer">
            <div class="footer-start">
             <label class="id-toggle-label">
                    <input type="checkbox" id="showIdToggle" class="id-toggle-checkbox">
                    ${getCookie("UserLang") == "ar" ? "عرض المعرف" : "Show ID"}
                </label>
            </div>
            <div class="footer-end">
                <button type="button" class="btn btn-secondary" id="closeFooterBtn">${getCookie("UserLang") == "ar" ? "إلغاء" : "Cancel"}</button>
                <button type="button" class="btn btn-primary" id="saveChanges">${getCookie("UserLang") == "ar" ? "حفظ السجل" : "Save Record"}</button>
            </div>
        </div>
    </div>
</div>
        `;

                    // Event listeners for closing the modal
                    this.shadowRoot.getElementById('closeBtn').onclick = () => this.closeModal();
                    this.shadowRoot.getElementById('closeFooterBtn').onclick = () => this.closeModal();
                    this.shadowRoot.getElementById('saveChanges').onclick = () => this.saveInsert();

                    // Event listener for ID toggle
                    const idToggle = this.shadowRoot.getElementById('showIdToggle');
                    idToggle.addEventListener('change', (e) => {
                        const idField = this.shadowRoot.querySelector('div.form-group[data-field-name="id"]');
                        if (idField) {
                            if (e.target.checked) {
                                idField.classList.remove('hidden-field');
                            } else {
                                idField.classList.add('hidden-field');
                            }
                        }
                    });

                }

                // Helper to show custom toast
                showToast(message, isError = false) {
                    const toast = this.shadowRoot.getElementById('toastNotification');
                    const msgSpan = this.shadowRoot.getElementById('toastMessage');
                    const iconSpan = this.shadowRoot.querySelector('.custom-toast-icon');

                    msgSpan.textContent = message;
                    iconSpan.textContent = isError ? '✕' : '✓';

                    if (isError) {
                        toast.classList.add('error');
                    } else {
                        toast.classList.remove('error');
                    }

                    toast.classList.add('show');

                    setTimeout(() => {
                        toast.classList.remove('show');
                    }, 3000);
                }


                openModal() {
                    this.shadowRoot.getElementById('editModal').style.display = 'flex';
                }

                closeModal() {
                    // this.shadowRoot.getElementById('editModal').style.display = 'none';
                    //  this.shadowRoot.querySelector('crud-modal').remove();
                    this.remove();
                }





                saveInsert() {
                    const form = this.shadowRoot.getElementById('editForm');
                    const requiredFields = Array.from(form.querySelectorAll('input[required], textarea[required]'));
                    let isValid = true;

                    requiredFields.forEach(input => {
                        if (input.type !== 'checkbox' && !input.value.trim()) {
                            isValid = false;
                            alert(`Please fill out the required field: ${input.previousSibling.textContent}`);
                        } else if (input.dataset.isReferencedTable == 1 && (input.getAttribute('data-id') == null || input.getAttribute('data-id') == '')) {
                            isValid = false;
                            alert(`Please fill out the required field: ${input.previousSibling.textContent}`);
                        }
                    });

                    if (!isValid) {
                        return;
                    }

                    // Proceed directly without Swal confirmation
                    const newData = {};
                    let id = null;

                    Array.from(form.querySelectorAll('input, textarea')).forEach(input => {
                        const column = input.getAttribute('data-column');
                        if (!column) return; // skip inputs without data-column (e.g. file inputs)
                        if (column.toLowerCase() === 'id') {
                            id = input.value;
                        }

                        if (input.list) {
                            const datalist = input.list;
                            const selectedOption = Array.from(datalist.options).find(option => option.value === input.value);
                            if (selectedOption) {
                                newData[column] = {
                                    id: selectedOption.dataset.id,
                                    value: input.value
                                };
                            } else {
                                const originalValue = input.dataset.originalValue || '';
                                const originalId = input.dataset.originalId || null;
                                if (originalValue == '' || originalId == "null" || originalId == null || originalId == '') {
                                    newData[column] = null;
                                    input.value = '';
                                } else {
                                    newData[column] = { id: originalId, value: originalValue };
                                    input.value = originalValue;
                                    input.setAttribute('data-id', originalId);
                                }
                            }
                        } else {
                            let idval;

                            try {
                                idval = input.getAttribute("data-id");
                            } catch (err) {
                                //// console.log(err);
                            }
                            //// console.log("idval", idval);
                            if (idval) {
                                newData[column] = { id: input.dataset.id, value: input.dataset.val };
                            } else {
                                if (input.type === 'number') {
                                    newData[column] = input.value !== "" && Number(input.value) >= 0 ? Number(input.value) : null;
                                } else if (input.type === 'checkbox') {
                                    newData[column] = input.checked ? 1 : 0;
                                } else {
                                    newData[column] = input.value && input.value !== "" ? input.value : null;
                                }
                            }
                        }
                    });

                    // console.log(newData); // Print the new data object to the console

                    // Auto-inject default values for excluded/hidden columns
                    // Referenced columns must be {id: "...", value: "..."} for the backend OPENJSON $.col.id path
                    if (!newData['branch_id']) newData['branch_id'] = { id: getCookie('UserBranshID') || getCookie('BranchID') || '', value: '' };
                    if (!newData['user_insert']) newData['user_insert'] = { id: getCookie('UserID') || '', value: '' };
                    if (!newData['Company_ID'] && !newData['company_id']) newData['Company_ID'] = { id: getCookie('CompId') || '', value: '' };
                    if (!newData['begin_date'] && !newData['Begin_date']) newData['Begin_date'] = new Date().toISOString();

                    let newdataArr = [];
                    newdataArr.push(newData);

                    let dataToSave = [];
                    const crudTable = document.querySelector(`crud-table[name="${this.name}"]`);
                    let saveObj = { columns: crudTable.info.columns, data: newdataArr, name: this.name };
                    dataToSave.push(saveObj);

                    const saveBtn = this.shadowRoot.getElementById('saveChanges');
                    const originalBtnText = saveBtn.textContent;
                    saveBtn.textContent = getCookie("UserLang") == "ar" ? "جاري الحفظ..." : "Saving...";
                    saveBtn.disabled = true;

                    loading('saveobj' + this.name);

                    let savedapiobject = { id: "save", data: JSON.stringify(dataToSave) };
                    _postData('../../API/invoice', savedapiobject, (data) => {
                        unloading('saveobj' + this.name);
                        saveBtn.textContent = originalBtnText;
                        saveBtn.disabled = false;

                        // --- Check for save errors ---
                        let hasError = false;
                        let errorMsg = '';

                        if (Array.isArray(data) && data.length > 0) {
                            const result = data[0];
                            const inserted = Number(result.countInsertResult) || 0;
                            const updated = Number(result.countUpdateResult) || 0;

                            if (inserted === 0 && updated === 0) {
                                hasError = true;
                                // Extract error message from insertResult or updateResult
                                if (result.insertResult && typeof result.insertResult === 'string' && result.insertResult.length > 1) {
                                    errorMsg = result.insertResult;
                                } else if (result.updateResult && typeof result.updateResult === 'string' && result.updateResult.length > 1) {
                                    errorMsg = result.updateResult;
                                } else {
                                    errorMsg = getCookie("UserLang") == "ar" ? "فشل الحفظ - لم يتم إدراج أو تحديث أي سجل" : "Save failed - no records inserted or updated";
                                }
                            }
                        } else if (data && data.error) {
                            hasError = true;
                            errorMsg = data.error;
                        }

                        if (hasError) {
                            console.error('Save Error:', errorMsg);
                            this.showToast(getCookie("UserLang") == "ar" ? "فشل الحفظ: " + errorMsg : "Save failed: " + errorMsg, true);
                            return;
                        }

                        // --- Success ---
                        const crudTable = document.querySelector(`crud-table[name="${this.getAttribute('name')}"]`);
                        const existingItemIndex = crudTable.dataMemory.findIndex(item => item.ID === id);

                        if (existingItemIndex !== -1) {
                            crudTable.dataMemory[existingItemIndex] = newData;
                            crudTable.dataOriginal[existingItemIndex] = JSON.parse(JSON.stringify(newData));
                        } else {
                            crudTable.dataMemory.unshift(newData);
                            crudTable.dataOriginal.unshift(JSON.parse(JSON.stringify(newData)));
                        }

                        crudTable.buildTable(crudTable.dataMemory);
                        this.showToast(getCookie("UserLang") == "ar" ? "تم الحفظ بنجاح" : "Saved Successfully");

                        setTimeout(() => {
                            this.closeModal();
                        }, 1000);
                    });
                }

            }



            safeDefine('auto-complete-table', AutoCompleteTable);
            safeDefine('multi-select', MultiSelect);
            safeDefine('crud-navbar', CrudNavBar);
            safeDefine('crud-modal', CrudModal);
            safeDefine('crud-table', CrudTable);



            function parseJsonValues(obj) {
                // Iterate over each property in the object
                for (let key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        try {
                            // Attempt to parse the value as JSON
                            let parsedValue = JSON.parse(obj[key]);

                            // If successful, replace the original value with the parsed JSON object
                            obj[key] = parsedValue;
                        } catch (e) {
                            // If parsing fails, the value is not a JSON string, so leave it as is
                        }

                        // Recursively parse nested objects
                        if (typeof obj[key] === 'object' && obj[key] !== null) {
                            parseJsonValues(obj[key]);
                        }
                    }
                }
                return obj;
            }

            function encodeToBase64(str) {
                const utf8Bytes = new TextEncoder().encode(str); // Convert string to UTF-8 bytes
                const base64String = btoa(String.fromCharCode.apply(null, utf8Bytes)); // Convert bytes to Base64
                return base64String;
            }

            function decodeFromBase64(base64Str) {
                const binaryString = atob(base64Str); // Convert Base64 to binary string
                const utf8Bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0)); // Convert binary string to bytes
                const decodedString = new TextDecoder().decode(utf8Bytes); // Decode bytes to UTF-8 string
                return decodedString;
            }
            function generateUniqueID() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }

            function getTodayDate(type) {
                const today = new Date();
                if (type === 'date') {
                    return today.toISOString().split('T')[0];
                } else if (type === 'datetime-local') {
                    return today.toISOString().slice(0, 16);
                }
                return '';
            }

            function getInputTypeForSQLType(type, length) {
                // For SQL types, you can add more cases as needed
                switch (type.toLowerCase()) {
                    case 'varchar':
                    case 'nvarchar':
                    case 'text':
                    case 'ntext':
                        if (length >= 300) {
                            return 'textarea';
                        }
                        return 'text';
                    case 'int':
                    case 'smallint':
                    case 'bigint':
                        return 'number';
                    case 'bit':
                        return 'checkbox';
                    case 'datetime':
                    case 'smalldatetime':
                    case 'date':
                        return 'date';
                    default:
                        return 'text';
                }
            }

            function createInputField(column, item, tableName) {
                const colNameLower = column.name.toLowerCase();

                // ── Code field → auto-fetch next sequence ──
                if (colNameLower === 'code' && !item && tableName) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'form-control';
                    input.setAttribute('data-column', column.name);
                    input.required = !column.is_nullable;
                    input.readOnly = true;
                    input.style.cssText = 'opacity:0.6;cursor:not-allowed;';
                    input.value = getCookie('UserLang') == 'ar' ? 'جاري التحميل...' : 'Loading...';

                    // Fetch next code from server
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', '../../ERP/newcode?tb=' + encodeURIComponent(tableName) + '&num=code', true);
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState === 4 && xhr.status === 200) {
                            input.value = xhr.responseText.toString().replace(/"/g, '').trim();
                            input.style.opacity = '1';
                        }
                    };
                    xhr.send();
                    return input;
                }

                // ── Phone fields → sanitize on blur ──
                if (colNameLower.indexOf('phone') > -1) {
                    const input = document.createElement('input');
                    input.type = 'tel';
                    input.className = 'form-control';
                    input.setAttribute('data-column', column.name);
                    input.required = !column.is_nullable;
                    input.placeholder = getCookie('UserLang') == 'ar' ? 'رقم الهاتف' : 'Phone number';
                    if (item) input.value = item[column.name] || '';

                    // Sanitize on blur: Arabic→English numerals, strip non-digits
                    input.addEventListener('blur', function () {
                        var v = this.value;
                        // Arabic-Indic digits ٠١٢٣٤٥٦٧٨٩
                        v = v.replace(/[\u0660-\u0669]/g, function (c) { return c.charCodeAt(0) - 0x0660; });
                        // Extended Arabic-Indic (Persian/Urdu) ۰۱۲۳۴۵۶۷۸۹
                        v = v.replace(/[\u06F0-\u06F9]/g, function (c) { return c.charCodeAt(0) - 0x06F0; });
                        // Remove everything except digits
                        v = v.replace(/[^0-9]/g, '');
                        this.value = v;
                    });

                    return input;
                }

                // ── Photo / Image / Attached → File Upload Widget ──
                if (colNameLower.indexOf('photo') > -1 || colNameLower.indexOf('image') > -1 || colNameLower.indexOf('attached') > -1) {
                    const wrapper = document.createElement('div');
                    wrapper.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
                    wrapper.setAttribute('data-column', column.name);
                    wrapper.classList.add('photo-upload-wrapper');

                    // Hidden text input to hold the URL value
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'text';
                    hiddenInput.className = 'form-control';
                    hiddenInput.setAttribute('data-column', column.name);
                    hiddenInput.placeholder = 'URL';
                    hiddenInput.required = !column.is_nullable;
                    hiddenInput.style.cssText = 'font-size:12px;opacity:0.7;';
                    if (item) hiddenInput.value = item[column.name] || '';

                    // File input (styled)
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'image/*';
                    fileInput.style.cssText = 'display:none;';

                    // Upload button
                    const uploadBtn = document.createElement('button');
                    uploadBtn.type = 'button';
                    uploadBtn.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 16px;background:linear-gradient(135deg,#2d3748,#3b4a5a);color:#a0aec0;border:2px dashed rgba(255,255,255,0.15);border-radius:10px;cursor:pointer;font-size:13px;font-weight:500;transition:all .2s ease;font-family:inherit;';
                    uploadBtn.innerHTML = '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>' +
                        (getCookie('UserLang') == 'ar' ? 'اختر صورة أو اسحبها هنا' : 'Choose image or drag here');
                    uploadBtn.onmouseenter = function () { this.style.borderColor = '#3b82f6'; this.style.color = '#e8ecf1'; };
                    uploadBtn.onmouseleave = function () { this.style.borderColor = 'rgba(255,255,255,0.15)'; this.style.color = '#a0aec0'; };
                    uploadBtn.onclick = function (e) { e.preventDefault(); fileInput.click(); };

                    // Image preview
                    const preview = document.createElement('img');
                    preview.style.cssText = 'max-width:120px;max-height:80px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);display:none;object-fit:cover;';
                    if (item && item[column.name]) {
                        preview.src = item[column.name];
                        preview.style.display = 'block';
                    }

                    // Upload status text
                    const statusText = document.createElement('span');
                    statusText.style.cssText = 'font-size:11px;color:#64748b;display:none;';

                    fileInput.onchange = function () {
                        if (!fileInput.files.length) return;
                        var file = fileInput.files[0];

                        // Show local preview immediately
                        var reader = new FileReader();
                        reader.onload = function (ev) {
                            preview.src = ev.target.result;
                            preview.style.display = 'block';
                        };
                        reader.readAsDataURL(file);

                        // Upload to server
                        statusText.style.display = 'inline';
                        statusText.textContent = getCookie('UserLang') == 'ar' ? '⏳ جاري الرفع...' : '⏳ Uploading...';
                        uploadBtn.style.pointerEvents = 'none';
                        uploadBtn.style.opacity = '0.5';

                        var formData = new FormData();
                        formData.append('myphotos', file);

                        var xhr = new XMLHttpRequest();
                        xhr.open('POST', '../../ERP/uploadimage?w=0&h=0');
                        xhr.send(formData);
                        xhr.onreadystatechange = function () {
                            if (xhr.readyState === 4 && xhr.status === 200) {
                                var src = xhr.responseText.toString();
                                if (src) {
                                    hiddenInput.value = src;
                                    preview.src = src;
                                    statusText.textContent = getCookie('UserLang') == 'ar' ? '✅ تم الرفع' : '✅ Uploaded';
                                    statusText.style.color = '#22c55e';
                                } else {
                                    statusText.textContent = getCookie('UserLang') == 'ar' ? '❌ فشل الرفع' : '❌ Upload failed';
                                    statusText.style.color = '#ef4444';
                                }
                                uploadBtn.style.pointerEvents = 'auto';
                                uploadBtn.style.opacity = '1';
                                setTimeout(function () { statusText.style.display = 'none'; statusText.style.color = '#64748b'; }, 3000);
                            }
                        };
                    };

                    wrapper.appendChild(uploadBtn);
                    wrapper.appendChild(fileInput);
                    wrapper.appendChild(hiddenInput);
                    wrapper.appendChild(preview);
                    wrapper.appendChild(statusText);
                    return wrapper;
                }

                // ── Standard input / textarea ──
                const inputType = getInputTypeForSQLType(column.type.split('(')[0], column.length);
                if (column.length > 60) {
                    //// console.log('texterea1');
                }
                let input;
                if (inputType === 'textarea') {
                    input = document.createElement('textarea');
                } else {
                    input = document.createElement('input');
                    input.type = inputType;
                }

                input.className = 'form-control';
                input.setAttribute('data-column', column.name);
                input.required = !column.is_nullable;

                if (inputType === 'date' || inputType === 'datetime-local') {
                    if (item) {
                        input.value = item[column.name] || getTodayDate(inputType);
                    } else {
                        input.value = getTodayDate(inputType);
                    }

                } else {
                    if (item) {
                        input.value = item[column.name] ? item[column.name].value || item[column.name] : '';
                    }

                }
                if (column.name.toLowerCase() === "id") {


                    input.readOnly = true;

                    if (item == null) {
                        input.value = generateUniqueID();
                    }
                }
                return input;
            }

            function getMaxZindex() {

                const maxZIndex = Array.from(document.querySelectorAll('body *'))
                    .map(a => parseFloat(window.getComputedStyle(a).zIndex))
                    .filter(a => !isNaN(a))
                    .sort((a, b) => b - a)[0] + 1 || 1000;

                return maxZIndex;
            }
            function isEventInChild(parent, event) {
                // //// console.log('Checking parent:', parent, 'for event target:', event.target);
                if (parent.contains(event.target)) {
                    // //// console.log('Event is inside parent:', parent);
                    return true;
                }
                const children = parent.children;
                for (let i = 0; i < children.length; i++) {
                    if (isEventInChild(children[i], event)) {
                        return true;
                    }
                }
                return false;
            }

            function setStopPropagationForChildren(element) {
                const children = element.children;
                for (let i = 0; i < children.length; i++) {
                    children[i].onclick = (e) => {
                        e.stopPropagation();
                    };
                    setStopPropagationForChildren(children[i]);
                }
            }


            function savephoto(input, fileinput, imgeElment, CURDelement) {

                let colname = fileinput.getAttribute("colname");
                let name = fileinput.getAttribute("name");

                let parentDiv = fileinput.parentElement;

                let olload = parentDiv.querySelector("#loadph_" + colname)
                if (olload) {
                    olload.remove();
                }
                let divload = document.createElement("div")
                divload.id = "loadph_" + colname;

                divload.innerHTML = '<div style="text-align:center;">	<img src="../../Templates/images/load23.gif" /></div>';
                parentDiv.appendChild(divload);


                // console.log(fileinput)

                var files = fileinput.files;
                var fileData = new FormData();

                for (var i = 0; i < files.length; i++) {
                    fileData.append("myphotos", files[i]);
                }

                var xhr = new XMLHttpRequest();
                xhr.open("POST", "../../ERP/uploadimage?w=" + "0" + "&h=" + "0");
                xhr.send(fileData);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState == 4 && xhr.status == 200) {
                        var src1 = xhr.responseText.toString();

                        if (src1 != "") {
                            input.value = src1;
                            imgeElment.setAttribute("src", src1);
                            var id = fileinput.closest('tr').getAttribute("data-id");
                            // console.log("tr id :",id)

                            let header = fileinput.closest('td').getAttribute("data-colname");
                            // console.log("this",CURDelement)
                            const curitem = CURDelement.dataMemory.find(item => item.ID === id);
                            curitem[header] = src1;
                        }
                        else {
                            imgeElment.setAttribute("src", "");
                        }
                        divload.remove();

                    }
                };
            }
        }

    }

    /**
     * MasCrud.openModal(tableName, options)
     * Opens a CRUD modal for any table programmatically.
     *
     * @param {string} tableName - The database table name (e.g. 'PM_Projects')
     * @param {Object} [options]
     * @param {string} [options.title]   - Custom modal title (defaults to tableName)
     * @param {string} [options.cols]    - Comma-separated column names to display (e.g. 'ID,name,email')
     * @param {Array}  [options.cond]    - Filter conditions array
     * @param {Function} [options.onClose] - Callback fired when modal is closed
     */
    function openCrudModal(tableName, options) {
        options = options || {};
        var title = options.title || tableName;
        var onClose = options.onClose || null;

        // Polyfill getpar if not available (it's external, used by cudbuild for URL params)
        if (typeof getpar === 'undefined') {
            window.getpar = function () { return ''; };
        }

        var modal = document.createElement('div');
        modal.style.cssText = 'display:flex;position:fixed;z-index:999999;left:0;top:0;width:100%;height:100%;overflow:auto;justify-content:center;align-items:flex-start;padding-top:2%;background:rgba(10,14,23,0.92);backdrop-filter:blur(4px);color:#e8ecf1;';

        var style = document.createElement('style');
        style.textContent = [
            '.mcm-content{margin:2% auto;padding:24px;border:1px solid rgba(255,255,255,0.06);width:92%;max-width:1400px;border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,0.5);animation:mcmSlideIn 0.3s ease-out;font-family:"Segoe UI",system-ui,-apple-system,sans-serif;background:linear-gradient(145deg,#1e2a3a,#1a2035);color:#e8ecf1;}',
            '@keyframes mcmSlideIn{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}',
            '.mcm-header{padding:8px 16px;background:linear-gradient(135deg,#2d3748,#343a40);color:#e8ecf1;display:flex;justify-content:space-between;align-items:center;border-radius:8px;margin-bottom:12px;}',
            '.mcm-header h2{font-size:16px;font-weight:600;margin:0;}',
            '.mcm-close{background:rgba(255,255,255,0.06);color:#a0aec0;border:none;font-size:22px;font-weight:600;cursor:pointer;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;transition:all 0.15s ease;}',
            '.mcm-close:hover{background:rgba(248,113,113,0.15);color:#f87171;}'
        ].join('\n');
        modal.appendChild(style);

        var content = document.createElement('div');
        content.className = 'mcm-content';

        // Header
        var header = document.createElement('div');
        header.className = 'mcm-header';
        var h2 = document.createElement('h2');
        h2.textContent = title;
        var closeBtn = document.createElement('span');
        closeBtn.className = 'mcm-close';
        closeBtn.innerHTML = '&times;';
        header.appendChild(h2);
        header.appendChild(closeBtn);

        // Body — cudbuild will create crud-table inside this container
        var body = document.createElement('div');
        var bodyId = '_mcm_body_' + Math.random().toString(36).substr(2, 9);
        body.id = bodyId;
        body.style.cssText = 'padding:4px 0;display:flex;flex-direction:column;gap:10px;';

        content.appendChild(header);
        content.appendChild(body);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // cudbuild registers custom elements + creates crud-table + triggers data fetch
        cudbuild(bodyId, tableName, { cols: options.cols || '', cond: options.cond || '' });

        // Close handler
        var doClose = function () {
            modal.style.display = 'none';
            if (modal.parentNode) document.body.removeChild(modal);
            if (typeof onClose === 'function') onClose();
        };
        closeBtn.onclick = doClose;
        modal.addEventListener('click', function (e) {
            if (e.target === modal) doClose();
        });
    }

    var MasCrud = {
        build: cudbuild,
        version: '1.1.0',
        openModal: openCrudModal
    };

    return MasCrud;

}));
