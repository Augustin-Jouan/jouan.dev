"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { EVENEMENT_OUVRIR_COMMANDES } from "@/lib/commandes/evenements";
import type { Commande } from "@/lib/commandes/types";
import type { ProprietesPalette } from "./PaletteCommandes";

/** Posée au premier appel ; vit dans le morceau de JS de la palette, pas dans le JS initial. */
let Palette: ComponentType<ProprietesPalette> | null = null;

/**
 * Raccourci de la palette de commandes (sous-projet 7), monté dans le layout :
 * Cmd+K / Ctrl+K, ou l'événement du bouton du pied de page. Au premier appel,
 * charge la palette (son propre morceau de JS) puis l'ouvre ; un appel pendant
 * qu'elle est ouverte la ferme. N'importe statiquement ni la palette ni la liste
 * des commandes : celle-ci arrive du layout, construite côté serveur.
 */
export function RaccourciCommandes({ commandes }: { commandes: Commande[] }) {
  const [etat, setEtat] = useState({ ouverte: false, ouvertures: 0 });
  const ouverte = useRef(false);

  useEffect(() => {
    let chargement = false;
    const ouvrir = () => {
      ouverte.current = true;
      setEtat((e) => ({ ouverte: true, ouvertures: e.ouvertures + 1 }));
    };
    const basculer = () => {
      if (ouverte.current) {
        ouverte.current = false;
        setEtat((e) => ({ ...e, ouverte: false }));
      } else if (Palette) {
        ouvrir();
      } else if (!chargement) {
        chargement = true;
        import("./PaletteCommandes")
          .then((m) => {
            Palette = m.PaletteCommandes;
            ouvrir();
          })
          .catch((erreur: unknown) => {
            console.warn("Palette de commandes indisponible ; nouvel essai au prochain appel.", erreur);
          })
          .finally(() => {
            chargement = false;
          });
      }
    };
    const surTouche = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      e.preventDefault();
      basculer();
    };
    window.addEventListener("keydown", surTouche);
    window.addEventListener(EVENEMENT_OUVRIR_COMMANDES, basculer);
    return () => {
      window.removeEventListener("keydown", surTouche);
      window.removeEventListener(EVENEMENT_OUVRIR_COMMANDES, basculer);
    };
  }, []);

  const fermer = useCallback(() => {
    ouverte.current = false;
    setEtat((e) => ({ ...e, ouverte: false }));
  }, []);

  if (!Palette || etat.ouvertures === 0) return null;
  // Une clé par ouverture : la palette repart d'une saisie vide et relit la page.
  return <Palette key={etat.ouvertures} commandes={commandes} ouverte={etat.ouverte} fermer={fermer} />;
}
