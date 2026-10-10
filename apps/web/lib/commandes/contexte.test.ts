import { afterEach, describe, expect, it } from "vitest";
import { lireContexte } from "./contexte";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("lireContexte", () => {
  it("sans fond d'accueil ni présence : ni intro ni curseur", () => {
    expect(lireContexte()).toEqual({ chemin: "/", introDisponible: false, presence: null });
  });

  it("intro disponible quand le fond peut jouer l'encre, pas avec le halo CSS", () => {
    document.body.innerHTML = '<div class="fond-accueil" data-mode="halo-anime"></div>';
    expect(lireContexte().introDisponible).toBe(true);
    document.body.innerHTML = '<div class="fond-accueil" data-mode="halo-css"></div>';
    expect(lireContexte().introDisponible).toBe(false);
  });

  it("lit l'état du curseur sur son bouton", () => {
    document.body.innerHTML = '<button data-presence="masquee"></button>';
    expect(lireContexte().presence).toBe("masquee");
    document.body.innerHTML = '<button data-presence="autre"></button>';
    expect(lireContexte().presence).toBeNull();
  });
});
