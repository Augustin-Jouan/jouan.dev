"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  DUREE_SESSION_MS,
  NOM_COOKIE,
  secretSession,
  signerSession,
  verifierMotDePasse,
} from "@/lib/admin/session";
import { rendreLimite, verifierLimite } from "@/lib/rate-limit";

export type EtatConnexion = { erreur?: string };

/**
 * Cinq échecs par quart d'heure, tous appelants confondus : un seul compte.
 * La tentative est réservée avant le calcul scrypt (sinon des requêtes en
 * rafale passeraient toutes la limite) et rendue si le mot de passe est bon.
 */
const LIMITE_ECHECS = { nom: "connexion-admin", max: 5, dureeMs: 15 * 60 * 1000 };
const CLE_LIMITE = "admin:connexion";

export async function seConnecter(_etat: EtatConnexion, donnees: FormData): Promise<EtatConnexion> {
  const empreinte = process.env.ADMIN_EMPREINTE;
  const secret = secretSession();
  if (!empreinte || !secret) return { erreur: "Administration non configurée." };
  if (!verifierLimite(CLE_LIMITE, LIMITE_ECHECS).autorise) {
    return { erreur: "Trop de tentatives. Réessayez dans un quart d'heure." };
  }
  if (!(await verifierMotDePasse(String(donnees.get("motDePasse") ?? ""), empreinte))) {
    return { erreur: "Mot de passe incorrect." };
  }
  rendreLimite(CLE_LIMITE, LIMITE_ECHECS);
  const expireLe = Date.now() + DUREE_SESSION_MS;
  (await cookies()).set(NOM_COOKIE, signerSession(expireLe, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    expires: new Date(expireLe),
  });
  redirect("/admin");
}

export async function seDeconnecter(): Promise<void> {
  (await cookies()).delete({ name: NOM_COOKIE, path: "/admin" });
  redirect("/admin/connexion");
}
