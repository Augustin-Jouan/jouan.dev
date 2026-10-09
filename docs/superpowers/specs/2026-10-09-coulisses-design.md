# Sous-projet 5 — Coulisses

Date : 2026-10-09 · Statut : design validé en conversation (sections 1 à 5), à relire par Augustin.

Prolonge les specs des sous-projets 1 à 4 (`2026-10-08-socle-et-accueil-design.md`,
`2026-10-09-etudes-de-cas-design.md`, `2026-10-09-accueil-personnalise-design.md`,
`2026-10-09-temps-reel-design.md`) : direction « Atelier clair », français uniquement, pas de nom de
client, de projet ou d'employeur dans le dépôt, mêmes budgets. La feuille de route du sous-projet 1 le
décrit ainsi : « Panneau : latence en direct, dernier déploiement, schéma d'architecture interactif (3D
chargée à la demande) ».

Branche : `sous-projet-5-coulisses`, partie de `sous-projet-4-temps-reel` (la sonde WebSocket s'ajoute
au service `apps/realtime` du sous-projet 4) ; sa PR visera `main` une fois les PR des sous-projets 3 et
4 fusionnées.

## 1. Objectif

Le public secondaire du portfolio (recruteurs, développeurs) trouve, derrière le lien « Coulisses » du
pied de page, la preuve que le site est bien construit : son architecture, dessinée et mesurée en direct
depuis le navigateur du visiteur, et les preuves de qualité du build en ligne (tests, scores Lighthouse,
poids du JavaScript). Les clients, public prioritaire, ne la croisent pas sur l'accueil.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Forme | **Une page `/coulisses`** : adresse partageable (CV, message à un recruteur), indexable, la 3D ne pèse que sur elle ; l'accueil reste intact |
| Accès | Lien « Coulisses » du **pied de page** (place prévue au sous-projet 1) ; rien dans l'en-tête |
| Latence | **Chaque maillon** : aller-retour navigateur → site, `SELECT 1` Postgres chronométré par le serveur, écho WebSocket avec le service temps réel ; affichée sur les liaisons du schéma |
| Mesure | **Par le navigateur du visiteur** : chaque chiffre est celui qu'il vit, depuis chez lui |
| Déploiement | **Identité du build et preuves de qualité figées par la CI** dans l'image : SHA, titre du commit, date, nombre de tests, notes Lighthouse, poids du JavaScript de l'accueil |
| Schéma | **2D d'abord** (SVG accessible, rendu serveur), **3D en option** (Three.js chargé au clic sur « Voir en 3D ») |

**Écartés :**
- panneau latéral ouvrable depuis toutes les pages (pas d'adresse, focus et défilement à gérer
  partout) ;
- trajet navigateur → site seul ; historique des mesures et disponibilité sur 30 jours (stockage et
  tâche périodique, peu parlant tant que le site est jeune) ;
