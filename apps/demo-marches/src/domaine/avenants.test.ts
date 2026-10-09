import { describe, expect, it } from "vitest";
import { montantEngage, validerAvenant } from "./avenants";

describe("montantEngage", () => {
  it("ajoute les avenants, positifs ou négatifs, au marché initial", () => {
    const avenants = [
      { id: "a", numero: 1, libelle: "Plus-value", montantHT: 85_000 },
      { id: "b", numero: 2, libelle: "Moins-value", montantHT: -30_000 },
    ];
    expect(montantEngage(1_260_000, avenants)).toBe(1_315_000);
    expect(montantEngage(1_260_000, [])).toBe(1_260_000);
  });
});

const CONTEXTE = { engageHT: 1_000_000, payeHT: 400_000 };

describe("validerAvenant", () => {
  it("accepte un libellé et un montant non nul", () => {
    expect(validerAvenant("  Plinthes ", "+1 000", CONTEXTE)).toEqual({ ok: true, libelle: "Plinthes", montantHT: 100_000 });
  });
  it("refuse un libellé vide, un montant illisible ou nul", () => {
    expect(validerAvenant(" ", "100", CONTEXTE)).toEqual({ ok: false, champ: "libelle", message: "Donnez un libellé à l'avenant." });
    expect(validerAvenant("Plinthes", "cent", CONTEXTE)).toEqual({ ok: false, champ: "montant", message: "Montant illisible : écrivez par exemple 1 250,00 ou -300." });
    expect(validerAvenant("Plinthes", "0", CONTEXTE)).toEqual({ ok: false, champ: "montant", message: "Un avenant ne peut pas être nul." });
  });
  it("refuse une moins-value qui ramènerait l'engagé sous le déjà payé", () => {
    const message = "La moins-value dépasse le montant restant du marché.";
    expect(validerAvenant("Retrait", "-6 000,01", CONTEXTE)).toEqual({ ok: false, champ: "montant", message });
    expect(validerAvenant("Retrait", "-6 000,00", CONTEXTE)).toEqual({ ok: true, libelle: "Retrait", montantHT: -600_000 });
  });
});
