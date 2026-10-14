# Trait conducteur — contexte commun à toutes les fiches

Lis ce fichier, puis **ta fiche seulement** (`tache-XX.md`). Ne lis ni le plan d'ensemble (`../2026-10-14-trait-conducteur.md`) ni la spec en entier : une fiche cite la section de spec dont elle a besoin. N'ouvre que les fichiers que ta fiche nomme.

**But :** un trait pêche accompagne le visiteur tout le long de l'accueil, au fil du défilement. Il naît sous l'accroche, descend à gauche d'un tracé libre (avec une petite boucle), devient le fil de la Méthode et en allume les étapes, ressort à droite, enlace les logos de SCR Informatique et d'Epitech d'un ∞, puis finit sa course en allumant le bouton d'envoi du Contact. Sur téléphone, c'est un trait fin le long du bord gauche.

Spec : `docs/superpowers/specs/2026-10-14-trait-conducteur-design.md`.

**Tout le code des fiches a déjà tourné** (tests unitaires, lint, types, build, e2e complets, Lighthouse) : recopie-le **exactement**. Si un test ne passe pas avec le code de la fiche, c'est qu'un détail a changé de ton côté : arrête-toi et dis-le, plutôt qu'improviser.

## Où et comment travailler

- Tout se passe dans le dossier principal du dépôt, sur la branche `trait-conducteur`. Les commandes se lancent **depuis la racine du dépôt**.
- Shell zsh : les fiches donnent les commandes prêtes à lancer, une par ligne.
- **Code chargé à la demande** (`apps/web/lib/trait/*`) : il n'importe que ses propres fichiers (`./trace`, `./progression`). Jamais `data/…` ni un module déjà importé par le code chargé d'office : Turbopack en ferait un morceau de JS à part, et le contrôle de taille (`verifier-taille-defilement`) ne s'y retrouverait plus.
- **Code chargé d'office** (`TraitConducteur.tsx`) : le budget des scripts de l'accueil est presque plein. N'y ajoute rien de plus que la fiche.
- Vitest (jsdom) : pas de `ResizeObserver` ; les tests qui en ont besoin le remplacent (déjà dans leur code).

## Sorties courtes, sans masquer les échecs

Toute commande de test, de lint, de build ou d'e2e passe par le script `court.sh`. Il :

- charge l'environnement des tests (base locale, adresse du service temps réel), sans jamais l'afficher ;
- garde le journal complet dans un fichier ;
- n'affiche que les 30 dernières lignes, puis le code de sortie.

```bash
./docs/superpowers/plans/trait-conducteur/court.sh pnpm --filter web exec vitest run lib/trait --reporter=dot
./docs/superpowers/plans/trait-conducteur/court.sh bash -c 'pnpm lint && pnpm typecheck'
```

- Ne pipe jamais une commande dans `tail` ou `head` : le code de sortie serait perdu, et un échec passerait pour un succès.
- Juge le résultat sur la ligne `→ code de sortie N` : 0 = succès.
- Pour voir plus de lignes : `LIGNES=80 ./docs/…/court.sh …`. Pour chercher dans un journal : `grep -n "FAIL\|Error" <journal>`.
- Vitest : `--reporter=dot`. Playwright : `--reporter=line`.
- Les e2e testent la build de production : `pnpm build` avant.

**Pas de vérification lourde** : ni `pnpm e2e` complet, ni Lighthouse, ni `docker build`. Augustin les lance à la fin (`verification-finale.md`). Une fiche ne lance que ses tests et ses e2e ciblés.

## Règles

- Site en **français uniquement** ; commentaires et messages de commit en français.
- Charte « Nuit mauve » : en CSS, seulement des rôles (`var(--color-…)`, `color-mix(…)`), jamais de couleur brute. Les composants n'emploient que les classes de rôles.
- Ne jamais modifier `apps/web/.env.example` ni `apps/web/scripts/empreinte-mot-de-passe.mjs`. Ne jamais afficher le contenu d'un `.env.local`.
- Ne rien pousser, ne pas ouvrir de PR, ne rien fusionner. Jamais de `--force`, de `reset --hard`, de `rebase`, ni de `git stash` nu.
- Commits ciblés : `git add` fichier par fichier (la fiche donne la liste), jamais `git add -A` ni `git add .`.
- Un test qui échoue ne se corrige jamais en l'affaiblissant (seuil relevé, règle retirée, assertion supprimée). Si la fiche ne suffit pas pour le faire passer honnêtement : s'arrêter et le dire dans le compte rendu.
- Si quelque chose ne colle pas avec la fiche (fichier ou texte à remplacer introuvable, test qui ne passe pas) : s'arrêter et le dire, plutôt qu'improviser.

## Fin de fiche : compte rendu

Termine **toujours** par ce compte rendu, et rien de plus (pas de résumé du code) :

```
Tâche XX : terminée | bloquée
Commits : <sha court> <message>   (un par ligne)
Tests : <une ligne, par exemple « lib/trait : 22 passés »>
Écarts ou doutes : <liste courte, ou « aucun »>
```
