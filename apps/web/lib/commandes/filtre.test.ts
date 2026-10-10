import { describe, expect, it } from "vitest";
import { filtrerCommandes, normaliser } from "./filtre";

const liste = [
  { libelle: "Accueil · Contact", motsCles: ["contact"] },
  { libelle: "Étude de cas · Site vitrine d'artisan", motsCles: ["Électricien-plombier", "Docker"] },
  { libelle: "Contact", motsCles: ["devis"] },
  { libelle: "Copier l'e-mail", motsCles: ["contact@jouan.dev", "mail"] },
];
const libelles = (saisie: string) => filtrerCommandes(liste, saisie).map((c) => c.libelle);

describe("normaliser", () => {
  it("retire accents et majuscules", () => {
    expect(normaliser("Étude ÉLECTRICIEN")).toBe("etude electricien");
  });
});

describe("filtrerCommandes", () => {
  it("ignore les accents et la casse", () => {
    expect(libelles("ETUDE")).toEqual(["Étude de cas · Site vitrine d'artisan"]);
    expect(libelles("electricien")).toEqual(["Étude de cas · Site vitrine d'artisan"]);
  });

  it("exige chaque mot de la saisie, dans le libellé ou les mots-clés", () => {
    expect(libelles("copier mail")).toEqual(["Copier l'e-mail"]);
    expect(libelles("copier docker")).toEqual([]);
  });

  it("met en tête les libellés qui commencent par la saisie, puis garde l'ordre", () => {
    expect(libelles("contact")).toEqual(["Contact", "Accueil · Contact", "Copier l'e-mail"]);
  });

  it("rend tout pour une saisie vide ou blanche, rien sans correspondance", () => {
    expect(libelles("")).toHaveLength(4);
    expect(libelles("   ")).toHaveLength(4);
    expect(libelles("zzz")).toEqual([]);
  });
});
