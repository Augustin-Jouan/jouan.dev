# Tâche 09 — Commandes ludiques et README

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **high**.
> Commandes depuis la racine du dépôt. Termine par le compte rendu de `contexte.md`.

Spec : section 5.2 (« Commandes ludiques ») et 8 (« Documentation »).

**Files:**
- Modify: `apps/web/components/accueil/IntroEncre.tsx`, `apps/web/components/accueil/IntroEncre.test.tsx`
- Modify: `apps/web/components/direct/CompteurPresents.tsx`, `apps/web/components/direct/PresenceDirecte.tsx`, `apps/web/components/direct/PresenceDirecte.test.tsx`
- Modify: `apps/web/components/coulisses/ArchitectureVivante.tsx`, `apps/web/components/coulisses/ArchitectureVivante3d.test.tsx`
- Modify: `apps/web/e2e/intro.spec.ts`, `apps/web/e2e/coulisses-3d.spec.ts`, `apps/web/e2e/commandes.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `EVENEMENT_REJOUER_INTRO`, `EVENEMENT_BASCULER_CURSEUR` (tâche 05) ; la palette lit `data-presence` sur le bouton du curseur et `data-mode` sur le fond de l'accueil (`lib/commandes/contexte.ts`, tâche 05).

Points d'attention :
- **Rejouer l'intro** : `moteur.arreter()` libère le contexte WebGL de son canvas. L'intro rejouée a donc besoin d'un canvas neuf : `key={tour}`. Le retour en haut (`scrollTo`) émet un `scroll` qui sauterait l'intro : elle ne repart qu'à l'image suivante (`requestAnimationFrame`).
- **Curseur** : l'écouteur est un `useEffect` **sans tableau de dépendances**, réinscrit à chaque rendu pour voir l'état courant. Ne pas « corriger » en ajoutant `[]`.
- **3D par l'adresse** : `react-hooks/set-state-in-effect` refuse l'appel de `basculer3d()` dans l'effet ; la ligne `eslint-disable-next-line` commentée de la fiche est voulue (même cas que l'intro : l'adresse et WebGL ne se lisent qu'au navigateur).

- [ ] **Step 1: Tests (échouent)**

À la fin de `apps/web/components/accueil/IntroEncre.test.tsx`, **avant** la dernière ligne `});` (fin du `describe`), ajouter :

```tsx
  it("« Rejouer l'intro » : retour en haut, puis l'intro repart sur un canvas neuf", async () => {
    navigateur();
    const defilerVers = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { container } = render(<IntroEncre />);
    await waitFor(() => expect(creerMoteur).toHaveBeenCalledTimes(1));
    act(() => options().surFinIntro?.());
    const ancien = container.querySelector("canvas");

    act(() => void window.dispatchEvent(new Event(EVENEMENT_REJOUER_INTRO)));
    expect(defilerVers).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
    await waitFor(() => expect(creerMoteur).toHaveBeenCalledTimes(2));
    expect(moteur.arreter).toHaveBeenCalled();
    expect(creerMoteur.mock.calls[1][0]).toMatchObject({ intro: true });
    expect(container.querySelector("canvas")).not.toBe(ancien);
    expect(fond(container)).toHaveAttribute("data-mode", "intro");
    expect(fond(container)).not.toHaveAttribute("data-intro");
  });

  it("ne rejoue rien avec le mouvement réduit", async () => {
    navigateur({ mouvementReduit: true });
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { container } = render(<IntroEncre />);
    await act(async () => {});
    await act(async () => {
      window.dispatchEvent(new Event(EVENEMENT_REJOUER_INTRO));
      await new Promise((fin) => requestAnimationFrame(() => fin(undefined)));
    });
    expect(fond(container)).toHaveAttribute("data-mode", "halo-css");
    expect(creerMoteur).not.toHaveBeenCalled();
  });
