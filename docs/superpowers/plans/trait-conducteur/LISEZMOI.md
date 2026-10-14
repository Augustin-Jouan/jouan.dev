# Trait conducteur — mode d'emploi du plan découpé

Le plan d'ensemble est `../2026-10-14-trait-conducteur.md` : il donne le but, les décisions et les révisions de la spec. Il est découpé ici en fiches courtes, une conversation d'agent par ligne du tableau, pour limiter les tokens :

- `contexte.md` : ce que toute fiche suppose (règles, sorties courtes). Lu à chaque conversation.
- `tache-XX.md` : une tâche. L'agent ne lit que celle-là (ou les deux de sa conversation).
- `relecture.md` : relecture groupée, après les conversations 2 et 3.
- `verification-finale.md` : vérifications lourdes, pour toi, à la fin.
- `court.sh` : lance une commande avec l'environnement des tests et n'affiche que la fin et le code de sortie.

**Tout le code des fiches a déjà tourné une fois**, dans une copie jetable de la branche :
- 722 tests unitaires du site (et 38 du service temps réel), lint, types ;
- build, accueil toujours prérendu ;
- e2e complets : 185 passés, 37 ignorés (ceux propres au téléphone ou à l'ordinateur) ;
- Lighthouse : scripts de l'accueil à 165 731 octets (budget 168 960), CLS 0, accessibilité 1, performance de 0,96 à 0,98 ;
- morceau du trait : 4,0 Ko compressés (budget 6 Ko).

L'agent recopie et vérifie ; il n'a rien à inventer. La spec (`../../specs/2026-10-14-trait-conducteur-design.md`) reste la référence en cas de doute.

## Avant de commencer (toi, une fois)

Ouvre l'éditeur sur le dossier du dépôt, sur la branche `trait-conducteur` (partie de `main` après la PR #29). Puis :

```bash
./docs/superpowers/plans/trait-conducteur/court.sh pnpm install --frozen-lockfile
./docs/superpowers/plans/trait-conducteur/court.sh pnpm --filter web generer-client
./docs/superpowers/plans/trait-conducteur/court.sh pnpm --filter realtime build
docker ps | grep postgres   # la base locale doit tourner
```

Le port 3100 sert aux e2e ciblés de la tâche 04 : rien d'autre ne doit l'occuper. Un `next dev` sur le port 3000 ne gêne pas les fiches, seulement la vérification finale.

## Ordre, conversations et niveaux

Une ligne = une conversation neuve. « Départ » : note le commit de départ (`git rev-parse --short HEAD`) avant la conversation, pour la relecture.

| Conversation | Fiche(s) | Niveau (Grok, sans « fast ») | Relecture après |
|---|---|---|---|
| 1 | `tache-01.md` | medium | |
| 2 | `tache-02.md` puis `tache-03.md` | medium | **groupe 1** (tâches 01 à 03 : le trait et son branchement) |
| 3 | `tache-04.md` | medium | **groupe 2** (tâche 04 : apparence et e2e) |

Ensuite : `verification-finale.md`.

## Message à donner à l'agent

Remplacer `XX` par la ou les fiches de la conversation (« `tache-02.md` puis `tache-03.md` ») :

> Lis `docs/superpowers/plans/trait-conducteur/contexte.md`, puis `docs/superpowers/plans/trait-conducteur/tache-XX.md`, et exécute la fiche étape par étape. Recopie le code exactement. Ne lis ni le plan d'ensemble ni la spec entière, n'ouvre que les fichiers que la fiche nomme. Passe chaque commande de test, de build ou d'e2e par `court.sh`. Termine par le compte rendu demandé dans `contexte.md`.

Garde le compte rendu de chaque conversation : la relecture en a besoin.

## Si une fiche bloque

L'agent s'arrête et le dit dans son compte rendu, plutôt que d'improviser. Reprends alors dans une conversation de niveau supérieur (ou avec moi), en lui donnant le compte rendu et le journal indiqué par `court.sh`. Ne relance pas la même fiche telle quelle.
