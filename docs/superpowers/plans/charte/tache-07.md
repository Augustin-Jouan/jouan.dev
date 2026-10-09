# Tâche 07 — Coulisses aux rôles, scène 3D comprise

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **medium**.
> Commandes depuis la racine du worktree. Termine par le compte rendu de `contexte.md`.

Couleurs relevées dans le code fusionné (`main` du 10/10) : le tableau du step 2 donne chaque occurrence. Le step 1 sert à vérifier qu'il n'y en a pas d'autre.

**Files:**
- Modify: `apps/web/app/coulisses/page.tsx`, `apps/web/components/coulisses/ArchitectureVivante.tsx`, `Courbe.tsx`, `PanneauEnDirect.tsx`, `Schema.tsx`, `SectionDeploiement.tsx`, `DateRelative.tsx`, `CadreScene3d.tsx`, `apps/web/lib/coulisses/scene3d.ts`, et leurs tests si besoin

**Interfaces:**
- Consumes: classes de rôles (tâche 3) ; `couleur(role)` (tâche 2).

- [ ] **Step 1: Relever les couleurs des Coulisses**

```bash
grep -rn -E "(bg|text|border|ring|ring-offset|outline|fill|stroke|decoration|divide|from|via|to)-(papier|encre|encre-douce|brique|braise|braise-claire|terre|white|black|emerald)[a-z0-9/-]*|var\(--color-(papier|encre|encre-douce|brique|braise|braise-claire|terre)\)|0x[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{6}\b|(bg|text|border|fill|stroke)-[a-z-]+/[0-9]+\b" \
  apps/web/app/coulisses apps/web/components/coulisses apps/web/lib/coulisses | grep -v "\.test\."
```

(Le rôle `trait` n'est pas dans cette recherche : `border-trait` et `stroke-trait` restent valables.)

- [ ] **Step 2: Remplacer, selon ce tableau**

| Fichier : ligne | Ancien | Nouveau |
|---|---|---|
| `app/coulisses/page.tsx:20` | `text-encre-douce` | `text-texte-doux` |
| `components/coulisses/Schema.tsx:54` | `"liaison-mesuree stroke-brique"` | `"liaison-mesuree stroke-accent"` (`stroke-trait` reste) |
| `Schema.tsx:63` | `stroke="var(--color-papier)"` (détourage des chiffres) | `stroke="var(--color-fond)"` |
| `Schema.tsx:65` et `:96` | `fill-encre` | `fill-texte` |
| `Schema.tsx:94` | `"fill-brique/10 stroke-brique"` (nœud actif) | `"fill-surface stroke-accent"` |
| `Schema.tsx:94` | `"fill-papier stroke-encre-douce"` (nœud au repos) | `"fill-fond stroke-trait-fort"` |
| `Schema.tsx:94` | `group-focus-visible:stroke-brique` | `group-focus-visible:stroke-accent` |
| `components/coulisses/Courbe.tsx:16` | `stroke-brique` | `stroke-accent` |
| `components/coulisses/CadreScene3d.tsx:89` | `aria-pressed:border-brique aria-pressed:text-brique` | `aria-pressed:border-accent aria-pressed:text-accent` |
| `components/coulisses/ArchitectureVivante.tsx:100` | `border border-encre … hover:bg-encre hover:text-papier` | `border border-trait-fort … hover:bg-accent hover:text-sur-accent` |
| `ArchitectureVivante.tsx:116` et `:119` | `text-encre-douce` | `text-texte-doux` |
| `components/coulisses/DateRelative.tsx:22` | `text-encre-douce` | `text-texte-doux` |
| `components/coulisses/PanneauEnDirect.tsx:16` | `bg-emerald-600` | `bg-vivant` |
| `PanneauEnDirect.tsx:24` et `:28` | `text-encre-douce` | `text-texte-doux` |
| `components/coulisses/SectionDeploiement.tsx:18` | `bg-encre/5` | `bg-surface` |
| `SectionDeploiement.tsx:24, 30, 38, 42, 48` | `text-encre-douce` | `text-texte-doux` |
| `lib/coulisses/scene3d.ts:130` | `"rounded bg-papier/90 px-1.5 py-0.5 text-xs font-semibold text-encre"` | `"rounded bg-surface px-1.5 py-0.5 text-xs font-semibold text-texte"` |

Pour `apps/web/lib/coulisses/scene3d.ts` : ajouter `import { couleur } from "@/lib/charte";` et remplacer

```ts
const COULEURS = { papier: 0xf3efe7, brique: 0xc84a1f, trait: 0xc9c1b2 };
```

par

```ts
/** Couleurs de lib/charte.ts : blocs clairs sur la nuit, liaisons en trait fort, sélection en accent. */
const COULEURS = { bloc: couleur("texte-doux"), actif: couleur("accent"), liaison: couleur("trait-fort") };
```

puis, dans le fichier, `COULEURS.papier` → `COULEURS.bloc`, `COULEURS.brique` → `COULEURS.actif`, `COULEURS.trait` → `COULEURS.liaison` (`MeshStandardMaterial` et `LineBasicMaterial` acceptent une chaîne `#rrggbb`). Les lumières blanches (`AmbientLight(0xffffff, …)`, `DirectionalLight(0xffffff, …)`) restent : ce sont des éclairages, pas des couleurs de la charte. Si la scène a un fond explicite (`scene.background`), le passer à `couleur("fond")`.

- [ ] **Step 3: Vérifier**

Relancer la commande du step 1. Expected : aucune ligne hors des deux lumières `0xffffff`. Puis :

```bash
./docs/superpowers/plans/charte/court.sh bash -c 'pnpm lint && pnpm typecheck && pnpm test'
```

Expected: PASS (tests des Coulisses mis à jour vers les classes de rôles s'ils cherchaient `stroke-brique`, `fill-papier`…, sans changer ce qu'ils vérifient). Puis :

```bash
./docs/superpowers/plans/charte/court.sh bash -c 'pnpm build && pnpm --filter web verifier-taille-3d'
./docs/superpowers/plans/charte/court.sh pnpm --filter web exec playwright test e2e/coulisses.spec.ts e2e/coulisses-3d.spec.ts --reporter=line
```

Expected: budget 3D respecté ; e2e PASS.

- [ ] **Step 4: Commiter**

Ajouter un par un chaque fichier modifié (`git status --short` ; chemins entre guillemets), puis :

```bash
git commit -m "Charte : Coulisses aux rôles (schéma, courbes, panneau, déploiement, scène 3D)"
```
