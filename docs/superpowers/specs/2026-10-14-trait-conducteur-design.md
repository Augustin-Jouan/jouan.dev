# Accueil — le trait conducteur

Date : 2026-10-14 · Statut : design validé en conversation (questions 1 à 5, approche 1, parties 1 et 2), relu par
Augustin ; révisé pendant la préparation du plan (§ 11).

Branche : `trait-conducteur`, partie de `main` après la fusion de la PR #29 (Méthode à allumage déclenché).
Mêmes règles que les sous-projets précédents : français uniquement, charte « Nuit mauve » (rôles de couleur, jamais
de valeur brute), budgets Lighthouse inchangés.

## 1. Objectif

Un trait pêche accompagne le visiteur tout le long de l'accueil, au fil du défilement. Il naît sous l'accroche,
descend à gauche d'un tracé libre, devient le fil de la Méthode et en allume les étapes, ressort à droite, enlace
les logos de SCR Informatique et d'Epitech d'un huit couché (∞), puis finit sa course en allumant le bouton d'envoi
du formulaire de contact. C'est un fil conducteur au sens propre : tout le parcours mène vers la prise de contact.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Pages | L'accueil, y compris les pages personnalisées des prospects (`/?pour=…`) ; aucune autre page |
| Départ, arrivée | Naît sous l'accroche (la goutte de l'intro « coule ») ; finit sur le bouton d'envoi du Contact, qu'il allume |
| Côté gauche | Trait libre, comme tracé à la main, avec une petite boucle à hauteur des Réalisations |
| Méthode | Le trait **devient** le fil : il suit la ligne du nœud 01 au bout, et chaque étape s'allume à son passage |
| Logos | Un ∞ enlace les deux anneaux ; chaque anneau s'illumine quand le trait le touche |
| Téléphone | Trait fin le long du bord gauche, ondulations douces ; rejoint la ligne verticale de la Méthode ; pas de détour par les logos |
| Tête | Un point lumineux au bout du trait, maintenu vers les deux tiers de la hauteur de l'écran |
| Remontée | Le trait recule avec la tête ; ce qu'il a allumé reste allumé |
| Mouvement réduit, sans JS | Pas de trait ; la page est celle d'aujourd'hui (Méthode en repli `FriseMethode`) |
| Approche | Calque SVG par-dessus la page, tracé calculé en JS à partir des positions réelles |

**Écartées :**

- *Animations CSS liées au défilement* (`animation-timeline: scroll()`) : le tracé doit de toute façon être
  construit en JS, Firefox ne les gère pas par défaut, et placer la tête aux deux tiers de l'écran ou déclencher les
  allumages serait bien plus compliqué.
- *Canvas ou WebGL* : trop lourd pour un trait (redessin à chaque image, écrans haute densité).

## 3. Le tracé

### 3.1 Variantes

- **« marges »** : écran d'au moins 64rem **et** marge latérale d'au moins **56 px**. La marge est la distance
  entre le bord de l'écran et le bord gauche du titre de la section Méthode (`#methode h2`).
- **« bord »** : tous les autres cas : téléphone, tablette, et écrans de 1024 à 1199 px (la colonne de contenu,
  `max-w-6xl` avec `px-8`, ne laisse que 32 à 55 px de marge).

La variante est recalculée à chaque recalcul du tracé (§ 4.3).

### 3.2 Points de passage

Repérés dans la page réelle, jamais codés en dur :

