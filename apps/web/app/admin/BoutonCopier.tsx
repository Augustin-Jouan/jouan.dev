"use client";

import { useEffect, useRef, useState } from "react";

export function BoutonCopier({ texte, libelle = "Copier le lien" }: { texte: string; libelle?: string }) {
  const [etat, setEtat] = useState<"repos" | "copie" | "echec">("repos");
  const minuterie = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(minuterie.current), []);

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setEtat("copie");
    } catch {
      setEtat("echec");
    }
    clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => setEtat("repos"), 2000);
  }

  return (
    <button type="button" onClick={copier} className="underline underline-offset-4">
      <span aria-live="polite">{etat === "copie" ? "Copié" : etat === "echec" ? "Copie impossible" : libelle}</span>
    </button>
  );
}
