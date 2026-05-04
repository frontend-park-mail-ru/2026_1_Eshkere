(function (global) {
  'use strict';

  // Определяем origin из URL самого скрипта, чтобы SDK работал
  // и на локальном окружении, и в проде без изменений.
  var _script = document.currentScript;
  var BASE_URL = _script ? new URL(_script.src).origin : 'https://eshkereklama.ru';

  var STYLES_ID = 'eshkere-ads-styles';

  var STYLES =
    '.eshkere-ad{display:block;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
    'border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;background:#fff;' +
    'text-decoration:none;color:inherit;transition:box-shadow .15s}' +
    '.eshkere-ad:hover{box-shadow:0 4px 16px rgba(0,0,0,.10)}' +
    '.eshkere-ad__image{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}' +
    '.eshkere-ad__body{padding:10px 14px 6px}' +
    '.eshkere-ad__title{display:block;font-size:14px;font-weight:600;color:#111;' +
    'text-decoration:none;margin-bottom:4px;line-height:1.35}' +
    '.eshkere-ad__desc{font-size:12px;color:#6b7280;margin:0;line-height:1.45}' +
    '.eshkere-ad__footer{padding:6px 14px 10px;display:flex;justify-content:flex-end}' +
    '.eshkere-ad__label{font-size:10px;color:#9ca3af;letter-spacing:.4px;text-transform:uppercase}';

  function injectStyles() {
    if (document.getElementById(STYLES_ID)) return;
    var style = document.createElement('style');
    style.id = STYLES_ID;
    style.textContent = STYLES;
    (document.head || document.documentElement).appendChild(style);
  }

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildMarkup(ad) {
    var parts = [];
    parts.push(
      '<a class="eshkere-ad" href="' + esc(ad.target_url) + '"' +
      ' target="_blank" rel="noopener noreferrer sponsored">',
    );
    if (ad.image_url) {
      parts.push(
        '<img class="eshkere-ad__image" src="' + esc(ad.image_url) + '"' +
        ' alt="' + esc(ad.title) + '" loading="lazy">',
      );
    }
    parts.push('<div class="eshkere-ad__body">');
    parts.push('<span class="eshkere-ad__title">' + esc(ad.title) + '</span>');
    if (ad.short_desc) {
      parts.push('<p class="eshkere-ad__desc">' + esc(ad.short_desc) + '</p>');
    }
    parts.push('</div>');
    parts.push(
      '<div class="eshkere-ad__footer">' +
      '<span class="eshkere-ad__label">Реклама</span>' +
      '</div>',
    );
    parts.push('</a>');
    return parts.join('');
  }

  // ─── Advertiser feed-link flow ──────────────────────────────────────────────
  // Используется рекламодателями: EshkereAds.render({ token, container })
  function render(config) {
    if (!config || !config.token || !config.container) return;

    var container = document.getElementById(config.container);
    if (!container) return;

    fetch(BASE_URL + '/feed/' + config.token)
      .then(function (res) {
        if (!res.ok) throw new Error('no ad');
        return res.json();
      })
      .then(function (res) {
        injectStyles();
        container.innerHTML = buildMarkup(res.data || res);
      })
      .catch(function () {
        container.hidden = true;
      });
  }

  // ─── Partner block flow ─────────────────────────────────────────────────────
  // Используется площадками: <div data-eshkere-ad data-embed-token="..."></div>
  function initBlock(el) {
    if (!el || el.dataset.eshkereInited) return;
    el.dataset.eshkereInited = '1';

    var token = el.getAttribute('data-embed-token');
    if (!token) {
      el.hidden = true;
      return;
    }

    fetch(BASE_URL + '/ad/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embed_token: token }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('no ad');
        return res.json();
      })
      .then(function (res) {
        var payload = res.data || res;
        if (!payload || !payload.ad) throw new Error('no ad');
        injectStyles();
        el.innerHTML = buildMarkup(payload.ad);
      })
      .catch(function () {
        el.hidden = true;
      });
  }

  function initAllBlocks() {
    var els = document.querySelectorAll('[data-eshkere-ad]');
    for (var i = 0; i < els.length; i++) {
      initBlock(els[i]);
    }
  }

  // Запускаем авто-инициализацию как только DOM готов
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllBlocks);
  } else {
    initAllBlocks();
  }

  global.EshkereAds = { render: render, initBlock: initBlock };
})(window);
