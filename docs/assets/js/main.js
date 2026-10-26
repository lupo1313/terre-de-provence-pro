/* Terre de Provence — interactions minimales (vanilla, sans dépendance) */
(function () {
  'use strict';

  /* ---- Menu mobile ---- */
  var toggle = document.getElementById('nav-toggle');
  var panel = document.getElementById('mobile-nav');
  if (toggle && panel) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      if (open) { panel.hidden = false; toggle.setAttribute('aria-label', 'Fermer le menu'); }
      else { panel.hidden = true; toggle.setAttribute('aria-label', 'Ouvrir le menu'); }
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 860) setOpen(false); });
  }

  /* ---- Badge Ouvert / Fermé (tous les jours 07:00–20:30) ---- */
  var OPEN = 7 * 60;          // 07:00
  var CLOSE = 20 * 60 + 30;   // 20:30
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(mins) { return pad(Math.floor(mins / 60)) + 'h' + pad(mins % 60); }
  document.querySelectorAll('[data-open-badge]').forEach(function (el) {
    var now = new Date();
    var cur = now.getHours() * 60 + now.getMinutes();
    var isOpen = cur >= OPEN && cur < CLOSE;
    el.classList.remove('is-open', 'is-closed');
    el.classList.add(isOpen ? 'is-open' : 'is-closed');
    el.textContent = isOpen
      ? 'Ouvert · ferme à ' + hhmm(CLOSE)
      : (cur < OPEN ? 'Fermé · ouvre à ' + hhmm(OPEN) : 'Fermé · ouvre demain à ' + hhmm(OPEN));
  });

  /* ---- Carte chargée au clic (RGPD : rien n'est appelé avant consentement) ---- */
  document.querySelectorAll('[data-map-load]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var host = btn.closest('.map-embed');
      if (!host) return;
      var q = btn.getAttribute('data-map-query') || '';
      var iframe = document.createElement('iframe');
      iframe.className = 'map-frame';
      iframe.loading = 'lazy';
      iframe.title = 'Carte — ' + q;
      iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      iframe.src = 'https://www.google.com/maps?q=' + encodeURIComponent(q) + '&output=embed';
      host.innerHTML = '';
      host.appendChild(iframe);
    });
  });
})();