| Point | Élément | Rôle |
|---|---|---|
| Départ | bas de la section de l'accroche (`section[aria-labelledby="accroche-titre"]`) | début du trait |
| Boucle | milieu vertical de `#realisations` | centre de la petite boucle (variante « marges ») |
| Nœuds 1 à 5 | `.methode-noeud` (centres) | le trait suit le fil de la Méthode ; allument les étapes |
| Logos 1 et 2 | `[data-trait="logo"]` (sur chaque lien du parcours qui a un logo) : centre et rayon de l'image | ∞ ; allument les anneaux |
| Envoi | `[data-trait="envoi"]` (le bouton d'envoi de `ContactForm`) | fin du trait ; allume le bouton |

Les attributs `data-trait` sont ajoutés aux éléments existants ; aucun élément visible n'est créé dans la page.

### 3.3 Géométrie, variante « marges »

Coordonnées du document (px). `M` = marge (§ 3.1), `W` = largeur utile de l'écran (`document.documentElement.clientWidth`).

1. **Descente à gauche** : du départ (`x = M / 2`, `y = bas de l'accroche − 24`) jusqu'au nœud 1, par une suite de
   courbes de Bézier. Les abscisses restent dans `[12, M − 16]`. L'aléa du tracé libre est **fixé** (graine
   constante dans le code) : la même mise en page donne toujours le même trait.
2. **Boucle** : une seule, de rayon 10 à 14 px, centrée à hauteur du milieu de `#realisations`, dans la marge gauche.
3. **Entrée dans la Méthode** : le trait arrive au centre du nœud 1 par la gauche, tangent à la ligne.
4. **Traversée** : segment droit le long de la ligne de la Méthode (`y` = centre des nœuds), du nœud 1 jusqu'au bout
   droit de la ligne (`.methode-fil`).
