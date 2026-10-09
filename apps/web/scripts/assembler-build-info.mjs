/**
 * Assemble `build-info.json` pour les coulisses, dans le job « image » de la CI,
 * avant le build Docker : mesures des jobs précédents (artefacts), commit et
 * date. Une donnée manquante ou invalide fait échouer le job.
 *
 * Le titre du commit devient public : un titre qui contient une adresse e-mail
 * ou IP est remplacé par un titre neutre (sans bloquer le déploiement).
 *
 * Usage (CI) :
 *   node apps/web/scripts/assembler-build-info.mjs --verifier mesures-verifier.json \
 *     --tests-e2e mesures-e2e-tests.json --lighthouse mesures-lighthouse.json > apps/web/build-info.json
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { TITRE_MAX, validerInfosBuild } from "../lib/coulisses/infos-build.mjs";

/** Adresse e-mail ou IPv4 ; un `@` seul (paquet `@types/…`) n'en est pas une. */
const SENSIBLE = /[^\s@]+@[^\s@]+\.[^\s@]+|\b\d{1,3}(\.\d{1,3}){3}\b/;
export const TITRE_NEUTRE = "Mise à jour du site";

export function assembler({ unitaires, boutEnBout, lighthouse, poidsJsAccueil, sha, titre, date }) {
  const coupe = titre.trim().slice(0, TITRE_MAX);
  // Testé sur le titre entier : une adresse coupée à la limite ne doit pas passer.
  const propre = SENSIBLE.test(titre) ? TITRE_NEUTRE : coupe;
  const infos = validerInfosBuild({
    sha,
    titre: propre,
    date,
    tests: { unitaires, boutEnBout },
    lighthouse,
    poidsJsAccueil,
  });
  if (!infos) throw new Error("Infos de build invalides ou incomplètes.");
  return infos;
}

const lanceDirectement = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (lanceDirectement) {
  const { values } = parseArgs({
    options: { verifier: { type: "string" }, "tests-e2e": { type: "string" }, lighthouse: { type: "string" } },
  });
  const lire = (f) => JSON.parse(readFileSync(f, "utf8"));
  const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
  const { unitaires } = lire(values.verifier);
  const { boutEnBout } = lire(values["tests-e2e"]);
  const { lighthouse, poidsJsAccueil } = lire(values.lighthouse);
  const infos = assembler({
    unitaires,
    boutEnBout,
    lighthouse,
    poidsJsAccueil,
    sha: process.env.GITHUB_SHA ?? git("rev-parse", "HEAD"),
    titre: git("log", "-1", "--format=%s"),
    date: new Date().toISOString(),
  });
  console.log(JSON.stringify(infos, null, 2));
}
