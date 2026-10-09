# Sous-projet 4 — Temps réel

Date : 2026-10-09 · Statut : design validé en conversation (sections 1 à 3), revu (25 remarques
intégrées), à relire par Augustin.

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
| Où | Curseurs **uniquement sur l'accueil** ; ailleurs, rien |
| Partage | **Par défaut** : chaque visiteur partage son curseur dès son arrivée ; bouton « Masquer mon curseur », **visible dès la connexion** sur pointeur fin (on peut refuser avant que quiconque arrive) |
| Mobile | Appareils sans pointeur fin : **compteur seul**, aucun curseur envoyé ni affiché, pas de bouton |
| Pages personnalisées | **Même salle** que l'accueil ; aucun nom ni jeton ne passe par le WebSocket |
| Apparence | **Flèche colorée sans texte**, couleur tirée d'une palette accordée à la charte |
| Compteur | « N personnes regardent cette page », **masqué quand on est seul** (affiché à partir de 2), point vert pulsé |
| Architecture | **Service séparé** `apps/realtime` (Hono, Node), sa propre image et sa propre ressource Coolify, sur `direct.portfolio.jouan.dev` |
| État | **En mémoire**, une seule instance ; ni base ni Redis |

**Une seule vérité pour « l'accueil » :** le visiteur ouvre `/` ou `/?pour=<jeton>` ; le rendu vient de
`app/page.tsx` ou de `/pour/[jeton]` (réécriture du proxy, sous-projet 3) ; dans les deux cas le même
composant `Accueil` monte la présence en direct, et tous rejoignent la même salle.

**Écartés :** curseurs sur tout le site ou seulement sur le premier écran ; partage sur demande ;
pseudonymes et traînées d'encre ; affichage « Vous êtes seul ici » ; serveur Node personnalisé servant
Next et le WebSocket (couplage du rendu et du temps réel, déjà écarté au sous-projet 1) ; deux processus
dans une même image ; calque de curseurs en `position: fixed` (il faudrait suivre le défilement : un
calque en coordonnées de document défile avec la page, sans écouteur).

## 3. Service `apps/realtime`

**Pile :** Node 22, Hono 4 (`hono`), `@hono/node-server` 2 avec son WebSocket intégré (sur `ws`) —
`@hono/node-ws` est déprécié —, TypeScript, Vitest, bundle `esbuild` ; un paquet du workspace pnpm
comme `web` et `demo-marches`, avec `lint`, `typecheck`, `test`, `build`, `dev`, `start`.

**Routes :**
- `GET /sante` → `200` (healthcheck Docker et Coolify) ;
- `GET /direct` → montée en WebSocket.

**Configuration (variables d'environnement) :**
- `PORT` (défaut `3001`), `HOTE` (défaut `0.0.0.0`) ;
- `ORIGINES_AUTORISEES` : liste séparée par des virgules ; vide = toute connexion refusée (voir §6
  pour les valeurs par environnement) ;
- `CONNEXIONS_PAR_IP` (défaut `5` ; relevé en e2e, où tous les navigateurs partagent `127.0.0.1`).

**État en mémoire :** une « salle » unique, table `id → { couleur, position | null }` (`null` : curseur
masqué, ou jamais envoyé — cas des mobiles). L'identifiant est tiré au hasard à la connexion (court,
opaque) ; il n'est relié à rien (ni jeton de prospect, ni cookie) et disparaît à la déconnexion. Une
reconnexion donne un nouvel identifiant et une nouvelle couleur. Tout l'état est perdu au redémarrage,
sans conséquence.

**Couleurs :** palette de six teintes lisibles sur le papier (`#f3efe7`, contraste ≥ 3:1) : brique
`#c84a1f`, braise `#e0582b`, terre `#8a5a3c`, encre douce `#5b574f`, sarcelle `#2f6f6a`, ardoise
`#3b5b8c` ; attribuée à l'arrivée, une couleur libre si possible, sinon la moins utilisée.

**Protocole :** JSON, un champ `type`, messages courts. Un curseur s'écrit `[id, couleur, s, x, y]`.

| Sens | Message | Quand |
|---|---|---|
| navigateur → serveur | `{ type: "position", s, x, y }` — `s` indice de section (entier, 0 ≤ s < 20), `x`, `y` entre 0 et 1 | souris en mouvement, 20/s au plus |
| navigateur → serveur | `{ type: "masque" }` | partage coupé, souris hors des sections ou de la page, onglet caché |
| serveur → navigateur | `{ type: "bienvenue", id, couleur, presents, curseurs: Curseur[] }` | à la connexion |
| serveur → navigateur | `{ type: "presents", nombre }` | quand le nombre de connectés change |
| serveur → navigateur | `{ type: "positions", curseurs: Curseur[] }` | lot toutes les 50 ms, seulement s'il y a du changement |
| serveur → navigateur | `{ type: "depart", id }` | curseur masqué ou connexion fermée |

