"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  submitContactForm,
  type ContactFormState,
} from "@/app/contact/actions";
import { LIMITES } from "@/app/contact/limites";

const initialState: ContactFormState = { status: "idle", message: "" };

// Classes de la charte « Nuit mauve ». Bordure au repos trait-fort : 3,6:1 sur
// le fond (WCAG 1.4.11 demande 3:1 pour la limite d'un champ).
// Le focus ajoute un anneau de 2 px : il ne repose pas sur la seule couleur.
const champ =
  "rounded-xl border bg-surface px-4 py-3 outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-fond";
const etiquette = "flex flex-col gap-2 text-sm font-medium";

export function ContactForm({ jeton }: { jeton?: string }) {
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
      className: `${champ} ${fautif ? "border-alerte" : "border-trait-fort"}`,
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
      {jeton && <input type="hidden" name="pour" value={jeton} />}

      {/* Sous 64 rem, le trait conducteur signe à droite du bouton : la marge laisse la place au-dessus. */}
      <button type="submit" disabled={pending} data-trait="envoi" className="self-start max-lg:mt-14 rounded-full bg-accent px-6 py-3 text-sm font-medium text-sur-accent transition-opacity hover:opacity-85 disabled:opacity-60">
        {pending ? "Envoi…" : "Envoyer"}
      </button>

      {/* Information au point de collecte (article 13 du RGPD), en deux niveaux comme le
          recommande la CNIL : l'essentiel ici, le détail dans la politique de confidentialité. */}
      <p className="text-xs text-texte-doux">
        Vos données servent uniquement à vous répondre. Détail et droits :{" "}
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
