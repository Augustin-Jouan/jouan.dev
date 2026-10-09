/**
 * Service temps réel de l'accueil : `/sante` pour les sondes de l'hébergeur, `/direct` pour le
 * WebSocket de l'accueil, `/sonde` pour l'écho de la page des coulisses (hors de la salle).
 * Une seule salle en mémoire ; les positions sont regroupées en lots
 * toutes les `intervalleLotMs`, et seuls les curseurs qui ont bougé partent.
 * Rien n'est journalisé qui permette d'identifier un visiteur (ni IP, ni position).
 */
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { serve, upgradeWebSocket } from "@hono/node-server";
import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono, type Context, type Next } from "hono";
import type { WSContext } from "hono/ws";
import { WebSocketServer, type WebSocket } from "ws";
import {
  CONNEXIONS_MAX,
  CONNEXIONS_PAR_IP,
  Debit,
  FILE_ENVOI_MAX,
  Gardien,
  SONDE_CONNEXIONS_MAX,
  SONDE_CONNEXIONS_PAR_IP,
  SONDE_FILE_ENVOI_MAX,
  SONDE_MESSAGES_PAR_SECONDE,
  SONDE_TAILLE_MAX,
} from "./limites.js";
import { envoyer } from "./envoi.js";
import { ipDuClient, origineAutorisee } from "./origines.js";
import { encoder, lireMessage, TAILLE_MAX_MESSAGE, type MessageServeur } from "./protocole.js";
import { Salle } from "./salle.js";

export type OptionsServeur = {
  origines: string[];
  port?: number;
  hote?: string;
  connexionsParIp?: number;
  sondeParIp?: number;
  intervalleLotMs?: number;
  intervallePingMs?: number;
};

type Connecte = { ws: WSContext<WebSocket>; vivant: boolean };

export async function demarrerServeur(options: OptionsServeur): Promise<{ port: number; fermer(): Promise<void> }> {
  const salle = new Salle();
  const gardien = new Gardien(CONNEXIONS_MAX, options.connexionsParIp ?? CONNEXIONS_PAR_IP);
  const connectes = new Map<string, Connecte>();
  const gardienSonde = new Gardien(SONDE_CONNEXIONS_MAX, options.sondeParIp ?? SONDE_CONNEXIONS_PAR_IP);
  const sondes = new Set<Connecte>();

  const diffuser = (message: MessageServeur, sauf?: string) => {
    const texte = encoder(message);
    for (const [id, c] of connectes) if (id !== sauf) envoyer(c.ws, texte, FILE_ENVOI_MAX);
  };
  const ipDe = (c: Context) => ipDuClient(c.req.header("x-forwarded-for"), getConnInfo(c).remote.address);

  // Avant la mise à niveau WebSocket : une réponse ici refuse la connexion avec ce statut.
  const filtrer = (nom: string, g: Gardien) => async (c: Context, next: Next) => {
    if (!origineAutorisee(c.req.header("origin"), options.origines)) {
      console.warn(`[${nom}] Connexion refusée : origine non autorisée.`);
      return c.text("Origine refusée", 403);
    }
    if (!g.peutAdmettre(ipDe(c))) return c.text("Trop de connexions", 429);
    await next();
  };

  const app = new Hono();
  app.get("/sante", (c) => c.text("ok"));
  app.get(
    "/direct",
    filtrer("direct", gardien),
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

  // Écho pour la page des coulisses : mesure l'aller-retour, sans rejoindre la salle.
  app.get(
    "/sonde",
    filtrer("sonde", gardienSonde),
    upgradeWebSocket((c) => {
      const ip = ipDe(c);
      const debit = new Debit(SONDE_MESSAGES_PAR_SECONDE);
      let connecte: Connecte | null = null;
      return {
        onOpen(_evt, ws) {
          if (!gardienSonde.admettre(ip)) {
            ws.close(1013, "Trop de connexions");
            return;
          }
          const nouveau: Connecte = { ws: ws as WSContext<WebSocket>, vivant: true };
          connecte = nouveau;
          sondes.add(nouveau);
          nouveau.ws.raw?.on("pong", () => {
            nouveau.vivant = true;
          });
        },
        onMessage(evt, ws) {
          if (!connecte) return;
          if (typeof evt.data !== "string") {
            ws.close(1003, "Texte seulement");
            return;
          }
          if (Buffer.byteLength(evt.data) > SONDE_TAILLE_MAX) {
            ws.close(1008, "Message trop long");
            return;
          }
          if (!debit.accepter(Date.now())) {
            ws.close(1008, "Trop de messages");
            return;
          }
          envoyer(ws as WSContext<WebSocket>, evt.data, SONDE_FILE_ENVOI_MAX);
        },
        onClose() {
          if (!connecte) return;
          gardienSonde.liberer(ip);
          sondes.delete(connecte);
          connecte = null;
        },
      };
    }),
  );

  const lots = setInterval(() => {
    const lot = salle.extraireLot();
    if (lot.length === 0) return;
    for (const [id, c] of connectes) {
      const autres = lot.filter((curseur) => curseur[0] !== id);
      if (autres.length > 0) envoyer(c.ws, encoder({ type: "positions", curseurs: autres }), FILE_ENVOI_MAX);
    }
  }, options.intervalleLotMs ?? 50);

  // Une connexion qui ne répond plus au ping depuis le précédent est coupée.
  const pings = setInterval(() => {
    for (const c of [...connectes.values(), ...sondes]) {
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
      for (const c of sondes) c.ws.close(1001, "Arrêt du service");
      await new Promise<void>((ok) => serveur.close(() => ok()));
    },
  };
}
