# Tâche 04 — Intro « goutte de lumière »

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **medium**.
> Commandes depuis la racine du worktree. Termine par le compte rendu de `contexte.md`.

**Files:**
- Modify: `apps/web/lib/encre/chronologie.ts` (couleurs, commentaires, `etatEncre`, `etatHalo`), `apps/web/lib/encre/moteur.ts` (import et ligne `gl.uniform3fv(uniformes.couleurClaire, …)`)
- Modify: `apps/web/app/globals.css` (`.halo-css`, `.fond-accueil__nom`)
- Test: `apps/web/lib/encre/chronologie.test.ts`, `apps/web/e2e/replis.spec.ts`, `apps/web/e2e/intro.spec.ts`

**Interfaces:**
- Consumes: `couleur(role)` (tâche 2) ; variables `--color-lueur`, `--color-lueur-chaude`, `--color-sur-accent` (tâche 3).
- Produces: `GOUTTE`, `LUEUR`, `LUEUR_CHAUDE: Rvb` (remplacent `ENCRE`, `BRAISE`, `BRAISE_CLAIRE`, supprimés).

- [ ] **Step 1: Tests unitaires (échouent)**

Dans `apps/web/lib/encre/chronologie.test.ts` :
- dans l'import de `./chronologie`, remplacer `BRAISE,` par `LUEUR,` et `ENCRE,` par `GOUTTE,`, et ajouter `LUEUR_CHAUDE,` (ordre alphabétique : `GOUTTE`, `HALO`, `HAUTEUR_MAX`, `LUEUR`, `LUEUR_CHAUDE`) ;
- `expect(etat.couleur).toEqual(ENCRE);` → `expect(etat.couleur).toEqual(GOUTTE);` ;
- `expect(fin.couleur).toEqual(BRAISE);` → `expect(fin.couleur).toEqual(LUEUR);` ;
- ajouter à la fin du fichier (`COUVERTURE` et `REPOS` sont déjà définis en tête du fichier) :

```ts
describe("couleurs de l'intro", () => {
  const rvb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

  it("part d'une goutte pêche et finit en halo corail, bordé de rose", () => {
    expect(GOUTTE).toEqual(rvb("#eab595"));
    expect(LUEUR).toEqual(rvb("#d87f81"));
    expect(LUEUR_CHAUDE).toEqual(rvb("#ae6378"));
  });

  it("passe de la goutte au halo pendant le resserrement", () => {
    // 1150 ms : entre la fin du nom (800 ms) et la fin de l'intro (1500 ms).
    const milieu = etatEncre(1150, COUVERTURE, REPOS);
    for (let i = 0; i < 3; i++) {
      const [bas, haut] = [GOUTTE[i]!, LUEUR[i]!].sort((x, y) => x - y);
      expect(milieu.couleur[i]).toBeGreaterThanOrEqual(bas!);
      expect(milieu.couleur[i]).toBeLessThanOrEqual(haut!);
    }
    expect(milieu.melange).toBeGreaterThan(0);
    expect(milieu.melange).toBeLessThan(1);
  });
});
```

Run: `./docs/superpowers/plans/charte/court.sh pnpm --filter web exec vitest run lib/encre/chronologie.test.ts --reporter=dot`
Expected: FAIL — `GOUTTE`, `LUEUR`, `LUEUR_CHAUDE` non exportés.

- [ ] **Step 2: `chronologie.ts` et `moteur.ts`**

Dans `apps/web/lib/encre/chronologie.ts`, ajouter après le commentaire d'en-tête `import { couleur } from "../charte";`, puis remplacer :

```ts
const rvb = (hex: number): Rvb => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

/** Mêmes valeurs que les jetons de app/globals.css. */
export const ENCRE = rvb(0x1b1a17);
export const BRAISE = rvb(0xe0582b);
export const BRAISE_CLAIRE = rvb(0xef9c62);
```

par :