Le nombre de présents compte **toutes** les connexions (mobiles et visiteurs qui ne partagent pas).
Un client ne reçoit jamais son propre curseur.

**Ordre des messages :** masquer ou quitter retire l'identifiant du lot en cours ; un lot n'est construit
qu'avec les curseurs encore visibles, et chaque connexion reçoit ses messages dans l'ordre d'envoi.
Un `depart` n'est donc jamais suivi d'une position antérieure. Un curseur masqué qui bouge de nouveau
réapparaît par un lot `positions` : le navigateur affiche toute position reçue.

**Fan-out borné :** un lot et la liste de `bienvenue` contiennent **30 curseurs au plus** (les plus
récemment bougés). Au-delà, les présents sont comptés mais pas tous dessinés : à 300 connexions, un lot
reste de l'ordre de 300 envois de 30 curseurs, 20 fois par seconde au plus.

**Garde-fous :**
- `Origin` absent ou hors `ORIGINES_AUTORISEES` → refus de la montée, HTTP `403`. L'origine arrête un
  navigateur sur un autre site, pas un script : l'abus automatisé repose sur les plafonds ci-dessous ;
- adresse IP : la **dernière** entrée de `X-Forwarded-For` (après découpage et nettoyage), posée par le
  proxy de Coolify ; à défaut, l'adresse de la socket. Les entrées précédentes viennent du client et ne
  sont jamais lues ;
- 300 connexions au plus au total, 5 par adresse IP ; au-delà, refus de la montée, HTTP `429` ; si une
  autre connexion prend la dernière place entre le contrôle et l'ouverture, fermeture `1013`. L'IP n'est
  gardée qu'en mémoire le temps de la connexion, jamais journalisée ni stockée ;
- **128 octets UTF-8 au plus par trame du navigateur vers le serveur**, et 40 messages par seconde par
  connexion ; au-delà, ou pour une trame binaire, fermeture `1008`. Les messages du serveur ne sont pas
  plafonnés (leur taille découle du plafond de 30 curseurs) ;
- message mal formé (JSON invalide, type inconnu, nombres hors bornes) → ignoré, jamais rediffusé ;
- ping toutes les 30 s ; une connexion sans pong est coupée ;
- journaux : démarrage, arrêts, refus d'origine (sans IP), erreurs ; jamais de position.

**Arrêt propre :** sur `SIGTERM`, fermeture des connexions (code `1001`) puis sortie.

**Image Docker :** `apps/realtime/Dockerfile` (multi-étapes, Node 22 alpine, utilisateur sans
privilèges, `HEALTHCHECK` sur `/sante`), construite depuis la racine du dépôt.

## 4. Client dans le site

**Composants :** `PresenceDirecte` (composant client) enveloppe le contenu de `Accueil` ; il ne rend
rien de dynamique au serveur : `/` reste statique (vérifié par `verifier-accueil-statique`).

**Configuration :** `NEXT_PUBLIC_DIRECT_URL` (par exemple `wss://direct.portfolio.jouan.dev/direct`),
figée au build comme l'identifiant Umami (`ARG` dans le `Dockerfile`, alimenté par la variable de dépôt
GitHub `DIRECT_URL`). Absente → aucun code de connexion n'est chargé ni exécuté, ni compteur, ni curseur.

**Chargement et budget :** le code de connexion (WebSocket natif, sans bibliothèque) est un morceau
séparé, chargé par `import()` après l'événement `load`, dans un temps libre du navigateur
(`requestIdleCallback`, à défaut un court délai), comme le moteur de l'intro. Objectif ≤ 4 Ko
compressés pour ce morceau, vérifié en CI par un script `verifier-taille-direct` (sur le modèle de
`verifier-taille-encre`, repéré par un marqueur).

**Repères de section :** chaque section de l'accueil porte `data-direct-section="<repère>"`, et l'indice
`s` échangé vient d'une table fixe, indépendante de l'ordre du document :

| `s` | Repère | Section |
|---|---|---|
| 0 | `accroche` | premier écran (`Accroche`) |
| 1 | `offre` | Ce que je fais |
| 2 | `realisations` | Réalisations |
| 3 | `methode` | Comment je travaille |
| 4 | `parcours` | Parcours |
| 5 | `contact` | Contact |

L'intro « goutte d'encre » n'est pas une section : elle n'a pas de repère. La section sous le pointeur
est celle dont la boîte (en coordonnées de document) contient le point ; `x` est relatif à la largeur de
cette boîte (la colonne de contenu), `y` à sa hauteur. Hors de toute section (marges latérales, en-tête,
pied de page) → `masque`.

