import { describe, it, expect } from "vitest";
import { redirections } from "./redirections";

describe("redirections", () => {
  it("ne contient que des redirections permanentes vers des chemins absolus", () => {
    redirections.forEach((r) => {
      expect(r.permanent).toBe(true);
      expect(r.source).toMatch(/^\//);
      expect(r.destination).toMatch(/^\//);
    });
  });

  it("renvoie les anciennes pages d'étude vers leur ancre de /realisations", () => {
    expect(redirections).toEqual(
      expect.arrayContaining([
        { source: "/realisations/suivi-de-marches", destination: "/realisations#suivi-de-marches", permanent: true },
        { source: "/realisations/site-artisan", destination: "/realisations#site-vitrine", permanent: true },
      ]),
    );
  });

  it("ne redirige jamais une source vers elle-même", () => {
    redirections.forEach((r) => {
      expect(r.source).not.toBe(r.destination);
    });
  });
});
