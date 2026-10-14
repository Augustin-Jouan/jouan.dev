"use client";

import type Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { allerAAncre } from "@/lib/defilement";
import { LienAuSurvol } from "./LienAuSurvol";

/**
 * Lien de l'en-tête vers une ancre de l'accueil (`/#offre`). Sur l'accueil,
 * un `Link` ferait une vraie navigation vers `/` dès que la recherche diffère
 * (`/?pour=…`) et perdrait la personnalisation : on ne change donc que le hash
 * (recherche conservée), avec le glissé du défilement doux s'il est actif
 * (lib/defilement.ts). Ailleurs, comportement du `Link`,
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
    allerAAncre(href.slice(1));
  }
  return <LienAuSurvol href={href} onClick={surClic} {...reste} />;
}
