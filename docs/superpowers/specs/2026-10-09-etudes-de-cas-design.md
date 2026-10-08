# Sous-projet 2 — Études de cas

Date : 2026-10-09 · Statut : design validé en conversation (parties 1 et 2) ; parties 3 à 6 décidées par
Claude sur les options recommandées et acceptées (démo B, habillage A, captures A, iframe A), à relire
par Augustin au réveil.

Prolonge la spec du sous-projet 1 (`2026-10-08-socle-et-accueil-design.md`), dont il reprend la
direction « Atelier clair », les conventions (contenu typé dans `apps/web/data/`, français uniquement,
pas de nom de client, de projet ou d'employeur dans le dépôt) et les budgets.

## 1. Objectif

Deux pages de réalisation anonymisées qui donnent envie à un client freelance de confier son application
métier à Augustin. La page de l'application métier contient une **démo interactive** sur données
fictives : le visiteur manipule un vrai écran de suivi de marchés de travaux.

Critères de réussite :

- depuis l'accueil, un clic sur une carte de réalisation ouvre l'étude de cas ;
- dans la démo, ajouter un avenant change aussitôt le montant engagé du lot et le total du chantier ;
  saisir un cumul réalisé calcule le certificat de paiement au centime ;
- aucune donnée, aucun nom, aucune ville, aucun logo ne permet d'identifier un client ;
- les pages respectent les budgets du sous-projet 1 ; le JavaScript de la démo n'est chargé que
  lorsqu'elle arrive à l'écran.

## 2. Périmètre et parcours

| Page | Chemin | Contenu propre |
|---|---|---|
| Application de suivi de marchés | `/realisations/suivi-de-marches` | Démo interactive dans une fenêtre, lien « Ouvrir en plein écran » |
| Site vitrine d'artisan | `/realisations/site-artisan` | Captures retouchées (ordinateur et mobile) |
| Démo seule | `/demo/suivi-de-marches/` | La mini-application, plein écran, non indexée |

- Pas de page d'index des réalisations : la section de l'accueil suffit.
- Les deux cartes de l'accueil deviennent des liens (« Voir l'étude de cas → »), application métier en
  premier (offre mise en avant).
- Sitemap : les deux pages d'étude de cas ; la démo seule en est exclue et porte
  `<meta name="robots" content="noindex">`.

**Exclus :** captures de l'application réelle (la lancer demande sa base de données, et ses
données de démo ne sont pas garanties anonymes ; la démo interactive les remplace), PDF dans la démo,
glisser-déposer dans le planning, version anglaise.

## 3. Plan d'une page d'étude de cas

Style « Atelier clair », composants et jetons du sous-projet 1.

1. **En-tête** : surtitre (« Application métier · BTP » / « Site vitrine · Artisan »), titre orienté
   résultat, sous-titre, trois chiffres clés.
2. **Le besoin** : ce que le client faisait avant, ce qui coinçait.
3. **La démo** (application) ou **les captures** (site vitrine).
4. **Ce que j'ai livré** : fonctionnalités en courts paragraphes.
5. **Sous le capot** : stack et deux ou trois choix techniques expliqués simplement.
6. **Pied** : appel à l'action « Un projet similaire ? Parlons-en » (vers `/#contact`) et lien vers
   l'autre étude de cas.

Le contenu vit dans `apps/web/data/realisations.ts` (type `EtudeDeCas`), la page est une route
dynamique `app/realisations/[slug]/page.tsx` générée statiquement (`generateStaticParams`,
`dynamicParams = false`). Les textes sont un premier jet de Claude ; **les chiffres clés et toute
affirmation factuelle sont listés pour validation par Augustin** dans le compte rendu de fin.

Chaque page a sa vignette de partage (`opengraph-image.tsx` de la route) en Instrument Serif, chargée
depuis `@fontsource/instrument-serif` (fichier `woff`, lu au build) ; la vignette de l'accueil passe à
la même police (point parqué au sous-projet 1).

