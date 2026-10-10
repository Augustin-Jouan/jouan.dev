"use client";

import { useSyncExternalStore } from "react";
import { EVENEMENT_OUVRIR_COMMANDES } from "@/lib/commandes/evenements";

const jamais = () => () => {};
const surMac = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

/**
 * « ⌘K pour naviguer », dans le pied de page : ouvre la palette de commandes,
 * seul moyen sur mobile. « Ctrl+K » hors des appareils Apple, après
 * l'hydratation : la touche a une largeur fixe, le changement ne décale rien.
 */
export function BoutonCommandes() {
  const mac = useSyncExternalStore(jamais, surMac, () => true);
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(EVENEMENT_OUVRIR_COMMANDES))}
      className="hover:text-texte"
    >
      <kbd className="inline-block w-[6ch] text-right font-mono">{mac ? "⌘K" : "Ctrl+K"}</kbd> pour naviguer
    </button>
  );
}
