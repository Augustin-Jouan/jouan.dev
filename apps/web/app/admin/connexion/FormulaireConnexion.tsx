"use client";

import { useActionState } from "react";
import { seConnecter, type EtatConnexion } from "./actions";

// Mêmes classes de champ que le formulaire de contact.
const champ =
  "rounded-xl border bg-papier px-4 py-3 outline-none transition-colors focus:border-encre focus-visible:ring-2 focus-visible:ring-encre focus-visible:ring-offset-2 focus-visible:ring-offset-papier";

export function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState<EtatConnexion, FormData>(seConnecter, {});

  return (
    <form action={action} className="mt-8 flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium">
        Mot de passe
        <input
          type="password"
          name="motDePasse"
          autoComplete="current-password"
          required
          aria-invalid={etat.erreur ? true : undefined}
          aria-describedby={etat.erreur ? "connexion-erreur" : undefined}
          className={`${champ} ${etat.erreur ? "border-brique" : "border-encre-douce/80"}`}
        />
      </label>
      <button
        type="submit"
        disabled={enCours}
        className="self-start rounded-full bg-encre px-6 py-3 text-sm font-medium text-papier transition-opacity hover:opacity-85 disabled:opacity-60"
      >
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
      {etat.erreur && (
        <p id="connexion-erreur" role="alert" className="rounded-xl border border-trait px-4 py-3 text-sm">
          {etat.erreur}
        </p>
      )}
    </form>
  );
}
