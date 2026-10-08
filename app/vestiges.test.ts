import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Garantit que le template ne contient plus rien du site dont il est issu.
 * À SUPPRIMER au démarrage d'un nouveau site (étape 2 du README) : un client
 * dont le métier figure dans cette liste a le droit d'en parler.
 */
const MOTS_INTERDITS = ["jérôme", "dufourd", "sdj", "châteaubriant", "électri", "plomb"];
const DOSSIERS_IGNORES = new Set(["node_modules", ".next", ".git"]);
const RACINE = join(__dirname, "..");

function* fichiers(dossier: string): Generator<string> {
  for (const nom of readdirSync(dossier)) {
    if (DOSSIERS_IGNORES.has(nom)) continue;
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) yield* fichiers(chemin);
    else if (!/\.(png|jpe?g|webp|ico|lock)$/.test(nom) && nom !== "package-lock.json") yield chemin;
  }
}

describe("template sans vestiges", () => {
  it("ne contient aucun mot du site d'origine", () => {
    const fautifs: string[] = [];
    for (const chemin of fichiers(RACINE)) {
      if (chemin.endsWith("vestiges.test.ts")) continue;
      const contenu = readFileSync(chemin, "utf8").toLowerCase();
      for (const mot of MOTS_INTERDITS) {
        if (contenu.includes(mot)) fautifs.push(`${chemin.replace(RACINE + "/", "")} : « ${mot} »`);
      }
    }
    expect(fautifs).toEqual([]);
  });
});
