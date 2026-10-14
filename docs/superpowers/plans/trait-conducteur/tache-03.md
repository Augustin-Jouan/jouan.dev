# Tâche 03 — Brancher le trait dans l'accueil

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **medium** (avec la tâche 02, même conversation).
> Commandes depuis la racine du dépôt. Termine par le compte rendu de `contexte.md`.

Spec : sections 3.2 (attributs `data-trait`), 4.2 (la Méthode) et 4.5 (démarrage et arrêt).

- `TraitConducteur` (client, rendu par l'accueil) charge le module de la tâche 02 **au premier défilement**, ou tout de suite si la page arrive déjà défilée. Jamais en mouvement réduit.
- Les liens des logos et le bouton d'envoi reçoivent leurs attributs `data-trait`.
- `FriseMethode` devient le repli : quand le trait a pris la main (`data-trait` sur la frise), ses propres déclenchements n'allument plus rien.

Prérequis : la tâche 02 est commitée (`apps/web/lib/trait/trait-conducteur.ts` existe).

**Files:**
- Create: `apps/web/components/accueil/TraitConducteur.tsx`, `apps/web/components/accueil/TraitConducteur.test.tsx`
- Modify: `apps/web/components/accueil/Accueil.tsx`, `apps/web/components/accueil/Parcours.tsx`, `apps/web/components/contact/ContactForm.tsx`
- Modify: `apps/web/components/accueil/FriseMethode.tsx`, `apps/web/components/accueil/FriseMethode.test.tsx`

**Interfaces:**
- Consumes : `demarrerTrait(): () => void` (`@/lib/trait/trait-conducteur`, importé dynamiquement) ; `quandLibre` (`@/lib/quand-libre`, existant).
- Produces : `TraitConducteur()` ; `data-trait="logo"` sur chaque lien à logo du parcours ; `data-trait="envoi"` sur le bouton d'envoi ; `FriseMethode` inerte quand la frise porte `data-trait`.

- [ ] **Step 1: Test du composant (échoue)**

`apps/web/components/accueil/TraitConducteur.test.tsx` :

```tsx
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const charge = vi.hoisted(() => ({ demarre: 0, arrete: 0 }));
vi.mock("@/lib/trait/trait-conducteur", () => ({
  demarrerTrait: () => {
    charge.demarre++;
    return () => {
      charge.arrete++;
    };
  },
}));

import { TraitConducteur } from "./TraitConducteur";

/** `matchMedia` factice ; `changer(true)` simule le passage au mouvement réduit pendant la visite. */
function medias(reduit: boolean) {
  const ecouteurs = new Set<() => void>();
  const requete = { matches: reduit, media: "(prefers-reduced-motion: reduce)" };
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return requete.matches;
    },
    media: requete.media,
    addEventListener: (_: string, f: () => void) => ecouteurs.add(f),
    removeEventListener: (_: string, f: () => void) => ecouteurs.delete(f),
  }));
  return {
    changer(valeur: boolean) {
      requete.matches = valeur;
      act(() => ecouteurs.forEach((f) => f()));
    },
  };
}

function defiler(y: number) {
  vi.stubGlobal("scrollY", y);
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

async function attendreTempsLibre() {
  await act(async () => {
    vi.advanceTimersByTime(1_500);
    await vi.dynamicImportSettled();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("scrollY", 0);
  charge.demarre = 0;
  charge.arrete = 0;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("TraitConducteur", () => {
  it("ne charge rien tant qu'on n'a pas défilé, démarre au premier défilement, et s'arrête au démontage", async () => {
    medias(false);
    const { container, unmount } = render(<TraitConducteur />);
    expect(container.innerHTML).toBe("");
    await attendreTempsLibre();
    expect(charge.demarre).toBe(0);
    defiler(40);
    await attendreTempsLibre();
    expect(charge.demarre).toBe(1);
    defiler(400);
    await attendreTempsLibre();
    expect(charge.demarre).toBe(1);
    unmount();
    expect(charge.arrete).toBe(1);
  });

  it("page déjà défilée à l'affichage (lien vers #contact, défilement restauré) : démarre sans attendre", async () => {
    medias(false);
    vi.stubGlobal("scrollY", 3_000);
    render(<TraitConducteur />);
    await attendreTempsLibre();
    expect(charge.demarre).toBe(1);
  });

  it("mouvement réduit : rien n'est chargé, même en défilant", async () => {
    medias(true);
    render(<TraitConducteur />);
    defiler(400);
    await attendreTempsLibre();
    expect(charge.demarre).toBe(0);
  });

  it("passage au mouvement réduit pendant la visite : le trait s'arrête", async () => {
    const { changer } = medias(false);
    render(<TraitConducteur />);
    defiler(40);
    await attendreTempsLibre();
    expect(charge.demarre).toBe(1);
    changer(true);
    expect(charge.arrete).toBe(1);
  });
});
```

Run: `./docs/superpowers/plans/trait-conducteur/court.sh pnpm --filter web exec vitest run components/accueil/TraitConducteur.test.tsx --reporter=dot`
Expected: FAIL — `Failed to resolve import "./TraitConducteur"`.

- [ ] **Step 2: Le composant**

`apps/web/components/accueil/TraitConducteur.tsx` :

```tsx
"use client";

import { useEffect } from "react";
import { quandLibre } from "@/lib/quand-libre";

/**
 * Le trait conducteur de l'accueil (lib/trait/trait-conducteur.ts). Il ne se dessine qu'une fois la page
 * défilée sous l'accroche : son morceau de JS n'est chargé qu'au premier défilement (ou dès l'affichage si
 * la page arrive déjà défilée), dans un temps libre. Le premier écran ne l'attend pas, et une visite sans
 * défilement ne le télécharge pas. Ni en mouvement réduit, ni sans JS : la page reste celle d'avant.
 * Ne rend rien.
 */
export function TraitConducteur() {
  useEffect(() => {
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduit.matches) return;
    let annule = false;
    let arreter: (() => void) | null = null;
    let annulerDemarrage = () => {};
    const demarrer = () => {
      window.removeEventListener("scroll", demarrer);
      annulerDemarrage = quandLibre(() => {
        import("@/lib/trait/trait-conducteur")
          .then((m) => {
            if (!annule && !reduit.matches) arreter = m.demarrerTrait();
          })
          .catch(() => {
            // Morceau introuvable (déploiement en cours) : pas de trait, la Méthode garde son repli.
          });
      });
    };
    const surChangement = () => {
      if (!reduit.matches) return;
      arreter?.();
      arreter = null;
    };
    reduit.addEventListener("change", surChangement);
    if (window.scrollY > 0) demarrer();
    else window.addEventListener("scroll", demarrer, { passive: true });
    return () => {
      annule = true;
      reduit.removeEventListener("change", surChangement);
      window.removeEventListener("scroll", demarrer);
      annulerDemarrage();
      arreter?.();
    };
  }, []);
  return null;
}
```

Run: `./docs/superpowers/plans/trait-conducteur/court.sh pnpm --filter web exec vitest run components/accueil/TraitConducteur.test.tsx --reporter=dot`
Expected: PASS — 4 tests.

- [ ] **Step 3: Le brancher dans l'accueil**

Dans `apps/web/components/accueil/Accueil.tsx`, remplacer :

```tsx
import { SignalVisite } from "./SignalVisite";
```

par :

```tsx
import { SignalVisite } from "./SignalVisite";
import { TraitConducteur } from "./TraitConducteur";
```

puis remplacer :

```tsx
      <SectionContact jeton={personnalisation?.jeton} />
```

par :

```tsx
      <SectionContact jeton={personnalisation?.jeton} />
      <TraitConducteur />
```

- [ ] **Step 4: Les attributs des points de passage**

Dans `apps/web/components/accueil/Parcours.tsx`, remplacer :

```tsx
              <a href={href} target="_blank" rel="noopener" className="group flex flex-col items-center gap-4">
```

par :

```tsx
              <a href={href} target="_blank" rel="noopener" data-trait="logo" className="group flex flex-col items-center gap-4">
```

Dans `apps/web/components/contact/ContactForm.tsx`, remplacer :

```tsx
      <button type="submit" disabled={pending} className="self-start rounded-full bg-accent px-6 py-3 text-sm font-medium text-sur-accent transition-opacity hover:opacity-85 disabled:opacity-60">
```

par :

```tsx
      <button type="submit" disabled={pending} data-trait="envoi" className="self-start rounded-full bg-accent px-6 py-3 text-sm font-medium text-sur-accent transition-opacity hover:opacity-85 disabled:opacity-60">
```

(Le formulaire sert aussi à la page `/contact`, sans trait : l'attribut y reste inerte.)

- [ ] **Step 5: La frise, repli du trait — test (échoue)**

Dans `apps/web/components/accueil/FriseMethode.test.tsx`, remplacer la première ligne :

```tsx
import { act, render } from "@testing-library/react";
```

par :

```tsx
import { act, cleanup, render } from "@testing-library/react";
```

puis remplacer :

```tsx
  it("frise déjà à l'écran au chargement (page rechargée plus bas) : laissée finie, sans clignotement", () => {
```

par :

```tsx
  it("trait conducteur aux commandes (`data-trait`) : ses déclenchements n'allument rien", () => {
    for (const ordinateur of [true, false]) {
      medias(ordinateur);
      const { frise, etapes } = rendre();
      frise.setAttribute("data-trait", "");
      const observateur = Observateur.dernier!;
      observateur.entrer(ordinateur ? frise : etapes[2]!);
      expect(allumees(etapes)).toEqual([false, false, false, false, false]);
      expect(frise).not.toHaveAttribute("data-complete");
      cleanup();
    }
  });

  it("frise déjà à l'écran au chargement (page rechargée plus bas) : laissée finie, sans clignotement", () => {
```

Run: `./docs/superpowers/plans/trait-conducteur/court.sh pnpm --filter web exec vitest run components/accueil/FriseMethode.test.tsx --reporter=dot`
Expected: FAIL — 1 test : `expected [ true, true, true, true, true ] to deeply equal [ false, false, false, false, false ]`.

- [ ] **Step 6: La frise, repli du trait — code**

Dans `apps/web/components/accueil/FriseMethode.tsx`, remplacer :

```tsx
 * reste finie. Une fois allumée, elle le reste.
 */
```

par :

```tsx
 * reste finie. Une fois allumée, elle le reste.
 *
 * C'est le repli du trait conducteur (lib/trait/trait-conducteur.ts) : quand il
 * pose `data-trait` sur la frise, il allume lui-même les étapes à son passage.
 */
```

puis remplacer :

```tsx
    const allumerJusqua = (rang: number) => {
      etapes.slice(0, rang + 1).forEach((etape) => etape.setAttribute("data-allumee", ""));
```

par :

```tsx
    const allumerJusqua = (rang: number) => {
      // Le trait conducteur (lib/trait) a pris la main : c'est lui qui allume.
      if (frise.hasAttribute("data-trait")) return;
      etapes.slice(0, rang + 1).forEach((etape) => etape.setAttribute("data-allumee", ""));
```

Run: `./docs/superpowers/plans/trait-conducteur/court.sh pnpm --filter web exec vitest run components/accueil --reporter=dot`
Expected: PASS (tous les tests de `components/accueil`, dont les 6 de `FriseMethode.test.tsx` et les 4 de `TraitConducteur.test.tsx`).

- [ ] **Step 7: Suite unitaire, lint et types**

Run: `./docs/superpowers/plans/trait-conducteur/court.sh bash -c 'pnpm test && pnpm lint && pnpm typecheck'`
Expected: `→ code de sortie 0`.

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/accueil/TraitConducteur.tsx apps/web/components/accueil/TraitConducteur.test.tsx apps/web/components/accueil/Accueil.tsx apps/web/components/accueil/Parcours.tsx apps/web/components/contact/ContactForm.tsx apps/web/components/accueil/FriseMethode.tsx apps/web/components/accueil/FriseMethode.test.tsx
git commit -m "Trait conducteur branché dans l'accueil : chargé au premier défilement ; logos et bouton d'envoi repérés ; la frise de la Méthode devient son repli"
```
