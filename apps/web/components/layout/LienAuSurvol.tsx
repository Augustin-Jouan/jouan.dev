"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

/**
 * `Link` qui ne précharge qu'à une intention : survol, focus au clavier ou
 * toucher (motif « hover-triggered prefetch » de la doc de Next). Le lien vers
 * l'accueil est dans l'en-tête de chaque page : préchargé à l'affichage, le JS
 * de l'accueil compterait dans le budget de la page visitée (`/coulisses`).
 */
export function LienAuSurvol({ onMouseEnter, onFocus, onTouchStart, ...reste }: ComponentProps<typeof Link>) {
  const [intention, setIntention] = useState(false);
  return (
    <Link
      {...reste}
      prefetch={intention ? null : false}
      onMouseEnter={(e) => {
        setIntention(true);
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        setIntention(true);
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        setIntention(true);
        onTouchStart?.(e);
      }}
    />
  );
}
