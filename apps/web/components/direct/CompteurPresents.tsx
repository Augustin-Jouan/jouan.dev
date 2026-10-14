"use client";

import { useState } from "react";
import { useDirect } from "./contexte";

/** Invitation copiée, ou lien à sélectionner quand le presse-papiers est refusé. */
type Invitation = { copiee: true } | { lien: string } | null;

/**
 * Ligne du compteur, en tête de l'accroche (avant la salutation) : une place à
 * hauteur fixe rendue par le serveur, vide sans service, pour que son apparition
 * ne décale rien.
 *
 * Seul sur la page : on peut inviter quelqu'un, avec le lien de l'accueil public.
 * Jamais celui d'un prospect (`/?pour=…`), qui transmettrait sa salutation et
 * compterait une visite ; les deux pages sont comptées ensemble.
 */
export function CompteurPresents() {
  const { etat } = useDirect();
  const plusieurs = etat.presents >= 2;
  const seul = etat.connecte && etat.presents === 1;
  const [invitation, setInvitation] = useState<Invitation>(null);
  // Quelqu'un est arrivé : l'invitation repart de zéro pour la prochaine fois.
  const [etaitPlusieurs, setEtaitPlusieurs] = useState(plusieurs);
  if (plusieurs !== etaitPlusieurs) {
    setEtaitPlusieurs(plusieurs);
    if (plusieurs) setInvitation(null);
  }

  async function inviter() {
    const lien = `${window.location.origin}/`;
    try {
      await navigator.clipboard.writeText(lien);
      setInvitation({ copiee: true });
    } catch {
      setInvitation({ lien });
    }
  }

  return (
    <div data-testid="compteur-presents" className="mb-3 flex h-7 items-center gap-4 text-sm text-texte-doux">
      <p aria-live="polite" className="flex items-center gap-2">
        {plusieurs && (
          <>
            <span aria-hidden="true" className="size-2 rounded-full bg-vivant motion-safe:animate-pulse" />
            {`${etat.presents} personnes regardent cette page`}
          </>
        )}
        {seul && !invitation && "Vous êtes seul ici."}
        {seul && invitation && "copiee" in invitation && "Lien copié : envoyez-le, le compteur passera à 2."}
        {seul && invitation && "lien" in invitation && (
          <>
            Envoyez ce lien :<span className="select-all text-texte">{invitation.lien}</span>
          </>
        )}
      </p>
      {seul && !invitation && (
        <button
          type="button"
          onClick={inviter}
          className="underline decoration-trait-fort underline-offset-4 transition-[color] hover:text-texte"
        >
          Inviter quelqu&apos;un
        </button>
      )}
    </div>
  );
}
