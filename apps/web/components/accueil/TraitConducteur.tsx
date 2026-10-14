"use client";

import { useEffect } from "react";
import { quandLibre } from "@/lib/quand-libre";

/** Sans défilement pendant ce délai, le glissé est fini : le trait peut démarrer. */
const PAUSE_DEFILEMENT = 200;

/**
 * Le trait conducteur de l'accueil (lib/trait/trait-conducteur.ts). Il ne se dessine qu'une fois la page
 * défilée sous l'accroche : son morceau de JS n'est chargé qu'à la première pause du défilement (ou de
 * l'arrivée sur une ancre), dans un temps libre. Le premier écran ne l'attend pas, une visite sans
 * défilement ne le télécharge pas, et son démarrage ne fait jamais saccader un glissé en cours. Ni en mouvement réduit, ni sans JS : la page reste celle d'avant.
 * Ne rend rien.
 */
export function TraitConducteur() {
  useEffect(() => {
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduit.matches) return;
    let annule = false;
    let arreter: (() => void) | null = null;
    let annulerDemarrage = () => {};
    let attente = 0;
    const demarrer = () => {
      window.removeEventListener("scroll", surDefilement);
      annulerDemarrage = quandLibre(() => {
        import("@/lib/trait/trait-conducteur")
          .then((m) => {
            if (!annule && !reduit.matches) arreter = m.demarrerTrait();
          })
          .catch(() => {
            // Morceau introuvable (déploiement en cours) : pas de trait, la Méthode garde son repli.
          });
      });
    };
    const surDefilement = () => {
      window.clearTimeout(attente);
      attente = window.setTimeout(demarrer, PAUSE_DEFILEMENT);
    };
    const surChangement = () => {
      if (!reduit.matches) return;
      arreter?.();
      arreter = null;
    };
    reduit.addEventListener("change", surChangement);
    window.addEventListener("scroll", surDefilement, { passive: true });
    if (window.scrollY > 0) surDefilement();
    return () => {
      annule = true;
      reduit.removeEventListener("change", surChangement);
      window.removeEventListener("scroll", surDefilement);
      window.clearTimeout(attente);
      annulerDemarrage();
      arreter?.();
    };
  }, []);
  return null;
}
