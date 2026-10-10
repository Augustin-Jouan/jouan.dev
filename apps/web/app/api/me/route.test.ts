// @vitest-environment node
import { describe, expect, it } from "vitest";
import { siteUrl } from "@/data/site";
import { GET } from "./route";

describe("GET /api/me", () => {
  it("renvoie le JSON Resume indenté, ouvert à toutes les origines, en cache une heure", async () => {
    const reponse = GET();
    expect(reponse.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(reponse.headers.get("access-control-allow-origin")).toBe("*");
    expect(reponse.headers.get("cache-control")).toBe("public, max-age=3600");
    const texte = await reponse.text();
    expect(texte).toMatch(/^\{\n {2}"\$schema"/);
    const json = JSON.parse(texte);
    expect(json.basics.name).toBe("Augustin Jouan");
    expect(json.meta.canonical).toBe(`${siteUrl}/api/me`);
    expect(json.meta.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });
});
