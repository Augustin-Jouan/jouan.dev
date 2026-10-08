import { describe, it, expect } from "vitest";
import { A_COMPLETER, mentionsLegales, mentionsLegalesManquantes } from "./legal";
import { contact } from "./contact";
import { siteName } from "./site";

describe("mentionsLegales", () => {
  it("présente l'éditeur comme entrepreneur individuel joignable par e-mail", () => {
    expect(mentionsLegales.editeur).toBe(siteName);
    expect(mentionsLegales.directeurPublication).toBe(siteName);
    expect(mentionsLegales.statut).toMatch(/entrepreneur individuel/i);
    expect(mentionsLegales.email).toBe(contact.email);
  });

  it("préremplit l'hébergeur OVH et l'absence de transfert hors UE", () => {
    expect(mentionsLegales.hebergeur.nom).toBe("OVH SAS");
    expect(mentionsLegales.transfertHorsUe).toMatch(
      /ne sont pas transférées hors de l'Union européenne/
    );
  });

  // Informations à fournir par l'EI avant la bascule sur jouan.dev.
  it("liste précisément les champs à compléter", () => {
    expect([...mentionsLegalesManquantes].sort()).toEqual(
      ["adresse", "mediateur.adresse", "mediateur.nom", "mediateur.site", "siren", "telephone", "tva"].sort()
    );
    expect(mentionsLegales.siren).toBe(A_COMPLETER);
  });
});
