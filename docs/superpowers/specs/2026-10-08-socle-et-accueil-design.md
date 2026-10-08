# Portfolio jouan.dev — sous-projet 1 : socle et page d'accueil

Date : 08/10/2026 · Statut : à relire

## 1. Objectif

Créer le portfolio d'Augustin Jouan, développeur full stack indépendant, sur `jouan.dev`. Quand quelqu'un l'ouvre, il doit se dire « ce développeur est très bon » : effet marquant dans les 3 premières secondes, compréhension de qui il est et de ce qu'il propose en 10 secondes. Le site lui-même est la démonstration de ses compétences front **et** back.

## 2. Public et positionnement

- **Public prioritaire : les clients freelance** (PME, indépendants, porteurs de projet). La page d'accueil leur parle d'abord : elle doit rassurer et donner envie de prendre contact.
- **Public secondaire : recruteurs et développeurs.** Leur parcours (coulisses techniques, `curl`, `/api/me`, Cmd+K) existe mais se découvre ; il ne s'impose pas sur l'accueil.
- **Offre en deux paliers :**
  - **Application métier sur mesure** (outils internes, suivi, devis, génération de PDF…) — mise en avant dans l'accroche ;
  - **Site vitrine** — porte d'entrée, plus accessible.
- **Identité :** « Augustin Jouan », sur le domaine `jouan.dev`. Site 100 % professionnel : pas de passion ni de trait personnel affiché.
- **Expérience :** accroche orientée résultats, puis un court parcours (développeur full stack en alternance, MSc Epitech, indépendant). L'employeur n'est pas nommé.
- **Réalisations : anonymisées.** Pas de nom de client ni de détail identifiant ; démos sur données fictives.

## 3. Feuille de route

Le portfolio est découpé en six sous-projets, chacun avec sa propre spec, son plan et son implémentation. **Ce document ne couvre que le n° 1.**

| # | Sous-projet | Contenu |
|---|---|---|
| **1** | **Socle et page d'accueil** | Ce document |
| 2 | Études de cas | Deux pages de réalisation anonymisées, démo de l'application métier sur données fictives |
| 3 | Accueil personnalisé | Liens `?pour=…`, accroche adaptée au prospect, notification à l'ouverture du lien, page de création des liens. Introduit le service `apps/realtime` |
| 4 | Temps réel | Curseurs multijoueurs et compteur de visiteurs connectés (WebSocket) |
| 5 | Coulisses | Panneau : latence en direct, dernier déploiement, schéma d'architecture interactif (3D chargée à la demande) |
| 6 | Easter eggs | `curl jouan.dev` (CV en ASCII), `/api/me` (JSON), palette de commandes Cmd+K |

Écartés pour la v1 : assistant IA, mur de pixels collaboratif, « essaie de casser mon site », playground d'API, vue code, machine à remonter le temps, mode terminal, page 404 avec mini-jeu. Chacun pourra devenir un sous-projet plus tard.

## 4. Périmètre du sous-projet 1

**Inclus :**
- passage du dépôt en monorepo pnpm, le site dans `apps/web` ;
- reprise et adaptation du châssis du template de site vitrine (déjà présent dans le dépôt) ;
- la page d'accueil complète (section 5), avec ses textes en première version ;
- l'intro « goutte d'encre » et le halo animé (section 7) ;
- les pages légales et la page `/contact` du châssis, adaptées ;
- les budgets de performance vérifiés en CI ;
- la mise en ligne en prévisualisation sur `portfolio.jouan.dev`.

**Prévu sans être implémenté** — la mise en page réserve la place, sans élément visible ni code mort :
- l'emplacement de l'accroche personnalisée « Bonjour [entreprise] » (n° 3) ;
- l'emplacement du compteur de visiteurs dans l'accroche (n° 4) ;
- le lien « Coulisses » et l'indice Cmd+K dans le pied de page (n° 5 et 6).

**Exclus :** service `apps/realtime` (créé au n° 3, premier à en avoir besoin), pages détaillées des réalisations (n° 2), bascule sur le domaine nu `jouan.dev` (quand le contenu sera définitif), version anglaise.

## 5. Contenu de la page d'accueil

Une seule page à défilement, dans cet ordre :

