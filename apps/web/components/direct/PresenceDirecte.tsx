"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { ConnexionDirecte } from "@/lib/direct/connexion";
import type { EtatDirect, MagasinDirect } from "@/lib/direct/magasin";
import { quandLibre } from "@/lib/quand-libre";
import { ContexteDirect } from "./contexte";

const VIDE: EtatDirect = { connecte: false, presents: 0 };
const nop = () => () => {};
const etatVide = () => VIDE;

/**
 * Présence en direct sur l'accueil (sous-projet 4) : le nombre de personnes
 * présentes. Magasin et connexion partagent un morceau chargé après
 * l'affichage, pour ne pas gonfler le chunk commun aux études de cas. Sans
 * `NEXT_PUBLIC_DIRECT_URL` (figée au build), rien n'est chargé ni connecté et
 * l'accueil reste celui d'avant.
 */
export function PresenceDirecte({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_DIRECT_URL;
  const [magasin, setMagasin] = useState<MagasinDirect | null>(null);
  const etat = useSyncExternalStore(magasin ? magasin.abonner : nop, magasin ? magasin.etat : etatVide, etatVide);

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
          setMagasin(mag);
          courante = new m.ConnexionDirecte(url, {
            surMessage: (msg) => mag!.appliquer(msg),
            surFermeture: () => mag!.vider(),
          });
          courante.ouvrir();
          document.addEventListener("visibilitychange", surVisibilite);
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

  return <ContexteDirect.Provider value={{ etat }}>{children}</ContexteDirect.Provider>;
}
