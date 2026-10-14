/**
 * Service temps réel de l'accueil : `/sante` pour les sondes de l'hébergeur, `/direct` pour le
 * compteur des personnes présentes sur l'accueil, `/sonde` pour l'écho de la page des
 * coulisses (hors du compte). Rien n'est journalisé qui permette d'identifier un visiteur.
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
import { encoder, TAILLE_MAX_MESSAGE, type MessageServeur } from "./protocole.js";

export type OptionsServeur = {
  origines: string[];
  port?: number;
  hote?: string;
  connexionsParIp?: number;
  sondeParIp?: number;
  intervallePingMs?: number;
};

type Connecte = { ws: WSContext<WebSocket>; vivant: boolean };

export async function demarrerServeur(options: OptionsServeur): Promise<{ port: number; fermer(): Promise<void> }> {
  const gardien = new Gardien(CONNEXIONS_MAX, options.connexionsParIp ?? CONNEXIONS_PAR_IP);
  /** Les présents de l'accueil : leur nombre est tout ce que le service partage. */
  const connectes = new Set<Connecte>();
  const gardienSonde = new Gardien(SONDE_CONNEXIONS_MAX, options.sondeParIp ?? SONDE_CONNEXIONS_PAR_IP);
  const sondes = new Set<Connecte>();

  const diffuser = (message: MessageServeur, sauf?: Connecte) => {
    const texte = encoder(message);
    for (const c of connectes) if (c !== sauf) envoyer(c.ws, texte, FILE_ENVOI_MAX);
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
      let connecte: Connecte | null = null;
      return {
        onOpen(_evt, ws) {
          // Une autre connexion a pu prendre la dernière place entre le contrôle et l'ouverture.
          if (!gardien.admettre(ip)) {
            ws.close(1013, "Trop de connexions");
            return;
          }
          const nouveau: Connecte = { ws: ws as WSContext<WebSocket>, vivant: true };
          connecte = nouveau;
          connectes.add(nouveau);
          nouveau.ws.raw?.on("pong", () => {
            nouveau.vivant = true;
          });
          ws.send(encoder({ type: "bienvenue", presents: connectes.size }));
          diffuser({ type: "presents", nombre: connectes.size }, nouveau);
        },
        // Le navigateur n'a rien à envoyer : un message est ignoré, mais la taille et le débit
        // restent bornés (une page ouverte sur une ancienne version envoie encore des positions).
        onMessage(evt, ws) {
          if (!connecte) return;
          if (typeof evt.data !== "string" || Buffer.byteLength(evt.data) > TAILLE_MAX_MESSAGE) {
            ws.close(1008, "Message trop long");
            return;
          }
          if (!debit.accepter(Date.now())) ws.close(1008, "Trop de messages");
        },
        onClose() {
          if (!connecte) return;
          gardien.liberer(ip);
          connectes.delete(connecte);
          diffuser({ type: "presents", nombre: connectes.size });
          connecte = null;
        },
      };
    }),
  );

  // Écho pour la page des coulisses : mesure l'aller-retour, sans compter parmi les présents.
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

  // Une connexion qui ne répond plus au ping depuis le précédent est coupée.
  const pings = setInterval(() => {
    for (const c of [...connectes, ...sondes]) {
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
      clearInterval(pings);
      for (const c of connectes) c.ws.close(1001, "Arrêt du service");
      for (const c of sondes) c.ws.close(1001, "Arrêt du service");
      await new Promise<void>((ok) => serveur.close(() => ok()));
    },
  };
}
