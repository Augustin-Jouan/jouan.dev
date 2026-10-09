import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { demarrerServeur } from "./serveur.js";

const ORIGINE = "http://localhost:3000";
let serveur: Awaited<ReturnType<typeof demarrerServeur>>;

beforeEach(async () => {
  serveur = await demarrerServeur({ origines: [ORIGINE], port: 0, hote: "127.0.0.1", connexionsParIp: 5, intervalleLotMs: 10 });
});
afterEach(async () => {
  await serveur.fermer();
});

type Client = { ws: WebSocket; recus: string[]; fermeture: Promise<number> };

function ouvrir(chemin: "/sonde" | "/direct", { origine = ORIGINE, ip = "10.0.0.1" } = {}): Promise<Client> {
  const ws = new WebSocket(`ws://127.0.0.1:${serveur.port}${chemin}`, {
    headers: { origin: origine, "x-forwarded-for": ip },
  });
  const recus: string[] = [];
  ws.on("message", (d) => recus.push(String(d)));
  const fermeture = new Promise<number>((ok) => ws.once("close", (code) => ok(code)));
  return new Promise((ok, ko) => {
    ws.once("open", () => ok({ ws, recus, fermeture }));
    ws.once("unexpected-response", (_req, res) => ko(new Error(`HTTP ${res.statusCode}`)));
    ws.once("error", ko);
  });
}

async function attendre<T>(trouver: () => T | undefined, delaiMs = 2_000): Promise<T> {
  const fin = Date.now() + delaiMs;
  for (;;) {
    const r = trouver();
    if (r !== undefined) return r;
    if (Date.now() > fin) throw new Error("Message attendu non reçu");
    await new Promise((ok) => setTimeout(ok, 10));
  }
}

const bienvenue = (c: Client) => attendre(() => c.recus.find((m) => m.includes('"bienvenue"')));

describe("sonde des coulisses", () => {
  it("renvoie chaque message tel quel", async () => {
    const s = await ouvrir("/sonde");
    s.ws.send("1234.5");
    expect(await attendre(() => s.recus[0])).toBe("1234.5");
  });

  it("refuse une origine non autorisée", async () => {
    await expect(ouvrir("/sonde", { origine: "https://ailleurs.dev" })).rejects.toThrow("HTTP 403");
  });

  it("refuse la 3e sonde d'une même adresse, pas celle d'une autre", async () => {
    await ouvrir("/sonde", { ip: "1.2.3.4" });
    await ouvrir("/sonde", { ip: "1.2.3.4" });
    await expect(ouvrir("/sonde", { ip: "1.2.3.4" })).rejects.toThrow("HTTP 429");
    await ouvrir("/sonde", { ip: "5.6.7.8" });
  });

  it("une adresse forgée en tête de X-Forwarded-For ne contourne pas la limite", async () => {
    await ouvrir("/sonde", { ip: "6.6.6.1, 1.2.3.4" });
    await ouvrir("/sonde", { ip: "6.6.6.2, 1.2.3.4" });
    await expect(ouvrir("/sonde", { ip: "7.7.7.7, 1.2.3.4" })).rejects.toThrow("HTTP 429");
  });

  it("une sonde saturée n'empêche pas de rejoindre l'accueil", async () => {
    await ouvrir("/sonde", { ip: "1.2.3.4" });
    await ouvrir("/sonde", { ip: "1.2.3.4" });
    const d = await ouvrir("/direct", { ip: "1.2.3.4" });
    expect(await bienvenue(d)).toBeDefined();
  });

  it("ne compte pas dans les présents de l'accueil", async () => {
    const a = await ouvrir("/direct", { ip: "1.1.1.1" });
    await bienvenue(a);
    await ouvrir("/sonde", { ip: "2.2.2.2" });
    const b = await ouvrir("/direct", { ip: "3.3.3.3" });
    expect((JSON.parse(await bienvenue(b)) as { presents: number }).presents).toBe(2);
  });

  it("ferme sur un message de plus de 32 octets", async () => {
    const s = await ouvrir("/sonde");
    s.ws.send("é".repeat(17)); // 34 octets en UTF-8
    expect(await s.fermeture).toBe(1008);
  });

  it("ferme sur un message binaire", async () => {
    const s = await ouvrir("/sonde");
    s.ws.send(Buffer.from([1, 2, 3]));
    expect(await s.fermeture).toBe(1003);
  });

  it("ferme au-delà de 5 messages par seconde", async () => {
    const s = await ouvrir("/sonde");
    for (let i = 0; i < 6; i++) s.ws.send(String(i));
    expect(await s.fermeture).toBe(1008);
  });

  it("le plafond par adresse se règle (tests de bout en bout)", async () => {
    await serveur.fermer();
    serveur = await demarrerServeur({ origines: [ORIGINE], port: 0, hote: "127.0.0.1", sondeParIp: 3 });
    for (let i = 0; i < 3; i++) await ouvrir("/sonde", { ip: "1.2.3.4" });
    await expect(ouvrir("/sonde", { ip: "1.2.3.4" })).rejects.toThrow("HTTP 429");
  });

  it("refuse la 101e sonde, toutes adresses confondues", async () => {
    await serveur.fermer();
    serveur = await demarrerServeur({ origines: [ORIGINE], port: 0, hote: "127.0.0.1", sondeParIp: 1_000 });
    await Promise.all(Array.from({ length: 100 }, () => ouvrir("/sonde")));
    await expect(ouvrir("/sonde")).rejects.toThrow("HTTP 429");
  });

  it("libère sa place à la fermeture", async () => {
    const s1 = await ouvrir("/sonde", { ip: "1.2.3.4" });
    await ouvrir("/sonde", { ip: "1.2.3.4" });
    s1.ws.close();
    await s1.fermeture;
    const fin = Date.now() + 2_000;
    for (;;) {
      try {
        await ouvrir("/sonde", { ip: "1.2.3.4" });
        break;
      } catch (e) {
        if (Date.now() > fin) throw e;
        await new Promise((ok) => setTimeout(ok, 20));
      }
    }
  });
});
