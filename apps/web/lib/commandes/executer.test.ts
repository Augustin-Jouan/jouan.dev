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
    await executerAction({ type: "copier", texte: "augustin@jouan.dev", confirmation: "E-mail copié" }, o);
    expect(writeText).toHaveBeenCalledWith("augustin@jouan.dev");
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
