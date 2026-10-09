import { describe, expect, it } from "vitest";
import { appareilDepuis, DELAI_NOUVELLE_VISITE_MS, estNouvelleVisite, estRobot } from "./visites";

const t0 = new Date("2026-10-09T12:00:00Z");

describe("estNouvelleVisite", () => {
  it("compte la première visite", () => {
    expect(estNouvelleVisite(null, t0)).toBe(true);
  });
  it("ignore une ouverture moins de 30 minutes après la précédente", () => {
    expect(estNouvelleVisite(t0, new Date(t0.getTime() + DELAI_NOUVELLE_VISITE_MS - 1))).toBe(false);
  });
  it("compte une ouverture 30 minutes après", () => {
    expect(estNouvelleVisite(t0, new Date(t0.getTime() + DELAI_NOUVELLE_VISITE_MS))).toBe(true);
  });
});

describe("estRobot", () => {
  it.each([
    null,
    "",
    "WhatsApp/2.23.20.0",
    "facebookexternalhit/1.1",
    "Mozilla/5.0 (compatible; Googlebot/2.1)",
    "Slackbot-LinkExpanding 1.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/120.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 11) Chrome/120.0 Mobile Safari/537.36 Chrome-Lighthouse",
  ])("reconnaît %s", (ua) => {
    expect(estRobot(ua)).toBe(true);
  });
  it("laisse passer un navigateur", () => {
    expect(
      estRobot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"),
    ).toBe(false);
  });
});

describe("appareilDepuis", () => {
  it("suit l'indice Sec-CH-UA-Mobile", () => {
    expect(appareilDepuis("?1", null)).toBe("mobile");
    expect(appareilDepuis("?0", "iPhone")).toBe("ordinateur");
  });
  it("se replie sur le User-Agent", () => {
    expect(appareilDepuis(null, "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile")).toBe("mobile");
    expect(appareilDepuis(null, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("ordinateur");
    expect(appareilDepuis(null, null)).toBe("ordinateur");
  });
});
