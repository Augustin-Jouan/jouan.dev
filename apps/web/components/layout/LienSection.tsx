"use client";

import type Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { LienAuSurvol } from "./LienAuSurvol";

/**
 * Lien de l'en-tête vers une ancre de l'accueil (`/#offre`). Sur l'accueil,
 * un `Link` ferait une vraie navigation vers `/` dès que la recherche diffère
 * (`/?pour=…`) et perdrait la personnalisation : on ne change donc que le hash
 * (défilement natif, recherche conservée). Ailleurs, comportement du `Link`,
 * préchargé à l'intention seulement (`LienAuSurvol`).
 */
export function LienSection({ href, onClick, ...reste }: ComponentProps<typeof Link>) {
  function surClic(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented || typeof href !== "string") return;
    // Clic avec modificateur (nouvel onglet, nouvelle fenêtre…) : le navigateur décide.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (window.location.pathname !== "/" || !href.startsWith("/#")) return;
    e.preventDefault();
    const ancre = href.slice(1);
    if (window.location.hash === ancre) {
      document.getElementById(ancre.slice(1))?.scrollIntoView();
    } else {
      window.location.hash = ancre;
    }
  }
  return <LienAuSurvol href={href} onClick={surClic} {...reste} />;
}
