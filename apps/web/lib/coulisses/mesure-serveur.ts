/** Mesure côté serveur pour la page des coulisses (spec du sous-projet 5, §4.1). */
import { base, baseConfiguree } from "@/lib/base/client";
import type { LimiteOptions } from "@/lib/rate-limit";

/**
 * La page mesure toutes les 2 s (30 par minute) : le double laisse de la marge.
 * `MESURE_MAX_PAR_IP` ne sert qu'aux tests de bout en bout, où tous les
 * navigateurs partagent 127.0.0.1.
 */
export const limiteMesure = (): LimiteOptions => ({
  nom: "mesure",
  max: Number(process.env.MESURE_MAX_PAR_IP) || 60,
  dureeMs: 60_000,
});
export const DELAI_BASE_MS = 2_000;

export const arrondir = (ms: number) => Math.round(ms * 10) / 10;

/**
 * Durée d'un `SELECT 1`, ou `null` sans base, sur échec ou au-delà de 2 s.
 * La requête abandonnée continue : son échec éventuel est absorbé, pour ne
 * jamais laisser de rejet non géré.
 */
export async function chronometrerBase(): Promise<number | null> {
  if (!baseConfiguree()) return null;
  const debut = performance.now();
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  const abandon = new Promise<false>((ok) => {
    minuterie = setTimeout(() => ok(false), DELAI_BASE_MS);
  });
  try {
    const requete = base().$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    );
    const reussie = await Promise.race([requete, abandon]);
    return reussie ? arrondir(performance.now() - debut) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(minuterie);
  }
}
