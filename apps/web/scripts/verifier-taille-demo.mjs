/**
 * Budget de la démo « Suivi de marchés » : son fichier (HTML, CSS et JavaScript
 * intégrés), compressé, doit tenir sous 110 Kio. Les polices n'y comptent pas.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const LIMITE = 110 * 1024;
const fichier = join(dirname(fileURLToPath(import.meta.url)), "..", "public/demo/suivi-de-marches/index.html");

if (!existsSync(fichier)) {
  console.error("Démo introuvable : public/demo/suivi-de-marches/index.html.");
  process.exit(1);
}

const taille = gzipSync(readFileSync(fichier)).length;
const ko = (o) => (o / 1024).toFixed(1);
console.log(`Démo : ${ko(taille)} Ko compressés, limite ${ko(LIMITE)} Ko.`);
if (taille > LIMITE) process.exit(1);
