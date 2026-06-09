/* ============================================================
   GABARIT HERO-BIS — interactions (galerie, loupe, lightbox)
   Autonome. À déposer dans js/gabarit.js et charger en defer.
   Aucune dépendance. Crée sa propre lightbox.
   ============================================================ */
(function () {
  function init() {
    var gabarits = document.querySelectorAll('.gabarit');
    if (!gabarits.length) return;

    // Lightbox unique pour toute la page
    var lb = document.createElement('div');
    lb.className = 'gabarit-lightbox';
    var lbImg = document.createElement('img');
    lbImg.alt = 'Aperçu agrandi';
    lb.appendChild(lbImg);
    document.body.appendChild(lb);
    lb.addEventListener('click', function () { lb.classList.remove('open'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') lb.classList.remove('open');
    });

    var ZOOM = 2.4, LENS = 190;
    var canHover = window.matchMedia('(hover:hover)').matches;

    gabarits.forEach(function (g) {
      var main  = g.querySelector('.gabarit-cover');
      var loupe = g.querySelector('.loupe');
      var stage = g.querySelector('.cover-stage');
      var thumbsWrap = g.querySelector('.thumbs');
      if (!main) return;

      // Loupe au survol (desktop uniquement)
      if (canHover && loupe && stage) {
        main.addEventListener('mousemove', function (e) {
          var r = main.getBoundingClientRect();
          var sr = stage.getBoundingClientRect();
          var x = e.clientX - r.left, y = e.clientY - r.top;
          if (x < 0 || y < 0 || x > r.width || y > r.height) { loupe.style.display = 'none'; return; }
          loupe.style.display = 'block';
          loupe.style.backgroundImage = 'url(' + main.src + ')';
          loupe.style.backgroundSize = (r.width * ZOOM) + 'px ' + (r.height * ZOOM) + 'px';
          loupe.style.backgroundPosition = (-(x * ZOOM - LENS / 2)) + 'px ' + (-(y * ZOOM - LENS / 2)) + 'px';
          loupe.style.left = (e.clientX - sr.left - LENS / 2) + 'px';
          loupe.style.top  = (e.clientY - sr.top  - LENS / 2) + 'px';
        });
        main.addEventListener('mouseleave', function () { loupe.style.display = 'none'; });
      }

      // Clic couverture → lightbox plein écran
      main.addEventListener('click', function () {
        lbImg.src = main.src;
        lb.classList.add('open');
      });

      // Vignettes → change l'image principale
      if (thumbsWrap) {
        thumbsWrap.addEventListener('click', function (e) {
          var b = e.target.closest('.thumb');
          if (!b) return;
          main.src = b.getAttribute('data-src');
          g.querySelectorAll('.thumb').forEach(function (t) { t.classList.remove('active'); });
          b.classList.add('active');
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
