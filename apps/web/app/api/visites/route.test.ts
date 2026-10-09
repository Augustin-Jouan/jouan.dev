// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const traiterVisite = vi.hoisted(() => vi.fn());
const after = vi.hoisted(() => vi.fn((tache: () => unknown) => tache()));
vi.mock("@/lib/liens/traitement", () => ({ traiterVisite }));
vi.mock("next/server", async (original) => ({ ...(await original<typeof import("next/server")>()), after }));
import { POST } from "./route";

const NAVIGATEUR = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1";
const signal = (corps: string, enTetes: Record<string, string> = { "user-agent": NAVIGATEUR }) =>
  POST(new Request("http://localhost/api/visites", { method: "POST", body: corps, headers: enTetes }));

describe("POST /api/visites", () => {
  beforeEach(() => {
    traiterVisite.mockReset();
    after.mockClear();
  });

  it("répond 204 et traite un signal valide en arrière-plan", async () => {
    const r = await signal("boulangerie-martin-k7f3");
    expect(r.status).toBe(204);
    expect(await r.text()).toBe("");
    expect(traiterVisite).toHaveBeenCalledWith("boulangerie-martin-k7f3", "mobile");
  });
  it.each([
    ["un jeton mal formé", "Boulangerie Martin", { "user-agent": NAVIGATEUR }],
    ["un robot", "boulangerie-martin-k7f3", { "user-agent": "WhatsApp/2.23" }],
    ["un corps trop long", "a".repeat(300), { "user-agent": NAVIGATEUR }],
  ])("répond 204 sans rien traiter pour %s", async (_cas, corps, enTetes) => {
    const r = await signal(corps, enTetes);
    expect(r.status).toBe(204);
    expect(traiterVisite).not.toHaveBeenCalled();
  });

  it("répond 204 sans rien traiter pour un flux de plus de 256 octets sans content-length", async () => {
    const flux = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode("a".repeat(200)));
        c.enqueue(new TextEncoder().encode("a".repeat(200)));
        c.close();
      },
    });
    const r = await POST(
      new Request("http://localhost/api/visites", {
        method: "POST",
        body: flux,
        headers: { "user-agent": NAVIGATEUR },
        duplex: "half",
      } as RequestInit),
    );
    expect(r.status).toBe(204);
    expect(after).not.toHaveBeenCalled();
    expect(traiterVisite).not.toHaveBeenCalled();
  });
  it("traite un signal valide malgré un content-length non numérique", async () => {
    const r = await signal("boulangerie-martin-k7f3", { "user-agent": NAVIGATEUR, "content-length": "abc" });
    expect(r.status).toBe(204);
    expect(traiterVisite).toHaveBeenCalledWith("boulangerie-martin-k7f3", "mobile");
  });
});
