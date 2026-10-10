/**
 * Trois rôles, et seulement sur ces adresses (voir `config.matcher`) :
 * - `/` demandé par un client en ligne de commande (`curl -L jouan.dev`) est
 *   réécrit vers le CV coloré `/cv.ansi`, y compris avec `?pour=` ; les
 *   navigateurs ne passent pas par ici et l'accueil reste statique ;
 * - `/?pour=<jeton>` est réécrit vers la page personnalisée `/pour/<jeton>`,
 *   l'adresse affichée ne change pas ; l'accueil sans paramètre reste statique ;
 * - `/admin/*` exige une session valide, sauf la page de connexion. Chaque page
 *   et action de l'administration revérifie la session côté serveur.
 */
import { NextResponse, type NextRequest } from "next/server";
import { NOM_COOKIE, secretSession, verifierSession } from "@/lib/admin/session";
import { estClientTerminal } from "@/lib/cv/client-terminal";
import { estJetonValide } from "@/lib/liens/jeton";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/" && estClientTerminal(request.headers.get("user-agent"))) {
    const cv = request.nextUrl.clone();
    cv.pathname = "/cv.ansi";
    cv.search = "";
    return NextResponse.rewrite(cv);
  }

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/connexion") return NextResponse.next();
    const secret = secretSession();
    if (secret && verifierSession(request.cookies.get(NOM_COOKIE)?.value, secret)) return NextResponse.next();
    // Hôte de la requête telle que Next la reconstruit (pas `request.url`, interne derrière le reverse proxy) ;
    // construit à neuf pour éviter de boucler sur un `/` final.
    return NextResponse.redirect(new URL("/admin/connexion", request.nextUrl));
  }

  const jeton = searchParams.get("pour") ?? "";
  if (!estJetonValide(jeton)) return NextResponse.next();
  const cible = request.nextUrl.clone();
  cible.pathname = `/pour/${jeton}`;
  cible.searchParams.delete("pour");
  return NextResponse.rewrite(cible);
}

export const config = {
  // Valeurs littérales seulement (lues au build) : le motif du User-Agent est
  // celui de MOTIF_CLIENT_TERMINAL (lib/cv/client-terminal.ts), vérifié par proxy.test.ts.
  matcher: [
    { source: "/", has: [{ type: "header", key: "user-agent", value: "(curl|Wget|HTTPie|xh)/.*" }] },
    { source: "/", has: [{ type: "query", key: "pour" }] },
    "/admin/:path*",
  ],
};
