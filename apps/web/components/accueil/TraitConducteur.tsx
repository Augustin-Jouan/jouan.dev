"use client";

import { useEffect } from "react";

/** Premiers gestes du visiteur : le trait est chargé dès l'un d'eux, avant même qu'il ait défilé. */
const INTERACTIONS = ["pointermove", "pointerdown", "touchstart", "keydown", "wheel", "scroll"] as const;

/**
 * Le trait conducteur de l'accueil (lib/trait/trait-conducteur.ts). Son morceau de JS est chargé dès la
 * première interaction (souris, toucher, clavier, molette, défilement), ou dès l'affichage si la page arrive
 * déjà défilée : le trait est prêt quand le visiteur commence à défiler. Le premier écran ne l'attend pas,
 * et une visite sans interaction (Lighthouse) ne le télécharge pas. Ni en mouvement réduit, ni sans JS : la
 * page reste celle d'avant. Ne rend rien.
 */
export function TraitConducteur() {
  useEffect(() => {
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduit.matches) return;
    let annule = false;
    let arreter: (() => void) | null = null;
    const charger = () => {
      window.removeEventListener("load", charger);
      import("@/lib/trait/trait-conducteur")
        .then((m) => {
          if (!annule && !reduit.matches) arreter = m.demarrerTrait();
        })
        .catch(() => {
          // Morceau introuvable (déploiement en cours) : pas de trait, la Méthode garde son repli.
        });
    };
    const surInteraction = () => {
      for (const type of INTERACTIONS) window.removeEventListener(type, surInteraction);
      // Les positions de la page ne sont justes qu'une fois tout chargé (images, polices).
      if (document.readyState === "complete") charger();
      else window.addEventListener("load", charger);
    };
    const surChangement = () => {
      if (!reduit.matches) return;
      arreter?.();
      arreter = null;
    };
    reduit.addEventListener("change", surChangement);
    if (window.scrollY > 0) surInteraction();
    else for (const type of INTERACTIONS) window.addEventListener(type, surInteraction, { passive: true });
    return () => {
      annule = true;
      reduit.removeEventListener("change", surChangement);
      for (const type of INTERACTIONS) window.removeEventListener(type, surInteraction);
      window.removeEventListener("load", charger);
      arreter?.();
    };
  }, []);
  return null;
}
