# Tâche 06 — La palette de commandes

> Suite de la tâche 05, même conversation (niveau **medium**). Termine par **un** compte rendu pour les tâches 05 et 06.

Spec : sections 5.1 (`PaletteCommandes.tsx`) et 5.3 (« Comportement »).

**Écart à la spec, décidé :** la zone `aria-live` des messages de copie vit dans la palette (hors du `<dialog>`, donc lisible une fois la palette fermée), pas dans le raccourci : le code chargé d'office reste minimal. Elle est montée dès l'ouverture, donc avant tout message, ce qui suffit pour qu'il soit annoncé. Le message s'affiche aussi à l'écran (bulle en bas de page, 4 s).

**Files:**
- Create: `apps/web/lib/commandes/executer.ts`, `apps/web/lib/commandes/executer.test.ts`
- Create: `apps/web/components/commandes/PaletteCommandes.tsx`, `apps/web/components/commandes/PaletteCommandes.test.tsx`

**Interfaces:**
- Consumes: tout `lib/commandes/` (tâche 05) ; `commandes` (`data/commandes.ts`, dans le test seulement).
- Produces: `executerAction(action, { naviguer, annoncer })` (`executer.ts`) ; `PaletteCommandes`, `ProprietesPalette = { commandes, ouverte, fermer }`, `MARQUEUR_PALETTE = "palette-commandes:v1"` (`PaletteCommandes.tsx`).

Points d'attention :
- La palette est **montée à neuf à chaque ouverture** (le raccourci lui donne une `key` par ouverture, tâche 07) : `useState(lireContexte)` relit la page, la saisie repart vide. Ne pas ajouter d'effet qui remet l'état à zéro : la règle `react-hooks/set-state-in-effect` le refuserait.
- Elle **n'importe rien de `data/`** (voir `contexte.md`, code chargé à la demande).
- Le marqueur est posé en attribut (`data-marqueur`) : une constante inutilisée disparaîtrait à la minification et `verifier-taille-commandes` ne trouverait plus le morceau.
- Fond assombri par un filtre (`backdrop:backdrop-brightness-50`) : une couleur avec opacité est interdite par la charte.

- [ ] **Step 1: Exécution des actions (test d'abord)**

`apps/web/lib/commandes/executer.test.ts` :

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { executerAction } from "./executer";

const outils = () => ({ naviguer: vi.fn(), annoncer: vi.fn() });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.location.hash = "";
});

describe("executerAction", () => {
  it("navigue par le routeur vers une page interne", async () => {
    const o = outils();
    await executerAction({ type: "lien", href: "/contact" }, o);
    expect(o.naviguer).toHaveBeenCalledWith("/contact");
  });

  it("ouvre un nouvel onglet sans lien vers la page", async () => {
    const ouvrir = vi.spyOn(window, "open").mockReturnValue(null);
    const o = outils();
    await executerAction({ type: "lien", href: "https://github.com/Augustin-Jouan", nouvelOnglet: true }, o);
    expect(ouvrir).toHaveBeenCalledWith("https://github.com/Augustin-Jouan", "_blank", "noopener");
    expect(o.naviguer).not.toHaveBeenCalled();
  });

  it("sur l'accueil, ne change que le hash d'une ancre (lien personnalisé gardé)", async () => {
    const o = outils();
    await executerAction({ type: "lien", href: "/#offre" }, o);
    expect(window.location.hash).toBe("#offre");
    expect(o.naviguer).not.toHaveBeenCalled();
  });

  it("copie le texte et l'annonce", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const o = outils();
    await executerAction({ type: "copier", texte: "contact@jouan.dev", confirmation: "E-mail copié" }, o);
    expect(writeText).toHaveBeenCalledWith("contact@jouan.dev");
    expect(o.annoncer).toHaveBeenCalledWith("E-mail copié");
  });

  it("si la copie échoue, annonce le texte à copier", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("refusé")) } });
    const o = outils();
    await executerAction({ type: "copier", texte: "curl -L jouan.dev", confirmation: "Commande copiée" }, o);
    expect(o.annoncer).toHaveBeenCalledWith("Copie impossible. À copier : curl -L jouan.dev");
  });

  it("émet l'événement sur window", async () => {
    const recu = vi.fn();
    window.addEventListener("jouan:essai", recu);
    await executerAction({ type: "evenement", nom: "jouan:essai" }, outils());
    window.removeEventListener("jouan:essai", recu);
    expect(recu).toHaveBeenCalledTimes(1);
  });
});
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run lib/commandes/executer.test.ts --reporter=dot`
Expected: FAIL — `./executer` introuvable.

`apps/web/lib/commandes/executer.ts` :

```ts
import type { ActionCommande } from "./types";

