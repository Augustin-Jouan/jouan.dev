# Easter eggs — plan d'implémentation

> **Découpé en fiches** : exécuter le plan à partir de `easter-eggs/LISEZMOI.md` (une conversation par ligne du tableau, sorties courtes, relectures groupées). Le code est dans les fiches `easter-eggs/tache-XX.md`, pas ici : ce fichier donne le but, les décisions et les écarts à la spec.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trois easter eggs pour le visiteur curieux, sans rien coûter au visiteur pressé : `curl -L jouan.dev` affiche un CV coloré en 80 colonnes, `/api/me` le renvoie en JSON Resume, et Cmd+K (Ctrl+K) ouvre une palette de commandes chargée à la demande.

**Architecture:** Un modèle de CV (`lib/cv/modele.ts`) tiré des données existantes alimente deux rendus purs : texte de terminal (couleurs xterm-256 calculées depuis les rôles de `lib/charte.ts`) et JSON Resume. Trois route handlers pré-rendus (`/cv.ansi`, `/cv.txt`, `/api/me`) les servent ; `proxy.ts` réécrit `/` vers `/cv.ansi` pour les seuls clients terminal, l'accueil restant statique pour les navigateurs. La palette (`<dialog>` et combobox ARIA maison) est chargée par `import()` au premier Cmd+K ; sa liste de commandes est construite côté serveur par le layout et passée en props, pour que le morceau chargé à la demande n'embarque aucune donnée.

**Tech Stack:** Next.js 16.4 (App Router, `proxy.ts`), React 19.2, Tailwind CSS 4.3 (rôles de la charte « Nuit mauve »), TypeScript, Vitest (jsdom), Playwright, `@axe-core/playwright`, Lighthouse CI.

**Spec:** `docs/superpowers/specs/2026-10-09-easter-eggs-design.md`.

**Où exécuter :** dossier principal du dépôt, branche `sous-projet-7-easter-eggs`, rebasée sur `main` après la fusion des sous-projets 5 (Coulisses) et 6 (Charte).

