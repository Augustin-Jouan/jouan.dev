# Coulisses — une 3D soignée, affichée d'emblée

Date : 2026-10-15 · Statut : design validé en conversation (trois prototypes : styles, vrais plateaux, couleurs),
à relire par Augustin.

Branche : `coulisses-3d`, partie de `main`. Mêmes règles que les sous-projets précédents : français uniquement,
charte « Nuit mauve » (rôles de couleur, jamais de valeur brute hors des fichiers prévus), budgets inchangés.
Cette spec remplace le § 5.3 de `2026-10-09-coulisses-design.md` (vue 3D à la demande) ; le reste de cette
spec-là ne change pas.

## 1. Objectif

La vue 3D de l'« Architecture vivante » ressemble aujourd'hui à un prototype : dix pavés gris identiques, des
traits de 1 px, des paquets minuscules ; sur téléphone, la scène flotte dans une bande au milieu d'un grand
cadre vide. Elle n'est visible qu'après un clic sur « Voir en 3D ».

On en fait une maquette soignée, dans la charte : des objets dont la forme dit le rôle, posés sur des plateaux
qui disent **où** chaque service tourne, colorés par lieu, dans une ambiance de nuit avec brouillard. Et c'est
elle qu'on voit en arrivant sur `/coulisses` ; la 2D devient l'option.

Critères de réussite :

- Un visiteur reconnaît, sans lire, ce qui tourne sur le VPS, ce qui est chez GitHub et ce qui est confié à
  des services externes.
- La 3D s'affiche d'elle-même sur un appareil qui la supporte, sans que la page arrive plus lentement.
- Les budgets tiennent : Lighthouse de `/coulisses` inchangé (scripts ≤ 168 960 octets, CLS ≤ 0,05, LCP), vue
  3D ≤ 180 Ko compressés (`verifier-taille-3d`).
- La disposition et les plateaux sont **vrais** : ils reprennent `data/architecture.ts`, sans rien inventer.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Style | Objets par rôle (style C des prototypes) dans l'ambiance et sur les plateaux du style A |
| Couleur | Par lieu : VPS corail, GitHub sauge, services externes mauve clair, navigateur papier ; élément choisi en pêche, avec un halo |
| Vue par défaut | 3D, chargée au premier geste du visiteur ; la page arrive avec la 2D, qui reste l'option (« Voir en 2D ») |
| Restent en 2D d'office | Pas de WebGL 2, rendu au processeur, économie de données, mouvement réduit, clavier |
| Téléphone | La scène pivote d'un quart de tour : sa longueur part en profondeur et remplit le cadre haut |
| Poids | Rien d'autre que le cœur de Three.js et les deux modules déjà utilisés ; pas de post-traitement |

## 3. La scène

### 3.1 Lieux et disposition

Chaque nœud reçoit un **lieu**, ajouté à `data/architecture.ts` (champ `lieu`), d'après ses textes actuels :

| Lieu | Nœuds | Support dans la scène |
|---|---|---|
| `vps` | Proxy, Site, Base, Temps réel, Déploiement | grand plateau « VPS EN FRANCE · COOLIFY » |
| `github` | CI, Registre | plateau « GITHUB », à l'arrière |
| `externe` | Statistiques, Mails | un socle rond chacun : « UMAMI CLOUD », « FOURNISSEUR SMTP » |
| `chez-vous` | Navigateur | un socle rond, sans nom (son étiquette suffit) |

Les nœuds sont posés **au sol** (plan `x`, `z`, `y` vers le haut), selon une disposition propre à la 3D :
elle ne reprend plus le plan du schéma 2D. Positions de départ, en unités de la scène, ajustables à l'œil :

| Nœud | x | z | Nœud | x | z |
|---|---|---|---|---|---|
| Navigateur | −6,2 | 0,3 | Base | 2,8 | 2,0 |
| Statistiques | −6,2 | 3,0 | Déploiement | 2,3 | −1,2 |
| Proxy | −2,3 | 0,4 | Mails | 6,2 | 0,4 |
| Temps réel | −2,3 | 2,5 | CI | −1,2 | −4,7 |
| Site | 0,5 | 0,4 | Registre | 1,6 | −4,7 |

