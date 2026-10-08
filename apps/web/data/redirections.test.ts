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

  it("ne redirige jamais une source vers elle-même", () => {
    redirections.forEach((r) => {
      expect(r.source).not.toBe(r.destination);
    });
  });
});
