// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /cv.txt", () => {
  it("renvoie le CV en texte brut, sans aucune séquence de couleur", async () => {
    const reponse = GET();
    expect(reponse.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const texte = await reponse.text();
    expect(texte).toContain("Augustin Jouan");
    expect(texte).not.toContain("\x1b");
  });
});
