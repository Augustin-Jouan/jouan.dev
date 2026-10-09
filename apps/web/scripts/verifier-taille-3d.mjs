/**
 * Vérifie que la vue 3D des coulisses (module scene3d, Three.js et ses
 * modules complémentaires), chargée au clic sur « Voir en 3D », reste sous
 * 180 Ko compressés. Les morceaux comptés sont repérés par des signatures qui
 * survivent à la minification : le marqueur de scene3d.ts, la clé `__THREE__`
 * posée par Three.js, et des noms de propriétés de CSS2DRenderer et
 * d'OrbitControls. Le test de bout en bout de la 3D vérifie que chaque morceau
 * chargé au clic porte bien l'une d'elles : le graphe réel est donc compté.
 *
 * Usage : pnpm --filter web verifier-taille-3d   (après `pnpm build`)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const LIMITE = 180 * 1024;
const MARQUEUR = "scene-3d:v1";
export const SIGNATURES_3D = [MARQUEUR, "__THREE__", "isCSS2DObject", "autoRotateSpeed"];

/** Ce code fait-il partie de la vue 3D ? */
export const contientVue3d = (code) => SIGNATURES_3D.some((s) => code.includes(s));

function* fichiersJs(chemin) {
  for (const nom of readdirSync(chemin)) {
    const complet = join(chemin, nom);
    if (statSync(complet).isDirectory()) yield* fichiersJs(complet);
    else if (nom.endsWith(".js")) yield complet;
  }
}

const lanceDirectement = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (lanceDirectement) {
  const app = join(dirname(fileURLToPath(import.meta.url)), "..");
  const dossier = join(app, ".next/static/chunks");
  if (!existsSync(dossier)) {
    console.error("Build introuvable (.next/static/chunks) : lancer pnpm build.");
    process.exit(1);
  }
  const morceaux = [...fichiersJs(dossier)].filter((f) => contientVue3d(readFileSync(f, "utf8")));
  if (!morceaux.some((f) => readFileSync(f, "utf8").includes(MARQUEUR))) {
    console.error("Morceau de la vue 3D introuvable : lancer pnpm build.");
    process.exit(1);
  }
  let total = 0;
  for (const f of morceaux) {
    const taille = gzipSync(readFileSync(f)).length;
    total += taille;
    console.log(`  ${relative(app, f)} : ${(taille / 1024).toFixed(1)} Ko compressés`);
  }
  console.log(`Vue 3D des coulisses : ${(total / 1024).toFixed(1)} Ko compressés, limite ${LIMITE / 1024} Ko.`);
  if (total > LIMITE) process.exit(1);
}
