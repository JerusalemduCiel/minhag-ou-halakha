/* js/feuilleter.js — "Feuilleter le livre" : aperçu façon livre feuilletable.
   Gabarit unique copiable sur les 4 sites. Pages simples dans
   /animation/images/page1.jpg, page2.jpg … (page1 = couverture, dernière = 4e de couv).
   Déclencheur : tout élément [data-feuilleter]. Indiquer le nombre de pages via
   data-pages="22" (recommandé : évite les requêtes 404 de détection). Sans cet
   attribut, le module auto-détecte (jusqu'à MAX_PAGES). Le ratio de page est lu
   automatiquement sur la 1re image → fonctionne quel que soit le format du livre.
   Drop-in autonome : loader immédiat + préchargement parallèle + StPageFlip à la demande.
   Desktop = livre ouvert (2 pages) · Mobile = 1 page · swipe / drag / clic. */
(function () {
  'use strict';

  var IMG_BASE  = 'animation/images/page';
  var IMG_EXT   = '.jpg';
  var MAX_PAGES = 40;          // borne d'auto-détection si data-pages absent
  var LIB_URL   = 'https://cdn.jsdelivr.net/npm/page-flip/dist/js/page-flip.browser.js';

  var overlay, box, container, pageFlip, srcs = [], firstRatio = 0;

  // ---- préchargement PARALLÈLE + détection de la séquence contiguë + ratio de page ----
  function preload(count, done){
    var max = (count && count > 0) ? count : MAX_PAGES;
    var res = new Array(max + 1).fill(null), pending = max;
    for (var i = 1; i <= max; i++){
      (function(k){
        var im = new Image();
        im.onload  = function(){ res[k] = true; if (k === 1){ firstRatio = im.naturalWidth / im.naturalHeight; } if (--pending === 0) collect(); };
        im.onerror = function(){ res[k] = false; if (--pending === 0) collect(); };
        im.src = IMG_BASE + k + IMG_EXT;
      })(i);
    }
    function collect(){
      var list = [];
      for (var k = 1; k <= max; k++){ if (res[k]) list.push(IMG_BASE + k + IMG_EXT); else break; }
      done(list);
    }
  }

  // ---- chargement de la lib StPageFlip ----
  function loadLib(cb){
    if (window.St && window.St.PageFlip){ cb(); return; }
    var s = document.createElement('script');
    s.src = LIB_URL; s.onload = cb;
    s.onerror = function(){ console.error('[feuilleter] StPageFlip non chargée — vérifier LIB_URL'); };
    document.head.appendChild(s);
  }

  // ---- styles + modale (créés une seule fois) ----
  function ensureModal(){
    if (overlay) return;
    var style = document.createElement('style');
    style.textContent =
      '.ost-feuill-overlay{position:fixed;inset:0;z-index:10002;display:none;align-items:center;'+
      'justify-content:center;background:rgba(8,6,4,.94);padding:20px;}'+
      '.ost-feuill-overlay.active{display:flex;}'+
      '.ost-feuill-box{position:relative;}'+
      '.ost-feuill-close{position:absolute;top:-44px;right:0;width:38px;height:38px;border-radius:50%;'+
      'border:none;background:rgba(255,255,255,.14);color:#fff;font-size:24px;line-height:1;cursor:pointer;'+
      'display:flex;align-items:center;justify-content:center;z-index:3;}'+
      '.ost-feuill-close:hover{background:rgba(255,255,255,.28);}'+
      '.ost-feuill-hint{position:absolute;bottom:-32px;left:0;right:0;text-align:center;'+
      'color:#cbb88a;font-size:.8rem;letter-spacing:.02em;}'+
      '.ost-feuill-loader{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;'+
      'justify-content:center;gap:14px;color:#cbb88a;font-size:.9rem;min-width:60vw;min-height:60vh;}'+
      '.ost-feuill-spin{width:42px;height:42px;border:3px solid rgba(201,162,75,.25);'+
      'border-top-color:#c9a24b;border-radius:50%;animation:ost-spin .8s linear infinite;}'+
      '@keyframes ost-spin{to{transform:rotate(360deg);}}'+
      '.ost-feuill-box.loading #ost-feuill-flip,.ost-feuill-box.loading .ost-feuill-hint{visibility:hidden;}'+
      '.ost-feuill-box:not(.loading) .ost-feuill-loader{display:none;}'+
      '@media (max-width:768px){.ost-feuill-close{top:-42px;}.ost-feuill-hint{bottom:-30px;}}';
    document.head.appendChild(style);

    overlay = document.createElement('div');
    overlay.className = 'ost-feuill-overlay';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML =
      '<div class="ost-feuill-box loading">'+
      '<button class="ost-feuill-close" type="button" aria-label="Fermer">&times;</button>'+
      '<div id="ost-feuill-flip"></div>'+
      '<div class="ost-feuill-loader"><div class="ost-feuill-spin"></div><span>Chargement du livre…</span></div>'+
      '<div class="ost-feuill-hint">Glissez ou cliquez les bords pour tourner les pages</div>'+
      '</div>';
    document.body.appendChild(overlay);
    box = overlay.querySelector('.ost-feuill-box');
    container = overlay.querySelector('#ost-feuill-flip');

    overlay.querySelector('.ost-feuill-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
    });
  }

  // ---- construction du flip-book (reconstruit à chaque ouverture = responsive) ----
  function buildFlip(){
    if (pageFlip){ try { pageFlip.destroy(); } catch(e){} pageFlip = null; container.innerHTML = ''; }
    var ratio = firstRatio || 0.7;          // ratio lu sur la 1re image
    var wide = window.innerWidth >= 820, shown = wide ? 2 : 1;
    var availW = window.innerWidth  * (wide ? 0.90 : 0.96);
    var availH = window.innerHeight * 0.86;
    var pageH = Math.min(availH, (availW / shown) / ratio);
    var pageW = pageH * ratio;
    pageFlip = new St.PageFlip(container, {
      width: Math.round(pageW), height: Math.round(pageH),
      size: 'fixed', usePortrait: true, showCover: true,
      maxShadowOpacity: 0.5, flippingTime: 700, useMouseEvents: true, mobileScrollSupport: true
    });
    pageFlip.loadFromImages(srcs);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ box.classList.remove('loading'); }); });
  }

  function openModal(count){
    ensureModal();
    box.classList.add('loading');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    if (srcs.length){ buildFlip(); return; }
    var libOK = false, imgOK = false;
    function ready(){
      if (!libOK || !imgOK) return;
      if (!srcs.length){ box.querySelector('.ost-feuill-loader span').textContent = 'Aperçu indisponible'; return; }
      buildFlip();
    }
    loadLib(function(){ libOK = true; ready(); });
    preload(count, function(list){ srcs = list; imgOK = true; ready(); });
  }
  function closeModal(){
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  function init(){
    var t = document.querySelectorAll('[data-feuilleter]');
    for (var i=0;i<t.length;i++){
      (function(el){
        var n = parseInt(el.getAttribute('data-pages'), 10) || 0;
        el.addEventListener('click', function(e){ e.preventDefault(); openModal(n); });
      })(t[i]);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
