"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LIAISONS, NOEUDS, NOEUD_PAR_DEFAUT, noeudDe, type IdNoeud } from "@/data/architecture";
import { mesurerHttp } from "@/lib/coulisses/http";
import { derniere, MagasinMesures, type EtatMesures } from "@/lib/coulisses/magasin";
import { Releveur } from "@/lib/coulisses/releveur";
import type { Scene3D } from "@/lib/coulisses/scene3d";
import { SondeTempsReel } from "@/lib/coulisses/sonde";
import { webglDisponible } from "@/lib/coulisses/webgl";
import { quandLibre } from "@/lib/quand-libre";
import { DetailNoeud } from "./DetailNoeud";
import { PanneauEnDirect } from "./PanneauEnDirect";
import { Schema } from "./Schema";

/** Sonde : même origine que le service temps réel, chemin `/sonde`. */
export const adresseSonde = (url: string) => new URL("/sonde", url).href;

type Vue = "2d" | "chargement" | "3d";
type Module3D = typeof import("@/lib/coulisses/scene3d");

const jamais = () => () => {};
const REQUETE_MOUVEMENT = "(prefers-reduced-motion: reduce)";
const abonnerMouvement = (fn: () => void) => {
  const mq = window.matchMedia(REQUETE_MOUVEMENT);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
};
const lireMouvement = () => window.matchMedia(REQUETE_MOUVEMENT).matches;
const dernieres = (m: EtatMesures) => ({ site: derniere(m.site), base: derniere(m.base), tempsReel: derniere(m.tempsReel) });

/**
 * Schéma de l'architecture, détail du nœud choisi et mesures en direct. Les
 * mesures démarrent une fois la page chargée, dans un temps libre, et
 * s'arrêtent quand l'onglet est caché. Sans `NEXT_PUBLIC_DIRECT_URL` (figée au
 * build), la mesure du temps réel est « indisponible ».
 */
export function ArchitectureVivante() {
  const [magasin] = useState(() => new MagasinMesures());
  const mesures = useSyncExternalStore(magasin.abonner, magasin.etat, magasin.etat);
  const [choisi, setChoisi] = useState<IdNoeud>(NOEUD_PAR_DEFAUT);

  const webgl = useSyncExternalStore(jamais, webglDisponible, () => false);
  const mouvementReduit = useSyncExternalStore(abonnerMouvement, lireMouvement, () => false);
  const [vue, setVue] = useState<Vue>("2d");
  const [module3d, setModule3d] = useState<Module3D | null>(null);
  const [echec3d, setEchec3d] = useState(false);
  const mesuresRef = useRef(mesures);
  const sceneRef = useRef<Scene3D | null>(null);

  useEffect(() => {
    mesuresRef.current = mesures;
  });
  useEffect(() => {
    sceneRef.current?.choisir(choisi);
  }, [choisi, vue]);

  const passerEn2d = useCallback((echec: boolean) => {
    setVue("2d");
    setEchec3d(echec);
  }, []);

  const basculer3d = () => {
    if (vue === "chargement") return;
    if (vue === "3d") {
      setVue("2d");
      return;
    }
    setEchec3d(false);
    setVue("chargement");
    import("@/lib/coulisses/scene3d")
      .then((m) => {
        setModule3d(m);
        setVue("3d");
      })
      .catch(() => passerEn2d(true));
  };

  // Ref de rappel avec nettoyage (React 19) : la scène vit tant que son cadre est monté.
  const monterScene = useCallback(
    (cadre: HTMLDivElement | null) => {
      if (!cadre || !module3d) return;
      let scene: Scene3D;
      try {
        scene = module3d.creerScene({
          conteneur: cadre,
          noeuds: NOEUDS,
          liaisons: LIAISONS,
          latences: () => dernieres(mesuresRef.current),
          mouvementReduit,
          surChoix: setChoisi,
          surPerte: () => passerEn2d(true),
        });
      } catch {
        passerEn2d(true);
        return;
      }
      sceneRef.current = scene;
      return () => {
        scene.arreter();
        sceneRef.current = null;
      };
    },
    [module3d, mouvementReduit, passerEn2d],
  );

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_DIRECT_URL;
    const sonde = url ? new SondeTempsReel(adresseSonde(url)) : null;
    const releveur = new Releveur(magasin, (signal) => mesurerHttp(signal), sonde);
    const surVisibilite = () => releveur.surVisibilite(document.visibilityState === "visible");
    const annuler = quandLibre(() => {
      releveur.demarrer();
      document.addEventListener("visibilitychange", surVisibilite);
    });
    return () => {
      annuler();
      document.removeEventListener("visibilitychange", surVisibilite);
      releveur.arreter();
    };
  }, [magasin]);

  return (
    <section aria-labelledby="titre-architecture" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="titre-architecture" className="font-serif text-3xl">
          Architecture vivante
        </h2>
        {/*
          Toujours rendu, pour que son apparition ne décale rien (CLS) : sans WebGL
          (et au rendu serveur), il reste invisible et hors de l'arbre d'accessibilité.
          Pendant le chargement, aria-disabled plutôt que disabled : le focus reste dessus.
        */}
        <button
          type="button"
          onClick={basculer3d}
          aria-disabled={vue === "chargement" || undefined}
          aria-hidden={!webgl || undefined}
          tabIndex={webgl ? undefined : -1}
          className={`rounded-full border border-encre px-4 py-2 text-sm font-semibold transition-colors hover:bg-encre hover:text-papier aria-disabled:opacity-60 ${webgl ? "" : "invisible"}`}
        >
          {vue === "3d" ? "Revenir en 2D" : vue === "chargement" ? "Chargement…" : "Voir en 3D"}
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-6">
          <figure className="flex flex-col gap-2">
            <div className="relative aspect-[360/820] w-full sm:aspect-[960/420]">
              {vue === "3d" ? (
                <div ref={monterScene} aria-hidden="true" data-testid="scene-3d" className="absolute inset-0 overflow-hidden rounded-xl" />
              ) : (
                <Schema choisi={choisi} choisir={setChoisi} mesures={mesures} />
              )}
            </div>
            {vue === "3d" && (
              <div role="group" aria-label="Nœuds" className="flex flex-wrap gap-2">
                {NOEUDS.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    aria-pressed={n.id === choisi}
                    onClick={() => setChoisi(n.id)}
                    className="rounded-full border border-trait px-3 py-1 text-sm aria-pressed:border-brique aria-pressed:text-brique"
                  >
                    {n.nom}
                  </button>
                ))}
              </div>
            )}
            {echec3d && <p role="status" className="text-sm text-encre-douce">3D indisponible sur cet appareil.</p>}
            <figcaption className="text-sm text-encre-douce">
              Choisissez un élément pour voir son rôle. Les temps sont mesurés depuis votre navigateur.
            </figcaption>
          </figure>
          <DetailNoeud noeud={noeudDe(choisi)} mesures={mesures} />
        </div>
        <PanneauEnDirect mesures={mesures} />
      </div>
    </section>
  );
}