## 4. La démo « Suivi de marchés »

### Données

Un chantier fictif (« Réhabilitation de 12 logements, rue des Tilleuls »), 8 lots, chacun avec une
entreprise inventée, un marché HT initial, des avenants, des acomptes antérieurs, un taux de TVA, un
taux de retenue de garantie (5 %), une caution bancaire oui/non et des dates de planning. Aucun nom,
aucune ville, aucun montant n'est repris des vrais chantiers.

### Onglet Marchés (par défaut)

- Tableau des lots : lot, entreprise, marché HT, avenants, montant engagé, cumul réalisé, part payée
  (barre), total du chantier en pied de tableau.
- Clic sur un lot : panneau du lot avec ses avenants et « Ajouter un avenant » (libellé, montant HT
  signé : plus-value ou moins-value). Le montant engagé change aussitôt partout.
- Bouton « Certificat de paiement » dans le panneau : aperçu du certificat. On saisit le cumul réalisé
  HT et la caution bancaire oui/non ; tout se calcule à la frappe. Pas de PDF : une note dit que
  l'application réelle génère un PDF figé et versionné.

### Onglet Planning (lecture seule)

Frise en semaines, une barre par lot, colonne des lots figée. Survol ou clic sur un lot : la barre et
la ligne sont mises en évidence ; le clic affiche ses dates et son entreprise. Pas de glisser-déposer.

### Règles de calcul (fonctions pures)

Montants en **centimes entiers**. Arrondi au centime, demi-centime au-dessus (`ROUND_HALF_UP`).

| Grandeur | Formule |
|---|---|
| Montant engagé HT | HT initial + Σ avenants |
| TVA d'une ligne | r(HT × taux) |
| Précédents HT | Σ acomptes antérieurs |
| Présent acompte HT | r(cumul − précédents HT) |
| Présent TTC | présent HT + r(présent HT × TVA) |
| Retenue de garantie | 0 avec caution, sinon r(présent TTC × taux de retenue) |
| Montant total mandaté | présent TTC − retenue |

Contrôles : cumul vide → « Saisissez le montant des travaux réalisés. » ; présent acompte ≤ 0 →
« Le présent acompte doit être positif. » ; cumul supérieur au montant engagé → « Le cumul dépasse le
montant du marché avenants compris. ». Libellé d'avenant vide ou montant nul refusés.

Cas de référence (calculés à la main, font foi dans les tests) :

- marché 12 600,00 €, avenant + 850,00 €, TVA 20 %, retenue 5 %, acomptes 3 000,00 € et 4 200,00 €,
  cumul 9 850,00 € : présent HT 2 650,00 ; TVA 530,00 ; TTC 3 180,00 ; retenue 159,00 ; mandaté
  3 021,00 € (avec caution : retenue 0,00, mandaté 3 180,00 €) ;
- TVA 10 %, retenue 5 %, présent HT 1 184,09 € : TVA 118,41 ; TTC 1 302,50 ; retenue 65,13 ;
  mandaté 1 237,37 €.

### Comportement

- Tout se passe dans le navigateur ; rien n'est conservé ni envoyé. « Réinitialiser la démo » ou un
  rechargement remet les données d'origine.
- Bandeau permanent « Démo — données fictives ». Nom affiché : « Suivi de marchés » (jamais le nom du
  produit réel).
- Mobile : tableau et planning défilent horizontalement, colonne des lots figée ; le panneau s'ouvre en
  plein écran.
- Accessibilité : clavier complet ; onglets (`tablist`), panneau et aperçu en `dialog` modal avec piège
  du focus et Échap ; montants recalculés annoncés par une région `aria-live="polite"` ; contraste AA.

### Habillage

L'identité de l'application réelle : ses jetons de couleur, ses polices (Figtree, Outfit, Spline Sans
Mono, auto-hébergées), ses briques d'interface, reprises et anonymisées. Thème clair uniquement.

## 5. Architecture

