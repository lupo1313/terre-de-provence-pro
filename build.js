#!/usr/bin/env node
/*
 * Terre de Provence — mini-build de partials (zéro dépendance).
 * Assemble src/partials + src/pages + src/data/site.json -> docs/
 * Usage : node build.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'docs');
const data = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'site.json'), 'utf8'));

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

const baseUrl = data.site.baseUrl.replace(/\/$/, '');
const prefix = (data.site.pathPrefix || '').replace(/\/$/, ''); // ex: "/terre-de-provence-pro" pour un sous-chemin GitHub Pages

// Préfixe les URLs racine (href/src/srcset commençant par "/") pour un déploiement en sous-dossier.
function applyPrefix(html) {
  if (!prefix) return html;
  return html
    .replace(/\b(href|src)="\/(?!\/)/g, `$1="${prefix}/`)
    .replace(/\bsrcset="([^"]*)"/g, (m, v) => `srcset="${v.replace(/(^|,\s*)\/(?!\/)/g, `$1${prefix}/`)}"`);
}
const pageUrl = (key) => {
  const slug = data.pages[key].slug;
  return baseUrl + (slug ? '/' + slug + '/' : '/');
};

// --- generated fragments ---------------------------------------------------
function navHtml(currentKey) {
  return data.nav.map((key) => {
    const p = data.pages[key];
    const href = p.slug ? '/' + p.slug + '/' : '/';
    const active = key === currentKey;
    return `<li><a href="${href}"${active ? ' aria-current="page" class="is-active"' : ''}>${p.navLabel}</a></li>`;
  }).join('\n          ');
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

  const jsonld =
    `<script type="application/ld+json">${localBusinessJsonld()}</script>\n` +
    `  <script type="application/ld+json">${breadcrumbJsonld(key)}</script>`;

  const ctx = {
    site: data.site, nap: data.nap, hours: data.hours, legal: data.legal,
    page: p, year,
    canonical: pageUrl(key),
    ogImage: baseUrl + (p.ogImage || ''),
    robots: p.noindex ? 'noindex, follow' : 'index, follow',
    bodyClass: 'page-' + (p.slug || 'accueil'),
    nav: navHtml(key),
    footerNav: footerNavHtml(),
    legalLinks: legalLinksHtml(),
    jsonld
  };

  const body = fill(read(bodyFile), ctx);
  const full = applyPrefix(fill([head, header, body, footer, scripts].join('\n'), ctx));

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

console.log(`✓ Build terminé : ${built} pages -> docs/`);
console.log(`  Rappel : définir site.baseUrl dans src/data/site.json avant déploiement (actuel : ${baseUrl}).`);
