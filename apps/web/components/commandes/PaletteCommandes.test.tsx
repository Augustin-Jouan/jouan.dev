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
