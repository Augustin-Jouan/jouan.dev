/**
 * Liste les placeholders `[…]` qui restent dans `data/` et `app/` : un site
 * ne doit pas partir en production avec « [Nom de l'entreprise] » dans le
 * pied de page.
 *
 * Usage : npm run verifier-placeholders   (code de sortie 1 s'il en reste)
 *
 * Dans le template lui-même, la commande échoue par construction. La ligne
 * qui l'appelle dans .github/workflows/ci.yml est livrée commentée : la
 * décommenter au démarrage d'un site (étape 6 du README).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Un placeholder est un crochet ouvrant, non collé à un identifiant, dont le
 * contenu comporte une majuscule, un chiffre, `+`, `@` ou une espace, sans
 * virgule jusqu'au crochet fermant : `[Nom]`, `[À compléter]`,
 * `[01 23 45 67 89]`, `[+33123456789]`, `[contact@exemple.fr]`.
 * Sont donc ignorés `string[]`, `liste[0]`, `[slug]` et les listes `[1, 2]`.
 * Un contenu purement numérique (`[0]`, `[42]`) n'est jamais un placeholder.
 * Les valeurs arbitraires Tailwind (`w-[200px]`, `top-[50%]`) sont collées à
 * un tiret et sont ignorées aussi.
 * Un placeholder ne doit pas contenir de virgule. Les classes de caractères
 * d'une regex (`/[A-Z]{2}/`) seraient signalées : les écrire hors de `data/`
 * et `app/`, ou marquer la ligne `placeholder-ok`.
 * Une ligne qui doit légitimement contenir des crochets se marque
 * `// placeholder-ok` (c'est le cas de la définition de `A_COMPLETER`).
 */
const PLACEHOLDER =
  /(?<![\w\]-])\[(?![0-9]+\])(?=[^\]]*[A-ZÀ-Ý0-9+@ ])[^\],]*\]/;

const EXTENSIONS = /\.(ts|tsx|mjs|css|md)$/;

function* fichiers(dossier) {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) yield* fichiers(chemin);
    else if (EXTENSIONS.test(nom) && !nom.includes(".test.")) yield chemin;
  }
}

/** @returns {{ fichier: string, ligne: number, texte: string }[]} */
export function trouverPlaceholders(racine, dossiers) {
  const resultat = [];
  for (const dossier of dossiers) {
    for (const chemin of fichiers(join(racine, dossier))) {
      readFileSync(chemin, "utf8")
        .split("\n")
        .forEach((texte, index) => {
          if (PLACEHOLDER.test(texte) && !texte.includes("placeholder-ok")) {
            resultat.push({ fichier: relative(racine, chemin), ligne: index + 1, texte: texte.trim() });
          }
        });
    }
  }
  return resultat;
}

const lanceDirectement = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (lanceDirectement) {
  const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
  const restants = trouverPlaceholders(racine, ["data", "app"]);
  if (restants.length === 0) {
    console.log("Aucun placeholder restant.");
  } else {
    console.error(`${restants.length} placeholder(s) à remplacer :`);
    for (const { fichier, ligne, texte } of restants) console.error(`  ${fichier}:${ligne}  ${texte}`);
    process.exit(1);
  }
}
