# Sous-projet 7 — Easter eggs

Date : 2026-10-09 · Statut : design validé en conversation (sections 1 à 4), à relire par Augustin.

Prolonge les specs des sous-projets 1 à 5 : direction visuelle du site (jetons `@theme`), français
uniquement, pas de nom de client, de projet ou d'employeur dans le dépôt, mêmes budgets. La spec du
sous-projet 1 prévoyait ce sous-projet en sixième position (« `curl jouan.dev` (CV en ASCII), `/api/me`
(JSON), palette de commandes Cmd+K ») ; une refonte de la charte (palette sauge, mauve, rose, corail,
pêche) s'est intercalée et devient le sous-projet 6 : les easter eggs passent en 7.

**Dépendances :**
- sous-projet 5 (Coulisses) fusionné : la commande « Voir l'architecture en 3D » ouvre `/coulisses?vue=3d` ;
- sous-projet 6 (Charte) fusionné : les couleurs du CV en terminal et le style de la palette viennent des
  rôles de la nouvelle charte (`lib/charte.ts` et classes de rôles comme `bg-surface`, `text-accent`).

Branche : `sous-projet-7-easter-eggs`, rebasée sur `main` une fois les sous-projets 5 et 6 fusionnés.

## 1. Objectif

Récompenser le visiteur curieux, surtout technique (développeur, recruteur, client qui fouille), sans rien
coûter au visiteur pressé : aucun octet de plus au premier chargement, accueil toujours statique, mêmes
scores Lighthouse.

- `curl -L jouan.dev` affiche un CV coloré et lisible en 80 colonnes ;
- `/api/me` renvoie le même CV au format standard JSON Resume ;
- Cmd+K (Ctrl+K) ouvre une palette de commandes accessible au clavier, chargée à la demande.

## 2. Décisions

| Sujet | Décision |
|---|---|
| `curl jouan.dev` | On annonce **`curl -L jouan.dev`** (ou `curl https://jouan.dev`) ; aucune règle Traefik : en HTTP, le proxy de Coolify redirige vers HTTPS, et `-L` suit la redirection |
| Détection | User-Agent commençant par `curl/`, `Wget/`, `HTTPie/` ou `xh/` sur `/` |
| Rendu terminal | **Couleurs ANSI** (256 couleurs) tirées des jetons de la charte ; version sans couleur sur `/cv.txt` |
| `/api/me` | Schéma **JSON Resume** (clés anglaises du standard, valeurs en français) |
| Palette | **Maison** : `<dialog>` natif, combobox ARIA, filtre insensible aux accents ; ni `cmdk` ni autre dépendance |
| Commandes | Navigation, actions utiles et trois commandes ludiques liées aux sous-projets 1, 4 et 5 |
| Découverte | Ligne du pied de page (« ⌘K pour naviguer · `curl -L jouan.dev` », ⌘K cliquable), message console, commentaire HTML |
| Dates | Aucune date dans le CV ni le JSON (absentes des données ; ajoutables plus tard dans `data/`) |

**Écartés :** règle Traefik pour servir `curl jouan.dev` en HTTP ; JSON maison en français ; bibliothèque
`cmdk` ; palette chargée avec chaque page ; commandes cachées (`sudo`, `hello`…) ; mode terminal ; bouton
⌘K dans l'en-tête ; suivi Umami des commandes ; historique des commandes récentes.

## 3. Le CV : un modèle, trois rendus

**`lib/cv/modele.ts`** construit un `CvModele` à partir des données existantes, sans recopier de texte :

| Champ du modèle | Source |
|---|---|
| nom, description | `data/site.ts` (`siteName`, `siteDescription`) |
| accroche | `data/accueil.ts` (`accroche.surtitre`, titre recomposé) |
| offres | `data/accueil.ts` (`offres` : titre et une ligne) |
| réalisations | `data/accueil.ts` (`realisations` : titre, contexte, stack) et `cheminEtude` |
| parcours | `data/accueil.ts` (`parcours`) |
| contact | `data/contact.ts` (e-mail, GitHub) et `siteUrl` + `/contact` |
| compétences | `data/competences.ts` (nouveau, voir ci-dessous) |

