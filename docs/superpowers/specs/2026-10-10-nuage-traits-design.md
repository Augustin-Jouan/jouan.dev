# Sous-projet 9 — Le nuage de traits remplace le halo de l'accueil

Date : 2026-10-10 · Statut : design validé en conversation (sections 1 et 2), à relire par Augustin.

Prolonge les specs du sous-projet 1 (intro « goutte de lumière ») et du sous-projet 6 (charte « Nuit mauve »).
Mêmes règles : français uniquement, mêmes budgets.

Branche : `nuage-traits`, partie de `main` après la fusion de la PR #12 (intro de 3,2 s).

## 1. Objectif

Le halo corail en haut à droite de l'accueil, qui suit un peu la souris, ne convient plus : il réagit à peine, et
sa matière (corail presque opaque, bord rose sombre qui ondule) ressemble à une tache. Il est remplacé par un
**nuage de petits traits** qui suit la souris, dans l'esprit de la page d'accueil d'Antigravity : des traits
orientés en rayons autour du curseur, aux couleurs de la charte.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Effet | Nuage de petits traits orientés en rayons autour du curseur, estompés avec la distance |
| Couleurs | Charte : pêche, corail, rose, mauve, répartis selon l'angle autour du centre et tournant lentement |
| Fin de l'intro | La goutte se rétracte vers la place de repos, puis **éclate en traits** qui se posent en nuage |
| Repli | **Nuage figé en SVG**, rendu par le serveur ; le halo CSS est supprimé |
| Téléphone | Le nuage respire à sa place ; il **suit le doigt** pendant le toucher, puis revient au lâcher |
| Technique | **Moteur WebGL actuel** : goutte et traits dans le même contexte, traits en rendu instancié |

**Écartés :** une goutte qui s'étire vers la souris (même matière que la tache) ; une lueur, une aurore, un soleil
net ou une éclipse (ébauchés, non retenus) ; les traits en Canvas 2D (calcul sur le fil principal, deux canvas à
synchroniser) ; les traits en éléments HTML ou SVG animés (trop lents).

## 3. Ce que voit le visiteur

- **Le nuage :** des traits arrondis de 2 px d'épaisseur et de 4 à 8 px de long, semés sur le premier écran,
  environ un par carré de 28 px de côté (à peu près 1 300 sur un portable, 500 sur un téléphone, **1 600 au plus**).
- **Autour du centre du nuage :** seuls les traits proches sont visibles ; ils s'estompent avec la distance et
  laissent un petit vide au centre. Chaque trait est orienté en rayon depuis le centre et légèrement repoussé vers
  l'extérieur ; les traits proches sont un peu plus longs. Le rayon du nuage respire doucement.
- **Centre du nuage :** il suit la souris avec un léger retard. Sans souris (pas encore bougée, ou sortie de la
  fenêtre), il revient à la **place de repos**, celle du halo actuel (`reposHalo`, `HALO` de
  `lib/encre/chronologie.ts`).
- **Fin de l'intro**, sur la même durée totale (3,2 s) :

  | Moment | Ce qui se passe |
  |---|---|
  | 0 → 2 s | Inchangé : la goutte pêche s'étale, le nom et « Développeur full stack » apparaissent |
  | 2 → 2,7 s | La goutte se rétracte vers la place de repos et rapetisse (le nom s'efface comme aujourd'hui) |
  | 2,7 → 3,2 s | Elle éclate : les traits partent de son centre en rayons et ralentissent jusqu'à leur place ; la goutte disparaît |

- **Téléphone :** au repos, le nuage respire à sa place. Toucher ou glisser le doigt déplace le centre du nuage
  sous le doigt ; au lâcher, il revient à sa place.
- **Repli** (mouvement réduit, WebGL absent ou en échec, rendu logiciel, et avant le chargement du moteur) : le
  nuage figé, à la place de repos, en SVG rendu par le serveur, visible sans JavaScript.
- **Inchangés :** un geste du visiteur coupe l'intro ; l'intro se joue à chaque visite ; « Rejouer l'intro »
  (palette) fonctionne ; le canvas reste décoratif (`aria-hidden`).

## 4. Architecture

| Fichier | Rôle |
|---|---|
| `lib/encre/nuage.ts` (nouveau, pur) | Semis déterministe des traits pour une taille d'écran : position, longueur, phase ; plafond de 1 600. Sert au moteur et au nuage figé |
| `lib/encre/chronologie.ts` | Phases de fin d'intro (rétractation, éclatement), cible du nuage (souris, doigt ou repos), respiration. Le halo (`etatHalo`, mélange vers le dégradé corail) disparaît |
| `lib/encre/shader.ts` | Shader de la goutte allégé de la partie halo ; nouveau programme des traits : orientation en rayon, poussée, estompe, couleur selon l'angle, trajet depuis la goutte pendant l'éclatement |
| `lib/encre/moteur.ts` | Deux programmes dans le même contexte WebGL2 ; traits dessinés en un appel instancié. Résolution : densité de l'écran plafonnée à 2 (la demi-résolution actuelle rendrait flous des traits de 2 px). Dessin continu tant que le haut de page est visible (respiration) ; pause hors écran et onglet caché, refus du rendu logiciel et libération du contexte conservés |
| `components/accueil/IntroEncre.tsx` | Suit la souris et le doigt ; oublie la souris quand elle quitte la fenêtre, le doigt quand il se lève |
| `components/accueil/NuageFige.tsx` (remplace `HaloCss.tsx`) | Le nuage figé en SVG : seuls les traits visibles autour de la place de repos (environ 250, environ 3 Ko compressés). Quand le moteur prend le relais, fondu de 0,3 s vers les traits animés : la disposition des traits diffère un peu, le nuage reste au même endroit |

**Supprimés :** `HaloCss.tsx`, la règle `.halo-css` de `app/globals.css`, le dégradé du halo dans le shader.

## 5. Budgets

- Moteur de l'encre : **10 Ko compressés** au plus, inchangé (`scripts/verifier-taille-encre.mjs`) ; le programme
  des traits ajoute environ 2 Ko.
- Nuage figé : environ 3 Ko compressés dans le HTML de l'accueil, qui reste prérendu
  (`verifier-accueil-statique`).
- Lighthouse : seuils inchangés.

## 6. Tests et vérifications

**Unitaires (Vitest) :**
- semis : déterministe (même taille, même nuage), densité, plafond de 1 600, traits dans l'écran ;
- chronologie : rétractation vers la place de repos, éclatement de 2,7 à 3,2 s, fin à 3,2 s ; cible du nuage
  (souris, doigt, repos) ; position de repos identique à celle du halo actuel ;
- `IntroEncre` : suivi du doigt, oubli de la souris à la sortie de la fenêtre et du doigt au lâcher ;
- `NuageFige` : SVG décoratif, nombre de traits borné.

**Bout en bout (Playwright) :**
- l'intro se termine, le moteur passe en `data-encre="actif"`, aucune erreur console ;
- repli : le nuage figé est présent avec le mouvement réduit et sans WebGL ;
- audit d'accessibilité (axe) de l'accueil, avant et après l'intro ;
- tests existants de l'intro, de l'accueil et des replis adaptés (le halo CSS disparaît).

**Visuel :** captures pendant l'éclatement, et du nuage près et loin de la souris, sur ordinateur et téléphone.

## 7. Exécution

Le plan découpe le travail en tâches ; l'exécution (par Claude ou en fiches) se décide à la relecture du plan.