```ts
const rvb = (hex: string): Rvb => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** Goutte pêche, puis halo corail bordé de rose : rôles de lib/charte.ts. */
export const GOUTTE = rvb(couleur("goutte"));
export const LUEUR = rvb(couleur("lueur"));
export const LUEUR_CHAUDE = rvb(couleur("lueur-chaude"));
```

Puis dans le reste du fichier : chaque `ENCRE` → `GOUTTE` et chaque `BRAISE` → `LUEUR` (deux `couleur: ENCRE` et la ligne `couleur: [mix(ENCRE[0], BRAISE[0], k), …]` dans `etatEncre` ; `couleur: BRAISE` dans `etatHalo`) ; le commentaire `/** 0 : encre unie ; 1 : dégradé braise du halo. */` → `/** 0 : goutte unie ; 1 : dégradé du halo. */` ; dans le commentaire d'en-tête, « goutte d'encre » → « goutte de lumière ».

Dans `apps/web/lib/encre/moteur.ts` : dans l'import de `./chronologie`, `BRAISE_CLAIRE,` → `LUEUR_CHAUDE,` ; `gl.uniform3fv(uniformes.couleurClaire, BRAISE_CLAIRE);` → `gl.uniform3fv(uniformes.couleurClaire, LUEUR_CHAUDE);`.

- [ ] **Step 3: Halo de repli et nom (CSS)**

Dans `apps/web/app/globals.css` :
- dans `.halo-css`, `var(--color-braise) 0%,` → `var(--color-lueur) 0%,` et `var(--color-braise-claire) 40%,` → `var(--color-lueur-chaude) 40%,` ;
- dans `.fond-accueil__nom`, `color: var(--color-papier);` → `color: var(--color-sur-accent);` (le nom se lit en nuit sur la goutte pêche).

- [ ] **Step 4: Tests e2e des couleurs calculées**

Le halo CSS est toujours présent (`HaloCss`) ; le nom n'existe que pendant l'intro (`data-mode="intro"`).

Dans `apps/web/e2e/replis.spec.ts`, dans le `test.describe("mouvement réduit", …)`, ajouter :

```ts
  test("halo CSS aux couleurs de la charte (corail bordé de rose)", async ({ page }) => {
    await page.goto("/");
    const halo = await page.locator(".halo-css").evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(halo).toContain("rgb(216, 127, 129)"); // lueur (corail)
    expect(halo).toContain("rgb(174, 99, 120)"); // lueur chaude (rose)
  });
```

Dans `apps/web/e2e/intro.spec.ts` (GPU simulé par le `beforeEach` du fichier), ajouter :

```ts
test("pendant l'intro, le nom se lit en nuit sur la goutte pêche", async ({ page }) => {
  await page.goto("/");
  const nom = page.locator(".fond-accueil__nom");
  await expect(nom).toBeAttached();
  expect(await nom.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(42, 33, 39)"); // sur-accent (nuit)
});
```

- [ ] **Step 5: Vérifier**

Run:

```bash
grep -rn "ENCRE\b\|BRAISE" apps/web/lib apps/web/components
./docs/superpowers/plans/charte/court.sh bash -c 'pnpm --filter web exec vitest run lib/encre --reporter=dot && pnpm typecheck'
```

Expected: aucune occurrence ; tests PASS ; typecheck OK. Puis :

```bash
./docs/superpowers/plans/charte/court.sh bash -c 'pnpm build && pnpm --filter web verifier-taille-encre'
./docs/superpowers/plans/charte/court.sh pnpm --filter web exec playwright test e2e/replis.spec.ts e2e/intro.spec.ts --reporter=line
```

Expected: budget de l'intro respecté ; e2e PASS.

- [ ] **Step 6: Commiter**

```bash
git add apps/web/lib/encre/chronologie.ts
git add apps/web/lib/encre/chronologie.test.ts
git add apps/web/lib/encre/moteur.ts
git add apps/web/app/globals.css
git add apps/web/e2e/replis.spec.ts
git add apps/web/e2e/intro.spec.ts
git commit -m "Intro : goutte de lumière pêche, halo corail bordé de rose"
```
