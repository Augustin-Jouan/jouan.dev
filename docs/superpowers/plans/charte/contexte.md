# Charte « Nuit mauve » — contexte commun à toutes les fiches

Lis ce fichier, puis **ta fiche seulement** (`tache-XX.md`). Ne lis ni le plan complet (`../2026-10-09-charte.md`, gardé pour l'historique) ni la spec en entier : une fiche cite la section de spec dont elle a besoin. N'ouvre que les fichiers que ta fiche nomme.

**But du sous-projet :** repeindre tout le site en charte sombre « Nuit mauve » (fond nuit, accent pêche, alerte corail, « en direct » sauge), avec des jetons à deux étages : teintes brutes `--teinte-*` sur `:root`, rôles `--color-<rôle>` dans `@theme` (seules classes de couleur possibles), et les mêmes valeurs dans `apps/web/lib/charte.ts` pour le code TypeScript. Des tests tiennent CSS et TypeScript d'accord, vérifient les contrastes et refusent toute autre classe de couleur.

## Où et comment travailler

- Tout se passe dans le dossier principal du dépôt, sur la branche `sous-projet-6-charte`, déjà rebasée sur `main` (Coulisses comprises). Les commandes se lancent **depuis la racine du dépôt**.
- Shell zsh : tout bloc qui contient un chemin à crochets (`[slug]`) ou une liste de fichiers se lance par `bash <<'EOF' … EOF`, avec un tableau et des chemins entre guillemets (les fiches le font déjà).
- Next.js 16 : avant d'écrire du code Next, lire le guide concerné dans `apps/web/node_modules/next/dist/docs/` (la fiche le dit quand c'est utile).

## Sorties courtes, sans masquer les échecs

Toute commande de test, de lint, de build ou d'e2e passe par le script `court.sh`. Il :

- charge l'environnement des tests (base locale, adresse du service temps réel), sans jamais l'afficher ;
- garde le journal complet dans un fichier ;
- n'affiche que les 30 dernières lignes, puis le code de sortie.

```bash
./docs/superpowers/plans/charte/court.sh pnpm --filter web exec vitest run lib/charte.test.ts --reporter=dot
./docs/superpowers/plans/charte/court.sh bash -c 'pnpm lint && pnpm typecheck && pnpm test'
```

- Ne pipe jamais une commande dans `tail` ou `head` : le code de sortie serait perdu, et un échec passerait pour un succès.
- Juge le résultat sur la ligne `→ code de sortie N` : 0 = succès.
- Pour voir plus de lignes : `LIGNES=80 ./docs/…/court.sh …`. Pour chercher dans un journal : `grep -n "FAIL\|Error" <journal>`.
- Vitest : `--reporter=dot`. Playwright : `--reporter=line`.

**Pas de vérification lourde** : ni `pnpm e2e` complet, ni Lighthouse, ni `docker build`. Augustin les lance à la fin (`verification-finale.md`). Une fiche ne lance que ses tests et ses e2e ciblés.

## Règles

- Site en **français uniquement** ; commentaires et messages de commit en français.
- **Aucun nom de client, de projet client ou d'employeur** dans le dépôt.
- Espaces insécables : dans le code, U+00A0 et U+202F s'écrivent `\u00a0` / `\u202f`, jamais en caractère littéral.
  - Vérifier : `grep -cP "[\x{00a0}\x{202f}]" <fichier>`, qui doit donner `0`.
  - Corriger : `perl -CSD -pi -e 's/\x{00a0}/\\u00a0/g; s/\x{202f}/\\u202f/g' <fichier>`.
- Ne jamais modifier `apps/web/.env.example` ni `apps/web/scripts/empreinte-mot-de-passe.mjs`. Ne jamais afficher le contenu d'un `.env.local`.
- Ne rien pousser, ne pas ouvrir de PR, ne rien fusionner. Jamais de `--force`, de `reset --hard`, de `rebase`, ni de `git stash` nu.
- Commits ciblés : `git add` fichier par fichier (la fiche donne la liste), jamais `git add -A` ni `git add .`.
- Un test qui échoue ne se corrige jamais en l'affaiblissant (seuil relevé, règle retirée, assertion supprimée). Si la fiche ne suffit pas pour le faire passer honnêtement : s'arrêter et le dire dans le compte rendu.
- Si quelque chose ne colle pas avec la fiche (fichier ou ligne introuvable, test qui ne passe pas) : s'arrêter et le dire, plutôt qu'improviser.

## La charte (valeurs exactes, minuscules partout)

| Teinte | Valeur |
|---|---|
| nuit | `#2a2127` |
| nuit-haute | `#352a31` |
| mauve | `#79616f` |
| mauve-clair | `#b9a3b0` |
| rose | `#ae6378` |
| corail | `#d87f81` |
| peche | `#eab595` |
| sauge | `#7e9680` |
| papier | `#f3efe7` |
| trait-nuit | `#4a3b44` |
| trait-mauve | `#8a7480` |

| Rôle | Teinte | Usage |
|---|---|---|
| fond | nuit | fond de page |
| surface | nuit-haute | cartes, champs, fenêtres |
| texte | papier | texte courant |
| texte-doux | mauve-clair | texte secondaire |
| accent | peche | boutons, liens forts, focus, mot en couleur |
| sur-accent | nuit | texte posé sur l'accent ou la goutte |
| alerte | corail | erreurs |
| vivant | sauge | pastille « en direct » (**jamais du texte**) |
| trait | trait-nuit | séparateurs décoratifs |
| trait-fort | trait-mauve | contours de champs et de boutons secondaires |
| lueur | corail | halo de l'accueil |
| lueur-chaude | rose | bord du halo |
| goutte | peche | goutte de l'intro |

Les composants n'emploient **que des rôles** : jamais une teinte brute, un ancien jeton (`papier`, `encre`, `encre-douce`, `brique`, `braise`, `braise-claire`, `terre`) ni une couleur par défaut de Tailwind (`white`, `emerald-600`…). **Aucune opacité sur une couleur** (`/40`, `/75`…), et **jamais `text-vivant`**.

## Fin de fiche : compte rendu

Termine **toujours** par ce compte rendu, et rien de plus (pas de résumé du code) :

```
Tâche XX : terminée | bloquée
Commits : <sha court> <message>   (un par ligne)
Tests : <une ligne, par exemple « charte.test.ts : 12 passés »>
Écarts ou doutes : <liste courte, ou « aucun »>
```
