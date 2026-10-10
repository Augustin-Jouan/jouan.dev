// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { NOM_COOKIE, signerSession } from "@/lib/admin/session";
import { MOTIF_CLIENT_TERMINAL } from "@/lib/cv/client-terminal";
import { config, proxy } from "./proxy";

const SECRET = "s".repeat(32);
const requete = (chemin: string, cookie?: string, userAgent?: string) =>
  new NextRequest(new URL(chemin, "http://localhost:3000"), {
    headers: { ...(cookie ? { cookie: `${NOM_COOKIE}=${cookie}` } : {}), ...(userAgent ? { "user-agent": userAgent } : {}) },
  });
const NAVIGATEUR = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const reecriture = (r: Response) => r.headers.get("x-middleware-rewrite");

describe("proxy", () => {
  afterEach(() => {
    delete process.env.ADMIN_SECRET;
  });

  it("réécrit un lien valide en gardant l'aperçu", () => {
    const r = proxy(requete("/?pour=boulangerie-martin-k7f3&apercu=1"));
    expect(new URL(reecriture(r)!).pathname).toBe("/pour/boulangerie-martin-k7f3");
    expect(new URL(reecriture(r)!).searchParams.get("apercu")).toBe("1");
    expect(new URL(reecriture(r)!).searchParams.has("pour")).toBe(false);
  });
  it.each(["Boulangerie-Martin-K7F3", "a%2Fb", "a b", "x".repeat(200), ""])(
    "laisse l'accueil normal pour pour=%s",
    (jeton) => {
      expect(reecriture(proxy(requete(`/?pour=${jeton}`)))).toBeNull();
    },
  );
  it("laisse passer la page de connexion", () => {
    expect(proxy(requete("/admin/connexion")).headers.get("location")).toBeNull();
  });
  it("renvoie vers la connexion sans session, ou sans secret configuré", () => {
    expect(proxy(requete("/admin")).headers.get("location")).toBe("http://localhost:3000/admin/connexion");
    expect(proxy(requete("/admin", signerSession(Date.now() + 60_000, SECRET))).headers.get("location")).toBe(
      "http://localhost:3000/admin/connexion",
    );
  });
  it("laisse passer une session valide, refuse une session d'un autre secret", () => {
    process.env.ADMIN_SECRET = SECRET;
    expect(proxy(requete("/admin", signerSession(Date.now() + 60_000, SECRET))).headers.get("location")).toBeNull();
    expect(
      proxy(requete("/admin", signerSession(Date.now() + 60_000, "a".repeat(32)))).headers.get("location"),
    ).toBe("http://localhost:3000/admin/connexion");
  });
  it.each(["/admin/connexion/x", "/admin/connexion/"])("protège %s (seule /admin/connexion est publique)", (chemin) => {
    expect(proxy(requete(chemin)).headers.get("location")).toBe("http://localhost:3000/admin/connexion");
  });
  it("redirige un cookie mal formé ou expiré, même avec un secret configuré", () => {
    process.env.ADMIN_SECRET = SECRET;
    const lieu = "http://localhost:3000/admin/connexion";
    expect(proxy(requete("/admin", "abc")).headers.get("location")).toBe(lieu);
    expect(proxy(requete("/admin", signerSession(Date.now() - 1000, SECRET))).headers.get("location")).toBe(lieu);
  });
  it("réécrit un jeton de 45 caractères, pas un de 46", () => {
    const jeton45 = `${"a".repeat(40)}-k7f3`;
    expect(reecriture(proxy(requete(`/?pour=${jeton45}`)))).not.toBeNull();
    expect(reecriture(proxy(requete(`/?pour=${jeton45}x`)))).toBeNull();
  });

  it("réécrit / vers le CV coloré pour curl, même avec un lien personnalisé", () => {
    expect(new URL(reecriture(proxy(requete("/", undefined, "curl/8.5.0")))!).pathname).toBe("/cv.ansi");
    const r = proxy(requete("/?pour=boulangerie-martin-k7f3", undefined, "curl/8.5.0"));
    expect(new URL(reecriture(r)!).pathname).toBe("/cv.ansi");
    expect(new URL(reecriture(r)!).search).toBe("");
  });
  it("garde la page personnalisée pour un navigateur", () => {
    const r = proxy(requete("/?pour=boulangerie-martin-k7f3", undefined, NAVIGATEUR));
    expect(new URL(reecriture(r)!).pathname).toBe("/pour/boulangerie-martin-k7f3");
  });
  it("protège toujours l'administration, même pour curl", () => {
    expect(proxy(requete("/admin", undefined, "curl/8.5.0")).headers.get("location")).toBe(
      "http://localhost:3000/admin/connexion",
    );
  });
  it("le matcher porte le même motif de User-Agent que estClientTerminal", () => {
    expect(config.matcher[0]).toEqual({
      source: "/",
      has: [{ type: "header", key: "user-agent", value: MOTIF_CLIENT_TERMINAL }],
    });
  });
});