5. **Sortie à droite** : courbe vers la marge droite, puis descente avec des abscisses dans `[W − M + 16, W − 12]`.
6. **∞** : un huit couché autour des deux logos, à `rayon de l'image + 6 px` de chaque centre (sur l'anneau pêche).
   Le trait entre par le haut de l'anneau de droite et l'épouse jusqu'au point de tangence, croise en ligne droite
   (tangentes intérieures communes aux deux anneaux), fait le tour de l'anneau de gauche par le bas, recroise et
   ressort par le bas de l'anneau de droite. Il ne passe **jamais** sur les images.
7. **Fin** : retour dans la marge droite, descente jusqu'à hauteur de la section Contact, puis courbe qui se termine
   au milieu du bord droit du bouton d'envoi, en passant sous les champs du formulaire.

### 3.4 Géométrie, variante « bord »

1. Du départ (`x = 8`) jusqu'à hauteur du nœud 1 : ondulations douces, abscisses dans `[4, 12]`.
2. Raccord au centre du nœud 1, puis le trait suit la ligne de la Méthode jusqu'à son bout.
3. **Ligne verticale** (téléphone, tablette) : retour à `x = 8`, descente avec les mêmes ondulations, sans détour par
   les logos, puis courbe finale vers le milieu du bord **gauche** du bouton d'envoi.
4. **Ligne horizontale** (écrans de 1024 à 1199 px) : le trait ressort à droite et descend le long du bord droit
   (`x ∈ [W − 12, W − 4]`), sans détour par les logos, puis courbe finale vers le milieu du bord **droit** du bouton
   (la colonne de droite du Contact est vide à cette hauteur).

## 4. Comportement

### 4.1 Progression

- **Ligne de lecture** : `T = scrollY + 0,66 × innerHeight` (coordonnée du document).
- Chaque point de passage *i* a une longueur `Lᵢ` le long du trait et une cible `Yᵢ` sur l'axe vertical :
  - en général, `Yᵢ` = l'ordonnée du point ;
  - **traversée d'une ligne horizontale** : `Y(nœud 1) = y_ligne − 0,25 × innerHeight` et
    `Y(bout de la ligne) = y_ligne + 0,25 × innerHeight` : la traversée s'étale sur un demi-écran de défilement
    (une ligne verticale suit le défilement sans étalement) ;
  - **∞** : de `Y = haut des logos` à `Y = bas des logos`.
  - Les `Yᵢ` sont rendus strictement croissants (`Yᵢ = max(Yᵢ, Yᵢ₋₁ + 1)`).
- Longueur tracée `L(T)` : interpolation linéaire entre points consécutifs ; `0` avant le départ, la longueur totale
  après l'envoi.
- **Tête** : le point du trait à la longueur `L`, lu dans une table précalculée (un échantillon tous les 4 px de
  longueur). Cachée quand `L = 0`.

### 4.2 Allumages

- Un point allumable (nœud, logo, envoi) s'allume dès que `L ≥ Lᵢ`. Pour un logo, `Lᵢ` est le premier point du ∞
  sur son anneau ; pour l'envoi, la longueur totale. Le composant pose alors `data-allumee` sur
  l'élément : l'étape (`.methode-etape`), le lien du logo, le bouton d'envoi. Un allumage est **définitif** : il
  reste en remontant.
- **Méthode** : le trait ne prend la main que si la frise est armée et pas encore allumée
  (`.methode-frise[data-animation]` sans aucune `.methode-etape[data-allumee]`). Il pose alors `data-trait` sur la
  frise :
  - `FriseMethode` ignore ses propres déclenchements tant que `data-trait` est présent (son observateur reste le
    repli tant que le trait n'a pas démarré) ;
  - la ligne pêche de la frise (`.methode-fil__plein`) et son paquet de lumière (`.methode-paquet`) sont masqués :
    c'est le trait qui fait le fil ;
  - le décalage de la cascade (`--delai`) vaut `0s` : chaque étape s'allume à l'instant du passage ;
  - quand la dernière étape est allumée, `data-complete` est posé comme aujourd'hui.

  Sinon (frise déjà allumée, ou affichée finie), le trait passe dessus sans rien changer.
- **Logos** : l'anneau d'un logo allumé prend un halo pêche (`box-shadow` sur l'image, transition 0,6 s), qui reste.
- **Envoi** : une pulsation lumineuse unique (1,2 s) au moment de l'allumage, puis un léger halo qui reste. Le
  bouton garde son comportement (désactivé pendant l'envoi, etc.).
- Points déjà dépassés au démarrage (arrivée par `#contact`, défilement restauré) : allumés tout de suite ; leurs
  animations se jouent hors de l'écran et sont finies quand on remonte.

### 4.3 Recalcul du tracé

Le tracé, les `Lᵢ`, les `Yᵢ` et la table de la tête sont recalculés, au plus une fois par image :

- au démarrage, puis quand `document.fonts.ready` est résolu ;
- quand la taille de `document.body` change (`ResizeObserver` : redimensionnement, rotation, polices, contenu de
  page de prospect) ;
- quand la variante change (§ 3.1).

Aucune lecture de position pendant le défilement : il n'utilise que les valeurs du dernier recalcul.

### 4.4 Intro

- Le trait n'apparaît pas tant que `.fond-accueil[data-intro="en-cours"]` existe.
- Si l'intro est rejouée (l'attribut repasse à `en-cours`), le trait est masqué (`opacity: 0`) jusqu'à la fin.

### 4.5 Démarrage et arrêt

- Composant `TraitConducteur` (client) rendu par `Accueil`. Il ne rend rien lui-même. **Au premier défilement**
  (ou dès l'affichage si la page arrive déjà défilée : lien vers `#contact`, défilement restauré), dans un temps libre
  (`quandLibre`), il importe dynamiquement `lib/trait/trait-conducteur.ts` (DOM sans React) et appelle
  `demarrerTrait()`, qui renvoie une fonction d'arrêt. Le trait ne se dessine qu'une fois la page défilée sous
  l'accroche : une visite sans défilement (et Lighthouse) ne le télécharge pas.
- Pas de démarrage si `prefers-reduced-motion: reduce`. Si la préférence passe à `reduce` pendant la visite, le
  trait s'arrête et son calque est retiré (les allumages déjà posés restent).
- Morceau introuvable (déploiement en cours) : pas de trait, sans erreur ; la Méthode garde son repli.
- L'arrêt (démontage de l'accueil, navigation) retire le calque, les écouteurs et les observateurs, ainsi que
  `data-trait` sur la frise.

## 5. Rendu

- Un `<svg>` dans un conteneur `position: absolute; top: 0; left: 0`, ajouté à `document.body` : largeur
  `100 %`, hauteur = bas de la section Contact, `overflow: hidden`, `pointer-events: none`, `aria-hidden="true"`,
  `z-index: 1` (au-dessus du contenu, sous les fenêtres et la palette, qui sont dans la couche supérieure). Il ne
  fait jamais déborder la page en largeur.
- Trait : `stroke` = `var(--color-accent)`, épaisseur 2 px (« marges ») ou 1,5 px (« bord »), extrémités rondes.
  Halo : un second tracé dessous, 7 px (« bord » : 5 px), `color-mix` à 28 % de `--color-lueur`. **Aucun filtre**
  sur les tracés : un `drop-shadow` sur un trait de toute la hauteur de la page, redessiné à chaque image, faisait
  tomber le défilement doux de ~70 à ~16 images par seconde. Longueur tracée par `stroke-dasharray` /
  `stroke-dashoffset` des deux tracés (avec `pathLength` égal à la longueur calculée).
- Tête : un cercle de 4 px de rayon, `fill` = `var(--color-texte)`, halo pêche, déplacé par `transform`.
- Masqué à l'impression (`@media print`).
- Par image de défilement : trois écritures seulement (`stroke-dashoffset` des deux tracés, `transform` de la tête),
  plus les `data-allumee` éventuels.

## 6. Fichiers

| Fichier | Rôle |
|---|---|
| `lib/trait/trace.ts` | Pur : points de passage + variante + dimensions → tracé SVG (`d`), segments et points allumables. Testé sans DOM |
| `lib/trait/progression.ts` | Pur : `(Lᵢ, Yᵢ)` + `T` → `L` ; table de la tête ; points à allumer |
| `lib/trait/trait-conducteur.ts` | DOM : repérage des points, calque SVG, écouteurs, recalculs, allumages ; `demarrerTrait()` ; marqueur `MARQUEUR_TRAIT = "trait-conducteur:v1"` |
| `components/accueil/TraitConducteur.tsx` | Client : chargement différé, mouvement réduit |
| `components/accueil/Accueil.tsx` | Rend `TraitConducteur` |
| `components/accueil/FriseMethode.tsx` | Ignore ses déclenchements quand la frise porte `data-trait` |
| `components/accueil/Parcours.tsx` | `data-trait="logo"` sur les liens à logo |
| `components/contact/ContactForm.tsx` | `data-trait="envoi"` sur le bouton d'envoi |
| `app/globals.css` | Méthode en mode trait, halo des logos, pulsation de l'envoi, impression |
| `scripts/verifier-taille-defilement.mjs` | Vérifie aussi le morceau du trait (≤ 6 Ko compressés) |
| `lib/methode-css.test.ts` | Étendu : masquage sous `[data-trait]`, pulsation sans mouvement réduit, impression, aucun filtre sur les tracés |
| `e2e/trait.spec.ts` | Nouveau (§ 9) |
| `e2e/methode.spec.ts` | Cascade et étape par étape testées **sans trait** (morceau bloqué) : c'est le repli |

## 7. Performances et budgets

- Le morceau du trait est chargé au premier défilement : premier écran, LCP et budget de scripts de l'accueil
  inchangés (mesuré : 165 731 octets, comme sans le trait ; chargé en temps libre dès l'affichage, il les portait à
  170 842, au-delà du budget).
- Budget du morceau : **6 Ko compressés**, vérifié en CI par le script de taille (repéré par `MARQUEUR_TRAIT`), à
  côté de Lenis (8 Ko).
- `TraitConducteur` dans le bundle de l'accueil : moins de 1 Ko ; le budget Lighthouse `resource-summary:script:size`
  (168 960 octets) reste respecté.
- CLS : 0 (calque absolu, aucun élément de la page déplacé).

## 8. Accessibilité

- Le calque est décoratif (`aria-hidden`), ne capte aucun clic et ne prend jamais le focus.
- Le contenu, l'ordre de lecture et la navigation au clavier ne changent pas.
- Mouvement réduit : pas de trait (§ 4.5).

## 9. Tests

**Unitaires (`lib/trait`) :**

- `trace` est déterministe (même entrée, même `d`).
- Variante « marges » : hors Méthode, ∞ et courbe finale, tous les points échantillonnés ont `x ∈ [12, M − 16]` à
  gauche ou `x ∈ [W − M + 16, W − 12]` à droite ; jamais `x < 0` ni `x > W`.
- Le tracé passe par le centre des cinq nœuds, dans l'ordre, et les `Lᵢ` sont croissants.
- ∞ : à la longueur de chaque logo, la distance au centre vaut `rayon + 6 ± 1 px` ; l'anneau de gauche est longé
  par le bas, la gauche et le haut ; aucun point du trait n'est à moins de `rayon + 5 px` d'un centre.
- Fin du tracé sur le bord du bouton d'envoi.
- Variante « bord » quand `M < 56` ou largeur < 64rem ; abscisses dans `[4, 12]` hors Méthode et courbe finale.
- `progression` : `L` = 0 avant le départ, total après l'envoi, monotone en `T` ; traversée de la Méthode étalée sur
  `0,5 × innerHeight` ; `Yᵢ` rendus strictement croissants.

**Composants :**

- `TraitConducteur` : rien avant le premier défilement ; import au premier défilement (tout de suite si la page est
  déjà défilée) ; pas d'import en mouvement réduit, même en défilant ; arrêt au démontage et au passage au
  mouvement réduit.
- `FriseMethode` : avec `data-trait` sur la frise, ses observateurs n'allument rien.
- CSS (`lib/methode-css.test.ts` étendu) : les règles du mode trait sont sous `[data-trait]` ; rien n'est masqué
  hors de ce mode.

**Bout en bout :**

- Ordinateur : le trait s'allonge quand on défile et recule quand on remonte ; les étapes de la Méthode, les deux
  logos puis le bouton d'envoi reçoivent `data-allumee` dans cet ordre ; rien ne s'éteint en remontant.
- Ordinateur : aucun débordement horizontal pendant tout le défilement.
- Mouvement réduit : pas de calque ; la Méthode est affichée finie.
- Téléphone : variante « bord » ; les étapes s'allument au passage du trait ; logos sans halo.
- Page de prospect (`/?pour=exemple-0000`) : le trait atteint le bouton d'envoi.
- Arrivée directe sur `/#contact` : le trait est tracé jusqu'à la position, les points dépassés sont allumés.
- Sans défilement, le trait n'est pas chargé.
- Le défilement doux reste fluide (test existant `e2e/defilement.spec.ts` : il échouait avec un filtre sur le trait).
- Taille du morceau vérifiée après le build.

**Visuel :** captures ordinateur (1440 px) et téléphone (390 px), dont une à mi-traversée de la Méthode et une
pendant le ∞, pour validation par Augustin avant la PR.

## 10. Hors périmètre

- Les autres pages (réalisations, coulisses, mentions…).
- Une variante du trait pour le thème clair (le site n'en a pas).
- Des interactions avec le trait (survol, clic).

## 11. Révisions pendant la préparation du plan

Le code a été écrit et vérifié une première fois avant le plan. Ce qui a changé par rapport à la version relue :

| Point | Avant | Après | Pourquoi |
|---|---|---|---|
| ∞ | Brins en diagonale du haut d'un anneau au croisement | Tangentes intérieures communes, arcs sur les anneaux | Les diagonales passaient sur le bord des photos |
| Halo du trait | `drop-shadow` | Second tracé translucide, sans filtre | Défilement doux à ~16 images/s au lieu de ~70 (`e2e/defilement.spec.ts` échouait) |
| Chargement | Temps libre après l'affichage | Premier défilement (ou page déjà défilée) | Budget Lighthouse des scripts dépassé de 1 882 octets |
| « bord » sur 1024–1199 px | Non décrit (ligne supposée verticale) | Ligne horizontale, fin le long du bord droit | La Méthode y est horizontale |
| Traversée sur téléphone | Étalée sur un demi-écran | Suit le défilement | La ligne y est verticale : elle se parcourt déjà en défilant |
