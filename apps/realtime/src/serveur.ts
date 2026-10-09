/**
 * Service temps réel de l'accueil : `/sante` pour les sondes, `/direct` pour le
 * WebSocket. Une seule salle en mémoire ; les positions sont regroupées en lots
 * toutes les `intervalleLotMs`, et seuls les curseurs qui ont bougé partent.
 * Rien n'est journalisé qui permette d'identifier un visiteur (ni IP, ni position).
 */
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { serve, upgradeWebSocket } from "@hono/node-server";
import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono, type Context } from "hono";
import type { WSContext } from "hono/ws";
import { WebSocketServer, type WebSocket } from "ws";
import { CONNEXIONS_MAX, CONNEXIONS_PAR_IP, Debit, Gardien } from "./limites.js";
import { ipDuClient, origineAutorisee } from "./origines.js";
import { encoder, lireMessage, TAILLE_MAX_MESSAGE, type MessageServeur } from "./protocole.js";
import { Salle } from "./salle.js";

export type OptionsServeur = {
  origines: string[];
  port?: number;
  hote?: string;
  connexionsParIp?: number;
  intervalleLotMs?: number;
  intervallePingMs?: number;
};

type Connecte = { ws: WSContext<WebSocket>; vivant: boolean };

export async function demarrerServeur(options: OptionsServeur): Promise<{ port: number; fermer(): Promise<void> }> {
  const salle = new Salle();
  const gardien = new Gardien(CONNEXIONS_MAX, options.connexionsParIp ?? CONNEXIONS_PAR_IP);
  const connectes = new Map<string, Connecte>();

  const diffuser = (message: MessageServeur, sauf?: string) => {
    const texte = encoder(message);
    for (const [id, c] of connectes) if (id !== sauf) c.ws.send(texte);
  };
  const ipDe = (c: Context) => ipDuClient(c.req.header("x-forwarded-for"), getConnInfo(c).remote.address);

  const app = new Hono();
  app.get("/sante", (c) => c.text("ok"));
  app.get(
    "/direct",
    async (c, next) => {
      if (!origineAutorisee(c.req.header("origin"), options.origines)) {
        console.warn("[direct] Connexion refusée : origine non autorisée.");
        return c.text("Origine refusée", 403);
      }
      if (!gardien.peutAdmettre(ipDe(c))) return c.text("Trop de connexions", 429);
      await next();
    },
    upgradeWebSocket((c) => {
      const ip = ipDe(c);
      const debit = new Debit();
      let id: string | null = null;
      return {
        onOpen(_evt, ws) {
          // Une autre connexion a pu prendre la dernière place entre le contrôle et l'ouverture.
          if (!gardien.admettre(ip)) {
            ws.close(1013, "Trop de connexions");
            return;
          }
          const arrivee = salle.rejoindre();
          id = arrivee.id;
          const connecte: Connecte = { ws: ws as WSContext<WebSocket>, vivant: true };
          connectes.set(id, connecte);
          connecte.ws.raw?.on("pong", () => {
            connecte.vivant = true;
          });
          ws.send(encoder({ type: "bienvenue", id, couleur: arrivee.couleur, presents: salle.nombre, curseurs: salle.curseurs(id) }));
          diffuser({ type: "presents", nombre: salle.nombre }, id);
        },
        onMessage(evt, ws) {
          if (id === null) return;
          if (typeof evt.data !== "string" || Buffer.byteLength(evt.data) > TAILLE_MAX_MESSAGE) {
            ws.close(1008, "Message trop long");
            return;
          }
          if (!debit.accepter(Date.now())) {
            ws.close(1008, "Trop de messages");
            return;
          }
          const message = lireMessage(evt.data);
          if (!message) return;
          if (message.type === "position") salle.deplacer(id, message.s, message.x, message.y);
          else if (salle.masquer(id)) diffuser({ type: "depart", id }, id);
        },
        onClose() {
          if (id === null) return;
          gardien.liberer(ip);
          connectes.delete(id);
          if (salle.quitter(id)) diffuser({ type: "depart", id });
          diffuser({ type: "presents", nombre: salle.nombre });
          id = null;
        },
      };
    }),
  );

  const lots = setInterval(() => {
    const lot = salle.extraireLot();
    if (lot.length === 0) return;
    for (const [id, c] of connectes) {
      const autres = lot.filter((curseur) => curseur[0] !== id);
      if (autres.length > 0) c.ws.send(encoder({ type: "positions", curseurs: autres }));
    }
  }, options.intervalleLotMs ?? 50);

  // Une connexion qui ne répond plus au ping depuis le précédent est coupée.
  const pings = setInterval(() => {
    for (const c of connectes.values()) {
      if (!c.vivant) {
        c.ws.raw?.terminate();
        continue;
      }
      c.vivant = false;
      c.ws.raw?.ping();
    }
  }, options.intervallePingMs ?? 30_000);

  const wss = new WebSocketServer({ noServer: true, maxPayload: 1_024 });
  const serveur = serve({
    fetch: app.fetch,
    port: options.port ?? 3001,
    hostname: options.hote ?? "0.0.0.0",
    websocket: { server: wss },
  });
  await once(serveur, "listening");

  return {
    port: (serveur.address() as AddressInfo).port,
    async fermer() {
      clearInterval(lots);
      clearInterval(pings);
      for (const c of connectes.values()) c.ws.close(1001, "Arrêt du service");
      await new Promise<void>((ok) => serveur.close(() => ok()));
    },
  };
}
