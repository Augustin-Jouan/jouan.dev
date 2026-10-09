/**
 * `build-info.json` : écrit par la CI avant le build de l'image (tâche CI
 * « image »), ignoré par Git, lu ici au build — la page des coulisses reste
 * statique. Absent (build local) ou invalide : `null`, et la section
 * « Dernier déploiement » le dit.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validerInfosBuild, type InfosBuild } from "./infos-build.mjs";

export type { InfosBuild };
export const FICHIER_BUILD_INFO = "build-info.json";

/** Le build du site s'exécute dans `apps/web` (`pnpm --filter web build`, en CI comme dans l'image). */
export function lireBuildInfo(dossier: string = process.cwd()): InfosBuild | null {
  let brut: string;
  try {
    brut = readFileSync(join(dossier, FICHIER_BUILD_INFO), "utf8");
  } catch {
    return null;
  }
  let infos: InfosBuild | null = null;
  try {
    infos = validerInfosBuild(JSON.parse(brut));
  } catch {
    infos = null;
  }
  if (!infos) console.warn(`[coulisses] ${FICHIER_BUILD_INFO} invalide : section « Dernier déploiement » en repli.`);
  return infos;
}
