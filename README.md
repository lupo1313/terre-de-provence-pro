# Terre de Provence — site vitrine

Site vitrine multipage, HTML/CSS/JS **sans framework**, assemblé par un mini-build de partials (zéro dépendance npm).

## Structure

```
src/
  data/site.json      → source unique : NAP, horaires, légal, pages + SEO
  partials/           → head, header, footer, scripts (factorisés)
  pages/              → le contenu propre de chaque page (<main>)
  assets/             → css, js, fonts, img  (le dossier img/_raw est ignoré au build)
build.js              → assemble src/ → docs/ (test) ou dist/ (prod)
docs/                 → sortie TEST (GitHub Pages, sous-chemin) — générée, ne pas éditer
dist/                 → sortie PROD (racine domaine, Hostinger) — générée à la demande, non versionnée
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

## Déployer en production (Hostinger)

1. Renseigner le domaine dans `src/data/site.json` → `site.prod.baseUrl` (ex. `https://terredeprovence.fr`).
2. Générer le build de production (racine, pas de sous-chemin) :
   ```bash
   node build.js --prod
   ```
   Résultat dans `dist/` (pages, assets, sitemap.xml, robots.txt, `.htaccess`).
3. Téléverser **le contenu de `dist/`** à la racine web (`public_html/`). Le `.htaccess` gère HTTPS, en-têtes de sécurité, CSP, compression et cache.

Le build de test (`node build.js` → `docs/`) reste dédié à GitHub Pages ; on ne le téléverse pas sur Hostinger.

### Cache-busting
Les URL de `styles.css` et `main.js` reçoivent `?v=<empreinte>` calculée sur leur contenu. Le cache long (`immutable`) du `.htaccess` est donc sûr : à chaque modification du CSS/JS, l'empreinte change et les visiteurs reçoivent la nouvelle version (sinon ils garderaient l'ancienne jusqu'à un an).

## Checklist avant mise en ligne publique

- [ ] **Domaine** choisi et renseigné dans `site.prod.baseUrl`.
- [ ] **Mentions légales** : remplacer tous les `À VÉRIFIER` (gérant/directeur de publication RZOUGA, e-mail de contact, n° TVA, identité de l'hébergeur, médiateur de la consommation, adresse du siège).
- [ ] **Livraison** : confirmer si le commerce livre, sinon ne rien ajouter (aujourd'hui non mentionnée).
- [ ] **Itinéraire / carte** : vérifier le lien et, si besoin, renseigner `nap.geo` (lat/lng) dans `site.json`.
- [ ] (Recommandé) Mesurer **Lighthouse** mobile une fois en ligne, viser 90+.

## Ajouter une page

1. Créer `src/pages/ma-page.html` (le contenu du `<main>`).
2. Ajouter une entrée dans `src/data/site.json` → `pages` (slug, title, description, h1…) et, si elle doit figurer au menu, dans `nav`.
3. `node build.js`. Le menu, le sitemap et le fil d'Ariane se mettent à jour automatiquement.
