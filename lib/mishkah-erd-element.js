(function(){
  if (typeof window === 'undefined') return;
  var TAG = 'mishkah-erd';
  if (customElements && customElements.get(TAG)) return;

  function buildSrc(base, params) {
    if (!base) base = '/projects/dev-dashboard/erd-embed.html';
    var url = base;
    var hasQuery = url.indexOf('?') !== -1;
    var qs = [];
    Object.keys(params).forEach(function(key){
      if (params[key]) qs.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
    });
    if (qs.length) url += (hasQuery ? '&' : '?') + qs.join('&');
    return url;
  }

  function MishkahERDElement(){
    var el = Reflect.construct(HTMLElement, [], MishkahERDElement);
    el._iframe = null;
    el._mounted = false;
    el._container = null;
    el._loading = null;
    return el;
  }

  MishkahERDElement.prototype = Object.create(HTMLElement.prototype);
  MishkahERDElement.prototype.constructor = MishkahERDElement;
  MishkahERDElement.observedAttributes = ['theme', 'lang', 'dir', 'src', 'api-key', 'readonly'];

  MishkahERDElement.prototype.connectedCallback = function(){
    if (this._mounted) return;
    this._mounted = true;
    this.style.display = 'block';
    this.style.width = '100%';
    this.style.height = this.style.height || '100%';
    this.style.position = 'relative';

    var container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';

    var toolbar = document.createElement('div');
    toolbar.style.position = 'absolute';
    toolbar.style.top = '12px';
    toolbar.style.left = '12px';
    toolbar.style.zIndex = '2';

    var fullscreenBtn = document.createElement('button');
    fullscreenBtn.textContent = '⛶';
    fullscreenBtn.title = 'Full screen';
    fullscreenBtn.style.width = '32px';
    fullscreenBtn.style.height = '32px';
    fullscreenBtn.style.borderRadius = '50%';
    fullscreenBtn.style.border = '1px solid rgba(0,0,0,0.15)';
    fullscreenBtn.style.background = '#ffffff';
    fullscreenBtn.style.cursor = 'pointer';
    fullscreenBtn.style.fontSize = '14px';
    fullscreenBtn.style.fontFamily = 'inherit';
    fullscreenBtn.style.display = 'grid';
    fullscreenBtn.style.placeItems = 'center';

    function setFullscreenUi(isFullscreen) {
      fullscreenBtn.textContent = isFullscreen ? '⤫' : '⛶';
      fullscreenBtn.title = isFullscreen ? 'Exit full screen' : 'Full screen';
    }

    fullscreenBtn.addEventListener('click', function(){
      var target = container;
      if (!document.fullscreenElement) {
        if (target && target.requestFullscreen) target.requestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    });

    document.addEventListener('fullscreenchange', function(){
      setFullscreenUi(!!document.fullscreenElement);
    });

    setFullscreenUi(false);
    toolbar.appendChild(fullscreenBtn);

    var loading = document.createElement('div');
    loading.textContent = 'Loading ERD...';
    loading.style.position = 'absolute';
    loading.style.inset = '0';
    loading.style.display = 'grid';
    loading.style.placeItems = 'center';
    loading.style.background = 'rgba(255,255,255,0.6)';
    loading.style.color = '#111827';
    loading.style.fontSize = '13px';
    loading.style.zIndex = '1';

    var iframe = document.createElement('iframe');
    iframe.setAttribute('part', 'iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.addEventListener('load', function(){ loading.style.display = 'none'; });
    iframe.src = buildSrc(this.getAttribute('src'), {
      theme: this.getAttribute('theme'),
      lang: this.getAttribute('lang'),
      dir: this.getAttribute('dir'),
      apiKey: this.getAttribute('api-key'),
      readOnly: this.hasAttribute('readonly') ? 'true' : ''
    });
    container.appendChild(iframe);
    container.appendChild(loading);
    container.appendChild(toolbar);
    this.appendChild(container);
    this._iframe = iframe;
    this._container = container;
    this._loading = loading;
    var self = this;
    iframe.addEventListener('load', function(){
      try {
        self._iframe.contentWindow.postMessage({
          type: 'mishkah-erd-env',
          env: {
            theme: self.getAttribute('theme'),
            lang: self.getAttribute('lang'),
            dir: self.getAttribute('dir'),
            apiKey: self.getAttribute('api-key') || '',
            readOnly: self.hasAttribute('readonly')
          }
        }, '*');
      } catch (_err) {
        // ignore
      }
    });
  };

  MishkahERDElement.prototype.attributeChangedCallback = function(name, oldValue, newValue){
    if (!this._iframe || oldValue === newValue) return;
    if (name === 'src') {
      this._iframe.src = buildSrc(newValue, {
        theme: this.getAttribute('theme'),
        lang: this.getAttribute('lang'),
        dir: this.getAttribute('dir'),
        apiKey: this.getAttribute('api-key'),
        readOnly: this.hasAttribute('readonly') ? 'true' : ''
      });
      return;
    }
    try {
      this._iframe.contentWindow.postMessage({
        type: 'mishkah-erd-env',
        env: {
          theme: this.getAttribute('theme'),
          lang: this.getAttribute('lang'),
          dir: this.getAttribute('dir'),
          apiKey: this.getAttribute('api-key') || '',
          readOnly: this.hasAttribute('readonly')
        }
      }, '*');
    } catch (_err) {
      // ignore
    }
  };

  if (customElements && customElements.define) {
    customElements.define(TAG, MishkahERDElement);
  }
})();