export type OutilsExecution = {
  /** Navigation interne par le routeur Next. */
  naviguer: (href: string) => void;
  /** Message pour la zone `aria-live` (copie réussie, ou texte à copier). */
  annoncer: (message: string) => void;
};

/** Exécute l'action d'une commande, une fois la palette fermée. */
export async function executerAction(action: ActionCommande, outils: OutilsExecution): Promise<void> {
  switch (action.type) {
    case "lien": {
      if (action.nouvelOnglet) {
        window.open(action.href, "_blank", "noopener");
        return;
      }
      // Ancre de l'accueil, depuis l'accueil : on ne change que le hash, comme
      // LienSection, pour garder un lien personnalisé (`/?pour=…`).
      if (action.href.startsWith("/#") && window.location.pathname === "/") {
        const ancre = action.href.slice(1);
        if (window.location.hash === ancre) document.getElementById(ancre.slice(1))?.scrollIntoView();
        else window.location.hash = ancre;
        return;
      }
      outils.naviguer(action.href);
      return;
    }
    case "copier":
      try {
        await navigator.clipboard.writeText(action.texte);
        outils.annoncer(action.confirmation);
      } catch {
        outils.annoncer(`Copie impossible. À copier : ${action.texte}`);
      }
      return;
    case "evenement":
      window.dispatchEvent(new Event(action.nom));
  }
}
```

Run : la même commande. Expected: PASS (6 tests).

- [ ] **Step 2: Test de la palette (échoue)**

`apps/web/components/commandes/PaletteCommandes.test.tsx` :

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { commandes } from "@/data/commandes";
import { contact } from "@/data/contact";
import { EVENEMENT_REJOUER_INTRO } from "@/lib/commandes/evenements";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { MARQUEUR_PALETTE, PaletteCommandes } from "./PaletteCommandes";

// jsdom n'implémente ni showModal ni close : un dialogue ouvert porte `open`, la fermeture émet `close`.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

const fermer = vi.fn();
beforeEach(() => {
  push.mockReset();
  fermer.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

const ouvrir = () => render(<PaletteCommandes commandes={commandes} ouverte fermer={fermer} />);
const champ = () => screen.getByRole("combobox");
const taper = (texte: string) => fireEvent.change(champ(), { target: { value: texte } });
const touche = (key: string) => fireEvent.keyDown(champ(), { key });
const choisie = () => screen.getAllByRole("option").find((o) => o.getAttribute("aria-selected") === "true");

describe("PaletteCommandes", () => {
  it("s'ouvre en modale étiquetée, champ en combobox relié à la liste", () => {
    ouvrir();
    const dialogue = screen.getByRole("dialog", { name: "Commandes" });
    expect(dialogue).toHaveAttribute("open");
    expect(dialogue).toHaveAttribute("data-marqueur", MARQUEUR_PALETTE);
    const liste = screen.getByRole("listbox", { name: "Commandes" });
    expect(champ()).toHaveAttribute("aria-expanded", "true");
    expect(champ()).toHaveAttribute("aria-controls", liste.id);
    expect(champ()).toHaveAttribute("aria-activedescendant", choisie()!.id);
    expect(choisie()).toHaveTextContent("Accueil");
    expect(screen.getByRole("group", { name: "Navigation" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Actions" })).toBeInTheDocument();
  });

  it("flèches qui bouclent, Début et Fin", () => {
    ouvrir();
    const options = screen.getAllByRole("option");
    touche("ArrowUp");
    expect(choisie()).toBe(options.at(-1));
    touche("ArrowDown");
    expect(choisie()).toBe(options[0]);
    touche("ArrowDown");
    expect(choisie()).toBe(options[1]);
    touche("End");
    expect(choisie()).toBe(options.at(-1));
    touche("Home");
    expect(choisie()).toBe(options[0]);
  });

  it("filtre sans accents, remet la sélection sur le premier résultat", () => {
    ouvrir();
    touche("ArrowDown");
    taper("etude artisan");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Étude de cas · Site vitrine d'artisan"]);
    expect(choisie()).toHaveTextContent("Étude de cas · Site vitrine d'artisan");
  });

  it("sans résultat, le dit et retire la liste", () => {
    ouvrir();
    taper("zzz");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(champ()).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(/^Aucune commande pour/).textContent).toBe("Aucune commande pour «\u00a0zzz\u00a0»");
  });

  it("Entrée sur un lien : ferme la palette puis navigue par le routeur", () => {
    ouvrir();
    taper("contact");
    expect(choisie()).toHaveTextContent(/^Contact$/);
    touche("Enter");
    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
    expect(fermer).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/contact");
  });

  it("Entrée sur une copie : copie et l'annonce", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    ouvrir();
    taper("copier e-mail");
    await act(async () => touche("Enter"));
    expect(writeText).toHaveBeenCalledWith(contact.email);
    expect(screen.getByRole("status")).toHaveTextContent("E-mail copié");
  });

  it("si la copie échoue, le message donne le texte à copier", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("refusé")) } });
    ouvrir();
    taper("copier e-mail");
    await act(async () => touche("Enter"));
    expect(screen.getByRole("status")).toHaveTextContent(`Copie impossible. À copier : ${contact.email}`);
  });

  it("un clic sur une option l'exécute", () => {
    ouvrir();
    fireEvent.click(screen.getByRole("option", { name: "Coulisses" }));
    expect(push).toHaveBeenCalledWith("/coulisses");
  });

  it("n'affiche les commandes ludiques que dans leur contexte", () => {
    ouvrir();
    expect(screen.queryByRole("option", { name: "Rejouer l'intro" })).toBeNull();
    expect(screen.queryByRole("option", { name: /mon curseur/ })).toBeNull();
    expect(screen.getByRole("option", { name: "Voir l'architecture en 3D" })).toBeInTheDocument();
  });

  it("propose l'intro et le curseur sur l'accueil quand ils sont là, et émet leur événement", () => {
    document.body.innerHTML = '<div class="fond-accueil" data-mode="halo-anime"></div><button data-presence="masquee"></button>';
    const recu = vi.fn();
    window.addEventListener(EVENEMENT_REJOUER_INTRO, recu);
    ouvrir();
    expect(screen.getByRole("option", { name: "Montrer mon curseur" })).toBeInTheDocument();
    taper("rejouer");
    touche("Enter");
    window.removeEventListener(EVENEMENT_REJOUER_INTRO, recu);
    expect(recu).toHaveBeenCalledTimes(1);
  });

  it("se ferme quand on la referme, ou d'un clic sur le fond", () => {
    const { rerender } = ouvrir();
    const dialogue = screen.getByRole("dialog");
    rerender(<PaletteCommandes commandes={commandes} ouverte={false} fermer={fermer} />);
    expect(dialogue).not.toHaveAttribute("open");

    rerender(<PaletteCommandes commandes={commandes} ouverte fermer={fermer} />);
    expect(dialogue).toHaveAttribute("open");
    fireEvent.click(dialogue);
    expect(dialogue).not.toHaveAttribute("open");
    expect(fermer).toHaveBeenCalledTimes(2);
  });
});
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run components/commandes --reporter=dot`
Expected: FAIL — `./PaletteCommandes` introuvable.

