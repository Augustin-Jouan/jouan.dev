"use client";

import { useActionState } from "react";
import { ANGLES, libellesAngle } from "@/data/accueil";
import { BoutonCopier } from "./BoutonCopier";
import { creerLienAction, type EtatCreation } from "./actions";

// Mêmes classes de champ que le formulaire de connexion.
const champ =
  "rounded-xl border border-encre-douce/80 bg-papier px-4 py-3 outline-none transition-colors focus:border-encre focus-visible:ring-2 focus-visible:ring-encre focus-visible:ring-offset-2 focus-visible:ring-offset-papier";

export function NouveauLien() {
  const [etat, action, enCours] = useActionState<EtatCreation, FormData>(creerLienAction, {});

  return (
    <section aria-labelledby="nouveau-lien" className="flex flex-col gap-4 rounded-2xl border border-trait p-5">
      <h2 id="nouveau-lien" className="font-serif text-2xl">
        Nouveau lien
      </h2>
      <form action={action} className="flex max-w-md flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Nom du prospect
          <input type="text" name="nom" maxLength={60} required className={champ} />
        </label>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 font-medium">Angle</legend>
          {ANGLES.map((angle) => (
            <label key={angle} className="flex items-center gap-2">
              <input type="radio" name="angle" value={angle} defaultChecked={angle === "application"} />
              {libellesAngle[angle]}
            </label>
          ))}
        </fieldset>
        <button
          type="submit"
          disabled={enCours}
          className="self-start rounded-full bg-encre px-6 py-3 text-sm font-medium text-papier transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          {enCours ? "Création…" : "Créer le lien"}
        </button>
      </form>
      {etat.erreur && (
        <p role="alert" className="rounded-xl border border-trait px-4 py-3 text-sm">
          {etat.erreur}
        </p>
      )}
      {etat.lien && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="break-words">Lien de {etat.lien.nom} :</span>
          <code className="select-all break-all rounded bg-trait/40 px-2 py-1">{etat.lien.url}</code>
          <BoutonCopier texte={etat.lien.url} />
        </div>
      )}
    </section>
  );
}
