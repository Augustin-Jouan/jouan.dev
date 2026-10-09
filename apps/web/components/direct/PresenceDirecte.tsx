"use client";

import { useEffect, useState, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import type { ConnexionDirecte } from "@/lib/direct/connexion";
import type { CurseurAffiche, EtatDirect, MagasinDirect } from "@/lib/direct/magasin";
import { ContexteDirect } from "./contexte";

const CLE_PARTAGE = "direct:partage";
const VIDE: EtatDirect = { connecte: false, presents: 0, curseurs: [] };
const nop = () => () => {};
const etatVide = () => VIDE;

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

type Apres = typeof import("@/lib/direct/apres-affichage");
type Calque = ComponentType<{ curseurs: CurseurAffiche[] }>;

/**
 * Présence en direct sur l'accueil (sous-projet 4) : compteur des personnes
 * présentes et curseurs des autres visiteurs. Magasin, coordonnées et connexion
 * partagent un morceau chargé après l'affichage, pour ne pas gonfler le chunk
 * commun aux études de cas. Le calque n'est chargé que s'il y a d'autres
 * curseurs. Sans `NEXT_PUBLIC_DIRECT_URL` (figée au build), rien n'est chargé
 * ni connecté et l'accueil reste celui d'avant.
 */
export function PresenceDirecte({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_DIRECT_URL;
  const [apres, setApres] = useState<Apres | null>(null);
  const [magasin, setMagasin] = useState<MagasinDirect | null>(null);
  const [Calque, setCalque] = useState<Calque | null>(null);
  const etat = useSyncExternalStore(magasin ? magasin.abonner : nop, magasin ? magasin.etat : etatVide, etatVide);
  const pointeurFin = useSyncExternalStore(abonnerPointeur, lirePointeur, () => false);
  const [partage, setPartage] = useState(() => (typeof window === "undefined" ? true : lirePartage()));
  const [connexion, setConnexion] = useState<ConnexionDirecte | null>(null);

  useEffect(() => {
    if (!url) return;
    let annule = false;
    let courante: ConnexionDirecte | null = null;
    let mag: MagasinDirect | null = null;
    const surVisibilite = () => courante?.surVisibilite(document.visibilityState === "visible");
    const annulerDemarrage = quandLibre(() => {
      import("@/lib/direct/apres-affichage")
        .then((m) => {
          if (annule) return;
          mag = new m.MagasinDirect();
          setApres(m);
          setMagasin(mag);
          courante = new m.ConnexionDirecte(url, {
            surMessage: (msg) => mag!.appliquer(msg, Date.now()),
            surFermeture: () => mag!.vider(),
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
      mag?.vider();
    };
  }, [url]);

  useEffect(() => {
    if (!connexion || !pointeurFin || !apres) return;
    if (!partage) {
      connexion.envoyer({ type: "masque" });
      return;
    }
    const { versRepere, boitesDesSections } = apres;
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
  }, [connexion, pointeurFin, partage, apres]);

  useEffect(() => {
    if (etat.curseurs.length === 0 || Calque) return;
    let annule = false;
    import("./CalqueCurseurs")
      .then((m) => {
        if (!annule) setCalque(() => m.CalqueCurseurs);
      })
      .catch(() => {
        // Morceau introuvable : pas de curseurs dessinés.
      });
    return () => {
      annule = true;
    };
  }, [etat.curseurs.length, Calque]);

  const basculerPartage = () => {
    const suivant = !partage;
    ecrirePartage(suivant);
    setPartage(suivant);
  };

  return (
    <ContexteDirect.Provider value={{ etat, pointeurFin, partage, basculerPartage }}>
      {children}
      {Calque ? <Calque curseurs={etat.curseurs} /> : null}
    </ContexteDirect.Provider>
  );
}
