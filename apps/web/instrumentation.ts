/**
 * Démarrage du serveur : purge des visites de plus de douze mois, au lancement
 * puis toutes les 24 h, pour que la promesse de la politique de confidentialité
 * tienne même sans nouvelle visite.
 */
const VINGT_QUATRE_HEURES_MS = 24 * 60 * 60 * 1000;

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Import dynamique : Prisma ne doit pas être chargé sur le runtime edge.
  const { baseConfiguree } = await import("@/lib/base/client");
  if (!baseConfiguree()) return;
  const { purgerVisitesAnciennes } = await import("@/lib/liens/traitement");

  const purger = async () => {
    try {
      await purgerVisitesAnciennes();
    } catch (err) {
      console.error("[visites] Purge planifiée impossible :", err);
    }
  };
  void purger();
  setInterval(purger, VINGT_QUATRE_HEURES_MS).unref();
}