- mesures faites par le serveur et diffusées en Server-Sent Events (latences internes au VPS proches de
  0 ms, et l'aller-retour du visiteur doit de toute façon être mesuré par son navigateur) ;
- état de la CI en direct par l'API GitHub (dépôt privé : jeton à gérer, activité exposée) ; liens vers
  les commits (dépôt privé) ;
- 3D comme vue principale ; 2D seule.

## 3. La page `/coulisses`

Page statique (`○ /coulisses` au build), ajoutée au plan du site (`sitemap.ts`, priorité 0,5), avec ses
métadonnées (titre « Coulisses », description) et son image Open Graph par défaut.

**Ordre de la page :**

1. **En-tête** : titre « Coulisses » et une phrase : comment ce site est construit, hébergé et mesuré,
   en direct depuis votre navigateur.
2. **Architecture vivante** : le schéma (section 5) sur toute la largeur, latences affichées sur les
   liaisons ; à côté (en dessous sur mobile), le panneau « En direct » avec les trois mesures :
   - *Vous → site* : aller-retour HTTP ;
   - *Site → base* : `SELECT 1` chronométré par le serveur ;
   - *Vous → temps réel* : écho WebSocket.

   Pour chacune : dernière valeur, médiane et courbe des 30 dernières valeurs (SVG). Sous le schéma ou à
   côté, le panneau de détail du nœud choisi. Le bouton « Voir en 3D » est en haut du schéma.
3. **Dernier déploiement** (section 6) : SHA court, titre du commit, date relative ; puis les preuves de
   qualité de ce commit, avec la mention « mesurés par la CI sur ce commit ».

**Nœuds du schéma :**

- chemin d'une requête : Navigateur (vous) → Proxy (Traefik, Coolify, VPS en France) → Site (Next.js)
  → Base (Postgres) ; à côté : Service temps réel (Hono, WebSocket), Statistiques (Umami), Envoi des
  mails (SMTP) ;
- chemin d'un déploiement : GitHub Actions → Registre d'images (GHCR) → Coolify.

Chaque nœud a un rôle, une technologie et un « pourquoi » d'une ou deux phrases, rédigés par Claude en
première version et validés par Augustin (section 11). Les textes restent anonymes et ne contiennent ni
l'adresse de l'administration Coolify, ni l'IP du VPS, ni l'hébergeur au-delà de « VPS en France ».

**En local, sans les données de la CI** : la section déploiement affiche « Build local : pas de mesures
CI » ; une mesure dont le service manque affiche « indisponible ».

**Pied de page** : le lien « Coulisses » s'ajoute à la liste existante, avant « Mentions légales ».

## 4. Mesures en direct

### 4.1 Côté site : `GET /api/coulisses/mesure`

- Chronomètre un `SELECT 1` sur Postgres (`base().$queryRaw`), abandonné au bout de 2 s, et répond
  `{ "base": <ms> | null, "serveur": <ms> }` ; `serveur` est le temps total passé dans la route. Les
  durées sont arrondies à 0,1 ms.
- Sans base (`baseConfiguree()` faux), sur échec ou au-delà de 2 s : `base: null`, réponse 200. La route
  ne renvoie jamais de détail d'erreur, de version ni de nom d'hôte.
- En-têtes : `Cache-Control: no-store`. Route dynamique (elle ne doit pas être figée au build).
- Limite de débit : `verifierLimite(ip, { nom: "mesure", max: 60, dureeMs: 60_000 })`, avec la même
  lecture d'IP que les autres routes ; au-delà : 429 avec `Retry-After`. La page en consomme 30 par
  minute.

### 4.2 Côté service temps réel : WebSocket `/sonde`

- Nouvelle route de `apps/realtime`, à côté de `/direct` : renvoie chaque message texte tel quel. Elle
  ne touche pas à la salle : une connexion à `/sonde` ne compte pas dans le compteur de l'accueil et ne
  reçoit aucun message de la salle.
- Garde-fous de `/direct` : origines autorisées (sinon 403), IP = dernière entrée de `X-Forwarded-For`,
  plafonds de connexions **propres** (100 au total, 2 par IP ; 429 au-delà, 1013 en cas de course), soit
  un second `Gardien`, pour qu'une saturation de la sonde ne prive jamais l'accueil de places.
- Messages : 32 octets UTF-8 au plus, 5 par seconde au plus (`Debit`), sinon fermeture 1008 ; messages
  binaires refusés (1003). Ping toutes les 30 s comme `/direct`.
- Adresse : même origine que `NEXT_PUBLIC_DIRECT_URL`, chemin `/sonde`
  (`new URL("/sonde", NEXT_PUBLIC_DIRECT_URL)`). La CSP autorise déjà cette origine dans `connect-src`.
  Sans `NEXT_PUBLIC_DIRECT_URL`, la mesure affiche « indisponible » et rien n'est tenté.

### 4.3 Côté navigateur

- Démarrage une fois la page chargée et le navigateur au repos (comme la présence en direct), pour ne
  pas peser sur le LCP.
- Toutes les 2 s, tant que l'onglet est visible, les deux mesures en parallèle :
  - aller-retour HTTP : `performance.now()` autour du `fetch` de `/api/coulisses/mesure` (abandon au bout
    de 5 s), qui rapporte aussi `base` ;
  - écho WebSocket : envoi de l'horodatage `performance.now()` en texte, mesure au retour (abandon au
    bout de 5 s).
- La première mesure HTTP est un rodage (ouverture de la connexion) : elle n'est pas affichée.
- Un magasin (sur le modèle de `MagasinDirect`, lu par `useSyncExternalStore`) garde les 30 dernières
  valeurs de chaque série et calcule la médiane.
- Après 3 échecs de suite, une série passe en « indisponible » ; les essais continuent en s'espaçant
  (2 s, 4 s, 8 s, puis 10 s) et l'affichage revient à la première réussite. Une réponse 429 compte comme
  un échec et respecte `Retry-After`.
- Onglet caché : plus aucune mesure ; la sonde est fermée après 30 s caché ; tout reprend au retour.
- La sonde se reconnecte comme la présence en direct (délais croissants variés de ±20 %, plafond 30 s).

**Jamais** : stocker ou journaliser une mesure ou une IP. L'IP ne sert, en mémoire, qu'aux limites.

## 5. Le schéma d'architecture

### 5.1 Données : `apps/web/data/architecture.ts`

