/** Le CV en texte brut, sans couleur (sous-projet 7) : `curl -L jouan.dev/cv.txt`. */
import { construireCv } from "@/lib/cv/modele";
import { rendreCvTerminal } from "@/lib/cv/terminal";

export const dynamic = "force-static";

export function GET() {
  return new Response(rendreCvTerminal(construireCv(), { couleurs: false }), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
