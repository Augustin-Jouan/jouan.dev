"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import { NOEUD_PAR_DEFAUT, noeudDe, type IdNoeud } from "@/data/architecture";
import { mesurerHttp } from "@/lib/coulisses/http";
import { MagasinMesures, type EtatMesures } from "@/lib/coulisses/magasin";
import { Releveur } from "@/lib/coulisses/releveur";
import { SondeTempsReel } from "@/lib/coulisses/sonde";
import { webglDisponible } from "@/lib/coulisses/webgl";
import { quandLibre } from "@/lib/quand-libre";
import { DetailNoeud } from "./DetailNoeud";
import { PanneauEnDirect } from "./PanneauEnDirect";
import { Schema } from "./Schema";

/** Sonde : même origine que le service temps réel, chemin `/sonde`. */
export const adresseSonde = (url: string) => new URL("/sonde", url).href;

type Vue = "2d" | "chargement" | "3d" | "echec";
type Cadre3d = ComponentType<{
  choisi: IdNoeud;
  choisir: (id: IdNoeud) => void;
  mesures: EtatMesures;
  surPerte: () => void;
}>;

const jamais = () => () => {};
/** Posé au premier clic ; vit dans le morceau 3D, pas dans le JS initial. */
let Cadre: Cadre3d | null = null;

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
  const [vue, setVue] = useState<Vue>("2d");
  const boutonRef = useRef<HTMLButtonElement>(null);
  const figureRef = useRef<HTMLElement>(null);
  const surPerte3d = useCallback(() => {
    // La rangée « Nœuds » va disparaître : le focus qu'elle avait revient sur le bouton 3D.
    if (figureRef.current?.contains(document.activeElement)) boutonRef.current?.focus();
    setVue("echec");
  }, []);

  const basculer3d = () => {
    if (vue === "chargement") return;
    if (vue === "3d") {
      setVue("2d");
      return;
    }
    setVue("chargement");
    import("./CadreScene3d")
      .then((m) => {
        Cadre = m.Cadre;
        setVue("3d");
      })
      .catch(surPerte3d);
  };

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
          ref={boutonRef}
          type="button"
          onClick={basculer3d}
          aria-disabled={vue === "chargement" || undefined}
          aria-hidden={!webgl || undefined}
          tabIndex={webgl ? undefined : -1}
          className={`rounded-full border border-trait-fort px-4 py-2 text-sm font-semibold transition-[color,background-color] hover:bg-accent hover:text-sur-accent aria-disabled:opacity-60 ${webgl ? "" : "invisible"}`}
        >
          {vue === "3d" ? "Revenir en 2D" : vue === "chargement" ? "Chargement…" : "Voir en 3D"}
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-6">
          <figure ref={figureRef} className="flex flex-col gap-2">
            {vue === "3d" && Cadre ? (
              <Cadre choisi={choisi} choisir={setChoisi} mesures={mesures} surPerte={surPerte3d} />
            ) : (
              <div className="relative aspect-[360/820] w-full sm:aspect-[960/420]">
                <Schema choisi={choisi} choisir={setChoisi} mesures={mesures} />
              </div>
            )}
            {/* Toujours présente, vide hors échec : une zone d'état qui apparaît déjà remplie n'est souvent pas annoncée. */}
            <p role="status" data-testid="etat-3d" className={vue === "echec" ? "text-sm text-texte-doux" : "sr-only"}>
              {vue === "echec" ? "3D indisponible sur cet appareil." : ""}
            </p>
            <figcaption className="text-sm text-texte-doux">
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
