"use server";

import { headers } from "next/headers";
import { contact } from "@/data/contact";
import { sendContactEmail } from "@/lib/email";
import { verifierLimite } from "@/lib/rate-limit";
import { LIMITES } from "./limites";

export type ContactFormState = {
  status: "idle" | "success" | "error";
  message: string;
  /** Nom du premier champ fautif, pour le signaler dans le formulaire. */
  champ?: "nom" | "email" | "telephone" | "message";
  /**
   * Saisie du visiteur, renvoyée avec chaque erreur : React vide le formulaire
   * avant toute action, le formulaire la rétablit en valeurs par défaut (avec
   * ou sans JavaScript).
   */
  valeurs?: Champs;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // placeholder-ok (classe de caractères, pas un placeholder)

/** Cinq demandes par heure et par adresse : large pour un humain, étroit pour un bot. */
const LIMITE_ENVOIS = { max: 5, dureeMs: 60 * 60 * 1000 };

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  // Honeypot : un bot remplit ce champ caché. On fait semblant de réussir.
  const honeypot = String(formData.get("entreprise") ?? "").trim();
  if (honeypot !== "") {
    return { status: "success", message: "Merci, votre message a bien été envoyé." };
  }

  const valeurs: Champs = {
    nom: String(formData.get("nom") ?? ""),
    email: String(formData.get("email") ?? ""),
    telephone: String(formData.get("telephone") ?? ""),
    message: String(formData.get("message") ?? ""),
  };
  const nom = valeurs.nom.trim();
  const email = valeurs.email.trim();
  const telephone = valeurs.telephone.trim();
  const message = valeurs.message.trim();

  const invalide = valider({ nom, email, telephone, message });
  if (invalide) return { ...invalide, valeurs };

  const limite = verifierLimite(await cleAppelant(), LIMITE_ENVOIS);
  if (!limite.autorise) {
    const minutes = Math.max(1, Math.ceil(limite.secondesAvantReessai / 60));
    return {
      status: "error",
      message: `Vous avez déjà envoyé plusieurs messages. Merci de réessayer dans ${minutes} minute${
        minutes > 1 ? "s" : ""
      }, ou de m'écrire directement à ${contact.email}.`,
      valeurs,
    };
  }

  try {
    await sendContactEmail({
      nom,
      email,
      telephone: telephone || undefined,
      message,
    });
  } catch (err) {
    console.error("[contact] Échec envoi email :", err);
    return {
      status: "error",
      // Le code d'erreur SMTP est affiché pour identifier la panne sans accès
      // aux logs de l'hébergeur (EAUTH, ETIMEDOUT…). Aucun secret dedans.
      message: `L'envoi a échoué (${codeErreur(err)}). Merci de réessayer ou de m'écrire directement à ${contact.email}.`,
      valeurs,
    };
  }

  return { status: "success", message: "Merci, votre message a bien été envoyé." };
}

type Champs = { nom: string; email: string; telephone: string; message: string };

function valider({ nom, email, telephone, message }: Champs): ContactFormState | null {
  if (!nom) {
    return { status: "error", message: "Merci d'indiquer votre nom.", champ: "nom" };
  }
  if (nom.length > LIMITES.nom) {
    return {
      status: "error",
      message: `Le nom ne doit pas dépasser ${LIMITES.nom} caractères.`,
      champ: "nom",
    };
  }
  if (!email || !EMAIL_REGEX.test(email) || email.length > LIMITES.email) {
    return {
      status: "error",
      message: "Merci de saisir une adresse email valide.",
      champ: "email",
    };
  }
  if (telephone.length > LIMITES.telephone) {
    return {
      status: "error",
      message: "Le numéro de téléphone saisi est trop long.",
      champ: "telephone",
    };
  }
  if (!message) {
    return {
      status: "error",
      message: "Merci de saisir votre message.",
      champ: "message",
    };
  }
  if (message.length > LIMITES.message) {
    return {
      status: "error",
      message: `Le message ne doit pas dépasser ${LIMITES.message} caractères.`,
      champ: "message",
    };
  }
  return null;
}

/**
 * Adresse de l'appelant vue par le reverse proxy de l'hébergeur. En l'absence
 * d'en-tête exploitable, tous les appels partagent le même compteur : le
 * plafond s'applique alors globalement, ce qui reste le comportement sûr.
 */
async function cleAppelant(): Promise<string> {
  const enTetes = await headers();
  const transmise =
    enTetes.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    enTetes.get("x-real-ip")?.trim();
  return transmise || "inconnu";
}

/** Résumé court et sans secret d'une erreur nodemailer, pour le message d'échec. */
function codeErreur(err: unknown): string {
  if (typeof err !== "object" || err === null) return "erreur inconnue";
  const { code, responseCode, command, response, message } = err as {
    code?: string;
    responseCode?: number;
    command?: string;
    /** Réponse brute du serveur SMTP, ex. « 550 5.7.1 Message rejected ». */
    response?: string;
    message?: string;
  };
  const parties = [code, responseCode, command, response?.replace(/\s+/g, " ").slice(0, 160)].filter(
    Boolean
  );
  if (parties.length > 0) return parties.join(" ");
  return (message ?? "erreur inconnue").slice(0, 80);
}
