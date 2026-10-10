import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { EVENEMENT_OUVRIR_COMMANDES } from "@/lib/commandes/evenements";
import type { Commande } from "@/lib/commandes/types";
import type { ProprietesPalette } from "./PaletteCommandes";

vi.mock("./PaletteCommandes", () => ({
  PaletteCommandes: ({ ouverte, fermer, commandes }: ProprietesPalette) => (
    <div data-testid="palette" data-ouverte={String(ouverte)} data-nombre={commandes.length}>
      <button onClick={fermer}>Fermer</button>
    </div>
  ),
}));

import { RaccourciCommandes } from "./RaccourciCommandes";

const commandes: Commande[] = [{ id: "accueil", libelle: "Accueil", groupe: "Navigation", motsCles: [], action: { type: "lien", href: "/" } }];
const rendre = () => render(<RaccourciCommandes commandes={commandes} />);
const touche = (init: KeyboardEventInit) => act(() => void fireEvent.keyDown(window, { key: "k", ...init }));
const palette = () => screen.findByTestId("palette");

describe("RaccourciCommandes", () => {
  it("n'importe statiquement ni la palette ni la liste des commandes", () => {
    // Sous jsdom, import.meta.url n'est pas une adresse file: ; Vitest tourne depuis apps/web.
    const source = readFileSync(join(process.cwd(), "components/commandes/RaccourciCommandes.tsx"), "utf8");
    expect(source).not.toMatch(/^import (?!type).*PaletteCommandes/m);
    expect(source).not.toMatch(/data\/commandes/);
  });

  it("rien avant le premier appel", () => {
    rendre();
    expect(screen.queryByTestId("palette")).toBeNull();
  });

  it("Ctrl+K ouvre la palette avec les commandes, un second Ctrl+K la ferme", async () => {
    rendre();
    await touche({ ctrlKey: true });
    expect(await palette()).toHaveAttribute("data-ouverte", "true");
    expect(await palette()).toHaveAttribute("data-nombre", "1");
    await touche({ ctrlKey: true });
    expect(await palette()).toHaveAttribute("data-ouverte", "false");
  });

  it("Cmd+K ouvre aussi ; K seul ou avec Maj ne fait rien", async () => {
    rendre();
    await touche({});
    await touche({ ctrlKey: true, shiftKey: true });
    expect(screen.queryByTestId("palette")).toBeNull();
    await touche({ metaKey: true });
    expect(await palette()).toHaveAttribute("data-ouverte", "true");
  });

  it("l'événement du pied de page l'ouvre ; la palette peut se fermer elle-même", async () => {
    rendre();
    await act(async () => void window.dispatchEvent(new Event(EVENEMENT_OUVRIR_COMMANDES)));
    expect(await palette()).toHaveAttribute("data-ouverte", "true");
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(await palette()).toHaveAttribute("data-ouverte", "false");
    await touche({ ctrlKey: true });
    expect(await palette()).toHaveAttribute("data-ouverte", "true");
  });
});
