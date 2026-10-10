// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /cv.ansi", () => {
  it("renvoie le CV coloré, qui varie selon le User-Agent", async () => {
    const reponse = GET();
    expect(reponse.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(reponse.headers.get("vary")).toBe("User-Agent");
    const texte = await reponse.text();
    expect(texte).toContain("Augustin Jouan");
    expect(texte).toContain("\x1b[38;5;180m");
  });
});
