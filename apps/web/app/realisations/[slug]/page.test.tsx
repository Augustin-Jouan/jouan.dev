import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cheminEtude, etudesDeCas } from "@/data/realisations";

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
vi.mock("next/navigation", () => ({ notFound }));

import EtudeDeCasPage, { generateMetadata, generateStaticParams } from "./page";

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

  for (const etude of etudesDeCas) {
    it(`pose les métadonnées de partage propres à ${etude.slug}`, async () => {
      const meta = await generateMetadata({ params: Promise.resolve({ slug: etude.slug }) });
      expect(meta.openGraph).toMatchObject({
        type: "article",
        locale: "fr_FR",
        url: cheminEtude(etude.slug),
        title: etude.titre,
        description: etude.sousTitre,
      });
      expect(meta.openGraph).not.toHaveProperty("images");
      expect(meta.openGraph).toHaveProperty("siteName");
      expect(meta.twitter).toMatchObject({ title: etude.titre, description: etude.sousTitre });
    });
  }

  it("donne le lien du site d'artisan, et aucun pour le suivi de marchés", async () => {
    render(await EtudeDeCasPage({ params: Promise.resolve({ slug: "site-artisan" }) }));
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Site vitrine · SARL Dufourd Jérôme, électricien-plombier à Châteaubriant")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir le site" })).toHaveAttribute("href", "https://sdj-elec.jouan.dev/");
    cleanup();
    render(await EtudeDeCasPage({ params: Promise.resolve({ slug: "suivi-de-marches" }) }));
    expect(screen.queryByRole("link", { name: "Voir le site" })).toBeNull();
  });

  it("appelle notFound pour un slug inconnu", async () => {
    await expect(EtudeDeCasPage({ params: Promise.resolve({ slug: "inconnu" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFound).toHaveBeenCalled();
  });
});
