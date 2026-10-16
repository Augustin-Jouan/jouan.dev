import { describe, expect, it } from "vitest";
import { EVENEMENT_REJOUER_INTRO } from "@/lib/commandes/evenements";
import { GROUPES } from "@/lib/commandes/types";
import { ANCRES, realisations } from "./accueil";
import { commandes } from "./commandes";
import { contact } from "./contact";
import { cheminEtude } from "./realisations";
import { hoteSite } from "./site";

const commande = (id: string) => commandes.find((c) => c.id === id)!;
const liens = commandes.flatMap((c) => (c.action.type === "lien" ? [c.action.href] : []));

describe("commandes", () => {
  it("ont des identifiants uniques et sont rangées par groupe", () => {
    expect(new Set(commandes.map((c) => c.id)).size).toBe(commandes.length);
    const rangs = commandes.map((c) => GROUPES.indexOf(c.groupe));
    expect(rangs).toEqual([...rangs].sort((a, b) => a - b));
  });

  it("mènent à chaque section de l'accueil, chaque étude de cas et chaque page", () => {
    for (const ancre of Object.values(ANCRES)) expect(liens).toContain(`/#${ancre}`);
    for (const r of realisations) expect(liens).toContain(cheminEtude(r.slug));
    for (const page of ["/", "/a-propos", "/coulisses", "/contact", "/mentions-legales", "/politique-de-confidentialite"]) {
      expect(liens).toContain(page);
    }
  });

  it("copient l'e-mail et la commande curl du site", () => {
    expect(commande("copier-email").action).toEqual({ type: "copier", texte: contact.email, confirmation: "E-mail copié" });
    expect(commande("copier-curl").action).toEqual({
      type: "copier",
      texte: `curl -L ${hoteSite}`,
      confirmation: "Commande copiée",
    });
  });

  it("ouvrent GitHub et le CV JSON dans un nouvel onglet", () => {
    expect(commande("github").action).toEqual({ type: "lien", href: contact.github, nouvelOnglet: true });
    expect(commande("cv-json").action).toEqual({ type: "lien", href: "/api/me", nouvelOnglet: true });
  });

  it("relient les commandes ludiques à l'intro et à la 3D, sans commande de curseur", () => {
    expect(commande("rejouer-intro")).toMatchObject({
      condition: "intro",
      action: { type: "evenement", nom: EVENEMENT_REJOUER_INTRO },
    });
    expect(commandes.some((c) => /curseur/i.test(c.libelle))).toBe(false);
    expect(commande("architecture-3d").action).toEqual({ type: "lien", href: "/coulisses?vue=3d" });
  });
});
