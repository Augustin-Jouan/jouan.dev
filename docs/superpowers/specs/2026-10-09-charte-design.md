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

**Teintes brutes** (variables `--teinte-<nom>` sur `:root`, **hors** `@theme` : elles ne donnent aucune classe Tailwind, si bien qu'un composant ne peut employer qu'un rôle) :

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
| `vivant` | sauge | point « en direct », pastilles, contours ; **jamais de texte** (classe `text-vivant` refusée par le garde-fou : 4,3 seulement sur une carte) | 4,9 | pastille seule (4,3) |
| `trait` | trait-nuit | séparateurs, bordures décoratives | décor | décor |
| `trait-fort` | trait-mauve | contour des champs et des boutons secondaires (≥ 3:1) | 3,6 | 3,2 |
| `lueur` | corail | centre du halo | décor | décor |
| `lueur-chaude` | rose | bord du halo | décor | décor |
| `goutte` | pêche | goutte de l'intro | décor | décor |

Le rose et le mauve purs restent décoratifs (3,6 et 2,8 sur la nuit). L'ombre `--shadow-fenetre` passe à
une ombre noire plus profonde (`0 30px 80px -40px rgb(0 0 0 / 0.6)`).

## 4. Changements

**Socle CSS (`app/globals.css`) :**
- deux étages : teintes brutes en `--teinte-<nom>` sur `:root`, puis rôles dans `@theme` en
  `--color-<rôle>: var(--teinte-<nom>)` ; les anciens jetons (`papier`, `encre`, `encre-douce`, `brique`,
  `braise`, `braise-claire`, `terre`, `trait` ancienne valeur) sont supprimés, ainsi que la palette par
  défaut de Tailwind (`--color-*: initial` en tête de `@theme`) : `bg-white` ou `bg-emerald-600` ne
  produisent plus rien ;
- `html` : `color-scheme: dark`, fond `fond`, couleur `texte` ; `body` garde sa classe de couleur, qui
  devient `text-texte` (`app/layout.tsx`) ;
- `::selection` : fond `accent`, texte `sur-accent` ; `:focus-visible` : anneau `accent` partout ;
- champs remplis automatiquement par le navigateur (`:autofill`, `:-webkit-autofill`) : fond `surface` et
  texte `texte` forcés (Chrome y pose sinon son fond clair, que `color-scheme` ne corrige pas) ;
- `.halo-css` (repli sans WebGL) : dégradé `lueur` → `lueur-chaude` ;
- `.fond-accueil__nom` : couleur `sur-accent` (nuit sur la goutte pêche).

**`lib/charte.ts` (nouveau) :** teintes et rôles en hexadécimal (`as const`) pour ce qui ne lit pas le CSS :
moteur de l'intro, vignettes, curseurs du direct, scène 3D des Coulisses, couleurs du terminal (sous-projet
7). Fonction `contraste(a, b)` (formule WCAG 2.x), utilisée par les tests.

**Intro (`lib/encre/chronologie.ts`) :** `ENCRE` → `GOUTTE` (pêche), `BRAISE` → `LUEUR` (corail),
`BRAISE_CLAIRE` → `LUEUR_CHAUDE` (rose), importées de `lib/charte.ts`. Durées, rayons et shader inchangés
(le shader ne contient aucune couleur ; alpha prémultiplié, valable sur fond sombre).

**Composants :** les 84 classes de couleur de `apps/web` (20 fichiers à la date de la spec, plus les pages
Coulisses du sous-projet 5) passent aux rôles. Correspondance par défaut : `bg-papier` → `bg-surface`
(champs, fenêtres, cadres : tous posés sur la page ; le fond de page vient de `html`), `text-encre` →
`text-texte`, `text-encre-douce` → `text-texte-doux`, `text-brique` → `text-accent`, `bg-encre
text-papier` (bouton principal) → `bg-accent text-sur-accent`, `border-trait` → `border-trait` (nouvelle
valeur) ou `border-trait-fort` pour les champs et boutons secondaires, couleurs d'erreur → `alerte`,
point du compteur → `bg-vivant`, `text-terre` → `text-texte-doux`. **Aucune opacité sur une couleur** :
`text-papier/75` → `text-texte-doux`, `bg-trait/40` et `bg-encre/5` → `bg-surface`, `fill-brique/10` →
`fill-surface`. Chaque cas douteux suit le tableau des rôles (section 3), pas la teinte d'origine.

**Coulisses (sous-projet 5) :** classes de rôles partout (schéma SVG, courbes, panneau en direct, section
déploiement, boutons 2D/3D) ; `stroke="var(--color-papier)"` (détourage des étiquettes du schéma) →
`var(--color-fond)` ; scène 3D (`scene3d.ts`) : couleurs lues dans `lib/charte.ts`, étiquettes en
`bg-surface text-texte`.

