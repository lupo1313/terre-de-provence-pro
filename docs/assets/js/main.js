/* Terre de Provence — interactions (vanilla, sans dépendance) */
(function () {
  'use strict';

  /* ---- Badge Ouvert / Fermé (tous les jours 07:00–20:30) ---- */
  var OPEN = 7 * 60, CLOSE = 20 * 60 + 30;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(m) { return pad(Math.floor(m / 60)) + 'h' + pad(m % 60); }
  document.querySelectorAll('[data-open-badge]').forEach(function (el) {
    var now = new Date(), cur = now.getHours() * 60 + now.getMinutes();
    var open = cur >= OPEN && cur < CLOSE;
    el.classList.remove('is-open', 'is-closed');
    el.classList.add(open ? 'is-open' : 'is-closed');
    el.textContent = open
      ? 'Ouvert · ferme à ' + hhmm(CLOSE)
      : (cur < OPEN ? 'Fermé · ouvre à ' + hhmm(OPEN) : 'Fermé · ouvre demain à ' + hhmm(OPEN));
  });

  /* ---- Carte chargée au clic (RGPD) ---- */
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

  /* ---- Rayons en jeu de cartes (accueil) ---- */
  (function () {
    var pile = document.querySelector('.pile');
    if (!pile) return;
    var cartes = [].slice.call(pile.querySelectorAll('.carte-pile'));
    var n = cartes.length;
    var detail = document.querySelector('.detail');
    var titre = detail.querySelector('.detail-titre');
    var texte = detail.querySelector('.detail-texte');
    var lien = detail.querySelector('.lien');
    var compteur = detail.querySelector('.compteur');
    var actif = 0;

    var ecart = function (i) { var d = ((i - actif) % n + n) % n; if (d > n / 2) d -= n; return d; };

    function afficher(i, annoncer) {
      if (annoncer === undefined) annoncer = true;
      actif = (i + n) % n;
      cartes.forEach(function (c, k) {
        var d = ecart(k);
        c.style.setProperty('--d', d);
        c.style.setProperty('--ad', Math.abs(d));
        c.classList.toggle('is-active', d === 0);
        c.classList.toggle('is-loin', Math.abs(d) > 2);
        c.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
      });
      var c = cartes[actif];
      titre.textContent = c.dataset.titre;
      texte.textContent = c.dataset.texte;
      lien.href = c.dataset.href;
      lien.textContent = 'Découvrir le rayon ' + c.dataset.titre.toLowerCase();
      compteur.textContent = (actif + 1) + ' / ' + n;
      if (annoncer) { detail.classList.remove('is-change'); void detail.offsetWidth; detail.classList.add('is-change'); }
    }

    pile.addEventListener('click', function (e) {
      if (glisse) return;
      var c = e.target.closest('.carte-pile');
      if (!c) return;
      var i = cartes.indexOf(c);
      if (i === actif) location.href = c.dataset.href; else afficher(i);
    });

    document.querySelectorAll('[data-pas]').forEach(function (b) {
      b.addEventListener('click', function () { afficher(actif + Number(b.dataset.pas)); });
    });

    pile.addEventListener('keydown', function (e) {
      var cible = { ArrowRight: actif + 1, ArrowLeft: actif - 1, Home: 0, End: n - 1 }[e.key];
      if (cible !== undefined) { e.preventDefault(); afficher(cible); }
      if (e.key === 'Enter') location.href = cartes[actif].dataset.href;
    });

    var x0 = null, dx = 0, glisse = false;
    pile.addEventListener('pointerdown', function (e) { x0 = e.clientX; dx = 0; glisse = false; });
    pile.addEventListener('pointermove', function (e) {
      if (x0 === null) return;
      dx = e.clientX - x0;
      if (!glisse && Math.abs(dx) > 8) { glisse = true; pile.classList.add('is-dragging'); pile.setPointerCapture(e.pointerId); }
      if (glisse) pile.style.setProperty('--drag', (dx * 0.35) + 'px');
    });
    var fin = function () {
      if (x0 === null) return;
      pile.classList.remove('is-dragging');
      pile.style.setProperty('--drag', '0px');
      if (glisse && Math.abs(dx) > 40) afficher(actif + (dx < 0 ? 1 : -1));
      x0 = null;
      setTimeout(function () { glisse = false; }, 0);
    };
    pile.addEventListener('pointerup', fin);
    pile.addEventListener('pointercancel', fin);

    afficher(0, false);
  })();
})();
