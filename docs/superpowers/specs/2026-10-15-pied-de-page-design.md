# Pied de page — trois colonnes, et un champ de traits qui écrit « à bientôt ! »

Date : 2026-10-15 · Statut : design validé en conversation (maquettes et prototype animé), à relire par Augustin.

> **Révision du 2026-10-15 :** le champ de traits a été implémenté puis retiré. Vu en place, sur toute la
> largeur du pied de page, il faisait kitsch, et son bord haut traçait une ligne dure sous la page. Seule la
> mise en page en trois colonnes (§ 2) est livrée, sans la bande du mot : les indices viennent directement
> sous les listes. Les § 3 et 4 restent ici pour mémoire.

Branche : `pied-de-page`, partie de `main` (démo du site de l'artisan fusionnée). Mêmes règles que les sous-projets
précédents : français uniquement, charte « Nuit mauve » (rôles de couleur, jamais de valeur brute), budgets
Lighthouse inchangés (scripts de l'accueil ≤ 168 960 octets, CLS ≤ 0,05).

## 1. Objectif

Le pied de page actuel est une ligne de petits liens gris, séparée de la page par un filet. On le réorganise en
trois colonnes sur toute la largeur. On lui donne aussi un moment marquant, dans le langage du nuage de traits de
l'accueil : un champ de petits traits qui suit la souris et qui, quand on y entre, **écrit « à bientôt ! »**.

Critères de réussite :

- Les liens sont rangés et complets : Réalisations y figure, et LinkedIn est ajouté.
- Avec une souris, entrer dans le pied de page fait apparaître le mot. En sortir le dissout. Le mot ne se déforme
  jamais sous la souris.
- Le JS de l'accueil au chargement ne grossit que d'un petit chargeur. L'animation est un morceau à part, chargé à
  l'approche du pied de page.
- Sur un processeur ralenti ×4, une image se calcule en moins de 16,7 ms (60 images/s).
- En mouvement réduit, sans JavaScript ou en économie de données, le mot s'affiche figé, sans animation.

## 2. Mise en page

**Plus de filet** entre la page et le pied de page (`border-t` retiré).

**Ordinateur** (à partir de 40 rem) : une grille de trois colonnes sur la largeur du contenu
(`grid-template-columns: 1fr auto 1fr`). La première colonne est calée à gauche, la deuxième centrée, la troisième
calée à droite (`justify-self: end`). Trois rangées : les listes, la bande du mot, les indices. Chaque colonne
occupe les trois rangées (`subgrid`), donc les indices s'alignent sur une même ligne quelle que soit la longueur des
listes.

| | Gauche | Milieu | Droite |
|---|---|---|---|
| Titre | **Me joindre** | **Site** | **Légal** |
| Liens | augustin@jouan.dev · GitHub ↗ · LinkedIn ↗ | Réalisations · Coulisses · Contact | Mentions légales · Politique de confidentialité |
| Bande | « à bientôt ! », sur les trois colonnes, 12 rem de haut | | |
| Indice | `curl -L jouan.dev` | Ctrl+K pour naviguer (bouton de la palette, ⌘K sur Mac) | © 2026 Augustin Jouan |

**Téléphone** : deux colonnes. « Me joindre » et « Site » côte à côte, chacune avec son indice en dessous, puis
« Légal » et le ©. La bande du mot vient en dernier, sur toute la largeur, haute de 7 rem.

**Typographie :**
- titres en petites capitales espacées (`text-xs uppercase tracking-[0.14em]`) dans la couleur du texte (`texte`) ;
- liens et indices en `text-sm text-texte-doux`, survolés en `texte`, comme aujourd'hui.

**Liens :**
- Ceux de la colonne Site viennent de `data/navigation.ts` (mêmes liens que l'en-tête).
- GitHub et LinkedIn s'ouvrent dans un nouvel onglet : ↗ visible, « (nouvel onglet) » pour les lecteurs d'écran,
  `rel="me noopener"`.
- Le `<nav aria-label="Pied de page">` garde les trois listes.

**LinkedIn** : `https://www.linkedin.com/in/augustinjouan`, ajouté à `data/contact.ts` et aux données structurées
(`sameAs` de `PersonJsonLd`), à côté de GitHub.

## 3. Le champ de traits

### 3.1 Ce que voit le visiteur

- **Le champ :** de petits traits arrondis de 2 px d'épaisseur et de 4 à 8 px de long, sur tout le pied de page,
  un par carré de 26 px environ (avec un léger décalage aléatoire). Au repos, ils sont très discrets (opacité 0,12),
  couleurs du nuage de l'accueil : pêche, corail, rose, mauve clair.
- **Sans souris :** un point de repos dérive lentement dans le pied de page. Les traits proches s'orientent vers lui
  et s'allument un peu : le pied de page n'est jamais tout à fait figé.
- **La souris dans le pied de page :** tous les traits s'orientent vers elle, comme une boussole, avec un léger
  retard. Les plus proches (rayon 260 px) s'allument et s'allongent. Les couleurs se répartissent selon l'angle
  autour d'elle et tournent lentement.
- **Le mot :** dès que la souris entre, environ 900 traits partent de places au hasard dans le champ et glissent
  vers leurs lettres. Ils écrivent « à bientôt ! » en Instrument Serif italique, couchés le long du tracé.
  - Le mot se forme en une seconde environ.
  - Ses traits sont plus visibles : 2,4 px d'épaisseur, opacité 0,85, lueur douce.
  - Les couleurs vont de gauche à droite et tournent lentement.
  - Le reste du champ baisse à 40 % de son intensité.
- **Le mot ne se déforme pas sous la souris :** ses traits gardent leur place et leur orientation. Seuls les traits
  du champ, autour, pointent vers la souris.
- **Survol d'un lien :** les traits autour du lien passent des rayons aux cercles et tournoient lentement, comme le
  champ autour d'un fil électrique. Rayon d'action 340 px. Les traits du mot restent en place.
- **La souris sort :** le mot se dissout en deux secondes environ. Chaque trait retourne à sa place d'origine et le
  champ reprend sa dérive.
- **Téléphone et tablette** (pointeur grossier) : il n'y a pas de souris pour entrer.
  - Le mot se forme quand le pied de page est visible à 40 % ou plus, et reste formé.
  - Un doigt posé sur le pied de page devient le centre de la boussole pendant le toucher.

### 3.2 Replis

Le mot existe aussi en texte, rendu par le serveur dans la bande : « à bientôt ! » en Instrument Serif italique,
couleur `trait-fort`, à la taille de la bande, décoratif (`aria-hidden`). Il reste affiché, et aucun module n'est
chargé :

- sans JavaScript ;
- en mouvement réduit (`prefers-reduced-motion: reduce`) ;
- en économie de données (`navigator.connection.saveData`) ;
- si Canvas 2D est indisponible.

Quand l'animation démarre, le texte est masqué et le canvas prend sa place. Le pied de page est loin sous la
ligne de flottaison au chargement : le module arrive avant que le visiteur le voie, et l'échange ne décale rien
(la bande a une hauteur fixe).

### 3.3 Technique

**Canvas 2D, pas le moteur WebGL de l'accueil.**
- **Le volume s'y prête :** 1 800 traits au plus, contre 1 600 pour le nuage, mais sur une surface bien plus petite.
- **La mesure l'a montré :** le prototype en Canvas 2D tient 60 images/s, processeur ralenti ×4, une fois la lueur
  floutée retirée.
- **Le moteur WebGL coûterait plus :** il ajouterait son morceau (≤ 10 Ko) et un second contexte WebGL sur
  l'accueil.

**Fichiers :**

| Fichier | Rôle |
|---|---|
| `lib/pied-de-page/champ.ts` | Fonctions pures, testées : semis du champ, cible de chaque trait (boussole, tourbillon, lettre), interpolation d'angle modulo π, couleur selon l'angle ou la position. |
| `lib/pied-de-page/mot.ts` | Échantillonne le mot sur un masque (pixels pleins tous les 6 px, orientation perpendiculaire au gradient du masque flouté). La fonction pure reçoit le masque ; l'appel au canvas est à part. |
| `lib/pied-de-page/anime.ts` | La boucle : un canvas, les événements, `requestAnimationFrame`. Marqueur `MARQUEUR_CHAMP = "champ-pied-de-page:v1"`. Morceau chargé par `import()`. |
| `components/layout/ChampPiedDePage.tsx` | Petit composant client : la bande, le texte de repli, le canvas. Décide s'il faut animer, charge le module à l'approche (`IntersectionObserver`, marge 600 px) et lui passe le pied de page. |
| `components/layout/Footer.tsx` | La nouvelle mise en page, avec `ChampPiedDePage` dans la bande. |
| `data/contact.ts`, `components/shared/PersonJsonLd.tsx` | LinkedIn. |
| `scripts/verifier-taille-champ.mjs` | Le morceau de l'animation ≤ 6 Ko compressés. Ajouté à la CI, à côté des autres contrôles de taille. |

**Le mot**
- Il est dessiné une fois, au démarrage du module, dans un canvas caché, avec la police italique du site (chargée
  par next/font ; on attend `document.fonts.load`).
- Il est redessiné au redimensionnement (avec un délai de 200 ms) et au changement de disposition ordinateur/téléphone.

**Légèreté**
- **Un tracé par couleur et par palier d'opacité,** au lieu d'un `stroke()` par trait.
- **Pas de `shadowBlur` :** la lueur des traits du mot est une première passe de traits plus larges (5 px) et
  transparents (opacité 0,12), sous les traits nets.
- **Une boucle qui s'arrête** quand le pied de page sort de l'écran, quand l'onglet est masqué, et quand plus rien
  ne bouge : mot formé ou dissous, souris immobile, angles stabilisés.
- **La dérive du repos ne tourne que si le pied de page est visible.**
- **Le canvas suit la densité de pixels de l'écran,** plafonnée à 2.

**Accessibilité**
- Le canvas est décoratif (`aria-hidden`).
- Les liens restent au-dessus du canvas et gardent leur focus visible.
- Le tourbillon se déclenche aussi au focus clavier d'un lien.

## 4. Tests et vérifications

- **Unitaires :**
  - `champ.ts` : l'angle d'un trait vise la souris, modulo π ; le tourbillon est tangent ; le mélange est progressif ;
    l'interpolation prend le plus court chemin ; le semis respecte l'espacement.
  - `mot.ts` : sur un masque factice (un rectangle), les points sont dans le plein, espacés de 6 px, et orientés le
    long des bords.
  - `Footer` : les trois colonnes, leurs titres et leurs liens (dont LinkedIn, `rel` et `target`), plus de
    `border-t`, l'ordre des indices, le texte de repli dans la bande.
  - `PersonJsonLd` : `sameAs` contient GitHub et LinkedIn.
  - `ChampPiedDePage` : pas d'import en mouvement réduit, ni sans `IntersectionObserver` visible ; import à
    l'approche.
- **e2e :**
  - les e2e existants qui passent par le pied de page (Coulisses, palette, GitHub) restent verts ;
  - au chargement de l'accueil, aucun morceau `champ-pied-de-page:v1` n'est demandé ;
  - après défilement jusqu'en bas, le morceau est chargé, le canvas est visible et le texte de repli masqué ;
  - en mouvement réduit, aucun morceau n'est chargé et le texte de repli est visible ;
  - axe sans violation sur les pages de `e2e/accessibilite.spec.ts`.
- **Budgets :**
  - `verifier-taille-champ` (≤ 6 Ko) et `verifier-accueil-statique` ;
  - Lighthouse de l'accueil inchangé.
- **Performance** (vérification manuelle, notée dans la PR) : temps par image, processeur ralenti ×4, mot formé et
  souris en mouvement, sous 16,7 ms.
- **Captures :** ordinateur et téléphone, mot formé, avant de pousser.