Toutes les adresses sont absolues et construites depuis `siteUrl` : elles suivent la bascule de
`portfolio.jouan.dev` vers `jouan.dev` sans retouche.

**`data/competences.ts`** (nouveau) : compétences groupées — front (Next.js, React, TypeScript, Tailwind
CSS), back (Node.js, Hono, WebSocket), données (PostgreSQL, Prisma), infrastructure (Docker, GitHub
Actions, Coolify). Un test vérifie que chaque élément des `stack` des réalisations y figure.

### 3.1 Rendu terminal (`lib/cv/terminal.ts`)

`rendreCvTerminal(modele, { couleurs: boolean }): string`. Gabarit (80 colonnes ; crochets = style) :

```
     _                        _   _            _
    /_\  _  _ __ _ _  _ ___| |_(_)_ _      _ | |___ _  _ __ _ _ _      [accent]
   / _ \| || / _` | || (_-<  _| | ' \    | || / _ \ || / _` | ' \
  /_/ \_\\_,_\__, |\_,_/__/\__|_|_||_|    \__/\___/\_,_\__,_|_||_|
             |___/
  Développeur full stack · indépendant                              [atténué]
  Des applications métier sur mesure, qui remplacent vos tableurs.

  ── OFFRE ─────────────────────────────────────────────────────────  [accent]
  ▸ Application métier sur mesure   <une ligne>
  ▸ Site vitrine                    <une ligne>

  ── RÉALISATIONS ──────────────────────────────────────────────────
  ▸ Suivi de marchés de travaux     Entreprise du BTP
    Next.js · TypeScript · PostgreSQL · Prisma · Docker             [atténué]
    https://jouan.dev/realisations/suivi-de-marches                 [souligné]
  ▸ …

  ── PARCOURS ──────────────────────────────────────────────────────
  ▸ <chaque ligne de parcours>

  ── CONTACT ───────────────────────────────────────────────────────
  ✉  contact@jouan.dev
  ⌂  https://jouan.dev/contact
  ⌥  https://github.com/Augustin-Jouan

  JSON : curl -L jouan.dev/api/me · Sans couleurs : curl -L jouan.dev/cv.txt
  Sur le site : ⌘K
```

- **Bandeau du nom :** texte ASCII figé dans le code (police « small » de figlet, sans dépendance).
- **Largeur :** aucune ligne ne dépasse 80 colonnes, séquences ANSI exclues ; les textes longs sont coupés
  aux espaces avec un retrait de suite.
- **Couleurs :** trois styles — accent (titres, bandeau), atténué (stacks, accroche), souligné (adresses).
  Codes **256 couleurs** (`ESC[38;5;<n>m`), pris en charge par tous les terminaux courants, y compris
  Terminal.app de macOS qui ignore les couleurs 24 bits. Chaque code est calculé (couleur xterm-256 la plus
  proche) depuis un rôle de la charte lu dans `lib/charte.ts` (sous-projet 6, tenu d'accord avec
  `app/globals.css` par ses propres tests) : accent → `accent`, atténué → `texte-doux`, souligné → `texte`. Une
  remise à zéro (`ESC[0m`) termine chaque segment coloré et le texte entier.
- **Sans couleur :** `couleurs: false` produit exactement le même texte, sans aucun octet `ESC` (test :
  rendu coloré débarrassé de ses séquences = rendu sans couleur).
- Fin de ligne `\n`, texte terminé par une ligne vide (l'invite du shell ne colle pas au CV).

### 3.2 JSON Resume (`lib/cv/json-resume.ts`)

`versJsonResume(modele, dateBuild: string)` → objet conforme au schéma JSON Resume v1 :

- `$schema` : adresse du schéma officiel ;
- `basics` : `name`, `label` (accroche), `email`, `url` (`siteUrl`), `summary` (`siteDescription`),
  `profiles: [{ network: "GitHub", username, url }]` ;
- `work` :
  - `{ name: "Indépendant", position: "Développeur full stack", summary }` ;
  - `{ name: "Alternance", position: "Développeur full stack" }` — **sans nom d'entreprise** ;
- `education` : `[{ institution: "Epitech", studyType: "Master of Science", area: "Informatique" }]` ;
- `projects` : une entrée par réalisation (`name`, `description` = livré, `url` absolue, `keywords` = stack) ;
- `skills` : un groupe par thème de `data/competences.ts` (`name`, `keywords`) ;
- `meta` : `{ canonical: siteUrl + "/api/me", lastModified: dateBuild }`.

Aucune date (`startDate`, `endDate`) : absentes des données.

## 4. Routes et proxy

| Route | Contenu | En-têtes |
|---|---|---|
| `/api/me` | JSON Resume, indenté sur 2 espaces | `Content-Type: application/json; charset=utf-8`, `Access-Control-Allow-Origin: *`, `Cache-Control: public, max-age=3600` |
| `/cv.txt` | CV sans couleur | `Content-Type: text/plain; charset=utf-8` |
| `/cv.ansi` | CV coloré (non annoncé ; servi par `/`) | `Content-Type: text/plain; charset=utf-8` |

Les trois sont des route handlers `GET` **pré-rendus au build** (`export const dynamic = "force-static"`),
ce que le résumé du build doit montrer (`○`). Les en-têtes de sécurité existants (`next.config.ts`)
s'appliquent aussi. Aucune des trois n'entre dans le sitemap.

**Proxy (`proxy.ts`)** — nouvelle entrée de `config.matcher` :

```ts
{ source: "/", has: [{ type: "header", key: "user-agent", value: "(curl|Wget|HTTPie|xh)/.*" }] }
```

Next compare la valeur comme une regex ancrée (`^…$`, sensible à la casse) : `curl/8.5.0` correspond,
`Mozilla/5.0 … curl` non. Dans `proxy()`, une fonction pure `estClientTerminal(userAgent)` (même regex,
exportée et testée) décide ; si vrai, réécriture vers `/cv.ansi` **avant** la logique `?pour=` (`curl -L
"jouan.dev/?pour=…"` reçoit aussi le CV). Les navigateurs, robots d'indexation et requêtes sans User-Agent
ne déclenchent pas le proxy : `/` reste servi statiquement (`verifier-accueil-statique` inchangé).

`next.config.ts` ajoute `Vary: User-Agent` sur `/`, pour qu'un cache placé un jour devant le site ne
serve pas le CV à un navigateur ou l'inverse.

## 5. Palette de commandes

### 5.1 Composants

- **`components/commandes/RaccourciCommandes.tsx`** (client, monté dans `app/layout.tsx`) : écoute
  Cmd+K / Ctrl+K sur `window` et l'événement `jouan:ouvrir-commandes` ; au premier appel, charge
  `PaletteCommandes` par `import()` dynamique, puis l'ouvre ; un appel pendant que la palette est ouverte la
  ferme. Contient aussi la zone `aria-live` des messages de copie. Ne doit importer statiquement ni la palette
  ni `data/commandes.ts`.
- **`components/commandes/PaletteCommandes.tsx`** : `<dialog>` ouvert par `showModal()`, `aria-label`
  « Commandes » ; champ `role="combobox"` (`aria-expanded`, `aria-controls`, `aria-activedescendant`) ;
  liste `role="listbox"`, groupes `role="group"` étiquetés, entrées `role="option"` (`aria-selected`). Porte
  le marqueur `palette-commandes:v1` (repéré par `verifier-taille-commandes`).
- **`data/commandes.ts`** : `Commande = { id, libelle, groupe: "Navigation" | "Actions" | "Pour le
  plaisir", motsCles: string[], action, visible?: (contexte) => boolean }` ; `action` vaut
  `{ type: "lien", href }`, `{ type: "copier", texte, confirmation }` ou `{ type: "evenement", nom }`.
- **`lib/commandes/filtre.ts`** : `filtrerCommandes(commandes, saisie)` — fonction pure.

### 5.2 Liste des commandes

| Groupe | Commandes |
|---|---|
| Navigation | Accueil ; chaque section de l'accueil (Offre, Réalisations, Méthode, Parcours, Contact) ; chaque étude de cas ; Coulisses ; Contact ; Mentions légales ; Politique de confidentialité |
| Actions | Copier l'e-mail ; Ouvrir GitHub (nouvel onglet) ; Copier `curl -L jouan.dev` ; Ouvrir le CV en JSON (`/api/me`) |
| Pour le plaisir | Rejouer l'intro ; Masquer / afficher mon curseur ; Voir l'architecture en 3D |

Les libellés et adresses de navigation viennent des données existantes (`ANCRES`, `sections`,
`etudesDeCas`, `cheminEtude`), pas de chaînes recopiées.

**Commandes ludiques :**
- **Rejouer l'intro** — visible seulement sur l'accueil (`/` et `/pour/…`) quand l'intro WebGL est
  disponible ; émet `jouan:rejouer-intro`, que le composant de l'intro écoute pour relancer la goutte
  d'encre (en respectant `prefers-reduced-motion` : sans animation, la commande est masquée).
- **Masquer / afficher mon curseur** — visible quand la présence en direct est connectée et le pointeur
  fin ; libellé selon l'état ; émet `jouan:basculer-curseur`, que `PresenceDirecte` écoute (même effet que
  son bouton).
- **Voir l'architecture en 3D** — toujours visible ; lien vers `/coulisses?vue=3d`. La page Coulisses lit
  ce paramètre au montage et active la vue 3D si WebGL est disponible (sinon, schéma 2D, comme le bouton).

Le contexte (`chemin`, `introDisponible`, `presence: "connectee" | "masquee" | null`) est lu à
l'ouverture de la palette.

### 5.3 Comportement

- **Clavier :** ↑/↓ (bouclent), Début/Fin, Entrée exécute, Échap ferme ; la saisie remet la sélection sur
  le premier résultat.
- **Filtrage :** saisie et textes normalisés (NFD, diacritiques retirés, minuscules) ; chaque mot de la
  saisie doit apparaître dans le libellé ou les mots-clés ; les libellés commençant par la saisie
  passent en tête, puis l'ordre de `data/commandes.ts`. Saisie vide : toutes les commandes visibles.
  Aucun résultat : « Aucune commande pour « … » ».
- **Exécution :** la palette se ferme puis l'action s'exécute — lien interne par le routeur Next, externe
  dans un nouvel onglet (`noopener`), copie par `navigator.clipboard.writeText` avec message « E-mail
  copié » (ou « Commande copiée ») dans la zone `aria-live` ; si la copie échoue, le message affiche le
  texte à copier.
- **Fermeture :** Échap, clic sur le fond, raccourci ; le focus revient à l'élément actif avant
  l'ouverture (comportement natif de `<dialog>`).
- **Mouvement :** apparition en fondu (150 ms), supprimée sous `prefers-reduced-motion`.
- **Échec de chargement** du morceau de la palette : `console.warn`, rien d'autre ; nouvel essai au prochain
  appel.
- **Style :** jetons de la charte uniquement (fond, texte, sélection, bordure) ; largeur max. 36rem,
  centrée en haut de l'écran ; plein largeur moins les marges sur mobile.

## 6. Indices

- **Pied de page** (`components/layout/Footer.tsx`) : ligne « ⌘K pour naviguer · `curl -L jouan.dev` » ;
  « ⌘K » est un `<button>` qui émet `jouan:ouvrir-commandes` (seul moyen d'ouvrir la palette sur mobile).
  Sur les systèmes autres que macOS, le libellé devient « Ctrl+K » (détecté côté client, après montage, sans
  décalage de mise en page : même largeur réservée).
- **Console** (`components/commandes/MessageConsole.tsx`, client, monté dans le layout) : en production
  seulement, une fois par session (`sessionStorage`, lecture et écriture dans un `try/catch`) : petite
  bannière, `curl -L jouan.dev`, `/api/me`, ⌘K.
- **Source HTML :** commentaire en tête du `<body>` (`<div hidden dangerouslySetInnerHTML>` contenant un
  commentaire HTML), mêmes trois indices.

## 7. Tests et vérifications

**Unitaires (Vitest) :**
- modèle : reprend les données (`parcours`, réalisations, contact), adresses absolues depuis `siteUrl`,
  aucune entrée `work` ne porte de nom d'entreprise ;
- compétences : chaque élément des `stack` des réalisations figure dans `data/competences.ts` ;
- terminal : largeur ≤ 80 (ANSI exclus) ; sans couleur = aucun `\x1b` ; avec couleur débarrassé des
  séquences = sans couleur ; chaque segment coloré se termine par `ESC[0m` ; conversion hex → xterm-256 ;
- couleurs : chaque style correspond au code xterm-256 le plus proche du rôle de `lib/charte.ts` attendu ;
- JSON Resume : `basics.name`, `profiles`, `projects[].url` absolues, `meta.canonical`, pas de date ;
- proxy : `estClientTerminal` vrai pour `curl/8.5.0`, `Wget/1.21.4`, `HTTPie/3.2.2`, `xh/0.22.0` ; faux pour
  un navigateur, Googlebot, `""`, `undefined`, `Mozilla/5.0 (compatible; curl)` ; la valeur du `matcher` est
  la même regex que celle de `estClientTerminal` ; `/?pour=<jeton valide>` toujours réécrit pour un navigateur ;
- filtre : accents, casse, plusieurs mots, préfixe en tête, aucun résultat, saisie vide ;
- palette (jsdom, polyfill de `showModal`/`close`) : ouverture, ARIA, flèches qui bouclent, Entrée sur un
  lien, sur une copie (succès et échec), sur un événement ; visibilité contextuelle des commandes ludiques ;
- raccourci : Cmd+K et Ctrl+K ouvrent, un second appel ferme, l'événement du pied de page ouvre.

**Bout en bout (Playwright) :**
- `GET /` avec `User-Agent: curl/8.5.0` → `200`, `text/plain`, contient le nom et `ESC[` ; `GET /` sans ce
  User-Agent → HTML ;
- `/cv.txt` → `text/plain` sans `ESC` ; `/api/me` → JSON valide, `Access-Control-Allow-Origin: *` ;
- ordinateur : Ctrl+K, « contact », Entrée → `/contact` ; Échap ferme et rend le focus ; « Copier
  l'e-mail » → presse-papiers (permission `clipboard-read`/`clipboard-write` accordée) ;
- mobile : le bouton du pied de page ouvre la palette ;
- `/coulisses?vue=3d` active la vue 3D (avec `simulerGpu`) ;
- aucune erreur console sur ces parcours.

**Budgets :**
- `verifier-accueil-statique` inchangé (l'accueil reste `○`) ;
- nouveau `scripts/verifier-taille-commandes.mjs` : le morceau marqué `palette-commandes:v1` existe, pèse
  8 Ko compressés au plus, et n'appartient pas aux scripts chargés d'office par l'accueil ;
- Lighthouse et ses seuils inchangés.

## 8. Documentation

README, section « Easter eggs » : `curl -L jouan.dev` (et `/cv.txt`), `/api/me`, palette Cmd+K ; ajouter
une commande (`data/commandes.ts`) ; les couleurs du terminal suivent les jetons de la charte.
