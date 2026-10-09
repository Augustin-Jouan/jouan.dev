import { afterEach, describe, expect, it, vi } from "vitest";
import { CHEMIN_MESURE, DELAI_HTTP_MAX_MS, mesurerHttp } from "./http";

const reponse = (corps: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(corps), init);

afterEach(() => {
  vi.useRealTimers();
});

describe("mesurerHttp", () => {
  it("mesure l'aller-retour jusqu'aux en-têtes et rapporte le temps de la base", async () => {
    let t = 100;
    const faire = vi.fn(async () => {
      t = 142.25;
      return reponse({ base: 1.2, serveur: 3 });
    });
    const r = await mesurerHttp(undefined, faire as unknown as typeof fetch, () => t);
    expect(r).toEqual({ ok: true, ms: 42.3, base: 1.2 });
    expect(faire).toHaveBeenCalledWith(CHEMIN_MESURE, expect.objectContaining({ cache: "no-store" }));
  });

  it("base absente ou invalide : base null", async () => {
    const faire = async () => reponse({ base: "?", serveur: 3 });
    expect(await mesurerHttp(undefined, faire as unknown as typeof fetch)).toMatchObject({ ok: true, base: null });
  });

  it("429 : échec avec le délai demandé par Retry-After", async () => {
    const faire = async () => new Response(null, { status: 429, headers: { "Retry-After": "30" } });
    expect(await mesurerHttp(undefined, faire as unknown as typeof fetch)).toEqual({ ok: false, reessaiMs: 30_000 });
  });

  it("erreur serveur ou réseau : échec", async () => {
    expect(await mesurerHttp(undefined, (async () => new Response(null, { status: 500 })) as unknown as typeof fetch)).toEqual({ ok: false });
    expect(await mesurerHttp(undefined, (async () => Promise.reject(new TypeError("réseau"))) as unknown as typeof fetch)).toEqual({ ok: false });
  });

  it("sans réponse en 5 s : la requête est abandonnée, échec", async () => {
    vi.useFakeTimers();
    const faire = (_url: string, init: RequestInit) =>
      new Promise<Response>((_ok, ko) => init.signal!.addEventListener("abort", () => ko(new DOMException("abandon", "AbortError"))));
    const r = mesurerHttp(undefined, faire as unknown as typeof fetch);
    await vi.advanceTimersByTimeAsync(DELAI_HTTP_MAX_MS);
    expect(await r).toEqual({ ok: false });
  });
});
