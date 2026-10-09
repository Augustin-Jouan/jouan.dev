"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { NOEUD_PAR_DEFAUT, noeudDe, type IdNoeud } from "@/data/architecture";
import { mesurerHttp } from "@/lib/coulisses/http";
import { MagasinMesures } from "@/lib/coulisses/magasin";
import { Releveur } from "@/lib/coulisses/releveur";
import { SondeTempsReel } from "@/lib/coulisses/sonde";
import { quandLibre } from "@/lib/quand-libre";
import { DetailNoeud } from "./DetailNoeud";
import { PanneauEnDirect } from "./PanneauEnDirect";
import { Schema } from "./Schema";

/** Sonde : même origine que le service temps réel, chemin `/sonde`. */
export const adresseSonde = (url: string) => new URL("/sonde", url).href;

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
        {/* Bouton « Voir en 3D » : tâche 14. */}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-6">
          <figure className="flex flex-col gap-2">
            <div className="relative aspect-[360/820] w-full sm:aspect-[960/420]">
              <Schema choisi={choisi} choisir={setChoisi} mesures={mesures} />
            </div>
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
