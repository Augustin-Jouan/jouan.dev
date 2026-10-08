import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { trouverPlaceholders } from "./verifier-placeholders.mjs";

describe("trouverPlaceholders", () => {
  it("liste chaque ligne contenant un texte entre crochets, avec son fichier", () => {
    const racine = mkdtempSync(join(tmpdir(), "placeholders-"));
    mkdirSync(join(racine, "data"));
    writeFileSync(join(racine, "data", "site.ts"), 'export const nom = "[Nom]";\nexport const ok = "Rempli";\n');
    writeFileSync(join(racine, "hors-champ.ts"), 'const x = "[Ignoré]";\n');

    const resultat = trouverPlaceholders(racine, ["data"]);

    expect(resultat).toEqual([
      { fichier: "data/site.ts", ligne: 1, texte: 'export const nom = "[Nom]";' },
    ]);
  });

  it("ignore les tableaux et index TypeScript", () => {
    const racine = mkdtempSync(join(tmpdir(), "placeholders-"));
    mkdirSync(join(racine, "app"));
    writeFileSync(
      join(racine, "app", "x.ts"),
      "const a: string[] = [];\nconst b = liste[0];\nconst c = [1, 2];\nconst d = `/services/[slug]`;\nconst e = x.split(\",\")[0];\nconst f = [42];\n"
    );
    expect(trouverPlaceholders(racine, ["app"])).toEqual([]);
  });

  it("détecte les placeholders numériques comme un téléphone", () => {
    const racine = mkdtempSync(join(tmpdir(), "placeholders-"));
    mkdirSync(join(racine, "data"));
    writeFileSync(join(racine, "data", "c.ts"), 'tel: "[01 23 45 67 89]", lien: "tel:[+33123456789]"\n');
    expect(trouverPlaceholders(racine, ["data"])).toHaveLength(1);
  });

  it("ignore les valeurs arbitraires Tailwind", () => {
    const racine = mkdtempSync(join(tmpdir(), "placeholders-"));
    mkdirSync(join(racine, "app"));
    writeFileSync(
      join(racine, "app", "y.tsx"),
      'const a = "w-[200px] top-[50%] leading-[1.5] grid-cols-[1fr_2fr]";\nconst b = "[Nom]";\n'
    );
    expect(trouverPlaceholders(racine, ["app"])).toHaveLength(1);
  });

  it("ignore les lignes marquées placeholder-ok", () => {
    const racine = mkdtempSync(join(tmpdir(), "placeholders-"));
    mkdirSync(join(racine, "data"));
    writeFileSync(
      join(racine, "data", "legal.ts"),
      'const a = "[Nom]"; // placeholder-ok\nconst b = "[Ville]";\n'
    );
    const resultat = trouverPlaceholders(racine, ["data"]);
    expect(resultat).toHaveLength(1);
    expect(resultat[0].ligne).toBe(2);
  });

  it("détecte un email placeholder en minuscules", () => {
    const racine = mkdtempSync(join(tmpdir(), "placeholders-"));
    mkdirSync(join(racine, "data"));
    writeFileSync(join(racine, "data", "contact.ts"), 'export const email = "[contact@exemple.fr]";\n');
    expect(trouverPlaceholders(racine, ["data"])).toHaveLength(1);
  });
});
