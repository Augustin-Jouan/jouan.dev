/**
 * Le CV coloré (sous-projet 7), servi pour `/` aux clients en ligne de commande
 * (`curl -L jouan.dev`, réécriture de proxy.ts) ; non annoncé. `Vary: User-Agent` :
 * un cache placé devant le site ne doit pas servir ce texte à un navigateur.
 * (Next écrase `Vary` sur la page d'accueil : seul ce côté peut le porter.)
 */
import { construireCv } from "@/lib/cv/modele";
import { rendreCvTerminal } from "@/lib/cv/terminal";

export const dynamic = "force-static";

export function GET() {
  return new Response(rendreCvTerminal(construireCv(), { couleurs: true }), {
    headers: { "Content-Type": "text/plain; charset=utf-8", Vary: "User-Agent" },
  });
}
