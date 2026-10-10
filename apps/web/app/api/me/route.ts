/**
 * Le CV au format JSON Resume (sous-projet 7), pré-rendu au build : la date du
 * build sert de `meta.lastModified`. Lisible depuis n'importe quel site.
 */
import { versJsonResume } from "@/lib/cv/json-resume";
import { construireCv } from "@/lib/cv/modele";

export const dynamic = "force-static";

export function GET() {
  const json = versJsonResume(construireCv(), new Date().toISOString().slice(0, 19));
  return new Response(`${JSON.stringify(json, null, 2)}\n`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
