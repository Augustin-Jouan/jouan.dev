"use client";

import { useDirect } from "./contexte";

/**
 * Ligne du compteur, en tête de l'accroche (avant la salutation) : une place à
 * hauteur fixe rendue par le serveur, vide sans service ou quand on est seul,
 * pour que son apparition ne décale rien. Le bouton apparaît dès la connexion,
 * sur pointeur fin seulement : on peut refuser avant que quiconque arrive.
 */
export function CompteurPresents() {
  const { etat, pointeurFin, partage, basculerPartage } = useDirect();
  const plusieurs = etat.presents >= 2;
  return (
    <div data-testid="compteur-presents" className="mb-3 flex h-7 items-center gap-4 text-sm text-texte-doux">
      <p aria-live="polite" className="flex items-center gap-2">
        {plusieurs && (
          <>
            <span aria-hidden="true" className="size-2 rounded-full bg-vivant motion-safe:animate-pulse" />
            {`${etat.presents} personnes regardent cette page`}
          </>
        )}
      </p>
      {etat.connecte && pointeurFin && (
        <button
          type="button"
          onClick={basculerPartage}
          className="underline decoration-trait-fort underline-offset-4 transition-[color] hover:text-texte"
        >
          {partage ? "Masquer mon curseur" : "Montrer mon curseur"}
        </button>
      )}
    </div>
  );
}
