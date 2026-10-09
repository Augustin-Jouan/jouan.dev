// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { NOM_COOKIE, signerSession } from "@/lib/admin/session";
import { proxy } from "./proxy";

const SECRET = "s".repeat(32);
const requete = (chemin: string, cookie?: string) =>
  new NextRequest(new URL(chemin, "http://localhost:3000"), {
    headers: cookie ? { cookie: `${NOM_COOKIE}=${cookie}` } : {},
  });
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
});