```
apps/
  demo-marches/               mini-application Vite + React 19 + Tailwind 4 (thème propre)
    src/domaine/              règles de calcul pures, testées (montants, certificat, planning)
    src/donnees/              chantier fictif ; état de la démo (useReducer)
    src/briques/              briques d'interface reprises de l'application réelle
    src/ecrans/               Marchés, PanneauLot, ApercuCertificat, Planning, Coquille
    index.html                noindex, sans script en ligne
  web/
    app/realisations/[slug]/  page d'étude de cas + vignette de partage
    components/realisations/  FenetreDemo (iframe), sections de la page, Captures
    data/realisations.ts      contenu des deux études de cas
    public/demo/suivi-de-marches/   sortie du build de la démo (ignorée par Git)
    public/realisations/site-artisan/  captures retouchées (versionnées)
```

- **Build** : la démo construit directement dans `apps/web/public/demo/suivi-de-marches/`
  (`base: "/demo/suivi-de-marches/"`, polyfill `modulePreload` désactivé pour rester sans script en
  ligne). `pnpm build` à la racine construit la démo puis le site ; le Dockerfile et la CI suivent.
- **Iframe** : `<iframe src="/demo/suivi-de-marches/index.html" loading="lazy" title="Démo
  interactive : suivi de marchés de travaux">` dans une fenêtre aux coins arrondis (hauteur 720 px sur
  ordinateur, 640 px sur mobile, défilement interne). `<noscript>` et repli : capture de la démo et
  lien plein écran.
- **En-têtes** : sous `/demo/:path*`, `frame-ancestors 'self'` et `X-Frame-Options: SAMEORIGIN` au lieu
  de `'none'` / `DENY` ; le reste du site garde ses en-têtes. `frame-src` reste couvert par
  `default-src 'self'`.
- **Captures du site vitrine** : faites à partir d'une **copie** du dépôt du site, placée hors de tout
  dépôt (dossier temporaire) ; nom, logo, téléphone, ville, adresse e-mail et photos de l'artisan y
  sont remplacés par du fictif (photos floutées ou remplacées par des aplats) avant la capture. Le
  dépôt d'origine n'est jamais modifié. Seules les images finales (WebP) entrent dans ce dépôt.

## 6. Budgets, tests, erreurs

| Mesure | Seuil | Contrôle |
|---|---|---|
| Lighthouse mobile des deux pages d'étude de cas | mêmes seuils que l'accueil (`lighthouserc.json`) | CI |
| JS compressé de la démo (tous les morceaux) | ≤ 110 Kio | CI, script `verifier-taille-demo` |
| JS de la démo chargé avant que la fenêtre soit à l'écran | aucun | e2e |

Tests :

- **Unitaires (démo)** : règles de calcul avec les cas de référence, réducteur d'état, géométrie du
  planning, écrans au Testing Library (ajout d'avenant, calcul du certificat, messages, onglets,
  clavier).
- **Unitaires (site)** : données des études de cas (slugs uniques, liens), page d'étude de cas, cartes
  de l'accueil, sitemap.
- **E2E (site)** : navigation accueil → étude de cas ; dans l'iframe, ajout d'un avenant qui change le
  total ; certificat du cas de référence affiché « 3 021,00 € » ; plein écran ; mobile sans débordement ;
  sans JS, repli visible ; aucune erreur de console ; en-têtes `/demo` autorisant l'inclusion par le
  site seulement.

Erreurs : la démo n'a ni réseau ni stockage ; une saisie invalide affiche son message sous le champ
(`aria-invalid`, `aria-describedby`) et le calcul affiché reste le dernier valide. Si l'iframe ne
charge pas, le repli (capture + lien) reste lisible.

## 7. À valider par Augustin

- Les textes et surtout les chiffres clés des deux études de cas.
- Le nom de la démo (« Suivi de marchés ») et le chantier fictif.
- Les captures retouchées du site vitrine (rien d'identifiant ne doit subsister).
- L'accord de la cliente ou la clause de cession de droits avant de montrer les écrans reconstruits.
