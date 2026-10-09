import { describe, expect, it } from "vitest";
import { dateRelative, formaterDateAbsolue } from "./dates";

const ISO = "2026-10-09T14:00:00.000Z";
const t = Date.parse(ISO);

describe("dates", () => {
  it("date absolue, en français, heure de Paris", () => {
    // ICU peut écrire « 16:00 » ou « 16 h 00 » selon sa version.
    expect(formaterDateAbsolue(ISO)).toMatch(/9 octobre 2026/);
    expect(formaterDateAbsolue(ISO)).toMatch(/16\s?(:|h)\s?00/);
  });
  it.each([
    [30 * 1_000, "à l'instant"],
    [5 * 60_000, "il y a 5 minutes"],
    [3 * 3_600_000, "il y a 3 heures"],
    [24 * 3_600_000, "hier"],
    [10 * 24 * 3_600_000, "il y a 10 jours"],
  ])("%d ms après : « %s »", (ecart, attendu) => {
    expect(dateRelative(ISO, t + ecart)).toBe(attendu);
  });
});
