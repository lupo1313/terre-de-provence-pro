#!/usr/bin/env node
/*
 * Terre de Provence — mini-build de partials (zéro dépendance).
 * Assemble src/partials + src/pages + src/data/site.json -> docs/
 * Usage : node build.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const data = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'site.json'), 'utf8'));

// `node build.js`        -> docs/  (test GitHub Pages, sous-chemin)
// `node build.js --prod` -> dist/  (production : domaine réel, racine)
const isProd = process.argv.includes('--prod');
const OUT = path.join(ROOT, isProd ? 'dist' : 'docs');

// Empreinte du CSS/JS pour le cache-busting (indispensable avec un cache long sur Hostinger)
function hashFile(p) {
  try { return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex').slice(0, 10); }
  catch (e) { return 'dev'; }
}
const cssVer = hashFile(path.join(SRC, 'assets', 'css', 'styles.css'));
const jsVer = hashFile(path.join(SRC, 'assets', 'js', 'main.js'));
function bustCache(html) {
  return html
    .replace(/assets\/css\/styles\.css(?=")/g, 'assets/css/styles.css?v=' + cssVer)
    .replace(/assets\/js\/main\.js(?=")/g, 'assets/js/main.js?v=' + jsVer);
}

const read = (p) => fs.readFileSync(p, 'utf8');
const partial = (name) => read(path.join(SRC, 'partials', name + '.html'));

// --- helpers ---------------------------------------------------------------
function resolve(pathStr, ctx) {
  return pathStr.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
}
// Replace {{ a.b.c }} tokens from a context object (strings only).
function fill(tpl, ctx) {
  return tpl.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (m, key) => {
    const v = resolve(key, ctx);
    return (v === undefined || v === null) ? '' : String(v);
  });
}
function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}
function copyDir(from, to, skip = []) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const s = path.join(from, entry.name), d = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(s, d, skip);
    else fs.copyFileSync(s, d);
  }
}

const prodCfg = isProd ? (data.site.prod || {}) : {};
const baseUrl = (prodCfg.baseUrl || data.site.baseUrl).replace(/\/$/, '');
const prefix = ((isProd ? (prodCfg.pathPrefix || '') : (data.site.pathPrefix || ''))).replace(/\/$/, ''); // sous-chemin GitHub Pages (vide en prod racine)

// Préfixe les URLs racine (href/src/srcset commençant par "/") pour un déploiement en sous-dossier.
function applyPrefix(html) {
  if (!prefix) return html;
  return html
    .replace(/\b(href|src|data-href)="\/(?!\/)/g, `$1="${prefix}/`)
    .replace(/\bsrcset="([^"]*)"/g, (m, v) => `srcset="${v.replace(/(^|,\s*)\/(?!\/)/g, `$1${prefix}/`)}"`);
}
const pageUrl = (key) => {
  const slug = data.pages[key].slug;
  return baseUrl + (slug ? '/' + slug + '/' : '/');
};

// --- generated fragments ---------------------------------------------------
function rayonLinks() {
  return (data.rayons || []).map((r) => `<a href="/nos-produits/#${r.anchor}">${r.label}</a>`).join('');
}
function navHtml(currentKey) {
  return data.nav.map((key) => {
    const p = data.pages[key];
    const href = p.slug ? '/' + p.slug + '/' : '/';
    const active = key === currentKey ? ' aria-current="page" class="is-active"' : '';
    if (key === 'nos-produits' && data.rayons && data.rayons.length) {
      return `<li><details class="m-sub"><summary>${p.navLabel}<span class="acc-ico" aria-hidden="true">+</span></summary><div class="m-sublist"><a href="${href}"${active}>Tous nos produits</a>${rayonLinks()}</div></details></li>`;
    }
    return `<li><a href="${href}"${active}>${p.navLabel}</a></li>`;
  }).join('\n          ');
}
// Nav de l'en-tête : exclut l'accueil (le logo renvoie à l'accueil), avec état actif.
function navHeaderHtml(currentKey) {
  return data.nav.filter((key) => key !== 'accueil').map((key) => {
    const p = data.pages[key];
    const href = '/' + p.slug + '/';
    const active = key === currentKey ? ' aria-current="page" class="is-active"' : '';
    if (key === 'nos-produits' && data.rayons && data.rayons.length) {
      return `<div class="has-sub"><a href="${href}"${active} aria-haspopup="true">${p.navLabel}</a><div class="submenu">${rayonLinks()}</div></div>`;
    }
    return `<a href="${href}"${active}>${p.navLabel}</a>`;
  }).join('');
}
function footerNavHtml() {
  return data.nav.map((key) => {
    const p = data.pages[key];
    const href = p.slug ? '/' + p.slug + '/' : '/';
    return `<li><a href="${href}">${p.navLabel}</a></li>`;
  }).join('\n          ');
}
function legalLinksHtml() {
  return data.footerExtra.map((key) => {
    const p = data.pages[key];
    return `<li><a href="/${p.slug}/">${p.navLabel}</a></li>`;
  }).join('\n          ');
}
function openingHoursSpec() {
  return data.hours.spec.map((s) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: s.days,
    opens: s.open,
    closes: s.close
  }));
}
function localBusinessJsonld() {
  const n = data.nap;
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'GroceryStore',
    '@id': baseUrl + '/#store',
    name: data.site.name,
    description: data.site.tagline,
    telephone: n.phoneLink,
    url: baseUrl + '/',
    address: {
      '@type': 'PostalAddress',
      streetAddress: n.streetAddress,
      postalCode: n.postalCode,
      addressLocality: n.addressLocality,
      addressRegion: n.addressRegion,
      addressCountry: n.country
    },
    openingHoursSpecification: openingHoursSpec()
  };
  if (n.geo && n.geo.lat && n.geo.lng) {
    obj.geo = { '@type': 'GeoCoordinates', latitude: n.geo.lat, longitude: n.geo.lng };
  }
  return JSON.stringify(obj);
}
function faqJsonld() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (data.faq || []).map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  });
}
function breadcrumbJsonld(key) {
  const p = data.pages[key];
  const items = [{ name: 'Accueil', url: baseUrl + '/' }];
  if (key !== 'accueil') items.push({ name: p.breadcrumb, url: pageUrl(key) });
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: it.url
    }))
  });
}

// --- build -----------------------------------------------------------------
rmrf(OUT);
fs.mkdirSync(OUT, { recursive: true });

const head = partial('head');
const header = partial('header');
const footer = partial('footer');
const scripts = partial('scripts');
const year = String(new Date().getFullYear());

let built = 0;
for (const key of Object.keys(data.pages)) {
  const p = data.pages[key];
  const bodyFile = path.join(SRC, 'pages', key + '.html');
  if (!fs.existsSync(bodyFile)) { console.warn('! page manquante : ' + key); continue; }

  let jsonld =
    `<script type="application/ld+json">${localBusinessJsonld()}</script>\n` +
    `  <script type="application/ld+json">${breadcrumbJsonld(key)}</script>`;
  if (key === 'accueil' && data.faq && data.faq.length) {
    jsonld += `\n  <script type="application/ld+json">${faqJsonld()}</script>`;
  }

  const ctx = {
    site: data.site, nap: data.nap, hours: data.hours, legal: data.legal, delivery: data.delivery,
    page: p, year,
    canonical: pageUrl(key),
    ogImage: baseUrl + (p.ogImage || ''),
    robots: p.noindex ? 'noindex, follow' : 'index, follow',
    bodyClass: 'page-' + (p.slug || 'accueil'),
    nav: navHtml(key),
    navHeader: navHeaderHtml(key),
    footerNav: footerNavHtml(),
    legalLinks: legalLinksHtml(),
    jsonld
  };

  const body = fill(read(bodyFile), ctx);
  const full = bustCache(applyPrefix(fill([head, header, body, footer, scripts].join('\n'), ctx)));

  let outPath;
  if (key === '404') outPath = path.join(OUT, '404.html');
  else if (!p.slug) outPath = path.join(OUT, 'index.html');
  else outPath = path.join(OUT, p.slug, 'index.html');

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, full.trim() + '\n', 'utf8');
  built++;
}

// assets (skip the _raw staging folder)
copyDir(path.join(SRC, 'assets'), path.join(OUT, 'assets'), ['_raw']);

// static root files
if (fs.existsSync(path.join(SRC, '.htaccess'))) {
  fs.copyFileSync(path.join(SRC, '.htaccess'), path.join(OUT, '.htaccess'));
}

// robots.txt + sitemap.xml
const indexable = Object.keys(data.pages).filter((k) => k !== '404' && !data.pages[k].noindex);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  indexable.map((k) => `  <url><loc>${pageUrl(k)}</loc></url>`).join('\n') +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap, 'utf8');
fs.writeFileSync(path.join(OUT, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`, 'utf8');

console.log(`✓ Build ${isProd ? 'PROD' : 'test'} : ${built} pages -> ${path.basename(OUT)}/ (css v=${cssVer}, js v=${jsVer})`);
console.log(`  baseUrl = ${baseUrl}${prefix ? ' · sous-chemin ' + prefix : ' · racine'}`);
if (isProd && /REMPLACER/.test(baseUrl)) console.log('  ⚠ Renseigne site.prod.baseUrl (domaine réel) avant de téléverser dist/.');
