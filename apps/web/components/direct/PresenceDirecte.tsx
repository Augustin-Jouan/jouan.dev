"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { ConnexionDirecte } from "@/lib/direct/connexion";
import { boitesDesSections, versRepere } from "@/lib/direct/coordonnees";
import { MagasinDirect, type EtatDirect } from "@/lib/direct/magasin";
import { CalqueCurseurs } from "./CalqueCurseurs";

const CLE_PARTAGE = "direct:partage";

type ValeurDirect = { etat: EtatDirect; pointeurFin: boolean; partage: boolean; basculerPartage(): void };

const ContexteDirect = createContext<ValeurDirect>({
  etat: { connecte: false, presents: 0, curseurs: [] },
  pointeurFin: false,
  partage: true,
  basculerPartage: () => {},
});

export const useDirect = () => useContext(ContexteDirect);

function lirePartage(): boolean {
  try {
    return window.localStorage.getItem(CLE_PARTAGE) !== "non";
  } catch {
    return true;
  }
}

function ecrirePartage(partage: boolean): void {
  try {
    if (partage) window.localStorage.removeItem(CLE_PARTAGE);
    else window.localStorage.setItem(CLE_PARTAGE, "non");
  } catch {
    // Stockage indisponible : le choix vaut pour cette page seulement.
  }
}

const REQUETE_POINTEUR = "(pointer: fine)";
const abonnerPointeur = (fn: () => void) => {
  const mq = window.matchMedia(REQUETE_POINTEUR);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
};
const lirePointeur = () => window.matchMedia(REQUETE_POINTEUR).matches;

/** Lance `fn` une fois la page chargée, dans un temps libre du navigateur. */
function quandLibre(fn: () => void): () => void {
  let id: number | undefined;
  const lancer = () => {
    id =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(fn, { timeout: 3_000 })
        : window.setTimeout(fn, 1_000);
  };
  if (document.readyState === "complete") lancer();
  else window.addEventListener("load", lancer, { once: true });
  return () => {
    window.removeEventListener("load", lancer);
    if (id === undefined) return;
    if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(id);
    window.clearTimeout(id);
  };
}

/**
 * Présence en direct sur l'accueil (sous-projet 4) : compteur des personnes
 * présentes et curseurs des autres visiteurs. Le code de connexion est un
 * morceau à part, chargé après l'affichage (comme le moteur de l'intro). Sans
 * `NEXT_PUBLIC_DIRECT_URL` (figée au build), rien n'est chargé ni connecté et
 * l'accueil reste celui d'avant.
 */
export function PresenceDirecte({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_DIRECT_URL;
  const [magasin] = useState(() => new MagasinDirect());
  const etat = useSyncExternalStore(magasin.abonner, magasin.etat, magasin.etat);
  const pointeurFin = useSyncExternalStore(abonnerPointeur, lirePointeur, () => false);
  const [partage, setPartage] = useState(() => (typeof window === "undefined" ? true : lirePartage()));
  const [connexion, setConnexion] = useState<ConnexionDirecte | null>(null);

  useEffect(() => {
    if (!url) return;
    let annule = false;
    let courante: ConnexionDirecte | null = null;
    const surVisibilite = () => courante?.surVisibilite(document.visibilityState === "visible");
    const annulerDemarrage = quandLibre(() => {
      import("@/lib/direct/connexion")
        .then(({ ConnexionDirecte }) => {
          if (annule) return;
          courante = new ConnexionDirecte(url, {
            surMessage: (m) => magasin.appliquer(m, Date.now()),
            surFermeture: () => magasin.vider(),
          });
          courante.ouvrir();
          document.addEventListener("visibilitychange", surVisibilite);
          setConnexion(courante);
        })
        .catch(() => {
          // Morceau introuvable (déploiement en cours) : l'accueil reste sans présence.
        });
    });
    return () => {
      annule = true;
      annulerDemarrage();
      document.removeEventListener("visibilitychange", surVisibilite);
      courante?.arreter();
      magasin.vider();
    };
  }, [url, magasin]);

  useEffect(() => {
    if (!connexion || !pointeurFin) return;
    if (!partage) {
      connexion.envoyer({ type: "masque" });
      return;
    }
    const surMouvement = (e: MouseEvent) => {
      // `pageX`/`pageY` restent vides sous jsdom ; `clientX + scrollX` est l'équivalent.
      const repere = versRepere(e.clientX + window.scrollX, e.clientY + window.scrollY, boitesDesSections());
      connexion.envoyer(repere ? { type: "position", ...repere } : { type: "masque" });
    };
    const surSortie = () => connexion.envoyer({ type: "masque" });
    document.addEventListener("mousemove", surMouvement, { passive: true });
    document.documentElement.addEventListener("mouseleave", surSortie);
    return () => {
      document.removeEventListener("mousemove", surMouvement);
      document.documentElement.removeEventListener("mouseleave", surSortie);
    };
  }, [connexion, pointeurFin, partage]);

  const basculerPartage = () => {
    const suivant = !partage;
    ecrirePartage(suivant);
    setPartage(suivant);
  };

  return (
    <ContexteDirect.Provider value={{ etat, pointeurFin, partage, basculerPartage }}>
      {children}
      <CalqueCurseurs curseurs={etat.curseurs} />
    </ContexteDirect.Provider>
  );
}