Les plateaux ne sont pas positionnés à la main : chacun est le rectangle qui englobe les nœuds de son lieu, plus
une marge (environ 1,2 unité) ; les socles sont centrés sur leur nœud. La liaison Registre → Déploiement
traverse le vide entre les plateaux GitHub et VPS : c'est la mise en ligne.

### 3.2 Formes par rôle

| Nœud | Forme |
|---|---|
| Navigateur | écran sur pied |
| Proxy | trois lames empilées |
| Site | bloc |
| Base | trois disques empilés |
| Temps réel | anneau debout |
| Statistiques | trois barres de hauteurs croissantes |
| Mails | enveloppe inclinée |
| CI | écrou (prisme à huit pans, moyeu) |
| Registre | trois conteneurs empilés |
| Déploiement | fusée (cône) |

Toutes sont faites de géométries simples de Three.js (boîtes, cylindres, tore, cône), en matière mate
(`MeshStandardMaterial`, rugosité ≈ 0,7), d'un peu plus d'une unité de large au plus.

### 3.3 Couleurs et ambiance

- **Couleur par lieu** (rôles de la charte, recopiés dans `lib/coulisses/couleurs3d.ts` et vérifiés par
  `couleurs3d.test.ts` comme aujourd'hui) : VPS `lueur` (corail), GitHub `vivant` (sauge), externes
  `texte-doux` (mauve clair), chez vous `texte` (papier). Le liseré et le nom de chaque plateau ou socle
  prennent la couleur de son lieu.
- **Élément choisi** : pêche (`accent`), légère émission chaude et halo au sol ; son étiquette passe en pastille
  pêche. Les autres étiquettes : pastilles sombres (`fond` translucide) au liseré pêche discret.
- **Fond** : couleur `fond` de la page, **brouillard** de la même couleur (la scène se fond dans la page au
  loin), **grille** au sol en `trait` qui s'y estompe.
- **Plateaux et socles** : `surface` (nuit haute), mats, épaisseur fine, liseré de la couleur du lieu ; noms en
  petites capitales espacées, comme les surtitres du site.
- **Liaisons** : tubes courbes (arc vers le haut, plus haut pour les liaisons longues), couleur `trait-fort`.
- **Paquets** : une bille claire avec un halo pêche et une traînée de sept halos décroissants, au rythme des
  latences mesurées (`periodePaquet`, inchangé).
- **Ombres** : une tache sombre et floue sous chaque objet (plan texturé), pas d'ombres calculées.
- **Lumière** : ambiante, un soleil chaud de face et un contre-jour mauve. Les halos sont des sprites en
  mélange additif, sur une texture générée au démarrage (dégradé radial) : aucun fichier image, aucun
  post-traitement.

### 3.4 Interactions

- Orbite à la souris ou au doigt (`OrbitControls`), sans déplacement latéral ; angle vertical borné pour ne
  jamais passer sous le sol ni à la verticale ; zoom borné ; rotation automatique lente, interrompue par un
  geste.
- **Survol** (pointeur fin seulement) : l'objet survolé se soulève légèrement, le curseur devient une main.
- **Clic** sans glisser sur un objet : il est choisi, dans le même panneau de détail qu'aujourd'hui. La rangée
  de boutons « Nœuds » sous la scène reste.

### 3.5 Téléphone et cadres étroits

- Sur un cadre plus haut que large, le monde pivote d'un quart de tour autour de l'axe vertical : la longueur de
  la scène (le navigateur à gauche, les mails à droite) part en profondeur, et la scène remplit le cadre haut.
- La distance de la caméra est calculée pour que toute la scène (plateaux, socles, étiquettes) tienne dans le
  cadre, dans les deux orientations (`distanceCamera`, réécrite pour la disposition au sol).
- Le cadre garde exactement la taille de la 2D (`aspect-[360/820]`, `sm:aspect-[960/420]`) : passer de l'une à
  l'autre ne décale rien.

## 4. Affichage par défaut

### 4.1 Déroulé

1. La page arrive avec la **2D**, rendue par le serveur, à la place exacte de la 3D. Le bouton propose
   « Voir en 3D » dès que WebGL est vérifié, comme aujourd'hui.
2. Au **premier geste** du visiteur — souris qui bouge, appui, toucher, molette, défilement — et si l'appareil
   s'y prête (§ 4.2), la vue 3D se télécharge, se construit, puis apparaît par un fondu d'environ 400 ms sur la
   2D. Pendant le chargement, la 2D reste affichée et utilisable.
3. En 3D, le bouton propose « Voir en 2D ». En 2D, « Voir en 3D ».
4. Un choix explicite du visiteur l'emporte : après « Voir en 2D », la 3D ne revient plus d'elle-même pendant la
   session (`sessionStorage`, lecture et écriture protégées ; sans stockage, le choix vaut pour la page).
5. `/coulisses?vue=3d` (commande « Voir l'architecture en 3D ») ouvre la 3D dès que WebGL est connu, sans
   attendre de geste et même en rendu au processeur : c'est une demande explicite.

### 4.2 Restent en 2D d'office (le bouton « Voir en 3D » reste proposé)

- **Pas de WebGL 2** : le bouton reste invisible, comme aujourd'hui.
- **Rendu au processeur** (SwiftShader, llvmpipe…) : détecté sans Three.js, par le nom du moteur de rendu, dans
  `lib/coulisses/webgl.ts` (même liste que `estRenduLogiciel` de l'intro, recopiée pour ne pas créer de morceau
  partagé). Une 3D au processeur ralentirait toute la page.
- **Économie de données** (`navigator.connection.saveData`).
- **Mouvement réduit** demandé (`prefers-reduced-motion: reduce`) : pas de bascule animée ni de scène qui tourne
  sans qu'on l'ait demandé. Ouverte au bouton, la 3D reste sans rotation automatique ni paquets, comme
  aujourd'hui.
- **Clavier** : une touche n'est pas un « premier geste ». La 2D est la vue accessible (schéma parcourable au
  clavier) ; la remplacer pendant qu'on y navigue ferait perdre le focus. Par sécurité, la bascule automatique
  n'a jamais lieu tant que le focus est dans la figure.

### 4.3 Échecs

Inchangés : création impossible, module introuvable ou contexte WebGL perdu ramènent à la 2D avec le message
« 3D indisponible sur cet appareil ». Une bascule automatique qui échoue ramène à la 2D **sans** message (le
visiteur n'avait rien demandé) ; le bouton reste proposé.

## 5. Performances

- **Premier affichage et Lighthouse** : rien ne change. La 3D (Three.js : 137 Ko compressés aujourd'hui,
  570 Ko de JavaScript) n'est jamais téléchargée sans geste ; Lighthouse n'en fait pas. Le budget des scripts de
  `/coulisses` (168 960 octets) et le CLS ne bougent pas.
- **Visiteur** : il télécharge la 3D seulement sur `/coulisses`, après son premier geste, sur un appareil qui la
  supporte, et pas en économie de données.
- **Poids de la vue 3D** : nouvelles géométries, sprites et texture générée viennent du cœur de Three.js ;
  estimation + 10 à 20 Ko compressés, sous la limite de 180 Ko (`verifier-taille-3d` après le build).
- **En marche** :
  - la scène se met en pause hors de l'écran et onglet caché (inchangé) ;
  - sur pointeur grossier (téléphone, tablette), une image sur deux : 30 images par seconde au plus, pour la
    batterie ;
  - densité de pixels plafonnée à 2 (inchangé) ;
  - géométries partagées entre objets identiques, tout libéré au retour en 2D et au démontage (inchangé).

## 6. Accessibilité

- Le canevas reste `aria-hidden` ; la rangée « Nœuds » (boutons `aria-pressed`) et le panneau de détail
  portent l'information au clavier et aux lecteurs d'écran, comme aujourd'hui.
- La bascule automatique ne déplace jamais le focus et n'annonce rien ; seul un échec demandé par le visiteur
  s'annonce (zone d'état existante).
- Contrastes : les étiquettes gardent texte clair sur fond sombre (ou sombre sur pêche pour l'élément choisi),
  dans les paires déjà validées par la charte.

## 7. Organisation du code

- `data/architecture.ts` : champ `lieu` sur chaque nœud (type `Lieu`).
- `lib/coulisses/geometrie3d.ts` (pur, testé) : positions au sol, plateaux et socles déduits des lieux, noms des
  plateaux, quart de tour sur cadre étroit, distance de la caméra, `periodePaquet` (inchangé).
- `lib/coulisses/formes3d.ts` (nouveau, dans le morceau 3D) : construit l'objet de chaque forme ; ses
  géométries sont partagées et libérables.
- `lib/coulisses/scene3d.ts` : scène, ambiance, plateaux, liaisons, paquets, interactions, boucle. Garde le
  marqueur `scene-3d:v1`.
- `lib/coulisses/couleurs3d.ts` : couleurs ajoutées (fond, surface, trait, lieux), vérifiées contre la charte.
- `lib/coulisses/webgl.ts` : en plus de la disponibilité de WebGL 2, « rendu au processeur ? ».
- `components/coulisses/ArchitectureVivante.tsx` : vue par défaut, premier geste, conditions du § 4.2, choix
  gardé en session, libellés du bouton, fondu.

## 8. Tests

- **Unitaires** :
  - `geometrie3d` : chaque nœud est dans le plateau ou sur le socle de son lieu ; les plateaux et socles ne se
    chevauchent pas ; quart de tour sur cadre étroit ; la scène entière tient dans le champ dans les deux
    orientations ; `periodePaquet` inchangé.
  - `architecture` : chaque nœud a un lieu, et les lieux reprennent les textes (Coolify et VPS pour `vps`,
    GitHub pour `github`, etc.).
  - `couleurs3d` : chaque couleur égale son rôle de la charte.
  - `webgl` : détection du rendu au processeur (noms connus, nom inconnu, extension absente).
  - `ArchitectureVivante` (module 3D simulé) : 2D au rendu ; bascule au premier geste ; aucune bascule sur
    touche, focus dans la figure, mouvement réduit, économie de données, rendu au processeur, ou après
    « Voir en 2D » dans la session ; libellés « Voir en 2D » / « Voir en 3D » ; échec d'une bascule
    automatique sans message, échec demandé avec message ; `?vue=3d` sans geste.
- **Bout en bout** (`e2e/coulisses-3d.spec.ts`) :
  - sans aucun geste, Three.js n'est pas chargé (`__THREE__` absent) ;
  - au premier geste, la 3D remplace la 2D si le navigateur de test rend par la carte graphique, sinon la 2D
    reste (le test vérifie la branche qui s'applique) ;
  - `?vue=3d` : canevas visible, chaque morceau chargé est compté par `verifier-taille-3d`, choix d'un nœud,
    « Voir en 2D » ramène le schéma ;
  - accessibilité de `/coulisses` sans violation, en 2D comme en 3D.
- **Budgets** : `verifier-taille-3d` ; Lighthouse de `/coulisses` (scripts, CLS) inchangé.
- **À l'œil** : captures ordinateur et téléphone de la scène, envoyées à Augustin avant la PR.

## 9. Hors périmètre

- Le schéma 2D (formes, couleurs, disposition) : il ne change pas.
- Les visiteurs présents dans la scène, les paquets émis à chaque mesure réelle, le mode « suivre une
  requête », une entrée animée de la caméra : pistes écartées pour cette fois.
- Un effet de « bloom » ou tout post-traitement.
