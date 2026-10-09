// @vitest-environment node
import { scryptSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => ({ set: vi.fn(), delete: vi.fn(), get: vi.fn() }));
const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
);
vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/admin/session", async (importer) => {
  const reel = await importer<typeof import("@/lib/admin/session")>();
  return { ...reel, verifierMotDePasse: vi.fn(reel.verifierMotDePasse) };
});
import { verifierMotDePasse } from "@/lib/admin/session";
import { reinitialiserLimites } from "@/lib/rate-limit";
import { seConnecter, seDeconnecter } from "./actions";

// Empreinte fabriquée ici pour le test : aucun mot de passe réel dans le dépôt.
const sel = Buffer.from("0123456789abcdef");
const EMPREINTE = ["scrypt", 16384, 8, 1, sel.toString("base64url"),
  scryptSync("bon-mot-de-passe", sel, 32, { N: 16384, r: 8, p: 1 }).toString("base64url")].join("$");
const formulaire = (motDePasse: string) => {
  const f = new FormData();
  f.set("motDePasse", motDePasse);
  return f;
};

describe("seConnecter", () => {
  beforeEach(() => {
    process.env.ADMIN_EMPREINTE = EMPREINTE;
    process.env.ADMIN_SECRET = "s".repeat(32);
    reinitialiserLimites();
  });
  afterEach(() => {
    delete process.env.ADMIN_EMPREINTE;
    delete process.env.ADMIN_SECRET;
    vi.clearAllMocks();
  });

  it("pose le cookie de session et redirige vers /admin", async () => {
    await expect(seConnecter({}, formulaire("bon-mot-de-passe"))).rejects.toThrow("REDIRECT /admin");
    const [nom, valeur, options] = jar.set.mock.calls[0];
    expect(nom).toBe("admin_session");
    expect(valeur).toMatch(/^\d+\.[\w-]+$/);
    expect(options).toMatchObject({ httpOnly: true, sameSite: "strict", path: "/admin" });
  });
  it("refuse un mauvais mot de passe sans cookie", async () => {
    expect(await seConnecter({}, formulaire("mauvais"))).toEqual({ erreur: "Mot de passe incorrect." });
    expect(jar.set).not.toHaveBeenCalled();
  });
  it("bloque après 5 échecs en un quart d'heure, même avec le bon mot de passe", async () => {
    for (let i = 0; i < 5; i++) await seConnecter({}, formulaire("mauvais"));
    expect(await seConnecter({}, formulaire("bon-mot-de-passe"))).toEqual({
      erreur: "Trop de tentatives. Réessayez dans un quart d'heure.",
    });
    expect(jar.set).not.toHaveBeenCalled();
  });
  it("limite aussi les requêtes en rafale : au plus 5 atteignent la vérification", async () => {
    const reponses = await Promise.all(Array.from({ length: 20 }, () => seConnecter({}, formulaire("mauvais"))));
    expect(vi.mocked(verifierMotDePasse).mock.calls.length).toBeLessThanOrEqual(5);
    expect(reponses.filter((r) => r.erreur?.startsWith("Trop de tentatives"))).toHaveLength(15);
  });
  it("un succès ne consomme rien : 4 échecs, un succès, puis encore 1 échec autorisé", async () => {
    for (let i = 0; i < 4; i++) await seConnecter({}, formulaire("mauvais"));
    await expect(seConnecter({}, formulaire("bon-mot-de-passe"))).rejects.toThrow("REDIRECT /admin");
    expect(await seConnecter({}, formulaire("mauvais"))).toEqual({ erreur: "Mot de passe incorrect." });
    expect((await seConnecter({}, formulaire("mauvais"))).erreur).toMatch(/^Trop de tentatives/);
  });
  it("ne compte pas les connexions réussies", async () => {
    for (let i = 0; i < 6; i++) {
      await expect(seConnecter({}, formulaire("bon-mot-de-passe"))).rejects.toThrow("REDIRECT /admin");
    }
  });
  it("signale une administration non configurée", async () => {
    delete process.env.ADMIN_SECRET;
    expect(await seConnecter({}, formulaire("bon-mot-de-passe"))).toEqual({
      erreur: "Administration non configurée.",
    });
  });
});

describe("seDeconnecter", () => {
  it("efface le cookie et renvoie vers la connexion", async () => {
    await expect(seDeconnecter()).rejects.toThrow("REDIRECT /admin/connexion");
    expect(jar.delete).toHaveBeenCalledWith({ name: "admin_session", path: "/admin" });
  });
});
