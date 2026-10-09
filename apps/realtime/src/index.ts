/** Point d'entrée : lit l'environnement, démarre le service et l'arrête proprement. */
import { lireOrigines } from "./origines.js";
import { demarrerServeur } from "./serveur.js";

async function principal() {
  const origines = lireOrigines(process.env.ORIGINES_AUTORISEES);
  if (origines.length === 0) console.warn("[direct] ORIGINES_AUTORISEES est vide : toute connexion sera refusée.");
  const serveur = await demarrerServeur({
    origines,
    port: Number(process.env.PORT ?? 3001),
    hote: process.env.HOTE ?? "0.0.0.0",
    connexionsParIp: process.env.CONNEXIONS_PAR_IP ? Number(process.env.CONNEXIONS_PAR_IP) : undefined,
    // Tests de bout en bout : tous les navigateurs partagent 127.0.0.1.
    sondeParIp: process.env.SONDE_CONNEXIONS_PAR_IP ? Number(process.env.SONDE_CONNEXIONS_PAR_IP) : undefined,
  });
  console.log(`[direct] Prêt sur le port ${serveur.port}.`);
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      console.log("[direct] Arrêt demandé.");
      void serveur.fermer().then(() => process.exit(0));
    });
  }
}

principal().catch((err: unknown) => {
  console.error("[direct] Démarrage impossible :", err);
  process.exit(1);
});
