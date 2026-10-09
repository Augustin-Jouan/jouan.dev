/**
 * Compte les tests passés à partir des rapports JSON de Vitest ou de
 * Playwright, pour la section « Dernier déploiement » des coulisses.
 *
 * Usage (CI) :
 *   node apps/web/scripts/compter-tests.mjs vitest <rapport.json>...  → {"unitaires":N}
 *   node apps/web/scripts/compter-tests.mjs playwright <rapport.json> → {"boutEnBout":N}
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Rapport Vitest (format compatible Jest) : tests passés ; refuse un rapport en échec. */
export function testsVitest(rapport) {
  const n = rapport?.numPassedTests;
  if (!Number.isInteger(n) || rapport.numFailedTests !== 0) throw new Error("Rapport Vitest illisible ou en échec.");
  return n;
}

/** Rapport Playwright : tests passés, y compris ceux réussis au second essai. */
export function testsPlaywright(rapport) {
  const s = rapport?.stats;
  if (!s || !Number.isInteger(s.expected) || !Number.isInteger(s.flaky) || s.unexpected !== 0) {
    throw new Error("Rapport Playwright illisible ou en échec.");
  }
  return s.expected + s.flaky;
}

const lanceDirectement = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (lanceDirectement) {
  const [type, ...fichiers] = process.argv.slice(2);
  const rapports = fichiers.map((f) => JSON.parse(readFileSync(f, "utf8")));
  if (type === "vitest" && rapports.length > 0) {
    console.log(JSON.stringify({ unitaires: rapports.reduce((total, r) => total + testsVitest(r), 0) }));
  } else if (type === "playwright" && rapports.length === 1) {
    console.log(JSON.stringify({ boutEnBout: testsPlaywright(rapports[0]) }));
  } else {
    console.error("Usage : compter-tests.mjs vitest <rapport.json>... | playwright <rapport.json>");
    process.exit(1);
  }
}
