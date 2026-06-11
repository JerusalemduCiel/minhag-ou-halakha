/* js/burger-menu.js — Menu burger mobile, boutiques Ora Shel Torah
   Toggle .active sur .burger-menu et .mobile-nav. Ferme au clic sur un lien
   ou en dehors. Drop-in autonome, sans dépendance. Rollback = retirer le <script>. */
(function () {
  'use strict';
  function init() {
    var burger = document.querySelector('.burger-menu');
    var menu = document.querySelector('.mobile-nav');
    if (!burger || !menu) return;

    burger.addEventListener('click', function () {
      menu.classList.toggle('active');
      burger.classList.toggle('active');
    });

    var links = menu.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function () {
        menu.classList.remove('active');
        burger.classList.remove('active');
      });
    }

    document.addEventListener('click', function (e) {
      if (!burger.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('active');
        burger.classList.remove('active');
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