- `noeuds` : `id`, `nom`, `role`, `techno`, `pourquoi`, `groupe` (`"requete"` ou `"deploiement"`),
  `mesure` éventuelle (`"site"`, `"base"`, `"temps-reel"`), positions 2D en deux variantes (`large`,
  `etroite`).
- `liaisons` : `de`, `vers`, `mesure` éventuelle.
- La 3D réutilise ces données (position 2D, plus une profondeur selon le groupe) : les deux vues ne
  peuvent pas diverger. Un test vérifie que chaque liaison relie deux nœuds existants et que chaque
  mesure citée existe.

### 5.2 Vue 2D (SVG rendu par le serveur)

- Une `<figure>` avec légende. Chaque nœud est un `<g role="button" tabIndex={0}>` avec `aria-label`
  (nom et rôle) ; Entrée et Espace le choisissent ; `aria-pressed` indique le nœud choisi.
- Le panneau de détail (nom, rôle, technologie, pourquoi, mesure s'il y en a une) est mis à jour en
  `aria-live="polite"`. Nœud choisi par défaut : Navigateur (vous).
- Les latences s'affichent sur les liaisons concernées. Des pointillés défilent le long des liaisons,
  d'autant plus vite que la latence est basse (durée bornée) ; figés avec `prefers-reduced-motion`.
- Mobile : variante verticale (positions `etroite`) affichée par CSS sous `sm` ; l'autre variante est en
  `display: none`, donc hors de l'arbre d'accessibilité (pas de doublon).

### 5.3 Vue 3D (à la demande)

- Le bouton « Voir en 3D » n'apparaît qu'après vérification de WebGL dans le navigateur.
- Au clic, `import()` d'un module `lib/coulisses/scene3d.ts` (Three.js et ses contrôles d'orbite). La
  scène remplace le SVG dans le même cadre, de même taille : aucun décalage de mise en page. Le bouton
  devient « Revenir en 2D » ; pendant le chargement, il indique « Chargement… » et reste désactivé.
- Scène : nœuds en blocs, noms en étiquettes HTML (`CSS2DRenderer`, texte net) ; paquets lumineux
  circulant sur les liaisons au rythme des latences mesurées ; orbite à la souris ou au doigt, zoom borné
  ; un clic sur un bloc choisit le nœud dans le même panneau de détail.
- Accessibilité : le canevas est `aria-hidden` ; une rangée de boutons « Nœuds » sous la scène garde le
  choix au clavier.
- `prefers-reduced-motion` : ni rotation automatique ni paquets animés ; la scène reste orientable.
- Sobriété : rendu en pause quand l'onglet est caché ou la scène hors de l'écran
  (`IntersectionObserver`) ; tout est libéré (rendu, géométries, matériaux, écouteurs) au retour en 2D
  ou au démontage.
- Échec (WebGL perdu, module introuvable) : retour en 2D avec le message « 3D indisponible sur cet
  appareil ».
- Budget : le morceau 3D reste sous **180 Ko compressés**, vérifié après le build par
  `verifier-taille-3d` (sur le modèle de `verifier-taille-encre`, repéré par un marqueur). Il ne compte
  pas dans le budget Lighthouse : il n'est jamais chargé sans clic.

## 6. Dernier déploiement et preuves de qualité

### 6.1 Le fichier `build-info.json`

Produit par la CI, ignoré par Git, lu par le site au build (la page reste statique). Emplacement :
`apps/web/build-info.json`.

| Champ | Contenu |
|---|---|
| `sha` | SHA complet du commit déployé (affiché court, 7 caractères) |
| `titre` | titre du commit, coupé à 100 caractères |
| `date` | heure du build, ISO 8601 UTC |
| `tests.unitaires` | tests unitaires et d'intégration passés, somme des trois paquets (`web`, `demo-marches`, `realtime`) |
| `tests.boutEnBout` | tests Playwright passés |
| `lighthouse` | `performance`, `accessibilite`, `bonnesPratiques`, `referencement` : pour chaque catégorie, la note la plus basse des pages mesurées, chaque page prise à sa médiane de 5 passages |
| `lighthouse.pages` | nombre de pages mesurées |
| `poidsJsAccueil` | octets de JavaScript de l'accueil (médiane Lighthouse, `resource-summary`) |

Un module `lib/coulisses/build-info.ts` le lit et le valide ; fichier absent ou invalide → `null`
(repli local de la section 3).

### 6.2 CI

- Job `verifier` : les tests Vitest des trois paquets écrivent aussi un rapport JSON ; un script
  `compter-tests.mjs` en fait la somme ; artefact `mesures-verifier`.
