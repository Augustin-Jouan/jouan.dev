import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "./page";
import {
  ANCRES,
  accroche,
  etapes,
  offres,
  parcours,
  realisations,
  sections,
  texteParcours,
} from "@/data/accueil";
import { contact } from "@/data/contact";
import { apercuEtude, cheminEtude } from "@/data/realisations";

describe("HomePage", () => {
  it("affiche l'accroche et ses deux actions", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      // jest-dom lit les insécables du titre comme des espaces.
      `${accroche.titreAvant}${accroche.titreAccent}${accroche.titreApres}`.replaceAll("\u00a0", " ")
    );
    expect(screen.getByRole("link", { name: accroche.actionPrincipale.libelle })).toHaveAttribute(
      "href",
      accroche.actionPrincipale.href
    );
    expect(screen.getByRole("link", { name: accroche.actionSecondaire.libelle })).toHaveAttribute(
      "href",
      accroche.actionSecondaire.href
    );
  });

  it("affiche les sections dans l'ordre, chacune à son ancre", () => {
    render(<HomePage />);
    const titres = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titres).toEqual([
      sections.offre.titre,
      sections.methode.titre,
      sections.parcours.titre,
      sections.contact.titre,
    ]);
    for (const id of Object.values(ANCRES)) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("affiche les offres avec leur exemple en image, les étapes et le parcours", () => {
    render(<HomePage />);
    const offre = document.getElementById(ANCRES.offre)!;
    for (const o of offres) {
      expect(screen.getByRole("heading", { level: 3, name: o.titre })).toBeInTheDocument();
      // L'exemple : la capture de la réalisation, qui mène à son étude sur /realisations.
      const r = realisations.find((x) => x.slug === o.etude)!;
      const lien = within(offre).getByRole("link", { name: `Voir l'exemple : ${r.titre}` });
      expect(lien).toHaveAttribute("href", cheminEtude(r.slug));
      const image = lien.querySelector("img")!;
      expect(image).toHaveAttribute("src", apercuEtude(r.slug).src);
      expect(image).toHaveAttribute("width", String(apercuEtude(r.slug).largeur));
      expect(image).toHaveAttribute("height", String(apercuEtude(r.slug).hauteur));
      expect(image).toHaveAttribute("loading", "lazy");
      expect(image).toHaveAttribute("alt", "");
    }
    expect(screen.queryByText(/^Exemple :/)).toBeNull();
    expect(screen.queryByRole("heading", { level: 2, name: "Quelques projets récents" })).toBeNull();
    for (const etape of etapes) {
      expect(screen.getByRole("heading", { level: 3, name: etape.titre })).toBeInTheDocument();
    }
    const liste = within(document.getElementById(ANCRES.parcours)!).getByRole("list", { name: "Parcours" });
    // Texte visible : sans la mention « (nouvel onglet) » réservée aux lecteurs d'écran.
    const visible = (li: HTMLElement) => {
      const copie = li.cloneNode(true) as HTMLElement;
      copie.querySelectorAll(".sr-only").forEach((el) => el.remove());
      return copie.textContent;
    };
    expect(within(liste).getAllByRole("listitem").map(visible)).toEqual(parcours.map(texteParcours));
    expect(within(liste).getByRole("link", { name: /^SCR Informatique\s*\(nouvel onglet\)$/ })).toHaveAttribute("href", "https://www.scrinfo.net/");
    expect(within(liste).getByRole("link", { name: /^Epitech\s*\(nouvel onglet\)$/ })).toHaveAttribute("href", "https://www.epitech.eu/");
    expect(within(offre).getByRole("link", { name: "Toutes les réalisations" })).toHaveAttribute("href", "/realisations");
  });

  it("intègre le formulaire et l'e-mail direct dans la section contact", () => {
    render(<HomePage />);
    const section = document.getElementById(ANCRES.contact)!;
    expect(within(section).getByLabelText("Nom")).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: contact.email })).toHaveAttribute(
      "href",
      `mailto:${contact.email}`
    );
  });
});