- [ ] **Step 3: La palette**

`apps/web/components/commandes/PaletteCommandes.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { lireContexte } from "@/lib/commandes/contexte";
import { executerAction } from "@/lib/commandes/executer";
import { filtrerCommandes } from "@/lib/commandes/filtre";
import type { Commande } from "@/lib/commandes/types";
import { commandesVisibles } from "@/lib/commandes/visibles";

/** Repère ce morceau de JS dans le build (scripts/verifier-taille-commandes.mjs). */
export const MARQUEUR_PALETTE = "palette-commandes:v1";

export type ProprietesPalette = {
  commandes: Commande[];
  ouverte: boolean;
  fermer: () => void;
};

/** Durée d'affichage du message de copie. */
const DUREE_MESSAGE_MS = 4000;

/**
 * Palette de commandes (Cmd+K), chargée à la demande par RaccourciCommandes et
 * montée à neuf à chaque ouverture : saisie vide, contexte de la page relu.
 * `<dialog>` modal natif (focus piégé, Échap, focus rendu à la fermeture) ;
 * champ en combobox ARIA, le focus y reste et `aria-activedescendant` désigne
 * l'option choisie. Le message de copie vit hors du dialogue : il reste lisible
 * une fois la palette fermée.
 */
export function PaletteCommandes({ commandes, ouverte, fermer }: ProprietesPalette) {
  const router = useRouter();
  const dialogue = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [contexte] = useState(lireContexte);
  const [saisie, setSaisie] = useState("");
  const [indice, setIndice] = useState(0);
  const [message, setMessage] = useState("");

  const groupes = useMemo(() => {
    const trouvees = filtrerCommandes(commandesVisibles(commandes, contexte), saisie);
    // Les groupes dans l'ordre de leur meilleur résultat ; dans un groupe, l'ordre du filtre.
    return [...new Set(trouvees.map((c) => c.groupe))].map((groupe) => ({
      groupe,
      commandes: trouvees.filter((c) => c.groupe === groupe),
    }));
  }, [commandes, contexte, saisie]);
  const affichees = groupes.flatMap((g) => g.commandes);
  const actif = affichees.length > 0 ? affichees[Math.min(indice, affichees.length - 1)] : undefined;
  const idOption = (commande: Commande) => `${id}-${commande.id}`;
  const idListe = `${id}-liste`;
  const idActif = actif ? idOption(actif) : undefined;

  useEffect(() => {
    const d = dialogue.current;
    if (!d) return;
    if (ouverte && !d.open) d.showModal();
    else if (!ouverte && d.open) d.close();
  }, [ouverte]);

  useEffect(() => {
    if (idActif) document.getElementById(idActif)?.scrollIntoView?.({ block: "nearest" });
  }, [idActif]);

  useEffect(() => {
    if (!message) return;
    const minuterie = window.setTimeout(() => setMessage(""), DUREE_MESSAGE_MS);
    return () => window.clearTimeout(minuterie);
  }, [message]);

  const executer = (commande: Commande) => {
    // La palette se ferme (le focus revient où il était), puis l'action s'exécute.
    dialogue.current?.close();
    void executerAction(commande.action, { naviguer: (href) => router.push(href), annoncer: setMessage });
  };

  const surTouche = (e: KeyboardEvent<HTMLInputElement>) => {
    const nombre = affichees.length;
    const courant = Math.min(indice, nombre - 1);
    const aller = (vers: number) => {
      e.preventDefault();
      setIndice(vers);
    };
    if (e.key === "ArrowDown" && nombre > 0) aller((courant + 1) % nombre);
    else if (e.key === "ArrowUp" && nombre > 0) aller((courant - 1 + nombre) % nombre);
    else if (e.key === "Home" && nombre > 0) aller(0);
    else if (e.key === "End" && nombre > 0) aller(nombre - 1);
    else if (e.key === "Enter" && actif) {
      e.preventDefault();
      executer(actif);
    }
  };

  return (
    <>
      <dialog
        ref={dialogue}
        aria-label="Commandes"
        data-marqueur={MARQUEUR_PALETTE}
        onClose={fermer}
        // Un clic sur le fond atteint le dialogue lui-même, hors de son contenu.
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="mx-auto mt-[12vh] w-[calc(100%-2.5rem)] max-w-xl overflow-hidden rounded-2xl border border-trait-fort bg-surface p-0 text-texte backdrop:backdrop-brightness-50 motion-safe:transition-opacity motion-safe:duration-150 motion-safe:starting:open:opacity-0"
      >
        <input
          role="combobox"
          aria-expanded={affichees.length > 0}
          aria-controls={affichees.length > 0 ? idListe : undefined}
          aria-activedescendant={idActif}
          aria-autocomplete="list"
          aria-label="Rechercher une page ou une action"
          placeholder="Rechercher une page ou une action…"
          autoComplete="off"
          spellCheck={false}
          value={saisie}
          onChange={(e) => {
            setSaisie(e.target.value);
            setIndice(0);
          }}
          onKeyDown={surTouche}
          className="w-full border-b border-trait bg-surface px-5 py-4 text-base placeholder:text-texte-doux"
        />
        {affichees.length > 0 ? (
          <div id={idListe} role="listbox" aria-label="Commandes" className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
            {groupes.map(({ groupe, commandes: duGroupe }) => (
              <div key={groupe} role="group" aria-label={groupe} className="pb-1">
                <div aria-hidden="true" className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-texte-doux">
                  {groupe}
                </div>
                {duGroupe.map((commande) => (
                  <div
                    key={commande.id}
                    id={idOption(commande)}
                    role="option"
                    aria-selected={commande === actif}
                    onClick={() => executer(commande)}
                    onMouseMove={() => setIndice(affichees.indexOf(commande))}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm aria-selected:bg-accent aria-selected:text-sur-accent"
                  >
                    {commande.libelle}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-texte-doux">{`Aucune commande pour «\u00a0${saisie.trim()}\u00a0»`}</p>
        )}
      </dialog>
      <p
        role="status"
        className={
          message
            ? "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-trait-fort bg-surface px-4 py-2 text-sm text-texte"
            : "sr-only"
        }
      >
        {message}
      </p>
    </>
  );
}
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run lib/commandes/executer.test.ts components/commandes --reporter=dot`
Expected: PASS (2 fichiers, 17 tests).

Vérifier les insécables (`\u00a0` du message « Aucune commande ») : `grep -cP "[\x{00a0}\x{202f}]" apps/web/components/commandes/PaletteCommandes.tsx apps/web/components/commandes/PaletteCommandes.test.tsx` → `0` pour chacun.

- [ ] **Step 4: Lint, types, charte**

```bash
./docs/superpowers/plans/easter-eggs/court.sh bash -c 'pnpm lint && pnpm typecheck && pnpm --filter web exec vitest run lib/charte-classes.test.ts --reporter=dot'
```

Expected: code de sortie 0.

- [ ] **Step 5: Commiter**

```bash
git add apps/web/lib/commandes/executer.ts
git add apps/web/lib/commandes/executer.test.ts
git add apps/web/components/commandes/PaletteCommandes.tsx
git add apps/web/components/commandes/PaletteCommandes.test.tsx
git commit -m "Palette de commandes : dialogue modal, combobox ARIA, copie annoncée"
```
