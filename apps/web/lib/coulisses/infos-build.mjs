/**
 * Infos du build affichées dans les coulisses (spec du sous-projet 5, §6),
 * validées ici par la CI (scripts/assembler-build-info.mjs) comme par le site
 * (lib/coulisses/build-info.ts) : une seule règle pour les deux.
 *
 * @typedef {{ performance: number, accessibilite: number, bonnesPratiques: number, referencement: number, pages: number }} NotesLighthouse
 * @typedef {{ unitaires: number, boutEnBout: number }} NombresTests
 * @typedef {{ sha: string, titre: string, date: string, tests: NombresTests, lighthouse: NotesLighthouse, poidsJsAccueil: number }} InfosBuild
 */

export const TITRE_MAX = 100;

/** @param {unknown} v @returns {Record<string, unknown>} */
const objet = (v) => (typeof v === "object" && v !== null ? /** @type {Record<string, unknown>} */ (v) : {});
/** @param {unknown} v */
const entier = (v) => typeof v === "number" && Number.isInteger(v) && v >= 0;
/** @param {unknown} v */
const note = (v) => typeof v === "number" && v >= 0 && v <= 1;

/**
 * @param {unknown} brut
 * @returns {InfosBuild | null}
 */
export function validerInfosBuild(brut) {
  if (typeof brut !== "object" || brut === null) return null;
  const b = objet(brut);
  const t = objet(b.tests);
  const l = objet(b.lighthouse);
  const valide =
    typeof b.sha === "string" &&
    /^[0-9a-f]{40}$/.test(b.sha) &&
    typeof b.titre === "string" &&
    b.titre.length > 0 &&
    b.titre.length <= TITRE_MAX &&
    typeof b.date === "string" &&
    !Number.isNaN(Date.parse(b.date)) &&
    entier(t.unitaires) &&
    entier(t.boutEnBout) &&
    note(l.performance) &&
    note(l.accessibilite) &&
    note(l.bonnesPratiques) &&
    note(l.referencement) &&
    entier(l.pages) &&
    /** @type {number} */ (l.pages) > 0 &&
    entier(b.poidsJsAccueil);
  if (!valide) return null;
  return /** @type {InfosBuild} */ ({
    sha: b.sha,
    titre: b.titre,
    date: b.date,
    tests: { unitaires: t.unitaires, boutEnBout: t.boutEnBout },
    lighthouse: {
      performance: l.performance,
      accessibilite: l.accessibilite,
      bonnesPratiques: l.bonnesPratiques,
      referencement: l.referencement,
      pages: l.pages,
    },
    poidsJsAccueil: b.poidsJsAccueil,
  });
}
