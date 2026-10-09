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

describe("ipDeRequete en IPv6", () => {
  it("regroupe une adresse IPv6 par préfixe /64 : un seul abonné, une seule clé", () => {
    expect(avec({ "x-forwarded-for": "2001:db8:1:2:aaaa::1" })).toBe("2001:db8:1:2::/64");
    expect(avec({ "x-forwarded-for": "2001:db8:1:2:ffff:ffff:ffff:ffff" })).toBe("2001:db8:1:2::/64");
  });
  it("développe la forme abrégée et ignore la zone", () => {
    expect(avec({ "x-forwarded-for": "2001:db8::1" })).toBe("2001:db8:0:0::/64");
    expect(avec({ "x-forwarded-for": "fe80::1%eth0" })).toBe("fe80:0:0:0::/64");
  });
  it("une adresse IPv4 écrite en IPv6 reste l'adresse IPv4", () => {
    expect(avec({ "x-forwarded-for": "::ffff:1.2.3.4" })).toBe("1.2.3.4");
  });
});
