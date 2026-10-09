"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { LIAISONS, NOEUDS, type IdNoeud } from "@/data/architecture";
import { derniere, type EtatMesures } from "@/lib/coulisses/magasin";
import { MARQUEUR_3D, creerScene, type Scene3D } from "@/lib/coulisses/scene3d";

const REQUETE_MOUVEMENT = "(prefers-reduced-motion: reduce)";
const abonnerMouvement = (fn: () => void) => {
  const mq = window.matchMedia(REQUETE_MOUVEMENT);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
};
const lireMouvement = () => window.matchMedia(REQUETE_MOUVEMENT).matches;
const dernieres = (m: EtatMesures) => ({ site: derniere(m.site), base: derniere(m.base), tempsReel: derniere(m.tempsReel) });

type Props = {
  choisi: IdNoeud;
  choisir: (id: IdNoeud) => void;
  mesures: EtatMesures;
  surPerte: () => void;
};

/**
 * Cadre et rangée de la vue 3D : chargé au clic avec scene3d / Three.js, pas
 * au premier rendu de `/coulisses`. `MARQUEUR_3D` reste dans ce morceau s'il
 * est séparé, pour que verifier-taille-3d et l'e2e le comptent.
 */
export function Cadre({ choisi, choisir, mesures, surPerte }: Props) {
  const mouvementReduit = useSyncExternalStore(abonnerMouvement, lireMouvement, () => false);
  const mesuresRef = useRef(mesures);
  const choisiRef = useRef(choisi);
  const sceneRef = useRef<Scene3D | null>(null);

  useEffect(() => {
    mesuresRef.current = mesures;
    choisiRef.current = choisi;
  });
  useEffect(() => {
    sceneRef.current?.choisir(choisi);
  }, [choisi]);

  const monterScene = useCallback(
    (cadre: HTMLDivElement | null) => {
      if (!cadre) return;
      let scene: Scene3D;
      try {
        scene = creerScene({
          conteneur: cadre,
          noeuds: NOEUDS,
          liaisons: LIAISONS,
          latences: () => dernieres(mesuresRef.current),
          mouvementReduit,
          choisi: choisiRef.current,
          surChoix: choisir,
          surPerte,
        });
      } catch {
        surPerte();
        return;
      }
      sceneRef.current = scene;
      return () => {
        scene.arreter();
        sceneRef.current = null;
      };
    },
    [choisir, mouvementReduit, surPerte],
  );

  return (
    <>
      <div className="relative aspect-[360/820] w-full sm:aspect-[960/420]">
        <div
          ref={monterScene}
          aria-hidden="true"
          data-testid="scene-3d"
          data-scene={MARQUEUR_3D}
          className="absolute inset-0 overflow-hidden rounded-xl"
        />
      </div>
      <div role="group" aria-label="Nœuds" className="flex flex-wrap gap-2">
        {NOEUDS.map((n) => (
          <button
            key={n.id}
            type="button"
            aria-pressed={n.id === choisi}
            onClick={() => choisir(n.id)}
            className="rounded-full border border-trait px-3 py-1 text-sm aria-pressed:border-brique aria-pressed:text-brique"
          >
            {n.nom}
          </button>
        ))}
      </div>
    </>
  );
}
