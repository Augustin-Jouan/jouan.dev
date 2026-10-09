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

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 256) return vide();
  const jeton = (await request.text()).trim();
  const ua = request.headers.get("user-agent");
  if (jeton.length > LONGUEUR_JETON_MAX || !estJetonValide(jeton) || estRobot(ua)) return vide();
  const appareil = appareilDepuis(request.headers.get("sec-ch-ua-mobile"), ua);
  after(() => traiterVisite(jeton, appareil));
  return vide();
}