- Job `e2e` : Playwright écrit aussi un rapport JSON ; après Lighthouse, un script
  `extraire-lighthouse.mjs` lit `.lighthouseci` (médiane par page, minimum entre pages, poids JS de
  l'accueil) ; artefact `mesures-e2e` (comptage e2e et Lighthouse).
- Job `image` (variante `site` de la matrice seulement) : télécharge les deux artefacts ;
  `assembler-build-info.mjs` y ajoute `sha` (`github.sha`), `titre` (`git log -1 --format=%s`) et
  `date`, valide l'ensemble et écrit `apps/web/build-info.json` avant le build Docker. Une donnée
  manquante ou invalide fait échouer le job. Le fichier doit entrer dans le contexte Docker
  (`.dockerignore` vérifié).
- Les scripts sont testés sur des fichiers d'exemple (rapports Vitest, Playwright et Lighthouse réduits),
  données manquantes comprises.

### 6.3 Affichage

- Le serveur rend la date absolue dans un `<time dateTime=…>` ; le navigateur la remplace par une date
  relative (« il y a 3 h ») après le chargement, sans changer la hauteur du bloc.
- Notes Lighthouse sur 100, avec « la note la plus basse des N pages mesurées » ; poids du JavaScript en
  Ko ; nombres de tests.
- **Anonymat** : le titre du commit devient public. La règle d'anonymat s'appliquait déjà aux messages
  de commit ; elle est rappelée dans le README (section « Coulisses »).

## 7. Budgets, sécurité, confidentialité

- **Budgets** : `/coulisses` rejoint les URL de Lighthouse avec les mêmes seuils (performance et
  accessibilité ≥ 0,95, LCP ≤ 2 800 ms, CLS ≤ 0,05, scripts ≤ 160 Ko). La 3D a son budget propre
  (180 Ko compressés, section 5.3).
- **Sécurité** : aucune fuite d'information technique (version de Postgres, nom d'hôte, IP, adresse de
  l'administration Coolify, détail d'erreur) ; route de mesure limitée en débit ; sonde avec origines,
  plafonds et débit propres.
- **Confidentialité** : la politique de confidentialité gagne un paragraphe « Coulisses » : la page
  mesure des temps de réponse depuis le navigateur du visiteur, aucune mesure n'est stockée, l'adresse IP
  ne sert, en mémoire, qu'à limiter le débit ; base légale : intérêt légitime (article 6.1.f du RGPD).
  Aucun cookie ni stockage local.

## 8. Tests

- **Unitaires (site)** : magasin des mesures (médiane, 30 valeurs gardées, rodage ignoré, « indisponible
  » après 3 échecs, essais espacés, 429 et `Retry-After`) ; route de mesure (Postgres simulé, abandon à
  2 s, `base: null` sans base, 429) ; `build-info.ts` (valide, absent, invalide) ; données du schéma
  (liaisons et mesures cohérentes) ; scripts de la CI sur fichiers d'exemple.
- **Intégration (service temps réel)** : `/sonde` renvoie l'écho ; refuse une origine inconnue (403) ;
  ferme sur message trop long ou binaire ; applique le débit ; applique ses propres plafonds (une sonde
  saturée n'empêche pas une connexion à `/direct`) ; ne change pas le compteur de `/direct`.
- **Composants** : schéma (choix au clavier, `aria-pressed`, panneau de détail) ; panneau « En direct »
  (valeurs, « indisponible ») ; section déploiement (données et repli local) ; bouton 3D absent sans
  WebGL, module 3D simulé (chargement, retour en 2D, échec) ; lien « Coulisses » du pied de page.
- **De bout en bout** : les trois mesures s'affichent (service temps réel lancé comme au sous-projet 4) ;
  le schéma se parcourt au clavier ; en 3D, un canevas apparaît puis le retour en 2D fonctionne (test
  sauté si le navigateur de test n'a pas WebGL) ; aucune erreur de console.
- **Lighthouse** : `/coulisses` ajoutée aux URL mesurées.
- **Build** : `○ /coulisses` ; `verifier-taille-3d` après le build.

## 9. Exploitation

- Rien de nouveau à configurer dans Coolify : la sonde passe par la ressource temps réel existante
  (`direct.portfolio.jouan.dev`) et ses origines autorisées.
- README : section « Coulisses » (données de la CI, `build-info.json`, repli local, sonde, rappel
  d'anonymat des titres de commit).

## 10. Hors périmètre

Historique des mesures, disponibilité, alertes ; état de la CI en direct ; liens vers les commits ;
version anglaise ; schéma modifiable par l'utilisateur.

## 11. À valider par Augustin

- Les textes des nœuds (rôle, technologie, pourquoi), rédigés en première version pendant
  l'implémentation.
- La phrase d'en-tête de la page et le paragraphe « Coulisses » de la politique de confidentialité.
