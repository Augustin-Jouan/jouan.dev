/**
 * Mesure des coulisses : temps d'un `SELECT 1` et temps passé dans la route.
 * Le navigateur en déduit l'aller-retour. Jamais de détail d'erreur, de version
 * ni de nom d'hôte ; rien n'est stocké.
 *
 * Un `GET` simple part sans contrôle CORS : une page d'un autre site pourrait
 * épuiser le quota d'un visiteur et charger la base. Les navigateurs envoient
 * `Sec-Fetch-Site` ; tout autre valeur que `same-origin` est refusée. Sans cet
 * en-tête (client hors navigateur), il n'y a pas de visiteur à protéger : la
 * limite par adresse suffit.
 */
import { ipDeRequete } from "@/lib/ip";
import { arrondir, chronometrerBase, limiteMesure } from "@/lib/coulisses/mesure-serveur";
import { verifierLimite } from "@/lib/rate-limit";

const SANS_CACHE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const debut = performance.now();
  const site = request.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin") return new Response(null, { status: 403, headers: SANS_CACHE });
  const limite = verifierLimite(ipDeRequete(request.headers), limiteMesure());
  if (!limite.autorise) {
    return new Response(null, {
      status: 429,
      headers: { ...SANS_CACHE, "Retry-After": String(limite.secondesAvantReessai) },
    });
  }
  const baseMs = await chronometrerBase();
  return Response.json({ base: baseMs, serveur: arrondir(performance.now() - debut) }, { headers: SANS_CACHE });
}
