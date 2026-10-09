import { describe, expect, it } from "vitest";
import { ipDeRequete } from "./ip";

const avec = (enTetes: Record<string, string>) => ipDeRequete(new Headers(enTetes));

describe("ipDeRequete", () => {
  it("prend la dernière entrée de X-Forwarded-For, celle ajoutée par le proxy", () => {
    expect(avec({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" })).toBe("1.2.3.4");
  });
  it("ignore les entrées vides", () => {
    expect(avec({ "x-forwarded-for": "1.2.3.4, " })).toBe("1.2.3.4");
  });
  it("ignore X-Real-IP, que le client peut poser lui-même", () => {
    expect(avec({ "x-real-ip": "1.2.3.4" })).toBe("inconnu");
  });
  it("sans en-tête : un compteur commun, le comportement sûr", () => {
    expect(avec({})).toBe("inconnu");
  });
});
