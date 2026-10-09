# Sous-projet 6 — Charte « Nuit mauve »

Date : 2026-10-09 · Statut : design validé en conversation (direction, intro, démo, approche, sections 1
à 3), à relire par Augustin.

Remplace la direction visuelle « Atelier clair » (section 6 de la spec du sous-projet 1,
`2026-10-08-socle-et-accueil-design.md`, laissée telle quelle comme document historique) par une charte
sombre bâtie sur la palette fournie par Augustin : sauge `#7E9680`, mauve `#79616F`, rose `#AE6378`,
corail `#D87F81`, pêche `#EAB595`. Typographies, mises en page et contenus ne changent pas. Mêmes
contraintes que les sous-projets précédents : français uniquement, pas de nom de client, de projet ou
d'employeur dans le dépôt, mêmes budgets.

**Place dans la suite :** intercalé après le sous-projet 5 (Coulisses) ; les easter eggs, prévus en 6,
deviennent le sous-projet 7 et utilisent cette charte. Branche `sous-projet-6-charte`, rebasée sur `main`
une fois le sous-projet 5 fusionné : ses pages sont repeintes avec le reste.

## 1. Objectif

Donner au site une identité propre, sombre et chaude, où toute la palette sert : sur un fond nuit tiré du
mauve, le pêche, le corail et la sauge deviennent lisibles comme texte, ce qu'aucun fond clair ne permet
(sur le papier actuel, seul le mauve atteint 4,5:1).

Critères de réussite : chaque paire texte/fond respecte WCAG AA ; aucune page n'utilise plus l'ancienne
charte ; l'intro garde son effet ; Lighthouse (accessibilité bloquante) et budgets inchangés.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Direction | **Nuit mauve** : fond sombre dérivé du mauve, texte papier, accent pêche ; un seul thème (pas de mode clair) |
| Intro | **Goutte de lumière** : une goutte pêche couvre l'écran, le nom s'y lit en nuit, puis elle se resserre en halo corail → rose. Même moteur, mêmes durées |
| Démo de l'étude de cas | Forcée en **sombre** dans le site par `?theme=sombre` (ses jetons sombres existent déjà) ; ouverte seule, elle reste en clair comme aujourd'hui |
| Jetons | **Deux étages** : teintes brutes, puis rôles ; les composants n'emploient que les rôles |
| Valeurs côté TypeScript | `lib/charte.ts`, vérifié contre `globals.css` |
| Icône | Goutte pêche sur fond nuit, à la place du carré gris provisoire |

**Écartés :** « Atelier clair » repeint (papier conservé, palette en accents) ; papier pêche à blocs de
couleur ; double thème clair/sombre selon l'appareil ; goutte d'encre plus noire que le fond ; goutte
corail sans changement de couleur ; démo laissée en clair ; démo repeinte aux couleurs du site ; jetons
gardant leurs anciens noms ; teintes brutes employées directement dans les composants.

## 3. Teintes et rôles

**Teintes brutes** (`@theme`, préfixe `--color-`) :

| Teinte | Valeur | Origine |
|---|---|---|
| `nuit` | `#2a2127` | dérivée du mauve |
| `nuit-haute` | `#352a31` | dérivée du mauve |
| `mauve` | `#79616F` | palette |
| `mauve-clair` | `#b9a3b0` | dérivée du mauve |
| `rose` | `#AE6378` | palette |
| `corail` | `#D87F81` | palette |
| `peche` | `#EAB595` | palette |
| `sauge` | `#7E9680` | palette |
| `papier` | `#f3efe7` | conservée de l'ancienne charte |
| `trait-nuit` | `#4a3b44` | dérivée |
| `trait-mauve` | `#8a7480` | dérivée du mauve |

**Rôles** (les seuls jetons employés par les composants) — contraste sur `fond` / sur `surface` :

| Rôle | Teinte | Usage | Fond | Surface |
|---|---|---|---|---|
| `fond` | nuit | fond des pages | — | — |
| `surface` | nuit-haute | cartes, fenêtre de la démo, palette ⌘K, administration | — | — |
| `texte` | papier | texte courant, titres | 13,6 | 12,0 |
| `texte-doux` | mauve-clair | surtitres, légendes, texte secondaire | 6,6 | 5,9 |
| `accent` | pêche | mot en couleur des titres, liens, bouton principal, anneau de focus | 8,6 | 7,6 |
| `sur-accent` | nuit | texte posé sur l'accent (bouton principal : 8,6) | — | — |
| `alerte` | corail | erreurs du formulaire et de l'administration | 5,4 | 4,8 |
| `vivant` | sauge | point « en direct », succès ; **texte sur `fond` seulement** | 4,9 | pastille seule (4,3) |
| `trait` | trait-nuit | séparateurs, bordures décoratives | décor | décor |
| `trait-fort` | trait-mauve | contour des champs et des boutons secondaires (≥ 3:1) | 3,6 | 3,2 |
| `lueur` | corail | centre du halo | décor | décor |
| `lueur-chaude` | rose | bord du halo | décor | décor |
| `goutte` | pêche | goutte de l'intro | décor | décor |

Le rose et le mauve purs restent décoratifs (3,6 et 2,8 sur la nuit). L'ombre `--shadow-fenetre` passe à
une ombre noire plus profonde (`0 30px 80px -40px rgb(0 0 0 / 0.6)`).

## 4. Changements

