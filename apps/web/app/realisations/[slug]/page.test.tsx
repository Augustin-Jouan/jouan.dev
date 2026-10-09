import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cheminEtude, etudesDeCas } from "@/data/realisations";

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
vi.mock("next/navigation", () => ({ notFound }));

import EtudeDeCasPage, { generateStaticParams } from "./page";

describe("page d'étude de cas", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    notFound.mockClear();
  });

  it("génère les deux slugs", () => {
    expect(generateStaticParams()).toEqual(etudesDeCas.map((e) => ({ slug: e.slug })));
  });

  for (const etude of etudesDeCas) {
    it(`rend l'étude ${etude.slug}`, async () => {
      render(await EtudeDeCasPage({ params: Promise.resolve({ slug: etude.slug }) }));
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(etude.titre);
      for (const chiffre of etude.chiffres) {
        expect(screen.getByText(chiffre.libelle)).toBeInTheDocument();
      }
      const titres = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
      expect(titres).toEqual([
        "Le besoin",
        etude.media.type === "demo" ? "La démo" : "Le résultat",
        "Ce que j'ai livré",
        "Sous le capot",
      ]);
      const autre = etudesDeCas.find((e) => e.slug !== etude.slug)!;
      expect(screen.getByRole("link", { name: `Voir aussi : ${autre.titre}` })).toHaveAttribute(
        "href",
        cheminEtude(autre.slug),
      );
      expect(screen.getByRole("link", { name: "Parlons-en" })).toHaveAttribute("href", "/#contact");
    });
  }

  it("appelle notFound pour un slug inconnu", async () => {
    await expect(EtudeDeCasPage({ params: Promise.resolve({ slug: "inconnu" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFound).toHaveBeenCalled();
  });
});
