# Sous-projet 4 — Temps réel

Date : 2026-10-09 · Statut : design validé en conversation (sections 1 à 3), à relire par Augustin.

Prolonge les specs des sous-projets 1 à 3 (`2026-10-08-socle-et-accueil-design.md`,
`2026-10-09-etudes-de-cas-design.md`, `2026-10-09-accueil-personnalise-design.md`) : direction
« Atelier clair », français uniquement, pas de nom de client, de projet ou d'employeur dans le dépôt,
mêmes budgets. Introduit le service `apps/realtime` (Hono), prévu par la spec du sous-projet 1
(« Next.js + service Hono séparé », pas de service temps réel managé : le site doit prouver le back).

Branche : `sous-projet-4-temps-reel`, partie de `sous-projet-3-accueil-personnalise` (le composant
`Accueil` vient du sous-projet 3) ; sa PR visera `main` une fois la PR du sous-projet 3 fusionnée.

## 1. Objectif

Sur l'accueil, un visiteur voit qu'il n'est pas seul : un compteur « 3 personnes regardent cette page »
dans l'accroche, et les curseurs des autres visiteurs qui se déplacent sur la page. L'effet montre, en
direct, un savoir-faire back (WebSocket, état partagé, limites, déploiement d'un service).

## 2. Décisions

| Sujet | Décision |
|---|---|
| Où | Curseurs **uniquement sur l'accueil** (`/` et pages personnalisées `/?pour=…`) ; ailleurs, rien |
| Partage | **Par défaut** : chaque visiteur partage son curseur dès son arrivée ; bouton « Masquer mon curseur » |
| Mobile | Appareils sans pointeur fin : **compteur seul**, aucun curseur envoyé ni affiché |
| Pages personnalisées | **Même salle** que l'accueil ; aucun nom ni jeton ne passe par le WebSocket |
| Apparence | **Flèche colorée sans texte**, couleur tirée d'une palette accordée à la charte |
| Compteur | « N personnes regardent cette page », **masqué quand on est seul** (affiché à partir de 2), point vert pulsé |
| Architecture | **Service séparé** `apps/realtime` (Hono, Node), sa propre image et sa propre ressource Coolify, sur `direct.portfolio.jouan.dev` |
| État | **En mémoire**, une seule instance ; ni base ni Redis |

**Écartés :** curseurs sur tout le site ou seulement sur le premier écran ; partage sur demande ;
pseudonymes et traînées d'encre ; affichage « Vous êtes seul ici » ; serveur Node personnalisé servant
Next et le WebSocket (couplage du rendu et du temps réel, déjà écarté au sous-projet 1) ; deux processus
dans une même image.

## 3. Service `apps/realtime`

**Pile :** Node 22, Hono 4 (`hono`), `@hono/node-server` 2 avec son WebSocket intégré (sur `ws`) — `@hono/node-ws` est déprécié —, TypeScript, Vitest, bundle `esbuild` ; un
paquet du workspace pnpm comme `web` et `demo-marches`, avec `lint`, `typecheck`, `test`, `build`,
`dev`.

**Routes :**
- `GET /sante` → `200` (healthcheck Docker et Coolify) ;
- `GET /direct` → montée en WebSocket.

**Configuration (variables d'environnement) :**
- `PORT` (défaut `3001`) ;
- `ORIGINES_AUTORISEES` : liste séparée par des virgules (`https://portfolio.jouan.dev`, et en local
  `http://localhost:3000`) ; vide = toute connexion refusée.

**État en mémoire :** une « salle » unique, table `id → { couleur, partage, position? }`.
L'identifiant est tiré au hasard à la connexion (court, opaque) ; il n'est relié à rien (ni jeton de
prospect, ni cookie) et disparaît à la déconnexion. Tout l'état est perdu au redémarrage, sans
conséquence.

**Couleurs :** palette de six teintes lisibles sur le papier (`#f3efe7`), dérivées de la charte
(brique, braise, terre, encre douce, et deux teintes complémentaires validées en contraste ≥ 3:1 sur
le papier) ; attribuée à l'arrivée, en évitant si possible une couleur déjà prise.

**Protocole :** JSON, un champ `type`, messages courts.

| Sens | `type` | Contenu | Quand |
|---|---|---|---|
| navigateur → serveur | `position` | `s` (indice de section, entier ≥ 0), `x`, `y` (0 à 1) | souris en mouvement, 20/s au plus |
| navigateur → serveur | `masque` | — | partage coupé, souris hors de la page, onglet caché |
| serveur → navigateur | `bienvenue` | `id`, `couleur`, `presents` (nombre), `curseurs` (positions connues) | à la connexion |
| serveur → navigateur | `presents` | `nombre` | quand le nombre de connectés change |
| serveur → navigateur | `positions` | liste `[id, couleur, s, x, y]` des curseurs qui ont bougé | lot toutes les 50 ms, seulement s'il y a du changement |
| serveur → navigateur | `depart` | `id` | curseur masqué ou connexion fermée |

Le nombre de présents compte **toutes** les connexions (mobiles et visiteurs qui ne partagent pas).
Un client ne reçoit jamais son propre curseur.

**Garde-fous :**
- en-tête `Origin` absent ou hors `ORIGINES_AUTORISEES` → refus de la montée (`403`) ;
- 300 connexions au plus au total, 5 par adresse IP (lue dans `X-Forwarded-For` posé par le proxy de
  Coolify, sinon l'adresse de la socket) ; au-delà, refus. L'IP n'est gardée qu'en mémoire le temps de
  la connexion, jamais journalisée ni stockée ;
- message de plus de 128 octets, ou plus de 40 messages par seconde sur une connexion → fermeture
  (code `1008`) ;
- message mal formé (JSON invalide, type inconnu, nombres hors bornes) → ignoré, jamais rediffusé ;
- ping toutes les 30 s ; une connexion sans pong est fermée ;
- journaux : démarrage, arrêts, refus (sans IP), erreurs ; jamais de position.

**Arrêt propre :** sur `SIGTERM`, fermeture des connexions (code `1001`) puis sortie.

**Image Docker :** `apps/realtime/Dockerfile` (multi-étapes, Node 22 alpine, utilisateur sans
privilèges, `HEALTHCHECK` sur `/sante`), construite depuis la racine du dépôt.

## 4. Client dans le site

**Composant :** `PresenceDirecte` (composant client), monté dans `Accueil` : présent sur `/` et sur
`/pour/[jeton]`. Il ne rend rien au serveur : `/` reste statique (vérifié par
`verifier-accueil-statique`).

**Configuration :** `NEXT_PUBLIC_DIRECT_URL` (par exemple `wss://direct.portfolio.jouan.dev/direct`),
figée au build comme l'identifiant Umami (`ARG` dans le `Dockerfile`). Absente → aucun code de
connexion n'est exécuté, ni compteur, ni curseur. La CSP (`next.config.ts`) ajoute son origine à
`connect-src` quand elle est définie.

**Chargement :** connexion après l'événement `load`, dans un temps libre du navigateur
(`requestIdleCallback`, à défaut un court délai) ; WebSocket natif, sans bibliothèque ; objectif
≤ 4 Ko compressés pour tout le client temps réel.

**Coordonnées :** chaque section de l'accueil porte un repère (`data-direct-section`, dans l'ordre :
accroche, offre, réalisations, méthode, parcours, contact). La position envoyée est la section sous la
souris, `y` relatif à la hauteur de cette section, `x` relatif à la colonne de contenu (largeur maximale
de la page). À l'affichage, chaque client reconvertit dans sa propre mise en page : un curseur pointé
sur un mot retombe sur ce mot quelle que soit la largeur d'écran. Une position hors de toute section
n'est pas envoyée (`masque`).

**Curseurs :**
- seulement si `matchMedia("(pointer: fine)")` ; sinon ni envoi ni affichage ;
- calque en position absolue au-dessus du contenu, `pointer-events: none`, `aria-hidden="true"` ;
- flèche SVG de la couleur du visiteur, déplacée par `transform` avec une transition courte ;
  `prefers-reduced-motion` → déplacement sans animation ;
- un curseur sans nouvelle position depuis 10 s s'estompe.

**Compteur :** au-dessus du surtitre de l'accroche (place réservée depuis le sous-projet 1), avant la
salutation du sous-projet 3. Point vert pulsé (sans pulsation si `prefers-reduced-motion`) et texte
« N personnes regardent cette page », affiché à partir de 2 présents. La ligne est **toujours réservée**
(hauteur fixe, vide quand on est seul ou sans service) : son apparition ne décale rien (CLS ≤ 0,05).
Annonce aux lecteurs d'écran par une zone `aria-live="polite"`.

**Bouton :** « Masquer mon curseur » / « Montrer mon curseur », à côté du compteur, visible seulement
sur pointeur fin et quand le compteur est affiché. Le choix est retenu dans `localStorage` (accès dans
un try/catch ; par défaut, partage). Masquer envoie `masque` et coupe l'envoi des positions.

**Robustesse :**
- coupure → reconnexion avec délai croissant (1 s, 2 s, 4 s… jusqu'à 30 s) ;
- onglet caché plus de 30 s → fermeture de la connexion (place libérée) ; retour → reconnexion ;
- service injoignable ou refus → page identique à aujourd'hui ; le code du site ne journalise rien
  (le navigateur peut signaler lui-même l'échec de connexion dans sa console, ce qui ne peut pas être évité).

## 5. Confidentialité

La politique de confidentialité gagne un paragraphe : sur l'accueil, la position relative de la souris
est partagée en direct avec les autres visiteurs présents, sous forme d'une flèche colorée anonyme ;
rien n'est enregistré ; l'adresse IP sert uniquement, en mémoire et le temps de la connexion, à limiter
le nombre de connexions ; le partage peut être coupé avec le bouton « Masquer mon curseur ». Aucun
cookie nouveau ; le choix du bouton reste dans le navigateur.

## 6. Exploitation

- **CI :** le service passe par `pnpm lint`, `pnpm typecheck`, `pnpm test` (workspace). Le job `image`
  construit et pousse deux images sur GHCR (site et temps réel). Le job de déploiement prévient les deux
  ressources Coolify ; le webhook du service vient d'un secret à part, et l'étape est sautée tant qu'il
  n'est pas défini.
- **Build du site :** `NEXT_PUBLIC_DIRECT_URL` passée en argument de build (variable de dépôt GitHub),
  comme `UMAMI_WEBSITE_ID`.
- **README :** section « Temps réel » (lancer le service en local, variables, déploiement).
- **À faire par Augustin :** entrée DNS de `direct.portfolio.jouan.dev`, ressource Coolify du service
  (image GHCR, `ORIGINES_AUTORISEES`), variable `NEXT_PUBLIC_DIRECT_URL`, secret du second webhook.

## 7. Tests et budgets

- **Service — unitaires :** lecture et validation des messages (bornes, tailles, types inconnus) ; la
  salle (arrivées, départs, couleurs, lots de positions, pas d'écho à soi-même) ; plafonds global et par
  IP ; limite de débit.
- **Service — intégration :** vrai serveur sur un port libre, vrais clients WebSocket (`ws` en
  dépendance de développement) : origine refusée, 6e client d'une même IP refusé, diffusion du compteur
  et des positions, départ, fermeture sur message trop gros.
- **Site — unitaires :** conversions de coordonnées (section ↔ page, dans les deux sens) ; composant
  avec un faux WebSocket : compteur masqué seul, « 3 personnes… » à trois, bouton qui coupe l'envoi,
  rien sans `NEXT_PUBLIC_DIRECT_URL`, pas de curseur sans pointeur fin.
- **Bout en bout :** Playwright démarre aussi le service ; deux contextes ouvrent l'accueil : chacun voit
  « 2 personnes regardent cette page », un mouvement de souris dans l'un fait apparaître un curseur dans
  l'autre ; projet mobile : compteur seul.
- **Lighthouse :** accueil mesuré avec le service démarré ; seuils inchangés (performance ≥ 0,95,
  LCP ≤ 2 800 ms, CLS ≤ 0,05, scripts ≤ 160 Ko).

## 8. Hors périmètre

Clics ou réactions partagés, discussion, curseurs ailleurs que sur l'accueil, historique ou statistiques
de présence, plusieurs instances du service (et Redis), vue « en direct » des prospects dans
l'administration.

## 9. À valider par Augustin

- le nom du sous-domaine `direct.portfolio.jouan.dev` ;
- le texte du compteur et des boutons ;
- le paragraphe de la politique de confidentialité ;
- la palette des six couleurs de curseur (rendu final à voir sur la prévisualisation).