**Socle CSS (`app/globals.css`) :**
- `@theme` à deux étages (teintes brutes, puis rôles en `var(--color-<teinte>)`) ; les anciens jetons
  (`papier` comme rôle, `encre`, `encre-douce`, `brique`, `braise`, `braise-claire`, `terre`, `trait`
  ancienne valeur) sont supprimés ;
- `html { color-scheme: dark }` ; `body` en `fond`/`texte` ;
- `::selection` : fond `accent`, texte `sur-accent` ; `:focus-visible` : anneau `accent` partout ;
- `.halo-css` (repli sans WebGL) : dégradé `lueur` → `lueur-chaude` ;
- `.fond-accueil__nom` : couleur `sur-accent` (nuit sur la goutte pêche).

**`lib/charte.ts` (nouveau) :** teintes et rôles en hexadécimal (`as const`) pour ce qui ne lit pas le CSS :
moteur de l'intro, vignettes, curseurs du direct, scène 3D des Coulisses, couleurs du terminal (sous-projet
7). Fonction `contraste(a, b)` (formule WCAG 2.x), utilisée par les tests.

**Intro (`lib/encre/chronologie.ts`) :** `ENCRE` → `GOUTTE` (pêche), `BRAISE` → `LUEUR` (corail),
`BRAISE_CLAIRE` → `LUEUR_CHAUDE` (rose), importées de `lib/charte.ts`. Durées, rayons et shader inchangés
(le shader ne contient aucune couleur ; alpha prémultiplié, valable sur fond sombre).

**Composants :** les 84 classes de couleur de `apps/web` (20 fichiers à la date de la spec, plus les pages
Coulisses du sous-projet 5) passent aux rôles. Correspondance par défaut : `bg-papier` → `bg-fond`,
`text-encre` → `text-texte`, `text-encre-douce` → `text-texte-doux`, `text-brique` → `text-accent`,
`bg-encre text-papier` (bouton principal) → `bg-accent text-sur-accent`, `border-trait` → `border-trait`
(nouvelle valeur) ou `border-trait-fort` pour les champs, couleurs d'erreur → `text-alerte`, succès et
point du compteur → `vivant`, `text-terre` → `text-texte-doux`. Chaque cas douteux suit le tableau des
rôles (section 3), pas la teinte d'origine.

**Coulisses (sous-projet 5) :** schéma SVG par classes de rôles ; scène 3D par `lib/charte.ts`.

**Temps réel :**
- `apps/realtime/src/couleurs.ts` : palette des curseurs `pêche, corail, sauge, mauve-clair, papier, rose`
  (toutes ≥ 3:1 sur la nuit ; le service ne dépend pas d'`apps/web` : valeurs recopiées, commentaire
  renvoyant à `lib/charte.ts`) ;
- `components/direct/CalqueCurseurs.tsx` : contour des flèches en nuit (au lieu du papier).

**Démo (`apps/demo-marches`) :** `?theme=sombre` dans l'adresse pose `color-scheme: dark` sur la racine
avant le premier rendu (script en tête de `index.html`) ; sans paramètre, rien ne change (clair).
`FenetreDemo` charge `SOURCE_DEMO + "?theme=sombre"`, pour l'iframe comme pour l'ouverture plein écran ;
l'aperçu statique est régénéré en sombre (`capturer-apercu-demo`). Les captures du site d'artisan ne
changent pas (copies d'écran d'un site client).

**Partage et navigateur :**
- `lib/vignette.tsx` (images Open Graph) : fond nuit, texte papier, halo corail → rose, surtitre pêche,
  texte secondaire mauve-clair ;
- `app/layout.tsx` : `export const viewport = { themeColor: "#2a2127" }` ;
- `app/icon.svg` : carré nuit aux coins arrondis, goutte pêche au centre, léger halo corail.

**Documentation :** README, section « Charte » (teintes, rôles, règle « les composants n'emploient que les
rôles », où changer une couleur : `globals.css` et `lib/charte.ts`, tenus d'accord par un test).

## 5. Vérifications

**Unitaires (Vitest) :**
- concordance : chaque teinte et chaque rôle de `lib/charte.ts` a la même valeur dans `@theme` de
  `globals.css` (lecture du fichier) ;
- contrastes : chaque paire du tableau de la section 3 respecte son seuil (4,5 texte ; 3 contours, grands
  titres et curseurs) ;
- anciens jetons : aucun fichier de `app/`, `components/`, `lib/` ne contient de classe Tailwind
  `*-(papier|encre|encre-douce|brique|braise|braise-claire|terre)` ; `papier` n'est plus un rôle (Tailwind 4
  ignore en silence une classe inconnue) ;
- chronologie de l'intro : couleurs de départ (pêche), de mélange et du halo ;
- `apps/realtime` : six teintes distinctes, chacune ≥ 3:1 sur la nuit ;
- démo : `?theme=sombre` → `color-scheme: dark` ; sans paramètre → clair.

**Bout en bout (Playwright) :**
- nouvelle dépendance de développement `@axe-core/playwright` : chaque page publique passée aux règles
  WCAG 2 A/AA (dont le contraste) — accueil, page personnalisée d'exemple, deux études de cas, contact,
  Coulisses, mentions légales, politique de confidentialité, connexion à l'administration — sans
  violation ;
- l'iframe de la démo a `?theme=sombre` ;
- tests existants de l'intro et des replis mis à jour (goutte, halo, repli CSS), toujours sans erreur
  console.

**Inchangés :** Lighthouse (accessibilité bloquante), budgets de taille, accueil statique.

**Contrôle visuel :** captures de chaque page (ordinateur et mobile) jointes à la PR, pour validation
par Augustin avant la fusion.