| # | Bloc | Contenu |
|---|---|---|
| 0 | Intro | Animation « goutte d'encre » qui devient le halo de fond (section 7) |
| 1 | Accroche | Surtitre « Développeur full stack · indépendant » ; titre orienté résultat (première version : « Des applications métier sur mesure, qui remplacent vos tableurs. ») ; sous-titre « Je conçois, développe et héberge vos outils, du premier échange à la mise en ligne. » ; boutons *Parler de votre projet* (vers le contact) et *Voir mes réalisations* (vers le bloc 3) |
| 2 | Ce que je fais | Deux cartes : **Application métier** (mise en avant, plus grande) et **Site vitrine** ; pour chacune : à qui ça s'adresse, ce qui est livré, un exemple |
| 3 | Réalisations | Deux cartes anonymisées : *Application de suivi de marchés de travaux pour une entreprise du BTP* et *Site vitrine d'un artisan électricien-plombier* ; pour chacune : le besoin, ce qui a été livré, la stack. Pas de lien tant que le n° 2 n'est pas fait |
| 4 | Comment je travaille | Cinq étapes : échange, devis, maquette, développement, mise en ligne et suivi |
| 5 | Parcours | Trois lignes : développeur full stack en alternance, MSc Epitech, indépendant |
| 6 | Contact | Formulaire du châssis et adresse e-mail directe |
| — | Pied de page | Mentions légales, politique de confidentialité, GitHub |

Le contenu vit dans des fichiers TypeScript typés sous `apps/web/data/` (offre, réalisations, étapes, parcours), pas en dur dans les composants. Site en français uniquement.

## 6. Direction visuelle : « Atelier clair »

Papier chaud, encre noire, un seul accent orange brûlé, titres en serif éditoriale. Rassurant et haut de gamme pour un client ; la technique se découvre ensuite.

**Couleurs (jetons Tailwind `@theme`) :**

| Jeton | Valeur | Usage |
|---|---|---|
| `papier` | `#f3efe7` | Fond |
| `encre` | `#1b1a17` | Texte, bouton principal, goutte d'encre |
| `encre-douce` | `#5b574f` | Texte secondaire |
| `brique` | `#c84a1f` | Accent des titres (grands corps uniquement) |
| `braise` | `#e0582b` → `#ef9c62` | Dégradé du halo |
| `terre` | `#8a5a3c` | Surtitres, petits accents |
| `trait` | `#c9c1b2` | Bordures, bouton secondaire |

Le contraste de chaque couple texte/fond est vérifié (WCAG AA) ; `brique` n'est utilisé que pour du texte de grande taille.

**Typographies :** *Instrument Serif* (titres) et *Inter* (texte), auto-hébergées par `next/font`. Grain de papier léger en fond (SVG de bruit, opacité faible). Boutons en pilule.

**Référence :** la maquette retenue lors du brainstorming (accroche « Atelier clair » avec halo orange en haut à droite).

## 7. Intro « goutte d'encre »

### Déroulé (≈ 1,5 s au total)

1. **0 → 450 ms :** une goutte d'encre noire part du centre et se répand jusqu'à couvrir l'écran ; ses bords sont organiques (déformés par du bruit), pas un cercle parfait.
2. **450 → 800 ms :** « Augustin Jouan » apparaît en Instrument Serif, couleur papier, au centre de l'encre.
3. **800 → 1500 ms :** le nom s'efface ; l'encre se rétracte vers le haut à droite, se réchauffe (noir → orange) et se floute jusqu'à devenir le **halo** de l'accueil.
4. **Ensuite :** le halo reste en fond. Il suit la souris avec inertie ; sur écran tactile, il dérive lentement de lui-même.

### Rendu

- **Shader WebGL2 écrit à la main, sans bibliothèque** (objectif : 5 à 8 Ko compressés) : un seul rectangle plein écran, un fragment shader qui dessine une forme à bord organique (distance signée déformée par du bruit) pilotée par des uniformes (progression, position, couleur, flou, souris).
- Faux fluide plutôt que simulation de Navier-Stokes : plus léger, plus fiable sur mobile, entièrement réglable.
- Le nom pendant l'intro est un élément HTML superposé (`aria-hidden`), le titre de la page restant le vrai contenu accessible.
- Le composant est client, importé dynamiquement **après** l'affichage : le HTML de l'accroche est complet dès la première réponse du serveur.