**Déjà vérifié :** tout le code des fiches a tourné dans une copie jetable de la branche avant l'écriture du plan. Résultats :
- 616 tests unitaires du site, lint et types ;
- build, avec les trois routes et l'accueil en `○` ;
- e2e complets : 128 passés, 25 ignorés (ceux propres au mobile ou à l'ordinateur) ;
- Lighthouse : scripts de l'accueil à 164 300 octets, CLS 0, accessibilité 1, performance entre 0,96 et 0,99 ;
- morceau de la palette : 2,2 Ko compressés.

## Global Constraints

Les règles détaillées sont dans `easter-eggs/contexte.md`, lu par chaque fiche. L'essentiel :

- Site en **français uniquement** ; commentaires et messages de commit en français.
- **Aucun nom de client, de projet client ou d'employeur** dans le dépôt. Le JSON Resume dit « Alternance », sans entreprise, et ne porte aucune date.
- Espaces insécables en échappement `\u00a0` / `\u202f`, jamais en caractère littéral. Vérifier avec `grep -cP "[\x{00a0}\x{202f}]"`.
- Charte « Nuit mauve » : seulement des **rôles** dans les classes, aucune opacité sur une couleur, jamais `text-vivant`.
- Le CV terminal ne dépasse jamais 80 colonnes, séquences ANSI exclues. Les couleurs sont en 256 couleurs (`ESC[38;5;<n>m`), pas en 24 bits.
- Le motif User-Agent `(curl|Wget|HTTPie|xh)/.*` est écrit en littéral dans le `matcher` de `proxy.ts` (Next l'exige). Un test le tient identique à `MOTIF_CLIENT_TERMINAL`.
- Le code chargé à la demande (`PaletteCommandes.tsx`) n'importe ni `data/` ni un module partagé avec le code chargé d'office.
- Budgets :
  - palette : 8 Ko compressés au plus, hors des scripts de l'accueil ;
  - scripts de l'accueil (Lighthouse) : 168 960 octets ;
  - l'accueil reste prérendu.
- Ne jamais modifier `apps/web/.env.example` ni `apps/web/scripts/empreinte-mot-de-passe.mjs`. Ne jamais afficher un `.env.local`.
- Git :
  - aucun push, aucune PR, aucune fusion ;
  - jamais de `--force`, de `reset --hard` ni de `git stash` nu ;
  - `git add` fichier par fichier.

## Review Focus

1. **Navigateur servi en CV, ou curl servi en HTML.** Un User-Agent de navigateur qui contient « curl » ne doit pas recevoir le CV. Une requête sans User-Agent non plus. Un `curl` sur `/?pour=…` doit recevoir le CV.
   Tests : unitaires du proxy et e2e `cv.spec.ts` (tâche 04).
2. **Terminal sans couleurs ou débordant.** Un terminal limité à 256 couleurs (Terminal.app), une fenêtre de 80 colonnes, un `cv.txt` lu par un script.
   Tests de la tâche 02 : largeur, absence d'octet ESC, remise à zéro après chaque segment. Le contrôle à l'œil est dans la vérification finale.
3. **Raccourci volé par le navigateur.** Firefox réserve Ctrl+K à sa recherche : `preventDefault` est obligatoire. Un Ctrl+K pendant l'ouverture doit fermer la palette.
   Tests : unitaires de la tâche 07 et e2e de la tâche 08. Firefox se contrôle à la main.
4. **Palette chargée d'office, ou qui ne se charge pas.** Si le morceau partait avec l'accueil, il coûterait au visiteur pressé. Si l'import échoue, la page ne doit pas planter, et l'appel suivant doit réessayer.
   Tests : `RaccourciCommandes.import.test.tsx` (tâche 07), puis `verifier-taille-commandes` et l'e2e « n'est pas le morceau de la palette » (tâche 08).
5. **Commandes ludiques sans effet.** Dans trois cas, la commande ne doit pas rester sans effet :
   - « Rejouer l'intro » après un défilement ;
   - « Masquer mon curseur » quand le partage est déjà coupé ;
   - `?vue=3d` sans WebGL, qui doit retomber sur le schéma 2D.

   Tests : unitaires et e2e de la tâche 09.

## Écarts à la spec (décisions prises en écrivant le plan)

Chacun a été essayé dans la copie jetable. Le relecteur ne doit pas les signaler comme des défauts.

| Spec | Plan | Pourquoi |
|---|---|---|
| `Commande.visible?: (contexte) => boolean` | `condition?: "intro" \| "presence"` et `libelleInverse` | La liste est construite côté serveur et passée en props au client : une fonction n'est pas sérialisable. |
| Action `lien` unique, externe dans un nouvel onglet | `{ type: "lien", href, nouvelOnglet?: true }` | Le drapeau est explicite et se teste. « Ouvrir GitHub » et « Ouvrir le CV en JSON » l'utilisent. |
| Zone `aria-live` dans `RaccourciCommandes` | Message `role="status"` rendu par la palette, hors du `<dialog>` | Garder la zone dans le code chargé d'office pèserait sur l'accueil. Le message n'existe qu'après une copie, donc une fois la palette chargée. |
| `RaccourciCommandes` charge la liste | La liste est passée en props par `app/layout.tsx` (serveur) | Importer `data/` dans le code chargé à la demande ferait un morceau partagé hors budget. |
| `Vary: User-Agent` sur `/` par `next.config.ts` | `Vary: User-Agent` sur la réponse de `/cv.ansi` | Next écrase `Vary` sur les pages. L'en-tête d'un route handler statique est conservé (vérifié en e2e). |
| Lighthouse et ses seuils inchangés | Scripts de l'accueil : limite à **165 Ko** (168 960 octets) | Décision d'Augustin. L'accueil pesait 163 278 octets (562 de marge). Le raccourci, le bouton et le message console ajoutent environ 1 000 octets (mesure : 164 300). |
| Compétences : quatre groupes | Un cinquième groupe, **Qualité** (Vitest, Playwright) | Le test « chaque techno des réalisations et des études de cas figure dans les compétences » l'exige : Playwright est dans la stack d'une étude de cas. Vitest l'accompagne, pour que le groupe ait du sens. |
| Contexte « lu à l'ouverture » | `lireContexte()` lit le DOM : `.fond-accueil[data-mode]` et `[data-presence]` (nouvel attribut du bouton du curseur) | Ainsi, la palette ne dépend d'aucun état React des autres composants. |
| « Rejouer l'intro » relance la goutte | Retour en haut, puis nouvelle intro à l'image suivante, sur un canvas neuf (`key={tour}`) | L'arrêt du moteur libère le contexte WebGL de l'ancien canvas. Le `scroll` émis par le retour en haut sauterait l'intro. |
| Pied de page « ⌘K » cliquable | Le bouton entier (« ⌘K pour naviguer ») ouvre la palette. `<kbd>` a une largeur fixe de `6ch`. | La cible est plus grande sur mobile, et le passage à « Ctrl+K » ne décale rien (CLS 0). |
| — | Deux e2e existants (`liens.spec.ts`, `admin.spec.ts`) cherchent le `<code>` dans `main` | Le `<code>curl -L …</code>` du pied de page était pris par leur sélecteur `code`. Seul le sélecteur change. |

## Fichiers

| Fichier | Rôle | Tâche |
|---|---|---|
| `apps/web/data/site.ts` | + `hoteSite` (hôte sans protocole) | 01 |
| `apps/web/data/competences.ts` (nouveau) | Compétences groupées | 01 |
| `apps/web/lib/cv/modele.ts` (nouveau) | `construireCv()` : le modèle du CV | 01 |
| `apps/web/lib/cv/couleurs-terminal.ts` (nouveau) | Rôle de la charte → code xterm-256 | 02 |
| `apps/web/lib/cv/terminal.ts` (nouveau) | `rendreCvTerminal()`, bandeau, coupure à 80 colonnes | 02 |
| `apps/web/lib/cv/json-resume.ts` (nouveau) | `versJsonResume()` | 03 |
| `apps/web/app/api/me`, `app/cv.txt`, `app/cv.ansi` (nouveaux) | Routes statiques | 03 |
| `apps/web/lib/cv/client-terminal.ts` (nouveau) | `estClientTerminal()` | 04 |
| `apps/web/proxy.ts` | Réécriture `/` → `/cv.ansi` pour les terminaux | 04 |
| `apps/web/lib/commandes/*` (nouveaux) | Types, événements, filtre, visibilité, contexte, exécution, indices | 05, 06, 07 |
| `apps/web/data/commandes.ts` (nouveau) | La liste, tirée des données existantes | 05 |
| `apps/web/components/commandes/*` (nouveaux) | Palette, raccourci, bouton, message console | 06, 07 |
| `apps/web/components/layout/Footer.tsx`, `app/layout.tsx` | Indices et montage | 07 |
| `apps/web/scripts/verifier-taille-commandes.mjs` (nouveau), `lighthouserc.json`, CI | Budgets | 08 |
| `IntroEncre.tsx`, `PresenceDirecte.tsx`, `CompteurPresents.tsx`, `ArchitectureVivante.tsx` | Commandes ludiques | 09 |
| `README.md` | Section « Easter eggs » | 09 |

## Tâches

| Fiche | Contenu | Spec |
|---|---|---|
| `easter-eggs/tache-01.md` | Modèle du CV et compétences | 3 |
| `easter-eggs/tache-02.md` | CV en terminal (80 colonnes, couleurs de la charte) | 3.1 |
| `easter-eggs/tache-03.md` | JSON Resume et routes du CV | 3.2, 4 |
| `easter-eggs/tache-04.md` | `curl -L jouan.dev` : le proxy sert le CV | 4 |
| `easter-eggs/tache-05.md` | Commandes : types, filtre, contexte et liste | 5.1, 5.2 |
| `easter-eggs/tache-06.md` | La palette de commandes | 5.1, 5.3 |
| `easter-eggs/tache-07.md` | Raccourci Cmd+K, pied de page et indices | 5.1, 6 |
| `easter-eggs/tache-08.md` | Budgets de la palette et e2e | 7 |
| `easter-eggs/tache-09.md` | Commandes ludiques et README | 5.2, 8 |

Les conversations, les niveaux, les relectures et la vérification finale sont décrits dans `easter-eggs/LISEZMOI.md`.
