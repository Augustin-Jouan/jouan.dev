/**
 * Notes Lighthouse pour les coulisses, depuis `.lighthouseci/manifest.json` :
 * les passages sont regroupés par page ; chaque page est prise à sa médiane
 * (5 passages en CI), puis on garde, par catégorie, la note la plus basse des
 * pages. Le poids du JavaScript de l'accueil est lui aussi la médiane de ses
 * passages. Une note ou un poids absent fait échouer le script : jamais de 0
 * affiché comme une mesure.
 *
 * Usage (CI) : node apps/web/scripts/extraire-lighthouse.mjs apps/web/.lighthouseci/manifest.json
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CATEGORIES = {
  performance: "performance",
  accessibilite: "accessibility",
  bonnesPratiques: "best-practices",
  referencement: "seo",
};

function mediane(valeurs) {
  const triees = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(triees.length / 2);
  return triees.length % 2 ? triees[milieu] : (triees[milieu - 1] + triees[milieu]) / 2;
}

export function extraireLighthouse(manifeste, lireRapport) {
  const parPage = new Map();
  for (const passage of manifeste) {
    const url = new URL(passage.url);
    const page = url.pathname + url.search;
    if (!parPage.has(page)) parPage.set(page, []);
    parPage.get(page).push(passage);
  }
  const accueil = parPage.get("/");
  if (!accueil) throw new Error("Accueil absent du manifeste Lighthouse.");

  const note = (passage, cle) => {
    const v = passage.summary?.[cle];
    if (typeof v !== "number") throw new Error(`Note « ${cle} » absente pour ${passage.url}.`);
    return v;
  };
  const lighthouse = {};
  for (const [nom, cle] of Object.entries(CATEGORIES)) {
    lighthouse[nom] = Math.min(...[...parPage.values()].map((passages) => mediane(passages.map((p) => note(p, cle)))));
  }
  lighthouse.pages = parPage.size;

  const poids = accueil.map((p) => {
    const scripts = lireRapport(p.jsonPath)?.audits?.["resource-summary"]?.details?.items?.find(
      (i) => i.resourceType === "script",
    );
    if (!Number.isInteger(scripts?.transferSize)) throw new Error("Poids du JavaScript de l'accueil introuvable.");
    return scripts.transferSize;
  });
  return { lighthouse, poidsJsAccueil: Math.round(mediane(poids)) };
}

const lanceDirectement = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (lanceDirectement) {
  const chemin = process.argv[2];
  if (!chemin) {
    console.error("Usage : extraire-lighthouse.mjs <manifest.json>");
    process.exit(1);
  }
  const manifeste = JSON.parse(readFileSync(chemin, "utf8"));
  // Les chemins des rapports peuvent être relatifs au dossier du manifeste.
  const lire = (f) => JSON.parse(readFileSync(resolve(dirname(chemin), f), "utf8"));
  console.log(JSON.stringify(extraireLighthouse(manifeste, lire)));
}
