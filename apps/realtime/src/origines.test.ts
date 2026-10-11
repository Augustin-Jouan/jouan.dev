import { describe, expect, it } from "vitest";
import { ipDuClient, lireOrigines, origineAutorisee } from "./origines.js";

describe("origines", () => {
  it("lit une liste séparée par des virgules", () => {
    expect(lireOrigines(" https://a.dev, http://localhost:3000 ,")).toEqual(["https://a.dev", "http://localhost:3000"]);
    expect(lireOrigines(undefined)).toEqual([]);
  });
  it("n'autorise que les origines listées, à l'identique", () => {
    const liste = ["https://jouan.dev"];
    expect(origineAutorisee("https://jouan.dev", liste)).toBe(true);
    expect(origineAutorisee("https://jouan.dev.attaque.dev", liste)).toBe(false);
    expect(origineAutorisee(undefined, liste)).toBe(false);
    expect(origineAutorisee("https://jouan.dev", [])).toBe(false);
  });
});

describe("ipDuClient", () => {
  it("prend la dernière adresse de X-Forwarded-For (ajoutée par le proxy)", () => {
    expect(ipDuClient("1.1.1.1, 2.2.2.2", "10.0.0.1")).toBe("2.2.2.2");
  });
  it("ignore une adresse forgée par le client en tête de liste", () => {
    expect(ipDuClient("6.6.6.6,9.9.9.9", undefined)).toBe("9.9.9.9");
  });
  it("retombe sur l'adresse de la socket", () => {
    expect(ipDuClient(undefined, "10.0.0.1")).toBe("10.0.0.1");
    expect(ipDuClient(" , ", "10.0.0.1")).toBe("10.0.0.1");
  });
  it("donne une valeur même sans rien", () => {
    expect(ipDuClient(undefined, undefined)).toBe("inconnue");
  });
});

describe("ipDuClient en IPv6", () => {
  it("regroupe par préfixe /64, garde l'IPv4", () => {
    expect(ipDuClient("2001:db8:1:2:aaaa::1", undefined)).toBe("2001:db8:1:2::/64");
    expect(ipDuClient(undefined, "2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(ipDuClient(undefined, "::ffff:1.2.3.4")).toBe("1.2.3.4");
    expect(ipDuClient("1.2.3.4", undefined)).toBe("1.2.3.4");
  });
});
