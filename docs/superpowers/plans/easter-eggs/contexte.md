# Easter eggs — contexte commun à toutes les fiches

Lis ce fichier, puis **ta fiche seulement** (`tache-XX.md`). Ne lis ni le plan d'ensemble (`../2026-10-10-easter-eggs.md`) ni la spec en entier : une fiche cite la section de spec dont elle a besoin. N'ouvre que les fichiers que ta fiche nomme.

**But du sous-projet :** trois easter eggs pour le visiteur curieux, sans rien coûter au visiteur pressé :
- `curl -L jouan.dev` affiche un CV coloré en 80 colonnes ;
- `/api/me` renvoie le même CV au format JSON Resume ;
- Cmd+K (Ctrl+K) ouvre une palette de commandes, chargée à la demande.

Spec : `docs/superpowers/specs/2026-10-09-easter-eggs-design.md`.

**Tout le code des fiches a déjà tourné** (tests, lint, types, build, e2e, Lighthouse) : recopie-le **exactement**. Si un test ne passe pas avec le code de la fiche, c'est qu'un détail a changé de ton côté : arrête-toi et dis-le, plutôt qu'improviser.

## Où et comment travailler

- Tout se passe dans le dossier principal du dépôt, sur la branche `sous-projet-7-easter-eggs`, déjà rebasée sur `main` (charte comprise). Les commandes se lancent **depuis la racine du dépôt**.
- Shell zsh : les fiches donnent les commandes prêtes à lancer, une par ligne.
- **Code chargé à la demande** (la palette, `components/commandes/PaletteCommandes.tsx`) : n'y importer ni `data/…` ni un module déjà importé par le code chargé d'office. Turbopack en ferait un petit morceau de JS à part, hors du budget de la palette (`verifier-taille-commandes`), et l'e2e le refuse. La liste des commandes arrive donc en props, construite côté serveur par le layout.
- **Code chargé d'office** (raccourci, bouton du pied de page, message console) : le budget des scripts de l'accueil est presque plein. N'y ajoute rien de plus que la fiche.
- Next.js 16 : avant d'écrire du code Next, lire le guide concerné dans `apps/web/node_modules/next/dist/docs/` (la fiche le dit quand c'est utile).
- Vitest (jsdom) : `import.meta.url` n'y est pas une adresse `file:` ; pour lire un fichier source, partir de `process.cwd()` (Vitest tourne depuis `apps/web`). `<dialog>` n'y a ni `showModal` ni `close` : les tests de la palette posent un polyfill (déjà dans leur code).

## Sorties courtes, sans masquer les échecs

Toute commande de test, de lint, de build ou d'e2e passe par le script `court.sh`. Il :

- charge l'environnement des tests (base locale, adresse du service temps réel), sans jamais l'afficher ;
- garde le journal complet dans un fichier ;
- n'affiche que les 30 dernières lignes, puis le code de sortie.

```bash
./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run lib/cv --reporter=dot
./docs/superpowers/plans/easter-eggs/court.sh bash -c 'pnpm lint && pnpm typecheck'
```

- Ne pipe jamais une commande dans `tail` ou `head` : le code de sortie serait perdu, et un échec passerait pour un succès.
- Juge le résultat sur la ligne `→ code de sortie N` : 0 = succès.
- Pour voir plus de lignes : `LIGNES=80 ./docs/…/court.sh …`. Pour chercher dans un journal : `grep -n "FAIL\|Error" <journal>`.
- Vitest : `--reporter=dot`. Playwright : `--reporter=line`.
- Les e2e testent la build de production : `pnpm build` avant, et le service temps réel construit une fois (`pnpm --filter realtime build`, voir `LISEZMOI.md`).

**Pas de vérification lourde** : ni `pnpm e2e` complet, ni Lighthouse, ni `docker build`. Augustin les lance à la fin (`verification-finale.md`). Une fiche ne lance que ses tests et ses e2e ciblés.

## Règles

- Site en **français uniquement** ; commentaires et messages de commit en français.
- **Aucun nom de client, de projet client ou d'employeur** dans le dépôt.
- Espaces insécables : dans le code, U+00A0 et U+202F s'écrivent `\u00a0` / `\u202f`, jamais en caractère littéral. Ton outil d'écriture peut les transformer en caractères : vérifie après chaque fichier qui en contient.
  - Vérifier : `grep -cP "[\x{00a0}\x{202f}]" <fichier>`, qui doit donner `0`.
  - Corriger : `perl -CSD -pi -e 's/\x{00a0}/\\u00a0/g; s/\x{202f}/\\u202f/g' <fichier>`.
- Charte « Nuit mauve » : les composants n'emploient que les **rôles** (`bg-surface`, `text-texte-doux`, `border-trait-fort`, `bg-accent`, `text-sur-accent`…), **jamais d'opacité sur une couleur** (`/50`) ni `text-vivant`. `lib/charte-classes.test.ts` refuse le reste.
- Ne jamais modifier `apps/web/.env.example` ni `apps/web/scripts/empreinte-mot-de-passe.mjs`. Ne jamais afficher le contenu d'un `.env.local`.
- Ne rien pousser, ne pas ouvrir de PR, ne rien fusionner. Jamais de `--force`, de `reset --hard`, de `rebase`, ni de `git stash` nu.
- Commits ciblés : `git add` fichier par fichier (la fiche donne la liste), jamais `git add -A` ni `git add .`.
- Un test qui échoue ne se corrige jamais en l'affaiblissant (seuil relevé, règle retirée, assertion supprimée). Si la fiche ne suffit pas pour le faire passer honnêtement : s'arrêter et le dire dans le compte rendu.
- Si quelque chose ne colle pas avec la fiche (fichier ou ligne introuvable, test qui ne passe pas) : s'arrêter et le dire, plutôt qu'improviser.

## Fin de fiche : compte rendu

Termine **toujours** par ce compte rendu, et rien de plus (pas de résumé du code) :

```
Tâche XX : terminée | bloquée
Commits : <sha court> <message>   (un par ligne)
Tests : <une ligne, par exemple « lib/cv : 16 passés »>
Écarts ou doutes : <liste courte, ou « aucun »>
```
