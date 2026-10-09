// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const faux = vi.hoisted(() => ({ configuree: true, requete: vi.fn() }));
vi.mock("@/lib/base/client", () => ({
  baseConfiguree: () => faux.configuree,
  base: () => ({ $queryRaw: faux.requete }),
}));

import { reinitialiserLimites } from "@/lib/rate-limit";
import { GET } from "./route";

const appel = (ip = "10.0.0.1", enTetes: Record<string, string> = { "sec-fetch-site": "same-origin" }) =>
  GET(new Request("http://localhost/api/coulisses/mesure", { headers: { "x-forwarded-for": ip, ...enTetes } }));

beforeEach(() => {
  faux.configuree = true;
  faux.requete.mockReset();
  faux.requete.mockResolvedValue([{ "?column?": 1 }]);
  reinitialiserLimites();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("GET /api/coulisses/mesure", () => {
  it("chronomètre la base et le serveur, sans cache", async () => {
    const r = await appel();
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const corps = (await r.json()) as { base: number; serveur: number };
    expect(corps).toEqual({ base: expect.any(Number), serveur: expect.any(Number) });
    expect(corps.base).toBeGreaterThanOrEqual(0);
    expect(corps.serveur).toBeGreaterThanOrEqual(corps.base);
    expect(faux.requete).toHaveBeenCalledTimes(1);
  });

  it("refuse un appel venu d'un autre site, sans toucher à la base ni au quota", async () => {
    for (const site of ["cross-site", "same-site", "none"]) {
      const r = await appel("1.2.3.4", { "sec-fetch-site": site });
      expect(r.status).toBe(403);
    }
    expect(faux.requete).not.toHaveBeenCalled();
    for (let i = 0; i < 60; i++) expect((await appel("1.2.3.4")).status).toBe(200);
  });

  it("accepte un appel sans Sec-Fetch-Site (client hors navigateur)", async () => {
    expect((await appel("10.0.0.1", {})).status).toBe(200);
  });

  it("sans base configurée : base null, aucune requête", async () => {
    faux.configuree = false;
    const corps = (await (await appel()).json()) as { base: number | null };
    expect(corps.base).toBeNull();
    expect(faux.requete).not.toHaveBeenCalled();
  });

  it("base en échec : 200, base null, aucun détail d'erreur", async () => {
    faux.requete.mockRejectedValue(new Error("connexion refusée par 10.1.2.3:5432"));
    const r = await appel();
    expect(r.status).toBe(200);
    const texte = await r.text();
    expect(texte).not.toContain("10.1.2.3");
    expect(JSON.parse(texte)).toMatchObject({ base: null });
  });

  it("base trop lente : abandon au bout de 2 s", async () => {
    vi.useFakeTimers();
    faux.requete.mockReturnValue(new Promise(() => {}));
    const reponse = appel();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(((await (await reponse).json()) as { base: number | null }).base).toBeNull();
  });

  it("une requête qui échoue après l'abandon ne laisse pas de rejet non géré", async () => {
    vi.useFakeTimers();
    let rejeter!: (e: Error) => void;
    faux.requete.mockReturnValue(new Promise((_ok, ko) => (rejeter = ko)));
    const nonGeres: unknown[] = [];
    const surRejet = (e: unknown) => nonGeres.push(e);
    process.on("unhandledRejection", surRejet);
    try {
      const reponse = appel();
      await vi.advanceTimersByTimeAsync(2_000);
      await reponse;
      vi.useRealTimers();
      rejeter(new Error("trop tard"));
      await new Promise((ok) => setTimeout(ok, 10));
      expect(nonGeres).toEqual([]);
    } finally {
      process.off("unhandledRejection", surRejet);
    }
  });

  it("au-delà de 60 requêtes par minute et par adresse : 429 avec Retry-After", async () => {
    for (let i = 0; i < 60; i++) expect((await appel("1.2.3.4")).status).toBe(200);
    const r = await appel("1.2.3.4");
    expect(r.status).toBe(429);
    expect(Number(r.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await appel("5.6.7.8")).status).toBe(200);
  });

  it("compte l'adresse ajoutée par le proxy, pas une adresse forgée en tête", async () => {
    for (let i = 0; i < 60; i++) await appel(`6.6.6.${i}, 1.2.3.4`);
    expect((await appel("7.7.7.7, 1.2.3.4")).status).toBe(429);
  });

  it("le plafond se règle par MESURE_MAX_PAR_IP (tests de bout en bout)", async () => {
    vi.stubEnv("MESURE_MAX_PAR_IP", "3");
    for (let i = 0; i < 3; i++) expect((await appel("1.2.3.4")).status).toBe(200);
    expect((await appel("1.2.3.4")).status).toBe(429);
  });
});
