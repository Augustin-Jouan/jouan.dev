import { describe, expect, it } from "vitest";
import { etatInitial, reducteur, totauxChantier } from "./etat";

describe("reducteur", () => {
  it("ajoute un avenant avec le numéro suivant, sans toucher aux autres lots", () => {
    const avant = etatInitial();
    const apres = reducteur(avant, { type: "ajouterAvenant", lotId: "l7", libelle: "Plinthes", montantHT: 100_000 });
    const l7 = apres.lots.find((l) => l.id === "l7")!;
    expect(l7.avenants.map((a) => [a.numero, a.libelle])).toEqual([[1, "Faïence toute hauteur des salles d'eau"], [2, "Plinthes"]]);
    expect(apres.lots.find((l) => l.id === "l1")).toBe(avant.lots.find((l) => l.id === "l1"));
  });

  it("ne réutilise jamais un numéro après une suppression", () => {
    let etat = etatInitial();
    etat = reducteur(etat, { type: "ajouterAvenant", lotId: "l7", libelle: "A", montantHT: 1_000 });
    const numero2 = etat.lots.find((l) => l.id === "l7")!.avenants[1]!;
    etat = reducteur(etat, { type: "supprimerAvenant", lotId: "l7", avenantId: numero2.id });
    etat = reducteur(etat, { type: "ajouterAvenant", lotId: "l7", libelle: "B", montantHT: 2_000 });
    expect(etat.lots.find((l) => l.id === "l7")!.avenants.map((a) => a.numero)).toEqual([1, 3]);
  });

  it("bascule la caution et réinitialise tout", () => {
    let etat = reducteur(etatInitial(), { type: "basculerCaution", lotId: "l7" });
    expect(etat.lots.find((l) => l.id === "l7")!.caution).toBe(true);
    etat = reducteur(etat, { type: "reinitialiser" });
    expect(etat).toEqual(etatInitial());
  });

  it("ignore un avenant invalide", () => {
    const avant = etatInitial();
    expect(reducteur(avant, { type: "ajouterAvenant", lotId: "l7", libelle: " ", montantHT: 100 })).toBe(avant);
    expect(reducteur(avant, { type: "ajouterAvenant", lotId: "l7", libelle: "X", montantHT: 0 })).toBe(avant);
  });
});

describe("totauxChantier", () => {
  it("additionne marchés, avenants, engagé et payé", () => {
    expect(totauxChantier(etatInitial().lots)).toEqual({
      marcheHT: 48_850_000,
      avenantsHT: 798_000,
      engageHT: 49_648_000,
      payeHT: 13_670_000,
    });
  });
});
