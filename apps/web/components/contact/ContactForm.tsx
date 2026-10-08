"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  submitContactForm,
  type ContactFormState,
} from "@/app/contact/actions";
import { LIMITES } from "@/app/contact/limites";
import { siteName } from "@/data/site";

const initialState: ContactFormState = { status: "idle", message: "" };

// Classes aux couleurs de l'Atelier clair. Bordure au repos encre-douce/80 :
// ≈ 4:1 sur le papier (WCAG 1.4.11 demande 3:1 pour la limite d'un champ).
// Le focus ajoute un anneau de 2 px : il ne repose pas sur la seule couleur.
const champ =
  "rounded-xl border bg-papier px-4 py-3 outline-none transition-colors focus:border-encre focus-visible:ring-2 focus-visible:ring-encre focus-visible:ring-offset-2 focus-visible:ring-offset-papier";
const etiquette = "flex flex-col gap-2 text-sm font-medium";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);
  const enErreur = state.status === "error";

  /**
   * Marque le champ signalé par le serveur et le relie au message d'erreur.
   * La valeur par défaut est la saisie renvoyée par une erreur : React vide
   * le formulaire avant chaque action, il revient ainsi à cette saisie.
   */
  function attributs(nom: NonNullable<ContactFormState["champ"]>) {
    const fautif = enErreur && state.champ === nom;
    return {
      defaultValue: state.valeurs?.[nom],
      className: `${champ} ${fautif ? "border-brique" : "border-encre-douce/80"}`,
      "aria-invalid": fautif || undefined,
      "aria-describedby": fautif ? "contact-retour" : undefined,
    };
  }

  const messageAttrs = attributs("message");

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <label className={etiquette}>
        Nom
        <input
          type="text"
          name="nom"
          required
          maxLength={LIMITES.nom}
          autoComplete="name"
          {...attributs("nom")}
        />
      </label>
      <label className={etiquette}>
        Email
        <input
          type="email"
          name="email"
          required
          maxLength={LIMITES.email}
          autoComplete="email"
          {...attributs("email")}
        />
      </label>
      <label className={etiquette}>
        Téléphone (optionnel)
        <input
          type="tel"
          name="telephone"
          maxLength={LIMITES.telephone}
          autoComplete="tel"
          {...attributs("telephone")}
        />
      </label>
      <label className={etiquette}>
        Message
        <textarea
          name="message"
          required
          rows={6}
          maxLength={LIMITES.message}
          {...messageAttrs}
          className={`${messageAttrs.className} resize-y`}
        />
      </label>

      {/* Honeypot anti-spam : invisible pour les humains, rempli par les bots */}
      <input
        type="text"
        name="entreprise"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <button type="submit" disabled={pending} className="self-start rounded-full bg-encre px-6 py-3 text-sm font-medium text-papier transition-opacity hover:opacity-85 disabled:opacity-60">
        {pending ? "Envoi…" : "Envoyer"}
      </button>

      {/* Information au point de collecte, article 13 du RGPD / CNIL. */}
      <p className="text-xs text-encre-douce">
        Le responsable du traitement est {siteName}. Nom, email et message sont
        obligatoires ; le téléphone est facultatif. Ces données servent
        uniquement à répondre à votre demande (mesures précontractuelles,
        art. 6.1.b du RGPD). Elles sont conservées trois ans à compter du
        dernier contact, puis supprimées — ou dix ans si une relation
        contractuelle s&apos;ensuit. Vous disposez d&apos;un droit
        d&apos;accès, de rectification, d&apos;effacement, de limitation,
        d&apos;opposition et de portabilité. Détail :{" "}
        <Link href="/politique-de-confidentialite" className="underline">
          politique de confidentialité
        </Link>
        .
      </p>

      {state.status !== "idle" && (
        <p
          id="contact-retour"
          // Une erreur doit interrompre le lecteur d'écran ; une confirmation
          // peut attendre une accalmie.
          role={enErreur ? "alert" : "status"}
          className="rounded-xl border border-trait px-4 py-3 text-sm"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
