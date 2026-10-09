import { describe, expect, it } from "vitest";
import { validerInfosBuild } from "./infos-build.mjs";
import { INFOS_EXEMPLE } from "./outils-test";

describe("validerInfosBuild", () => {
  it("accepte des infos complètes", () => {
    expect(validerInfosBuild(INFOS_EXEMPLE)).toEqual(INFOS_EXEMPLE);
  });

  it("ne garde que les champs connus", () => {
    expect(validerInfosBuild({ ...INFOS_EXEMPLE, secret: "x" })).not.toHaveProperty("secret");
  });

  it.each([
    ["un SHA court", { sha: "0123456" }],
    ["un titre vide", { titre: "" }],
    ["un titre de plus de 100 caractères", { titre: "a".repeat(101) }],
    ["une date illisible", { date: "hier" }],
    ["un nombre de tests négatif", { tests: { unitaires: -1, boutEnBout: 68 } }],
    ["un nombre de tests décimal", { tests: { unitaires: 1.5, boutEnBout: 68 } }],
    ["une note au-delà de 1", { lighthouse: { ...INFOS_EXEMPLE.lighthouse, performance: 1.2 } }],
    ["une note absente", { lighthouse: { ...INFOS_EXEMPLE.lighthouse, referencement: null } }],
    ["aucune page mesurée", { lighthouse: { ...INFOS_EXEMPLE.lighthouse, pages: 0 } }],
    ["un poids absent", { poidsJsAccueil: undefined }],
  ])("refuse %s", (_cas, changement) => {
    expect(validerInfosBuild({ ...INFOS_EXEMPLE, ...changement })).toBeNull();
  });

  it("refuse ce qui n'est pas un objet", () => {
    expect(validerInfosBuild(null)).toBeNull();
    expect(validerInfosBuild("{}")).toBeNull();
  });
});
