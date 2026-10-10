import { describe, expect, it } from "vitest";
import { appliquerTheme } from "./theme";

describe("appliquerTheme", () => {
  it("passe la démo en sombre avec ?theme=sombre (règle de styles/jetons.css)", () => {
    const racine = document.createElement("html");
    appliquerTheme("?theme=sombre", racine);
    expect(racine.dataset.theme).toBe("sombre");
  });

  it("ne change rien sans paramètre ni avec une autre valeur", () => {
    for (const recherche of ["", "?theme=clair", "?autre=sombre"]) {
      const racine = document.createElement("html");
      appliquerTheme(recherche, racine);
      expect(racine.dataset.theme).toBeUndefined();
    }
  });
});
