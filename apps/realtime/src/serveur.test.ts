import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import type { MessageServeur } from "./protocole.js";
import { demarrerServeur } from "./serveur.js";

const ORIGINE = "http://localhost:3000";
let serveur: Awaited<ReturnType<typeof demarrerServeur>>;

beforeEach(async () => {
  serveur = await demarrerServeur({ origines: [ORIGINE], port: 0, hote: "127.0.0.1", connexionsParIp: 5, intervalleLotMs: 10 });
});
afterEach(async () => {
  await serveur.fermer();
});

type Client = { ws: WebSocket; messages: MessageServeur[]; fermeture: Promise<number> };

function connecter({ origine = ORIGINE, ip = "10.0.0.1" } = {}): Promise<Client> {
  const ws = new WebSocket(`ws://127.0.0.1:${serveur.port}/direct`, {
    headers: { origin: origine, "x-forwarded-for": ip },
  });
  const messages: MessageServeur[] = [];
  ws.on("message", (d) => messages.push(JSON.parse(String(d)) as MessageServeur));
  const fermeture = new Promise<number>((ok) => ws.once("close", (code) => ok(code)));
  return new Promise((ok, ko) => {
    ws.once("open", () => ok({ ws, messages, fermeture }));
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

const dernier = <T extends MessageServeur["type"]>(c: Client, type: T) =>
  c.messages.filter((m): m is Extract<MessageServeur, { type: T }> => m.type === type).at(-1);

describe("serveur temps réel", () => {
  it("répond sur /sante", async () => {
    const r = await fetch(`http://127.0.0.1:${serveur.port}/sante`);
    expect(r.status).toBe(200);
  });

  it("refuse une origine non autorisée", async () => {
    await expect(connecter({ origine: "https://ailleurs.dev" })).rejects.toThrow("HTTP 403");
  });

  it("refuse la 6e connexion d'une même adresse", async () => {
    for (let i = 0; i < 5; i++) await connecter({ ip: "1.2.3.4" });
    await expect(connecter({ ip: "1.2.3.4" })).rejects.toThrow("HTTP 429");
    await connecter({ ip: "5.6.7.8" });
  });

  it("une adresse forgée en tête de X-Forwarded-For ne contourne pas la limite", async () => {
    for (let i = 0; i < 5; i++) await connecter({ ip: `6.6.6.${i}, 1.2.3.4` });
    await expect(connecter({ ip: "7.7.7.7, 1.2.3.4" })).rejects.toThrow("HTTP 429");
  });

  it("accueille avec un identifiant, une couleur et le nombre de présents", async () => {
    const a = await connecter();
    const bienvenue = await attendre(() => dernier(a, "bienvenue"));
    expect(bienvenue.presents).toBe(1);
    expect(bienvenue.id).toMatch(/^[0-9a-f]{8}$/);
    expect(bienvenue.couleur).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("diffuse le compteur et les positions, sans écho à l'émetteur", async () => {
    const a = await connecter({ ip: "1.1.1.1" });
    const b = await connecter({ ip: "2.2.2.2" });
    const idA = (await attendre(() => dernier(a, "bienvenue"))).id;
    await attendre(() => (dernier(a, "presents")?.nombre === 2 ? true : undefined));

    a.ws.send(JSON.stringify({ type: "position", s: 1, x: 0.5, y: 0.25 }));
    const lot = await attendre(() => dernier(b, "positions"));
    expect(lot.curseurs).toEqual([[idA, expect.any(String), 1, 0.5, 0.25]]);
    await new Promise((ok) => setTimeout(ok, 50));
    expect(a.messages.some((m) => m.type === "positions")).toBe(false);
  });

  it("donne les curseurs déjà visibles à l'arrivée", async () => {
    const a = await connecter({ ip: "1.1.1.1" });
    const idA = (await attendre(() => dernier(a, "bienvenue"))).id;
    a.ws.send(JSON.stringify({ type: "position", s: 0, x: 0.1, y: 0.2 }));
    await new Promise((ok) => setTimeout(ok, 50));
    const b = await connecter({ ip: "2.2.2.2" });
    const bienvenue = await attendre(() => dernier(b, "bienvenue"));
    expect(bienvenue.curseurs).toEqual([[idA, expect.any(String), 0, 0.1, 0.2]]);
  });

  it("annonce le masque puis le départ", async () => {
    const a = await connecter({ ip: "1.1.1.1" });
    const b = await connecter({ ip: "2.2.2.2" });
    const idA = (await attendre(() => dernier(a, "bienvenue"))).id;
    a.ws.send(JSON.stringify({ type: "position", s: 0, x: 0.5, y: 0.5 }));
    await attendre(() => dernier(b, "positions"));
    a.ws.send(JSON.stringify({ type: "masque" }));
    expect((await attendre(() => dernier(b, "depart"))).id).toBe(idA);
    a.ws.close();
    await attendre(() => (dernier(b, "presents")?.nombre === 1 ? true : undefined));
  });

  it("ignore un message mal formé sans fermer la connexion", async () => {
    const a = await connecter({ ip: "1.1.1.1" });
    const b = await connecter({ ip: "2.2.2.2" });
    a.ws.send("pas du json");
    a.ws.send(JSON.stringify({ type: "position", s: 0, x: 3, y: 0 }));
    await new Promise((ok) => setTimeout(ok, 50));
    expect(a.ws.readyState).toBe(WebSocket.OPEN);
    expect(b.messages.some((m) => m.type === "positions")).toBe(false);
  });

  it("ferme sur un message trop long (1008)", async () => {
    const a = await connecter();
    a.ws.send("x".repeat(200));
    expect(await a.fermeture).toBe(1008);
  });

  it("ferme sur un débit excessif (1008)", async () => {
    const a = await connecter();
    for (let i = 0; i < 60; i++) a.ws.send('{"type":"masque"}');
    expect(await a.fermeture).toBe(1008);
  });

  it("libère la place à la fermeture", async () => {
    const clients = [];
    for (let i = 0; i < 5; i++) clients.push(await connecter({ ip: "3.3.3.3" }));
    clients[0]!.ws.close();
    await clients[0]!.fermeture;
    await new Promise((ok) => setTimeout(ok, 20));
    await connecter({ ip: "3.3.3.3" });
  });
});
