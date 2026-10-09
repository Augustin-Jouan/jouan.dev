import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";

/**
 * Envoie `texte`, sauf si le client ne lit plus : au-delà de `max` octets en
 * attente d'envoi, la connexion est coupée. Sans ce plafond, un client qui
 * écrit sans jamais lire ferait grossir la mémoire du service sans limite (le
 * ping ne suffit pas : un pong envoyé spontanément le garde « vivant »).
 */
export function envoyer(ws: WSContext<WebSocket>, texte: string, max: number): boolean {
  if ((ws.raw?.bufferedAmount ?? 0) > max) {
    ws.raw?.terminate();
    return false;
  }
  ws.send(texte);
  return true;
}
