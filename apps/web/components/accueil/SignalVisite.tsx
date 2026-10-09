"use client";

import { useEffect } from "react";

/** Temps de page visible avant de compter la visite : écarte les scanners de liens. */
export const DUREE_VISIBLE_MS = 3000;

/** Signale l'ouverture d'un lien personnalisé, une fois, après 3 s de page visible. */
export function SignalVisite({ jeton }: { jeton: string }) {
  useEffect(() => {
    let cumul = 0;
    let depuis: number | null = null;
    let minuterie: number | undefined;
    let envoye = false;

    function envoyer() {
      if (envoye) return;
      envoye = true;
      if (!navigator.sendBeacon?.("/api/visites", jeton)) {
        fetch("/api/visites", { method: "POST", body: jeton, keepalive: true }).catch(() => {});
      }
    }
    function demarrer() {
      if (envoye || depuis !== null) return;
      depuis = Date.now();
      minuterie = window.setTimeout(envoyer, DUREE_VISIBLE_MS - cumul);
    }
    function suspendre() {
      if (depuis !== null) cumul += Date.now() - depuis;
      depuis = null;
      window.clearTimeout(minuterie);
    }
    function surVisibilite() {
      if (document.visibilityState === "visible") demarrer();
      else suspendre();
    }

    if (document.visibilityState === "visible") demarrer();
    document.addEventListener("visibilitychange", surVisibilite);
    return () => {
      window.clearTimeout(minuterie);
      document.removeEventListener("visibilitychange", surVisibilite);
    };
  }, [jeton]);

  return null;
}
