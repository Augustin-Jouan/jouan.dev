# Easter eggs — mode d'emploi du plan découpé

Le plan d'ensemble est `../2026-10-10-easter-eggs.md` : il donne le but, les décisions et les écarts à la spec. Il est découpé ici en fiches courtes, une conversation d'agent par ligne du tableau, pour limiter les tokens :

- `contexte.md` : ce que toute fiche suppose (règles, sorties courtes). Lu à chaque conversation.
- `tache-XX.md` : une tâche. L'agent ne lit que celle-là (ou les deux de sa conversation).
- `relecture.md` : relecture groupée, après les conversations 2, 5 et 6.
- `verification-finale.md` : vérifications lourdes, pour toi, à la fin.
- `court.sh` : lance une commande avec l'environnement des tests et n'affiche que la fin et le code de sortie.

**Tout le code des fiches a déjà tourné une fois**, dans une copie jetable de la branche : tests unitaires (616), lint, types, build, e2e complets (128), Lighthouse (accueil à 164 300 octets de scripts, CLS 0). L'agent recopie et vérifie ; il n'a rien à inventer.

La spec (`../../specs/2026-10-09-easter-eggs-design.md`) reste la référence en cas de doute, aux écarts près listés dans le plan d'ensemble.

## Avant de commencer (toi, une fois)

Ouvre l'éditeur sur le dossier du dépôt, sur la branche `sous-projet-7-easter-eggs` (déjà rebasée sur `main`, charte comprise). Puis :

```bash
./docs/superpowers/plans/easter-eggs/court.sh pnpm install --frozen-lockfile
./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web generer-client
./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter realtime build
./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec playwright install chromium
docker ps | grep postgres   # la base locale doit tourner
```

Les ports 3100 (site) et 3201 (temps réel) servent aux e2e ciblés : rien d'autre ne doit les occuper. Un `next dev` sur le port 3000 ne gêne pas les fiches, seulement la vérification finale.

## Ordre, conversations et niveaux

Une ligne = une conversation neuve. « Départ » : note le commit de départ (`git rev-parse --short HEAD`) avant la conversation, pour la relecture.

| Conversation | Fiche(s) | Niveau (Grok, sans « fast ») | Relecture après |
|---|---|---|---|
| 1 | `tache-01.md` puis `tache-02.md` | medium | |
| 2 | `tache-03.md` puis `tache-04.md` | medium | **groupe 1** (tâches 01 à 04 : le CV) |
| 3 | `tache-05.md` puis `tache-06.md` | medium | |
| 4 | `tache-07.md` | medium | |
| 5 | `tache-08.md` | medium | **groupe 2** (tâches 05 à 08 : la palette) |
| 6 | `tache-09.md` | high | **groupe 3** (tâche 09 : commandes ludiques) |

Ensuite : `verification-finale.md`.

## Message à donner à l'agent

Remplacer `XX` par la ou les fiches de la conversation (« `tache-01.md` puis `tache-02.md` ») :

> Lis `docs/superpowers/plans/easter-eggs/contexte.md`, puis `docs/superpowers/plans/easter-eggs/tache-XX.md`, et exécute la fiche étape par étape. Recopie le code exactement. Ne lis ni le plan d'ensemble ni la spec entière, n'ouvre que les fichiers que la fiche nomme. Passe chaque commande de test, de build ou d'e2e par `court.sh`. Termine par le compte rendu demandé dans `contexte.md`.

Garde le compte rendu de chaque conversation : la relecture en a besoin.

## Si une fiche bloque

L'agent s'arrête et le dit dans son compte rendu, plutôt que d'improviser. Reprends alors dans une conversation de niveau supérieur (ou avec moi), en lui donnant le compte rendu et le journal indiqué par `court.sh`. Ne relance pas la même fiche telle quelle.
