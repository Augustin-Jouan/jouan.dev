"use client";

import { useEffect } from "react";
import { quandLibre } from "@/lib/quand-libre";

/** Sans défilement doux : mouvement réduit demandé, ou écran tactile seul (déjà fluide). */
const NATIF = ["(prefers-reduced-motion: reduce)", "(hover: none) and (pointer: coarse)"];

/**
 * Défilement doux de tout le site (lib/defilement-lenis.ts), chargé dans un
 * temps libre après l'affichage : le premier écran n'attend pas Lenis. Ne rend rien.
 */
export function DefilementDoux() {
  useEffect(() => {
    if (NATIF.some((requete) => window.matchMedia(requete).matches)) return;
    let annule = false;
    let arreter: (() => void) | null = null;
    const annulerDemarrage = quandLibre(() => {
      import("@/lib/defilement-lenis")
        .then((m) => {
          if (!annule) arreter = m.demarrerDefilement();
        })
        .catch(() => {
          // Morceau introuvable (déploiement en cours) : le défilement reste natif.
        });
    });
    return () => {
      annule = true;
      annulerDemarrage();
      arreter?.();
    };
  }, []);
  return null;
}
