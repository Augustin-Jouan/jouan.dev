import { describe, expect, it } from "vitest";
import type { Commande, ContexteCommandes } from "./types";
import { commandesVisibles } from "./visibles";

const lien = { type: "lien", href: "/" } as const;
const liste: Commande[] = [
  { id: "accueil", libelle: "Accueil", groupe: "Navigation", motsCles: [], action: lien },
  { id: "intro", libelle: "Rejouer l'intro", groupe: "Pour le plaisir", motsCles: [], action: lien, condition: "intro" },
];
const ids = (contexte: Partial<ContexteCommandes>) =>
  commandesVisibles(liste, { chemin: "/", introDisponible: false, ...contexte }).map((c) => c.libelle);

describe("commandesVisibles", () => {
  it("propose l'intro sur l'accueil, personnalisé compris, quand elle peut se jouer", () => {
    expect(ids({ introDisponible: true })).toEqual(["Accueil", "Rejouer l'intro"]);
    expect(ids({ chemin: "/pour/boulangerie-martin-k7f3", introDisponible: true })).toContain("Rejouer l'intro");
    expect(ids({ introDisponible: false })).not.toContain("Rejouer l'intro");
    expect(ids({ chemin: "/contact", introDisponible: true })).not.toContain("Rejouer l'intro");
  });
});
