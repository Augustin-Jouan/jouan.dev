import { describe, expect, it } from "vitest";
import { INFOS_EXEMPLE } from "@/lib/coulisses/outils-test";
import { assembler, TITRE_NEUTRE } from "./assembler-build-info.mjs";
import { testsPlaywright, testsVitest } from "./compter-tests.mjs";
import { extraireLighthouse } from "./extraire-lighthouse.mjs";

describe("testsVitest", () => {
  it("compte les tests passés", () => expect(testsVitest({ numPassedTests: 293, numFailedTests: 0 })).toBe(293));
  it("refuse un rapport en échec ou illisible", () => {
    expect(() => testsVitest({ numPassedTests: 293, numFailedTests: 1 })).toThrow();
    expect(() => testsVitest({})).toThrow();
  });
});

describe("testsPlaywright", () => {
  it("compte les tests passés, y compris au second essai", () =>
    expect(testsPlaywright({ stats: { expected: 60, flaky: 2, unexpected: 0, skipped: 3 } })).toBe(62));
  it("refuse un rapport en échec", () =>
    expect(() => testsPlaywright({ stats: { expected: 60, flaky: 0, unexpected: 1 } })).toThrow());
});

describe("extraireLighthouse", () => {
  const passage = (chemin: string, perf: number, jsonPath = "autre.json") => ({
    url: `http://127.0.0.1:3000${chemin}`,
    isRepresentativeRun: false,
    jsonPath,
    summary: { performance: perf, accessibility: 1, "best-practices": 0.96, seo: 1 },
  });
  const manifeste = [
    passage("/", 0.5, "a1.json"),
    passage("/", 0.98, "a2.json"),
    passage("/", 0.97, "a3.json"),
    passage("/coulisses", 0.96),
    passage("/coulisses", 0.99),
    passage("/coulisses", 0.95),
    passage("/?pour=exemple-0000", 0.99),
  ];
  const scripts = (octets: number) => ({
    audits: {
      "resource-summary": {
        details: { items: [{ resourceType: "total", transferSize: 400_000 }, { resourceType: "script", transferSize: octets }] },
      },
    },
  });
  const rapports: Record<string, unknown> = { "a1.json": scripts(150_000), "a2.json": scripts(158_436), "a3.json": scripts(160_000) };
  const lire = (chemin: string) => rapports[chemin];

  it("médiane des passages de chaque page, puis la note la plus basse des pages", () => {
    expect(extraireLighthouse(manifeste, lire)).toEqual({
      lighthouse: { performance: 0.96, accessibilite: 1, bonnesPratiques: 0.96, referencement: 1, pages: 3 },
      poidsJsAccueil: 158_436,
    });
  });

  it("refuse un manifeste sans l'accueil", () => {
    expect(() => extraireLighthouse([passage("/coulisses", 1)], lire)).toThrow("Accueil");
  });

  it("refuse une note absente plutôt que d'afficher 0", () => {
    const sansSeo = { ...passage("/", 1, "a2.json"), summary: { performance: 1, accessibility: 1, "best-practices": 1 } };
    expect(() => extraireLighthouse([sansSeo], lire)).toThrow("seo");
  });

  it("refuse un rapport de l'accueil sans poids de scripts", () => {
    expect(() => extraireLighthouse([passage("/", 1, "absent.json")], lire)).toThrow("JavaScript");
  });
});

describe("assembler", () => {
  const { tests, lighthouse, poidsJsAccueil, sha, date } = INFOS_EXEMPLE;
  const base = { ...tests, lighthouse, poidsJsAccueil, sha, date };

  it("coupe le titre à 100 caractères et valide l'ensemble", () => {
    const infos = assembler({ ...base, titre: `  ${"a".repeat(150)}  ` });
    expect(infos.titre).toHaveLength(100);
  });

  it("échoue si une donnée manque", () => {
    expect(() => assembler({ ...base, titre: "ok", boutEnBout: undefined })).toThrow("Infos de build invalides");
  });

  it.each(["Contact : réponse à quelqu'un@exemple.fr", "Proxy : 10.1.2.3 en dur"])(
    "remplace par un titre neutre un titre qui publierait une adresse, sans bloquer le déploiement : %s",
    (titre) => {
      expect(assembler({ ...base, titre }).titre).toBe(TITRE_NEUTRE);
    },
  );

  it("garde un titre avec un @ qui n'est pas une adresse (paquet npm)", () => {
    expect(assembler({ ...base, titre: "Bump @types/node from 24.1.0 to 24.2.0" }).titre).toBe(
      "Bump @types/node from 24.1.0 to 24.2.0",
    );
  });
});
