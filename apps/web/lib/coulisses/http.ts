/** Aller-retour HTTP vers la route de mesure des coulisses (spec du sous-projet 5, §4.3). */
export const CHEMIN_MESURE = "/api/coulisses/mesure";
export const DELAI_HTTP_MAX_MS = 5_000;

export type ResultatHttp = { ok: true; ms: number; base: number | null } | { ok: false; reessaiMs?: number };

/**
 * `signal` : abandon décidé par l'appelant (onglet caché) ; la requête est aussi
 * abandonnée au bout de 5 s.
 */
export async function mesurerHttp(
  signal?: AbortSignal,
  faire: typeof fetch = fetch,
  chrono: () => number = () => performance.now(),
): Promise<ResultatHttp> {
  const controle = new AbortController();
  const minuterie = setTimeout(() => controle.abort(), DELAI_HTTP_MAX_MS);
  const abandonner = () => controle.abort();
  if (signal?.aborted) controle.abort();
  signal?.addEventListener("abort", abandonner, { once: true });
  try {
    const debut = chrono();
    const r = await faire(CHEMIN_MESURE, { cache: "no-store", signal: controle.signal });
    const ms = Math.round((chrono() - debut) * 10) / 10;
    if (r.status === 429) {
      const secondes = Number(r.headers.get("retry-after"));
      return secondes > 0 ? { ok: false, reessaiMs: secondes * 1_000 } : { ok: false };
    }
    if (!r.ok) return { ok: false };
    const corps: unknown = await r.json();
    const base =
      typeof corps === "object" && corps !== null && "base" in corps && typeof corps.base === "number" ? corps.base : null;
    return { ok: true, ms, base };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(minuterie);
    signal?.removeEventListener("abort", abandonner);
  }
}
