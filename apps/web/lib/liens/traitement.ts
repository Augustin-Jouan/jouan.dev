/** Traitement d'un signal de visite, après la réponse au navigateur. Ne lève jamais. */
import { siteUrl } from "@/data/site";
import { baseConfiguree } from "@/lib/base/client";
import { envoyerMail } from "@/lib/email";
import { verifierLimite } from "@/lib/rate-limit";
import { enregistrerVisite, marquerMailEnvoye, purgerVisites } from "./depot";
import { contenuMailVisite } from "./mail-visite";
import { CONSERVATION_VISITES_MS, type Appareil } from "./visites";

const LIMITE_SIGNAUX = { max: 10, dureeMs: 60 * 60 * 1000 };

/** Supprime les visites de plus de douze mois. Ne lève jamais. */
export async function purgerVisitesAnciennes(maintenant = new Date()): Promise<void> {
  try {
    await purgerVisites(new Date(maintenant.getTime() - CONSERVATION_VISITES_MS));
  } catch (err) {
    console.error("[visites] Purge impossible :", err);
  }
}

export async function traiterVisite(jeton: string, appareil: Appareil, maintenant = new Date()): Promise<void> {
  if (!baseConfiguree()) return;
  if (!verifierLimite(`visite:${jeton}`, LIMITE_SIGNAUX, maintenant.getTime()).autorise) return;

  let visite;
  try {
    visite = await enregistrerVisite(jeton, appareil, maintenant);
  } catch (err) {
    console.error("[visites] Enregistrement impossible :", err);
    return;
  }
  if (!visite) return;

  let envoye = false;
  try {
    await envoyerMail(
      contenuMailVisite({
        nom: visite.nom,
        numero: visite.numero,
        appareil,
        le: maintenant,
        precedente: visite.precedente,
        urlAdmin: `${siteUrl}/admin`,
      }),
    );
    envoye = true;
  } catch (err) {
    console.error("[visites] Mail de visite non envoyé :", err);
  }

  if (envoye) {
    try {
      await marquerMailEnvoye(visite.id);
    } catch (err) {
      console.error("[visites] Mail envoyé mais visite non marquée :", err);
    }
  }

  await purgerVisitesAnciennes(maintenant);
}