### Économie

- Rendu stoppé quand rien ne bouge (halo immobile et souris inactive), repris au mouvement.
- Pause quand l'onglet est caché (`visibilitychange`).
- Densité de pixels plafonnée à 1,5.

### Quand l'intro ne se joue pas

| Situation | Comportement |
|---|---|
| Visite suivante (drapeau `localStorage`) | Halo animé directement, sans intro |
| `prefers-reduced-motion` | Halo **CSS** statique, sans animation |
| WebGL2 absent, shader en échec, contexte GPU perdu | Halo **CSS** statique |
| JavaScript désactivé | Halo **CSS** statique, page entièrement lisible |
| `localStorage` inaccessible (navigation privée stricte) | L'intro se joue à chaque visite, sans erreur |

Le halo CSS (dégradé radial flouté, identique à la maquette) est présent dans le HTML dès le départ ; le canvas WebGL s'y substitue quand il est prêt.

### Passer l'intro

Un clic, une touche, un défilement ou un toucher termine immédiatement l'intro : on saute à l'état « halo ».

## 8. Architecture technique

### Dépôt

```
jouan.dev/
├── apps/
│   └── web/                 # site Next.js (contenu actuel du dépôt, déplacé)
├── docs/
├── .github/workflows/ci.yml
├── package.json             # racine du workspace (scripts globaux)
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

- **pnpm workspaces** (remplace npm et `package-lock.json`).
- `apps/realtime` (Hono, Node) sera ajouté au sous-projet 3 ; aucun service vide n'est créé maintenant.
- Stack de `apps/web` : Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, Vitest, Playwright. Avant d'écrire du code Next, lire les guides de `node_modules/next/dist/docs/` (cf. `AGENTS.md`).

### Reprise du châssis

Conservé tel quel : formulaire de contact (honeypot, bornes de saisie, 5 envois par heure et par IP, SMTP), en-têtes de sécurité et CSP stricte, sitemap, robots, vignette de partage, pages légales, Umami, Dockerfile, CI avec image GHCR et webhook Coolify, Dependabot, scripts (`optimiser-images`, `verifier-smtp`, `verifier-placeholders`).

Adapté :
- `package.json` : nom `jouan-dev`, scripts passés à pnpm ;
- `data/site.ts`, `data/contact.ts`, `data/navigation.ts`, `data/legal.ts` : remplis pour une EI de développement ; `app/vestiges.test.ts` supprimé (cf. README du châssis) ;
- JSON-LD : `LocalBusiness` remplacé par `Person` (`jobTitle`, `url`, `sameAs` GitHub, `knowsAbout`) ;
- formulaire de contact : intégré en bas de l'accueil ; la page `/contact` est conservée ;
- polices : Instrument Serif et Inter ;
- CSP : vérifier qu'elle autorise le canvas WebGL et le shader inline sans `unsafe-eval` ;
- Dockerfile et CI : adaptés au workspace pnpm (sortie `standalone` avec la bonne racine de traçage) ;
- `verifier-placeholders` : laissé commenté dans la CI pendant la prévisualisation (les mentions légales gardent des `[À compléter]` tant que les informations de l'EI ne sont pas fournies) ; activé avant la bascule sur le domaine nu.

### Composants principaux de la page

| Unité | Rôle | Dépend de |
|---|---|---|
| `Accroche`, `Offre`, `Realisations`, `Methode`, `Parcours`, `Contact` | Un composant serveur par bloc, alimenté par `data/` | `data/*` |
| `HaloCss` | Halo de repli en CSS pur, rendu côté serveur | — |
| `IntroEncre` | Composant client : décide s'il faut jouer l'intro, monte le canvas, gère le saut et les replis | `moteur-encre` |
| `moteur-encre` | Module sans React : crée le contexte WebGL2, compile le shader, expose `demarrer()`, `sauter()`, `suivreSouris()`, `arreter()` ; signale les échecs | — |

`moteur-encre` est indépendant de React pour pouvoir être testé seul et réutilisé (coulisses, page 404…).

## 9. Performance

| Mesure | Budget | Où c'est vérifié |
|---|---|---|
| Score Lighthouse mobile (performance) | ≥ 95 | CI (Lighthouse CI) |
| LCP, simulation mobile Lighthouse | < 1,8 s | CI |
| LCP réel sur ordinateur, bonne connexion | < 1 s | Vérification manuelle avant mise en ligne |
| CLS | < 0,05 | CI |
| JS compressé au premier chargement | ≈ 110 Ko | CI (rapport de build) |
| Intro (shader + moteur), chargée après l'affichage | < 10 Ko compressés | CI |

L'objectif « moins d'1 s » du brief s'entend en conditions réelles ; la simulation mobile lente de Lighthouse ne permet à aucun site de descendre sous ≈ 1,2 s, d'où le seuil de 1,8 s en CI.

## 10. Tests

- **Vitest :** tests du châssis conservés (e-mail, sitemap, page) ; validation des données (`data/`) ; logique de décision de l'intro (première visite, reduced-motion, WebGL absent, `localStorage` inaccessible) isolée dans une fonction pure et testée.
- **Playwright** (ordinateur et mobile) :
  - l'accueil s'affiche avec tous ses blocs ;
  - il s'affiche complet sans JavaScript ;
  - l'intro se joue à la première visite, se saute d'un clic, ne se rejoue pas à la deuxième ;
  - avec `prefers-reduced-motion`, le halo CSS est affiché et aucun canvas n'est monté ;
  - avec WebGL désactivé, le halo CSS est affiché et la console ne montre aucune erreur non gérée ;
  - le formulaire de contact aboutit (SMTP simulé) et affiche une erreur claire en cas d'échec.
- **Lighthouse CI :** les budgets de la section 9 font échouer la CI s'ils sont dépassés.

## 11. Déploiement

Selon le runbook de mise en ligne d'un site vitrine (image Docker publiée sur GHCR par la CI, ressource Coolify de type *Docker Image*, redéploiement par webhook) :

- prévisualisation sur `https://portfolio.jouan.dev` (entrée A dans la zone `jouan.dev`) ;
- variables SMTP et Umami en variables d'exécution Coolify ;
- plus tard, bascule sur `jouan.dev` (domaine nu) avec redirection de `www.jouan.dev` vers le domaine nu, une fois `verifier-placeholders` activé et passant.

## 12. Gestion des erreurs

| Erreur | Comportement |
|---|---|
| SMTP indisponible | Message clair avec l'adresse e-mail directe (comportement du châssis) |
| Trop d'envois (limite par IP) | Message invitant à réessayer plus tard ou à écrire directement |
| WebGL indisponible, shader en échec, contexte perdu | Halo CSS, intro abandonnée, aucune erreur visible |
| `localStorage` qui lève une exception | Traité comme « première visite », sans erreur |
| JavaScript désactivé | Page complète et lisible, formulaire fonctionnel (action serveur) |

## 13. Contenu à fournir

Pour le prototype, Claude rédige une première version de tous les textes. Avant la bascule sur le domaine nu, Augustin fournit ou valide :
- les textes définitifs (accroche, offre, réalisations, parcours) ;
- les informations légales de l'EI (SIREN, adresse de domiciliation, etc.) ;
- les captures des deux réalisations, anonymisées.

## 14. Décisions et alternatives écartées

- **Next.js + futur service Hono séparé** plutôt qu'Astro (sortirait de la stack vendue aux clients) ou qu'un serveur Next personnalisé (couplage du temps réel et du rendu).
- **Pas de service temps réel managé** (Liveblocks, PartyKit) : le site doit prouver le back.
- **Intro qui devient le fond** plutôt qu'un écran de chargement bloquant : ne dégrade ni le LCP ni la compréhension en 10 s.
- **Shader maison** plutôt que Three.js / React Three Fiber pour l'intro : quelques Ko au lieu de 150 et plus. Three.js reste envisageable, chargé à la demande, pour le schéma 3D des coulisses (n° 5).
- **Direction « Atelier clair »** plutôt que « Nuit technique » ou « Plan d'ingénieur » ; **intro « goutte d'encre »** plutôt que « du plan à l'objet » ou « grains qui s'assemblent ».
