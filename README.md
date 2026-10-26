# Terre de Provence — site vitrine

Site vitrine multipage, HTML/CSS/JS **sans framework**, assemblé par un mini-build de partials (zéro dépendance npm).

## Structure

```
src/
  data/site.json      → source unique : NAP, horaires, légal, pages + SEO
  partials/           → head, header, footer, scripts (factorisés)
  pages/              → le contenu propre de chaque page (<main>)
  assets/             → css, js, fonts, img  (le dossier img/_raw est ignoré au build)
build.js              → assemble src/ → docs/
docs/                 → SORTIE compilée = ce qu'on déploie (généré, ne pas éditer à la main)
```

## Compiler

Prérequis : Node.js (aucune dépendance à installer).

```bash
node build.js
```

Résultat : le dossier `docs/` est régénéré (pages, assets, sitemap.xml, robots.txt, .htaccess).

## Prévisualiser en local

```bash
npx --yes serve docs      # ou n'importe quel serveur statique
```

Puis ouvrir l'URL indiquée. Les URLs sont propres (`/nos-produits/`, etc.).

## Tester sur GitHub Pages

1. Pousser le dépôt sur GitHub.
2. Settings → Pages → Source : branche `main`, dossier `/docs`.
3. L'URL `https://<user>.github.io/<repo>/` sert le site. (⚠️ sur un sous-chemin de projet, voir « baseUrl » ci-dessous.)

## Déployer sur Hostinger

Téléverser **le contenu de `docs/`** à la racine web (`public_html/`). Le `.htaccess` fourni gère HTTPS, en-têtes de sécurité, CSP, compression et cache.

## Avant mise en ligne

- Renseigner `site.baseUrl` dans `src/data/site.json` (domaine réel) puis relancer `node build.js`.
- Remplacer toutes les mentions `À VÉRIFIER` des pages légales (gérant/directeur de publication, e-mail, TVA, hébergeur, médiateur).
- Vérifier le lien itinéraire et, si besoin, renseigner `nap.geo` (lat/lng) dans `site.json`.

## Ajouter une page

1. Créer `src/pages/ma-page.html` (le contenu du `<main>`).
2. Ajouter une entrée dans `src/data/site.json` → `pages` (slug, title, description, h1…) et, si elle doit figurer au menu, dans `nav`.
3. `node build.js`. Le menu, le sitemap et le fil d'Ariane se mettent à jour automatiquement.
