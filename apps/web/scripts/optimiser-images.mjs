/**
 * Réduit les photos et logos de `public/images` avant de les commiter :
 * un smartphone livre du 4000 px et 2 à 4 Mo par photo, alors qu'une photo
 * plein écran n'a pas besoin de plus de 2048 px. next/image redimensionne à
 * la volée, mais le fichier source reste dans le dépôt et dans l'image
 * Docker.
 *
 * Usage : node scripts/optimiser-images.mjs [fichier ...]
 * Sans argument, parcourt tout `public/images`. Les fichiers déjà en dessous
 * des seuils sont laissés tels quels.
 */
import { readdir, rename, stat } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER = join(ROOT, "public/images");

/** Largeur/hauteur maximale d'une photo, taille maximale raisonnable pour une photo plein écran. */
const COTE_MAX = 2048;
/** Au-delà, une image est reprise même si ses dimensions sont correctes. */
const POIDS_MAX = 500 * 1024;
const QUALITE_JPEG = 82;

async function* parcourir(dossier) {
  for (const entree of await readdir(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) yield* parcourir(chemin);
    else if (/\.(jpe?g|png|webp)$/i.test(entree.name)) yield chemin;
  }
}

async function optimiser(chemin) {
  const { size: poidsAvant } = await stat(chemin);
  const meta = await sharp(chemin).metadata();
  const tropGrand = meta.width > COTE_MAX || meta.height > COTE_MAX;
  if (!tropGrand && poidsAvant <= POIDS_MAX) return;

  let pipeline = sharp(chemin).rotate(); // applique l'orientation EXIF
  if (tropGrand) {
    pipeline = pipeline.resize(COTE_MAX, COTE_MAX, { fit: "inside", withoutEnlargement: true });
  }

  const ext = extname(chemin).toLowerCase();
  if (ext === ".png") pipeline = pipeline.png({ compressionLevel: 9, palette: !meta.hasAlpha });
  else if (ext === ".webp") pipeline = pipeline.webp({ quality: QUALITE_JPEG });
  else pipeline = pipeline.jpeg({ quality: QUALITE_JPEG, mozjpeg: true });

  const temporaire = `${chemin}.tmp`;
  const sortie = await pipeline.toFile(temporaire);
  await rename(temporaire, chemin);

  const ko = (n) => `${Math.round(n / 1024)} Ko`;
  console.log(
    `${chemin.replace(`${ROOT}/`, "")} : ${meta.width}×${meta.height} ${ko(poidsAvant)} → ${sortie.width}×${sortie.height} ${ko(sortie.size)}`
  );
}

const cibles = process.argv.slice(2);
if (cibles.length === 0) {
  for await (const chemin of parcourir(DOSSIER)) await optimiser(chemin);
} else {
  for (const cible of cibles) await optimiser(resolve(process.cwd(), cible));
}
