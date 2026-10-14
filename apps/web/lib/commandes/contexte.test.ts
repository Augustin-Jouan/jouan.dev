import { afterEach, describe, expect, it } from "vitest";
import { lireContexte } from "./contexte";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("lireContexte", () => {
  it("sans fond d'accueil : pas d'intro", () => {
    expect(lireContexte()).toEqual({ chemin: "/", introDisponible: false });
  });

  it("intro disponible quand le fond peut jouer l'encre, pas avec le nuage figé", () => {
    document.body.innerHTML = '<div class="fond-accueil" data-mode="nuage-anime"></div>';
    expect(lireContexte().introDisponible).toBe(true);
    document.body.innerHTML = '<div class="fond-accueil" data-mode="nuage-fige"></div>';
    expect(lireContexte().introDisponible).toBe(false);
  });
});
