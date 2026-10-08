/**
 * Budget de la démo « Suivi de marchés » : tout son JavaScript, compressé,
 * doit tenir sous 110 Kio. Prérequis : `pnpm build` à la racine.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const LIMITE = 110 * 1024;
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const dossier = join(app, "public/demo/suivi-de-marches/assets");

if (!existsSync(dossier)) {
  console.error("Démo introuvable : lancer `pnpm build` à la racine d'abord.");
  process.exit(1);
}

const fichiers = readdirSync(dossier).filter((nom) => nom.endsWith(".js"));
const total = fichiers.reduce((somme, nom) => somme + gzipSync(readFileSync(join(dossier, nom))).length, 0);

if (fichiers.length === 0) {
  console.error("Aucun fichier JavaScript dans la démo construite.");
  process.exit(1);
}
const ko = (o) => (o / 1024).toFixed(1);
console.log(`Démo : ${fichiers.length} fichier(s) JS, ${ko(total)} Ko compressés, limite ${ko(LIMITE)} Ko.`);
if (total > LIMITE) process.exit(1);
