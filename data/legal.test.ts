import { describe, it, expect } from "vitest";
import { A_COMPLETER, mentionsLegales, mentionsLegalesManquantes } from "./legal";
import { contact } from "./contact";
import { siteName } from "./site";

describe("mentionsLegales", () => {
  it("réutilise les coordonnées connues du site", () => {
    expect(mentionsLegales.raisonSociale).toBe(siteName);
    expect(mentionsLegales.adresse).toBe(contact.adresse);
    expect(mentionsLegales.telephone).toBe(contact.telephone);
    expect(mentionsLegales.email).toBe(contact.email);
  });

  it("préremplit l'hébergeur OVH et l'absence de transfert hors UE", () => {
    expect(mentionsLegales.hebergeur.nom).toBe("OVH SAS");
    expect(mentionsLegales.transfertHorsUe).toMatch(
      /ne sont pas transférées hors de l'Union européenne/
    );
  });

  it("laisse l'assurance absente par défaut", () => {
    expect(mentionsLegales.assurance).toBeUndefined();
  });

  // Dans le template, ces champs sont attendus vides : c'est le site créé
  // à partir du template qui devra les remplir (voir README).
  it("liste précisément les champs à compléter", () => {
    expect(mentionsLegalesManquantes.sort()).toEqual(
      [
        "capitalSocial",
        "rcs",
        "tvaIntracommunautaire",
        "directeurPublication",
        "mediateur.nom",
        "mediateur.adresse",
        "mediateur.site",
      ].sort()
    );
    expect(mentionsLegales.rcs).toBe(A_COMPLETER);
  });
});
