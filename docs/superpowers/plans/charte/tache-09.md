# Tâche 09 — Curseurs du temps réel sur la nuit

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **low**.
> Commandes depuis la racine du worktree. Termine par le compte rendu de `contexte.md`.

**Files:**
- Modify: `apps/realtime/src/couleurs.ts`, `apps/realtime/src/couleurs.test.ts`
- Modify: `apps/web/components/direct/CalqueCurseurs.tsx` (attribut `stroke` du `<path>`)

**Interfaces:**
- Consumes: `couleur(role)` (tâche 2).
- Produces: `PALETTE` (même nom, même forme : 6 teintes).

- [ ] **Step 1: Test du service (échoue)**

Dans `apps/realtime/src/couleurs.test.ts`, remplacer le test `"reste lisible sur le papier (contraste ≥ 3:1)"` par :

```ts
  it("reste lisible sur la nuit du site (contraste ≥ 3:1)", () => {
    for (const c of PALETTE) expect(contraste(c, "#2a2127")).toBeGreaterThanOrEqual(3);
  });
```

Run: `./docs/superpowers/plans/charte/court.sh pnpm --filter realtime exec vitest run src/couleurs.test.ts --reporter=dot`
Expected: FAIL (anciennes teintes sous 3:1 sur la nuit).

- [ ] **Step 2: Nouvelle palette**

Dans `apps/realtime/src/couleurs.ts`, remplacer le commentaire et la constante `PALETTE` par :

```ts
/**
 * Teintes des curseurs, tirées de la charte « Nuit mauve » (apps/web/lib/charte.ts) et
 * lisibles sur la nuit du site (#2a2127, contraste ≥ 3:1) : pêche, corail, sauge,
 * mauve clair, papier, rose. Recopiées ici : le service ne dépend pas d'apps/web.
 */
export const PALETTE = ["#eab595", "#d87f81", "#7e9680", "#b9a3b0", "#f3efe7", "#ae6378"] as const;
```

Run: `./docs/superpowers/plans/charte/court.sh pnpm --filter realtime exec vitest run --reporter=dot`
Expected: PASS.

- [ ] **Step 3: Contour des flèches**

Dans `apps/web/components/direct/CalqueCurseurs.tsx`, ajouter `import { couleur } from "@/lib/charte";` et remplacer `stroke="#f3efe7"` par `stroke={couleur("fond")}` (un contour nuit détache les flèches claires du fond).

Run: `./docs/superpowers/plans/charte/court.sh pnpm --filter web exec vitest run components/direct --reporter=dot`, puis : `./docs/superpowers/plans/charte/court.sh bash -c 'pnpm build && pnpm --filter realtime build && pnpm --filter web verifier-taille-direct && pnpm --filter web exec playwright test e2e/direct.spec.ts --reporter=line'` (le service est reconstruit : les e2e lancent sa version compilée)
Expected: PASS ; budget du JS de présence respecté.

- [ ] **Step 4: Commiter**

```bash
git add apps/realtime/src/couleurs.ts
git add apps/realtime/src/couleurs.test.ts
git add apps/web/components/direct/CalqueCurseurs.tsx
git commit -m "Temps réel : curseurs aux couleurs de la charte, lisibles sur la nuit"
```
