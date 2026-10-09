# Charte « Nuit mauve » — mode d'emploi du plan découpé

Le plan `../2026-10-09-charte.md` est découpé ici en fiches courtes, une conversation d'agent par fiche, pour limiter les tokens :

- `contexte.md` : ce que toute fiche suppose (règles, charte, sorties courtes). Environ 120 lignes, lu à chaque conversation.
- `tache-XX.md` : une tâche. L'agent ne lit que celle-là.
- `relecture.md` : relecture groupée, toutes les 3 ou 4 tâches.
- `verification-finale.md` : vérifications lourdes, pour toi, à la fin.
- `court.sh` : lance une commande avec l'environnement des tests et n'affiche que la fin et le code de sortie.

La spec (`../../specs/2026-10-09-charte-design.md`) reste la référence en cas de doute.

## Avant de commencer (toi, une fois)

Ouvre l'éditeur sur le **worktree** `.superpowers/worktrees/charte`, pas sur le dossier principal. La branche `sous-projet-6-charte` y est déjà rebasée sur `main` (Coulisses comprises). Puis :

```bash
./docs/superpowers/plans/charte/court.sh pnpm install --frozen-lockfile
./docs/superpowers/plans/charte/court.sh pnpm --filter web generer-client
./docs/superpowers/plans/charte/court.sh pnpm --filter realtime build
./docs/superpowers/plans/charte/court.sh pnpm --filter web exec playwright install chromium
docker ps | grep postgres   # la base locale doit tourner
```

Les ports 3100 (site) et 3201 (temps réel) servent aux e2e ciblés : rien d'autre ne doit les occuper. Un `next dev` sur le port 3000 ne gêne pas les fiches, seulement la vérification finale.

## Ordre, conversations et niveaux

Une ligne = une conversation neuve. « Départ » : note le commit de départ (`git rev-parse --short HEAD`) avant la conversation, pour la relecture.

| Conversation | Fiche(s) | Niveau (Grok, sans « fast ») | Relecture après |
|---|---|---|---|
| 1 | `tache-02.md` puis `tache-03.md` | low | |
| 2 | `tache-04.md` | medium | **groupe 1** (tâches 02 à 04) |
| 3 | `tache-05-06.md` | medium | |
| 4 | `tache-07.md` | medium | |
| 5 | `tache-08.md` | medium | **groupe 2** (tâches 05 à 08) |
| 6 | `tache-09.md` | low | |
| 7 | `tache-10.md` | medium | |
| 8 | `tache-11.md` | medium | |
| 9 | `tache-12.md` | high | **groupe 3** (tâches 09 à 12) |

Ensuite : `verification-finale.md`.

## Message à donner à l'agent

Remplacer `XX` par la ou les fiches de la conversation :

> Lis `docs/superpowers/plans/charte/contexte.md`, puis `docs/superpowers/plans/charte/tache-XX.md`, et exécute la fiche étape par étape. Ne lis ni le plan complet ni la spec entière, n'ouvre que les fichiers que la fiche nomme. Passe chaque commande de test, de build ou d'e2e par `court.sh`. Termine par le compte rendu demandé dans `contexte.md`.

Garde le compte rendu de chaque conversation : la relecture en a besoin.

## Si une fiche bloque

L'agent s'arrête et le dit dans son compte rendu, plutôt que d'improviser. Reprends alors dans une conversation de niveau supérieur (ou avec moi), en lui donnant le compte rendu et le journal indiqué par `court.sh`. Ne relance pas la même fiche telle quelle.
