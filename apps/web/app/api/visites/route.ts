/**
 * Signal d'ouverture d'un lien personnalisé (components/accueil/SignalVisite).
 * Répond toujours 204, sans corps : la réponse ne dit pas si le jeton existe.
 * Le travail (base, mail) se fait après la réponse.
 */
import { after } from "next/server";
import { estJetonValide, LONGUEUR_JETON_MAX } from "@/lib/liens/jeton";
import { traiterVisite } from "@/lib/liens/traitement";
import { appareilDepuis, estRobot } from "@/lib/liens/visites";

const vide = () => new Response(null, { status: 204 });
const TAILLE_MAX = 256;

/** Lit le corps en s'arrêtant au-delà de TAILLE_MAX octets (null si trop long ou absent). */
async function lireCorps(request: Request): Promise<string | null> {
  if (!request.body) return null;
  const lecteur = request.body.getReader();
  const morceaux: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.byteLength;
    if (total > TAILLE_MAX) {
      await lecteur.cancel();
      return null;
    }
    morceaux.push(value);
  }
  const tout = new Uint8Array(total);
  let decalage = 0;
  for (const m of morceaux) {
    tout.set(m, decalage);
    decalage += m.byteLength;
  }
  return new TextDecoder().decode(tout);
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > TAILLE_MAX) return vide();
  const corps = await lireCorps(request);
  if (corps === null) return vide();
  const jeton = corps.trim();
  const ua = request.headers.get("user-agent");
  if (jeton.length > LONGUEUR_JETON_MAX || !estJetonValide(jeton) || estRobot(ua)) return vide();
  const appareil = appareilDepuis(request.headers.get("sec-ch-ua-mobile"), ua);
  after(() => traiterVisite(jeton, appareil));
  return vide();
}
