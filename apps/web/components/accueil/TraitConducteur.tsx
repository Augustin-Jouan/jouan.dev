"use client";

import { useEffect } from "react";
import { quandLibre } from "@/lib/quand-libre";

/**
 * Le trait conducteur de l'accueil (lib/trait/trait-conducteur.ts). Il ne se dessine qu'une fois la page
 * défilée sous l'accroche : son morceau de JS n'est chargé qu'au premier défilement (ou dès l'affichage si
 * la page arrive déjà défilée), dans un temps libre. Le premier écran ne l'attend pas, et une visite sans
 * défilement ne le télécharge pas. Ni en mouvement réduit, ni sans JS : la page reste celle d'avant.
 * Ne rend rien.
 */
export function TraitConducteur() {
  useEffect(() => {
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduit.matches) return;
    let annule = false;
    let arreter: (() => void) | null = null;
    let annulerDemarrage = () => {};
    const demarrer = () => {
      window.removeEventListener("scroll", demarrer);
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
    const surChangement = () => {
      if (!reduit.matches) return;
      arreter?.();
      arreter = null;
    };
    reduit.addEventListener("change", surChangement);
    if (window.scrollY > 0) demarrer();
    else window.addEventListener("scroll", demarrer, { passive: true });
    return () => {
      annule = true;
      reduit.removeEventListener("change", surChangement);
      window.removeEventListener("scroll", demarrer);
      annulerDemarrage();
      arreter?.();
    };
  }, []);
  return null;
}
