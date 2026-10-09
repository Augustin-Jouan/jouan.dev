// @vitest-environment node
import { scryptSync } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  creerEmpreinte,
  DUREE_SESSION_MS,
  secretSession,
  signerSession,
  verifierMotDePasse,
  verifierSession,
} from "./session";

const SECRET = "s".repeat(32);

describe("empreinte du mot de passe", () => {
  it("vérifie le bon mot de passe et refuse les autres", async () => {
    const empreinte = await creerEmpreinte("correct horse");
    expect(empreinte).toMatch(/^scrypt\$16384\$8\$1\$[\w-]+\$[\w-]+$/);
    expect(await verifierMotDePasse("correct horse", empreinte)).toBe(true);
    expect(await verifierMotDePasse("Correct horse", empreinte)).toBe(false);
  });
  it("sale chaque empreinte", async () => {
    expect(await creerEmpreinte("x")).not.toBe(await creerEmpreinte("x"));
  });
  it.each(["", "scrypt$1$2", "bcrypt$16384$8$1$a$b", "scrypt$16384$8$1$$"])(
    "refuse une empreinte mal formée (%s)",
    async (empreinte) => {
      expect(await verifierMotDePasse("x", empreinte)).toBe(false);
    },
  );
  it("accepte une empreinte au format du script", async () => {
    const sel = Buffer.from("0123456789abcdef");
    const cle = scryptSync("mot-de-passe-e2e", sel, 32, { N: 16384, r: 8, p: 1 });
    const empreinte = ["scrypt", 16384, 8, 1, sel.toString("base64url"), cle.toString("base64url")].join("$");
    expect(await verifierMotDePasse("mot-de-passe-e2e", empreinte)).toBe(true);
  });
});

describe("session signée", () => {
  const maintenant = 1_000_000;
  it("accepte une session valide", () => {
    expect(verifierSession(signerSession(maintenant + 1000, SECRET), SECRET, maintenant)).toBe(true);
  });
  it("refuse une session expirée", () => {
    expect(verifierSession(signerSession(maintenant - 1, SECRET), SECRET, maintenant)).toBe(false);
  });
  it("refuse une session signée avec un autre secret (secret changé)", () => {
    expect(verifierSession(signerSession(maintenant + 1000, "a".repeat(32)), SECRET, maintenant)).toBe(false);
  });
  it("refuse une expiration modifiée", () => {
    const [, signature] = signerSession(maintenant + 1000, SECRET).split(".");
    expect(verifierSession(`${maintenant + DUREE_SESSION_MS}.${signature}`, SECRET, maintenant)).toBe(false);
  });
  it.each([undefined, "", "abc", "1.2.3", ".x"])("refuse %s", (valeur) => {
    expect(verifierSession(valeur, SECRET, maintenant)).toBe(false);
  });
});

describe("secretSession", () => {
  afterEach(() => {
    delete process.env.ADMIN_SECRET;
  });
  it("exige au moins 32 caractères", () => {
    process.env.ADMIN_SECRET = "court";
    expect(secretSession()).toBeNull();
    process.env.ADMIN_SECRET = SECRET;
    expect(secretSession()).toBe(SECRET);
  });
});