**Précision attendue :** un curseur retombe dans **la même zone de la même section** chez tous les
visiteurs (même bande de lecture, même côté de la colonne). Comme le texte se recompose selon la largeur
d'écran, il ne pointe pas forcément le même mot.

**Curseurs :**
- seulement si `matchMedia("(pointer: fine)")` ; sinon ni envoi ni affichage ;
- calque en position absolue dans `body`, en coordonnées de document (il défile avec la page),
  `pointer-events: none`, `aria-hidden="true"` ; positions recalculées à chaque lot et au
  redimensionnement de la fenêtre ;
- flèche SVG de la couleur du visiteur, déplacée par `transform` avec une transition courte ;
  `prefers-reduced-motion` → déplacement sans animation ;
- un curseur sans nouvelle position depuis 10 s s'estompe — **affichage seulement** : le serveur le
  garde tant que le visiteur ne le masque pas ou ne part pas.

**Accroche, ordre figé :** compteur → salutation (pages personnalisées, sous-projet 3) → surtitre →
titre. La ligne du compteur est une **place à hauteur fixe rendue par le serveur** dans `Accroche`
(nouvelle : le sous-projet 1 n'avait laissé qu'un commentaire), vide sans service ou quand on est seul,
remplie côté client : son apparition ne décale rien (CLS ≤ 0,05). La salutation est rendue par le
serveur avec la page : elle ne bouge pas non plus.

**Compteur :** point vert pulsé (sans pulsation si `prefers-reduced-motion`) et « N personnes regardent
cette page », affiché à partir de 2 présents ; zone `aria-live="polite"`. Connexion perdue → le compteur
disparaît (pas de nombre périmé affiché) jusqu'au prochain `bienvenue`.

**Bouton :** « Masquer mon curseur » / « Montrer mon curseur », sur la ligne du compteur, visible dès
que la connexion est établie et seulement sur pointeur fin. Le choix est retenu en stockage local
(`localStorage`, accès protégé ; par défaut, partage). Masquer envoie `masque` et coupe l'envoi des
positions.