**Temps réel :**
- `apps/realtime/src/couleurs.ts` : palette des curseurs `pêche, corail, sauge, mauve-clair, papier, rose`
  (toutes ≥ 3:1 sur la nuit ; le service ne dépend pas d'`apps/web` : valeurs recopiées, commentaire
  renvoyant à `lib/charte.ts`) ;
- `components/direct/CalqueCurseurs.tsx` : contour des flèches en nuit (au lieu du papier).

**Démo (`apps/demo-marches`) :** `?theme=sombre` dans l'adresse pose `color-scheme: dark` sur la racine
avant le premier rendu (module `src/theme.ts` appelé en tête de `src/main.tsx`, sans script en ligne) ; sans paramètre, rien ne change (clair).
`FenetreDemo` charge `SOURCE_DEMO + "?theme=sombre"`, pour l'iframe comme pour l'ouverture plein écran ;
l'iframe reste invisible (`opacity-0`, fond `surface`) jusqu'à son événement `load`, pour ne jamais
montrer l'éclair clair de la démo avant son passage en sombre ; l'aperçu statique est régénéré en sombre
(`capturer-apercu-demo`). Le jeton sombre `--faint` de la démo passe de `#748a9d` à `#8a9eb0` (4,64:1
sur sa surface la plus claire `#223442`, contre 3,58). Les captures du site d'artisan ne changent pas
(copies d'écran d'un site client).

**Partage et navigateur :**
- `lib/vignette.tsx` (images Open Graph) : fond nuit, texte papier, halo corail → rose, surtitre pêche,
  texte secondaire mauve-clair ;
- `app/layout.tsx` : `export const viewport = { themeColor: "#2a2127", colorScheme: "dark" }` ;
- `app/icon.svg` : carré nuit aux coins arrondis, goutte pêche au centre, léger halo corail.

**Documentation :** README, section « Charte » (teintes, rôles, règle « les composants n'emploient que les
rôles », où changer une couleur : `globals.css` et `lib/charte.ts`, tenus d'accord par un test).

## 5. Vérifications

**Unitaires (Vitest) :**
- concordance : chaque teinte (`--teinte-*`) et chaque rôle (`--color-*` de `@theme`) de `globals.css`
  correspond à `lib/charte.ts` (lecture du fichier) ;
- contrastes : chaque paire du tableau de la section 3 respecte son seuil (4,5 texte ; 3 contours, grands
  titres et curseurs), plus le nom de l'intro sur la goutte (`sur-accent` sur `goutte`) ;
- rôles seulement : aucun fichier de `app/`, `components/`, `lib/` ne contient de classe de couleur
  Tailwind (`bg-`, `text-`, `border-`, `ring-`, `fill-`, `stroke-`, `decoration-`, `divide-`, `outline-`…)
  dont la couleur est un ancien jeton, une teinte brute ou une couleur de la palette par défaut de
  Tailwind (`white`, `emerald-600`…), ni de couleur avec opacité, ni `text-vivant`, ni
  `var(--color-<ancien jeton>)` — Tailwind 4 ignore en silence une classe inconnue ;
- chronologie de l'intro : couleurs de départ (pêche), de mélange et du halo ;
- `apps/realtime` : six teintes distinctes, chacune ≥ 3:1 sur la nuit ;
- démo : `?theme=sombre` → `color-scheme: dark` ; sans paramètre → clair.

**Bout en bout (Playwright) :**
- nouvelle dépendance de développement `@axe-core/playwright` : chaque page publique passée aux règles
  WCAG 2.0, 2.1 et 2.2 de niveaux A et AA (dont le contraste) — accueil, page personnalisée d'exemple,
  deux études de cas, contact, Coulisses, mentions légales, politique de confidentialité, connexion à
  l'administration, et la démo en thème sombre — sans violation ; l'accueil est analysé deux fois : avec
  mouvement réduit, et sans (une fois l'intro terminée) ;
- focus : en tabulant sur l'accueil et sur le contact, **chaque** élément atteint montre un contour ou
  un anneau pêche ; la page déclare `color-scheme: dark` ;
- halo de repli : `.halo-css` est peint en corail puis rose ;
- l'iframe de la démo a `?theme=sombre` et son document est en `color-scheme: dark` ;
- `<meta name="theme-color">` et `<meta name="color-scheme">` présents ; l'icône est la goutte pêche ;
  la vignette Open Graph de l'accueil a un fond nuit ;
- tests existants de l'intro et des replis mis à jour (goutte, halo, repli CSS), toujours sans erreur
  console.

**Inchangés :** Lighthouse (accessibilité bloquante), budgets de taille, accueil statique.

**Contrôle visuel :** captures de chaque page de la liste axe (ordinateur et mobile), plus l'intro en
cours, prises par un script et jointes à la PR, pour validation par Augustin avant la fusion ; l'autofill
des champs se vérifie à cette occasion (aucun test automatique ne peut le déclencher).
