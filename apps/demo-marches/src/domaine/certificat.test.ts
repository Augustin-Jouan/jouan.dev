import { describe, expect, it } from "vitest";
import { calculerCertificat, type EntreeCertificat } from "./certificat";

const reference: EntreeCertificat = {
  marcheHT: 1_260_000,
  avenants: [85_000],
  acomptesAnterieurs: [300_000, 420_000],
  tauxTVA: 20,
  tauxRetenue: 5,
  caution: false,
  cumulTexte: "9 850,00",
};

describe("calculerCertificat", () => {
  it("reproduit le cas de référence calculé à la main", () => {
    expect(calculerCertificat(reference)).toEqual({
      ok: true,
      lignes: {
        numero: 3,
        totalHT: 1_345_000,
        totalTVA: 269_000,
        totalTTC: 1_614_000,
        precedentsHT: 720_000,
        precedentsTVA: 144_000,
        precedentsTTC: 864_000,
        presentHT: 265_000,
        presentTVA: 53_000,
        presentTTC: 318_000,
        retenue: 15_900,
        mandate: 302_100,
      },
    });
  });

  it("sans retenue quand une caution bancaire la remplace", () => {
    const resultat = calculerCertificat({ ...reference, caution: true });
    expect(resultat.ok && resultat.lignes.retenue).toBe(0);
    expect(resultat.ok && resultat.lignes.mandate).toBe(318_000);
  });

  it("arrondit le demi-centime au-dessus", () => {
    const resultat = calculerCertificat({
      marcheHT: 500_000,
      avenants: [],
      acomptesAnterieurs: [],
      tauxTVA: 10,
      tauxRetenue: 5,
      caution: false,
      cumulTexte: "1 184,09",
    });
    expect(resultat).toMatchObject({ ok: true, lignes: { presentTVA: 11_841, presentTTC: 130_250, retenue: 6_513, mandate: 123_737 } });
  });

  it.each([
    ["", "Saisissez le montant des travaux réalisés."],
    ["sept mille", "Montant illisible : écrivez par exemple 9 850,00."],
    ["7 000", "Le présent acompte doit être positif."],
    ["7 200", "Le présent acompte doit être positif."],
    ["13 450,01", "Le cumul dépasse le montant du marché avenants compris."],
  ])("refuse le cumul « %s »", (cumulTexte, message) => {
    expect(calculerCertificat({ ...reference, cumulTexte })).toEqual({ ok: false, message });
  });
});