**Robustesse :**
- coupure → reconnexion avec délai croissant (1 s, 2 s, 4 s… jusqu'à 30 s), chaque délai varié de ±20 %
  pour que les visiteurs ne se reconnectent pas tous à la même seconde après un redéploiement ;
- onglet caché → `masque` tout de suite, fermeture après 30 s (place libérée) ; retour → reconnexion ;
- service injoignable ou refus → page identique à aujourd'hui ; le code du site ne journalise rien
  (le navigateur peut signaler lui-même l'échec de connexion dans sa console, ce qui ne peut pas être évité).

**CSP :** l'origine de `NEXT_PUBLIC_DIRECT_URL` (`wss://…` en production) est ajoutée à `connect-src`.
La directive `upgrade-insecure-requests` n'est **pas** émise quand `NEXT_PUBLIC_DIRECT_URL` commence par
`ws://` (e2e et Lighthouse en local et en CI, servis en `http://127.0.0.1`), sinon le navigateur
réécrirait la connexion en `wss://` ; en production (`wss://`), rien ne change.

## 5. Confidentialité

La politique de confidentialité gagne une section « Présence en direct » :
- **ce qui est partagé** : sur l'accueil, la position de la souris relative à la section affichée, sous
  forme d'une flèche colorée anonyme, et le nombre de personnes présentes ; rien n'est enregistré ;
- **finalité et base légale** : animer la page d'accueil et montrer un savoir-faire technique ; intérêt
  légitime (article 6.1.f du RGPD), avec possibilité de s'y opposer à tout moment ;
- **destinataires** : les autres visiteurs présents au même moment (la flèche seulement), et
  l'hébergeur du service, qui achemine la connexion ;
- **durée** : le temps de la visite ; l'adresse IP sert uniquement, en mémoire et le temps de la
  connexion, à limiter le nombre de connexions ; les journaux techniques du serveur d'hébergement
  (adresse IP, date) relèvent de la mention déjà faite pour le site ;
- **opposition** : le bouton « Masquer mon curseur » ; le choix est gardé en stockage local, comme le
  repère de l'intro déjà vue ; pas de cookie supplémentaire.

## 6. Exploitation

- **Origines autorisées (`ORIGINES_AUTORISEES`) :**
  - prévisualisation (Coolify) : `https://portfolio.jouan.dev` ;
  - production, à la bascule sur le domaine nu : ajouter `https://jouan.dev` ;
  - développement local : `http://localhost:3000` ;
  - e2e : `http://127.0.0.1:3100` ; Lighthouse : `http://127.0.0.1:3000` (posées par la CI).

  Toute origine HTTPS servant le site doit figurer dans la liste de la ressource Coolify.
- **Exposition :** le service n'est joignable qu'en HTTPS par le proxy de Coolify (Traefik) ; le port
  3001 n'est pas publié sur l'hôte. C'est ce qui rend fiable la dernière entrée de `X-Forwarded-For`.
- **Une instance :** une seule réplique. Pendant un redéploiement, les visiteurs sont déconnectés
  quelques secondes puis se reconnectent (délais variés de ±20 %) ; le compteur peut être faux pendant
  ce court moment, ce qui est accepté.
- **Mise en service, dans cet ordre :** entrée DNS de `direct.portfolio.jouan.dev` → ressource Coolify
  du service (image GHCR, `ORIGINES_AUTORISEES`) en ligne et saine → variable de dépôt GitHub
  `DIRECT_URL` (`wss://direct.portfolio.jouan.dev/direct`), qui devient `NEXT_PUBLIC_DIRECT_URL` au
  build du site → secret `COOLIFY_WEBHOOK_URL_DIRECT`. Tant que `DIRECT_URL` est vide, le site ne tente
  aucune connexion.
- **CI :**
  - le service passe par `pnpm lint`, `pnpm typecheck`, `pnpm test` (workspace) ;
  - job `e2e` : `NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct` pour le build et les tests ;
    Playwright démarre le service (port 3201) à côté du site ; les tests de présence sont dans un projet
    Playwright à part, exécuté seul après les autres, en série ; le service est relancé (port 3201,
    origine `http://127.0.0.1:3000`) pour Lighthouse ; `verifier-taille-direct` après le build ;
  - job `image` : deux images poussées sur GHCR (site, temps réel) ;
  - job de déploiement : prévient les deux ressources Coolify ; le webhook du service vient de son
    propre secret, et l'étape est sautée tant qu'il n'est pas défini.
- **README :** section « Temps réel » (lancer le service en local, variables, origines, mise en service).

## 7. Tests et budgets

- **Service — unitaires :** lecture et validation des messages (bornes, tailles, types inconnus) ; la
  salle (arrivées, départs, couleurs, lots, pas d'écho à soi-même, un identifiant masqué ou parti
  n'entre plus dans le lot, plafond de 30 curseurs) ; plafonds global et par IP ; limite de débit ;
  choix de l'IP (dernière entrée de `X-Forwarded-For`).
- **Service — intégration :** vrai serveur sur un port libre, vrais clients WebSocket (`ws` en
  dépendance de développement) : `403` pour une origine refusée ; `429` pour le 6e client d'une même IP,
  **y compris quand le client forge des adresses différentes en tête de `X-Forwarded-For`** ; diffusion
  du compteur et des positions ; départ ; fermeture `1008` sur trame trop longue et sur débit excessif.
- **Site — unitaires :** conversions de coordonnées (repère ↔ page, table des repères, section absente) ;
  connexion (envois espacés, reconnexion avec délais variés et plafonnés, onglet caché) ; composant avec
  une connexion factice : compteur masqué seul, « 3 personnes… » à trois, bouton visible dès la
  connexion sur pointeur fin, qui coupe l'envoi, rien sans `NEXT_PUBLIC_DIRECT_URL`, pas de curseur ni
  de bouton sans pointeur fin, place du compteur rendue à hauteur fixe sans service.
- **Bout en bout :** deux contextes ouvrent l'accueil : chacun voit « 2 personnes regardent cette
  page », un mouvement de souris dans l'un fait apparaître un curseur dans l'autre, le bouton le fait
  disparaître ; mobile : compteur seul ; page personnalisée dans la même salle.
- **Lighthouse :** accueil mesuré avec le service démarré ; seuils inchangés (performance ≥ 0,95,
  LCP ≤ 2 800 ms, CLS ≤ 0,05, scripts ≤ 160 Ko) ; morceau de connexion ≤ 4 Ko compressés.

## 8. Hors périmètre

Clics ou réactions partagés, discussion, curseurs ailleurs que sur l'accueil, historique ou statistiques
de présence, plusieurs instances du service (et Redis), vue « en direct » des prospects dans
l'administration, refus des connexions sans `X-Forwarded-For` (inutile tant que le port n'est pas publié).

## 9. À valider par Augustin

- le nom du sous-domaine `direct.portfolio.jouan.dev` ;
- le texte du compteur et des boutons ;
- la section « Présence en direct » de la politique de confidentialité ;
- la palette des six couleurs de curseur (rendu final à voir sur la prévisualisation).