```

et, en tête du même fichier, après `import type { OptionsMoteur } from "@/lib/encre/moteur";`, ajouter :

```tsx
import { EVENEMENT_REJOUER_INTRO } from "@/lib/commandes/evenements";
```

Dans `apps/web/components/direct/PresenceDirecte.test.tsx`, juste **avant** la ligne `    it("partage actif : la souris dans une section envoie une position", async () => {`, ajouter :

```tsx
    it("la commande de la palette bascule le curseur, comme le bouton", async () => {
      rendre();
      await demarrer();
      recevoir(bienvenue(1));
      expect(screen.getByRole("button", { name: "Masquer mon curseur" })).toHaveAttribute("data-presence", "connectee");
      act(() => void window.dispatchEvent(new Event(EVENEMENT_BASCULER_CURSEUR)));
      expect(fausse.envoyer).toHaveBeenCalledWith({ type: "masque" });
      expect(window.localStorage.getItem("direct:partage")).toBe("non");
      expect(screen.getByRole("button", { name: "Montrer mon curseur" })).toHaveAttribute("data-presence", "masquee");
    });
```

et, en tête du fichier, avant `import type { MessageServeur } from "@/lib/direct/protocole";`, ajouter :

```tsx
import { EVENEMENT_BASCULER_CURSEUR } from "@/lib/commandes/evenements";
```

À la fin de `apps/web/components/coulisses/ArchitectureVivante3d.test.tsx`, **avant** la dernière ligne `});`, ajouter :

```tsx
  it("avec ?vue=3d, la 3D s'ouvre d'elle-même", async () => {
    window.history.replaceState(null, "", "/coulisses?vue=3d");
    try {
      webgl(true);
      render(<ArchitectureVivante />);
      await waitFor(() => expect(scene.creerScene).toHaveBeenCalledTimes(1));
      expect(screen.getByRole("button", { name: "Revenir en 2D" })).toBeInTheDocument();
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });

  it("avec ?vue=3d mais sans WebGL, le schéma 2D reste", async () => {
    window.history.replaceState(null, "", "/coulisses?vue=3d");
    try {
      webgl(false);
      render(<ArchitectureVivante />);
      await act(async () => {});
      expect(scene.creerScene).not.toHaveBeenCalled();
      expect(screen.getAllByRole("group", { name: "Schéma de l'architecture" }).length).toBeGreaterThan(0);
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run components/accueil/IntroEncre.test.tsx components/direct/PresenceDirecte.test.tsx components/coulisses/ArchitectureVivante3d.test.tsx --reporter=dot`
Expected: FAIL (3 tests : rejouer l'intro, commande du curseur, `?vue=3d` avec WebGL ; « mouvement réduit » et « sans WebGL » passent déjà).

- [ ] **Step 2: Rejouer l'intro** — `apps/web/components/accueil/IntroEncre.tsx`

1. Après `import { siteName } from "@/data/site";`, ajouter :

```tsx
import { EVENEMENT_REJOUER_INTRO } from "@/lib/commandes/evenements";
```

2. Dans le commentaire du composant, après la ligne ` * - data-encre : actif (canvas affiché) | repli (WebGL a échoué)`, ajouter :

```tsx
 *
 * La commande « Rejouer l'intro » (palette, sous-projet 7) émet
 * `jouan:rejouer-intro` : retour en haut, puis l'intro repart sur un canvas neuf
 * (l'arrêt du moteur libère le contexte WebGL de l'ancien).
```

3. Après `  const [encre, setEncre] = useState<"actif" | "repli">();`, ajouter :

```tsx
  /** Numéro de l'intro jouée : change à chaque « Rejouer l'intro ». */
  const [tour, setTour] = useState(0);
```

4. Juste **avant** l'effet qui commence par `  useEffect(() => {` suivi de `    if (mode === "halo-css") return;`, ajouter :

```tsx
  useEffect(() => {
    let image = 0;
    const rejouer = () => {
      window.scrollTo({ top: 0, behavior: "instant" });
      // Le `scroll` de ce retour en haut part avant la prochaine image : l'intro
      // ne repart qu'après, sinon elle se sauterait elle-même.
      cancelAnimationFrame(image);
      image = requestAnimationFrame(() => {
        montageRef.current = performance.now();
        setIntro(undefined);
        setMode((actuel) => (actuel === "halo-css" ? actuel : "intro"));
        setTour((n) => n + 1);
      });
    };
    window.addEventListener(EVENEMENT_REJOUER_INTRO, rejouer);
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener(EVENEMENT_REJOUER_INTRO, rejouer);
    };
  }, []);
```

5. À la fin de ce même effet, remplacer `  }, [mode]);` par `  }, [mode, tour]);`.

6. Remplacer `{mode !== "halo-css" && <canvas ref={canvasRef} />}` par `{mode !== "halo-css" && <canvas key={tour} ref={canvasRef} />}`.

- [ ] **Step 3: Curseur**

`apps/web/components/direct/CompteurPresents.tsx` : dans le commentaire du composant, après la ligne ` * sur pointeur fin seulement : on peut refuser avant que quiconque arrive.`, ajouter :

```tsx
 * `data-presence` indique son état à la palette de commandes (lib/commandes/contexte.ts).
```

puis, sur le `<button>`, après la ligne `          onClick={basculerPartage}`, ajouter :

```tsx
          data-presence={partage ? "connectee" : "masquee"}
```

`apps/web/components/direct/PresenceDirecte.tsx` : avant `import { quandLibre } from "@/lib/quand-libre";`, ajouter :

```tsx
import { EVENEMENT_BASCULER_CURSEUR } from "@/lib/commandes/evenements";
```

puis, juste après la fonction `basculerPartage` (après son `};`), ajouter :

```tsx
  // Commande « Masquer / Montrer mon curseur » de la palette : même effet que le bouton.
  // Sans dépendances : réinscrit à chaque rendu, l'écouteur voit l'état courant.
  useEffect(() => {
    window.addEventListener(EVENEMENT_BASCULER_CURSEUR, basculerPartage);
    return () => window.removeEventListener(EVENEMENT_BASCULER_CURSEUR, basculerPartage);
  });
