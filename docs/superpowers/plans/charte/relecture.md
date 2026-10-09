# Relecture groupée (une conversation par groupe)

Trois relectures, plutôt que deux relecteurs après chaque tâche. Chacune lit **le diff du groupe dans un fichier**, pas l'historique des conversations.

## Préparer (toi)

`DEPART` est le commit noté avant la première conversation du groupe (voir `LISEZMOI.md`).

```bash
git log --oneline DEPART..HEAD
git diff DEPART..HEAD > /tmp/charte-groupe-N.diff
wc -l /tmp/charte-groupe-N.diff
```

## Message à donner au relecteur (niveau high, sans « fast »)

> Tu relis, sans rien modifier, le travail du groupe N de la charte « Nuit mauve ». Lis `docs/superpowers/plans/charte/contexte.md`, les fiches FICHES (même dossier), puis le diff `/tmp/charte-groupe-N.diff`. Voici les comptes rendus des agents : COMPTES RENDUS.
>
> Vérifie :
> 1. Le diff fait ce que disent les fiches, avec leurs valeurs exactes (teintes, rôles, classes), et rien d'autre.
> 2. Aucun test n'est affaibli (seuil relevé, assertion retirée, règle désactivée) ; les tests demandés par les fiches existent.
> 3. Les points à surveiller ci-dessous pour ce groupe.
> 4. Règles de `contexte.md` : aucune classe hors des rôles, pas d'opacité sur une couleur, pas de `text-vivant`, insécables en `\u00a0`, français, aucun nom de client ou d'employeur.
>
> Tu peux lancer des tests ciblés avec `./docs/superpowers/plans/charte/court.sh`, mais ni `pnpm e2e` complet ni Lighthouse.
>
> Rends un rapport court, 400 mots au plus. Pour chaque constat : gravité (bloquant, important ou mineur), `fichier:ligne`, ce qui ne va pas et la correction en une phrase. Termine par un verdict, « OK » ou « à corriger ».

Remplacer `N`, `FICHES` et `COMPTES RENDUS`. S'il y a des corrections, les faire faire dans une nouvelle conversation (niveau medium), en lui donnant le rapport et la fiche concernée.

## Groupe 1 — tâches 02 à 04 (socle et intro)

**Fiches :** `tache-02.md`, `tache-03.md`, `tache-04.md`.

**À surveiller :**
- `lib/charte.ts` et `globals.css` donnent exactement les valeurs de `contexte.md`, et le test de concordance les relie vraiment (il échouerait si une valeur changeait d'un côté).
- La tâche 03 ne change rien de visible : `html` est encore en papier et encre, et les anciens jetons sont toujours là.
- L'intro : plus aucun `ENCRE` ni `BRAISE` ; le halo de repli et le nom utilisent `--color-lueur`, `--color-lueur-chaude` et `--color-sur-accent`, et les e2e vérifient leurs couleurs calculées.

**À regarder toi-même :** rien.

## Groupe 2 — tâches 05 à 08 (pages et garde-fou)

**Fiches :** `tache-05-06.md`, `tache-07.md`, `tache-08.md`.

**À surveiller :**
- Aucune ancienne classe oubliée, y compris dans les Coulisses (`Schema`, `CadreScene3d`, `scene3d.ts`) et sous la forme `var(--color-<ancien>)`.
- Le garde-fou `charte-classes.test.ts` n'a pas été élargi ou contourné pour passer.
- `--color-*: initial` est en tête de `@theme`, et la palette par défaut a disparu du CSS construit.
- Le focus pêche (`:focus-visible`) et la règle `:autofill` sont présents.
- `Offre` : la carte mise en avant est en `bg-surface ring-1 ring-accent`.

**À regarder toi-même :** lance le build local (`./docs/superpowers/plans/charte/court.sh pnpm build`, puis `node apps/web/scripts/demarrer-standalone.mjs`, avec le port 3000 libre). Parcours l'accueil, une étude de cas, `/contact`, `/coulisses` (2D et 3D) et `/admin/connexion` : fond nuit, texte clair, aucune zone claire, focus visible au clavier.

## Groupe 3 — tâches 09 à 12 (curseurs, démo, partage, accessibilité)

**Fiches :** `tache-09.md`, `tache-10.md`, `tache-11.md`, `tache-12.md`.

**À surveiller :**
- La palette des curseurs reste ≥ 3:1 sur la nuit, et le service ne dépend pas d'`apps/web`.
- La démo n'est sombre qu'avec `?theme=sombre`, appliqué avant le premier rendu.
- L'iframe reste invisible jusqu'à son `load`.
- Le gris pâle sombre de la démo est passé à `#8a9eb0`.
- `viewport` porte `themeColor` et `colorScheme` ; l'icône et la vignette n'ont plus de couleur en dur.
- `accessibilite.spec.ts` vérifie WCAG 2.0, 2.1 et 2.2 (A et AA) sur toutes les pages, démo sombre comprise. Il passe aussi l'accueil après l'intro, et la boucle de focus. Aucune règle d'axe n'est désactivée.

**À regarder toi-même :** `apps/web/public/realisations/suivi-de-marches/apercu.webp`, qui doit montrer la démo en sombre. Le reste se voit dans les captures de `verification-finale.md`.
