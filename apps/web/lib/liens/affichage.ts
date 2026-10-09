/** Lien à afficher sur la page personnalisée ; null = accueil normal, sans erreur visible. */
import { baseConfiguree } from "@/lib/base/client";
import type { Angle } from "@/data/accueil";
import { trouverLienActif } from "./depot";
import { estJetonValide } from "./jeton";

export async function lienPourAffichage(jeton: string): Promise<{ nom: string; angle: Angle } | null> {
  if (!estJetonValide(jeton) || !baseConfiguree()) return null;
  try {
    return await trouverLienActif(jeton);
  } catch (err) {
    console.error("[liens] Lecture du lien impossible :", err);
    return null;
  }
}