```

- [ ] **Step 4: La 3D par l'adresse** — `apps/web/components/coulisses/ArchitectureVivante.tsx`

Juste **avant** l'effet qui commence par `  useEffect(() => {` suivi de `    const url = process.env.NEXT_PUBLIC_DIRECT_URL;`, ajouter :

```tsx
  // `/coulisses?vue=3d` (commande « Voir l'architecture en 3D ») : la 3D s'ouvre
  // d'elle-même, une fois WebGL connu ; sans WebGL, le schéma 2D reste.
  const vueDemandee = useRef(false);
  useEffect(() => {
    if (!webgl || vueDemandee.current) return;
    vueDemandee.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'adresse et WebGL ne se lisent qu'au navigateur
    if (new URLSearchParams(window.location.search).get("vue") === "3d") basculer3d();
  });
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run components/accueil components/direct components/coulisses --reporter=dot`
Expected: PASS.

`./docs/superpowers/plans/easter-eggs/court.sh bash -c 'pnpm lint && pnpm typecheck'` — Expected: code de sortie 0.

- [ ] **Step 5: e2e**

Dans `apps/web/e2e/intro.spec.ts`, juste **avant** la ligne `// Revue finale, Important 1 : sur un téléphone lent, le moteur arrive plusieurs`, ajouter :

```ts
test("« Rejouer l'intro » depuis la palette, page défilée : l'intro repart du haut", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Raccourci clavier : ordinateur seulement.");
  await page.goto("/");
  const fond = page.locator(".fond-accueil");
  await expect(fond).toHaveAttribute("data-intro", "terminee", { timeout: 5000 });
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox").fill("rejouer");
  await page.keyboard.press("Enter");
  await expect(fond).toHaveAttribute("data-intro", "en-cours");
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(fond).toHaveAttribute("data-intro", "terminee", { timeout: 5000 });
});
```

À la fin de `apps/web/e2e/coulisses-3d.spec.ts`, ajouter :

```ts
test("/coulisses?vue=3d ouvre directement la vue 3D", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/coulisses?vue=3d");
  const webgl = await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2")));
  test.skip(!webgl, "WebGL indisponible dans ce navigateur de test.");
  await expect(page.getByTestId("scene-3d").locator("canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Revenir en 2D" })).toBeVisible();
  expect(erreurs).toEqual([]);
});
```

Dans `apps/web/e2e/commandes.spec.ts`, dans le `test.describe("ordinateur", …)`, juste **avant** `  test("palette ouverte : aucune violation WCAG A/AA", async ({ page }) => {`, ajouter :

```ts
  test("« Voir l'architecture en 3D » ouvre les coulisses en 3D", async ({ page }) => {
    await page.goto("/");
    const webgl = await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2")));
    test.skip(!webgl, "WebGL indisponible dans ce navigateur de test.");
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox").fill("3d");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/coulisses\?vue=3d$/);
    await expect(page.getByTestId("scene-3d").locator("canvas")).toBeVisible();
  });
```

```bash
./docs/superpowers/plans/easter-eggs/court.sh pnpm build
./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec playwright test e2e/intro.spec.ts e2e/coulisses-3d.spec.ts e2e/commandes.spec.ts e2e/direct.spec.ts --reporter=line
```

Expected: code de sortie 0. Les tests WebGL ne doivent **pas** être ignorés sur ordinateur (le navigateur des e2e a WebGL logiciel) : `grep -n "skipped\|ignor" <journal>` pour le vérifier.

- [ ] **Step 6: README**

Dans `README.md`, juste avant la ligne `## Déploiement`, ajouter :

```markdown
## Easter eggs

Pour les curieux (spec : `docs/superpowers/specs/2026-10-09-easter-eggs-design.md`) :

- `curl -L jouan.dev` : le CV en couleurs, en 80 colonnes. `proxy.ts` réécrit `/` vers `/cv.ansi`
  pour les clients en ligne de commande (`curl`, `Wget`, `HTTPie`, `xh`) ; `/cv.txt` donne le même
  CV sans couleur. Les couleurs sont les codes 256 couleurs les plus proches des rôles de la charte
  (`lib/cv/couleurs-terminal.ts`).
- `/api/me` : le même CV au format JSON Resume. Les trois routes sont pré-rendues au build, à
  partir des données du site (`lib/cv/modele.ts`, `data/competences.ts`).
- Cmd+K (Ctrl+K), ou « ⌘K pour naviguer » dans le pied de page : une palette de commandes chargée
  au premier appel (`components/commandes/`, 8 Ko au plus, `verifier-taille-commandes`). Pour
  ajouter une commande : une entrée dans `data/commandes.ts`.
- Indices : le pied de page, la console du navigateur et un commentaire en tête de la page.

Le raccourci et les indices ajoutent environ 1 Ko au JavaScript de chaque page : le budget des
scripts de l'accueil (`lighthouserc.json`) est passé de 160 à 165 Ko pour eux.
```

- [ ] **Step 7: Commiter**

```bash
git add apps/web/components/accueil/IntroEncre.tsx
git add apps/web/components/accueil/IntroEncre.test.tsx
git add apps/web/components/direct/CompteurPresents.tsx
git add apps/web/components/direct/PresenceDirecte.tsx
git add apps/web/components/direct/PresenceDirecte.test.tsx
git add apps/web/components/coulisses/ArchitectureVivante.tsx
git add apps/web/components/coulisses/ArchitectureVivante3d.test.tsx
git add apps/web/e2e/intro.spec.ts
git add apps/web/e2e/coulisses-3d.spec.ts
git add apps/web/e2e/commandes.spec.ts
git add README.md
git commit -m "Commandes ludiques : rejouer l'intro, montrer ou masquer son curseur, coulisses en 3D ; README"
```

Ne pas pousser. Le compte rendu suffit : la vérification complète, Lighthouse et les essais à la main sont pour Augustin (`verification-finale.md`).
