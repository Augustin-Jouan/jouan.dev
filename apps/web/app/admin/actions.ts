"use server";

import { revalidatePath } from "next/cache";
import { ANGLES, type Angle } from "@/data/accueil";
import { exigerSession } from "@/lib/admin/acces";
import { changerEtat, creerLien, supprimerLien } from "@/lib/liens/depot";
import { nettoyerNom } from "@/lib/liens/jeton";
import { urlDuLien } from "@/lib/liens/url";

export type EtatCreation = { lien?: { nom: string; url: string }; erreur?: string };

/** Identifiant plausible (cuid) ; un formulaire forgé ne doit pas atteindre la base. */
function lireId(donnees: FormData): string | null {
  const id = donnees.get("id");
  return typeof id === "string" && id.length > 0 && id.length <= 64 ? id : null;
}

/** P2025 : enregistrement introuvable, par exemple un lien déjà supprimé dans un autre onglet. */
function estAbsent(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "P2025";
}

export async function creerLienAction(_etat: EtatCreation, donnees: FormData): Promise<EtatCreation> {
  await exigerSession();
  const nom = nettoyerNom(String(donnees.get("nom") ?? ""));
  if (!nom.ok) return { erreur: nom.erreur };
  const angle = String(donnees.get("angle") ?? "") as Angle;
  if (!ANGLES.includes(angle)) return { erreur: "Choisissez un angle." };
  try {
    const { jeton } = await creerLien(nom.nom, angle);
    revalidatePath("/admin");
    return { lien: { nom: nom.nom, url: urlDuLien(jeton) } };
  } catch (err) {
    console.error("[admin] Création du lien impossible :", err);
    return { erreur: "Base de données indisponible." };
  }
}

export async function changerEtatAction(donnees: FormData): Promise<void> {
  await exigerSession();
  const id = lireId(donnees);
  const actif = donnees.get("actif");
  if (id === null || (actif !== "true" && actif !== "false")) return;
  try {
    await changerEtat(id, actif === "true");
  } catch (err) {
    if (!estAbsent(err)) throw err;
  }
  revalidatePath("/admin");
}

export async function supprimerLienAction(donnees: FormData): Promise<void> {
  await exigerSession();
  const id = lireId(donnees);
  if (id === null) return;
  try {
    await supprimerLien(id);
  } catch (err) {
    if (!estAbsent(err)) throw err;
  }
  revalidatePath("/admin");
}
