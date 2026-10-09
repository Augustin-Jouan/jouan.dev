"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Image as ImageEtude } from "@/data/realisations";

export const SOURCE_DEMO = "/demo/suivi-de-marches/index.html";

/** Sous cette largeur, une iframe à défilement interne se manie mal : on ouvre la démo en plein écran. */
const LARGEUR_MIN = 768;

/**
 * La démo n'est chargée qu'à l'approche de la fenêtre : son JavaScript ne pèse
 * pas sur le chargement de la page. Avant (et sans JavaScript), l'aperçu tient
 * sa place.
 */
export function FenetreDemo({ apercu }: { apercu: ImageEtude }) {
  const fenetre = useRef<HTMLDivElement>(null);
  const [chargee, setChargee] = useState(false);

  useEffect(() => {
    const element = fenetre.current;
    if (!element || !window.matchMedia(`(min-width: ${LARGEUR_MIN}px)`).matches) return;
    if (typeof IntersectionObserver === "undefined") {
      // Navigateur sans IntersectionObserver : on charge tout de suite (une seule fois, au montage).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChargee(true);
      return;
    }
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((entree) => entree.isIntersecting)) {
          setChargee(true);
          observateur.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);

  return (
    <figure className="flex flex-col gap-4">
      <div ref={fenetre} className="overflow-hidden rounded-3xl border border-trait bg-papier shadow-fenetre">
        <div aria-hidden="true" className="flex items-center gap-2 border-b border-trait px-5 py-3">
          <span className="size-3 rounded-full bg-trait" />
          <span className="size-3 rounded-full bg-trait" />
          <span className="size-3 rounded-full bg-trait" />
          <span className="ml-3 text-xs text-encre-douce">Suivi de marchés — démo</span>
        </div>
        {chargee ? (
          <iframe
            src={SOURCE_DEMO}
            title="Démo interactive : suivi de marchés de travaux"
            className="block h-[720px] w-full bg-white"
          />
        ) : (
          <Image
            src={apercu.src}
            alt={apercu.alt}
            width={apercu.largeur}
            height={apercu.hauteur}
            sizes="(min-width: 1152px) 1088px, 100vw"
            className="block h-auto w-full md:h-180 md:object-cover md:object-top"
          />
        )}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-3 text-sm text-encre-douce">
        <span>Chantier, entreprises et montants entièrement fictifs. Rien n&apos;est enregistré.</span>
        <a
          href={SOURCE_DEMO}
          target="_blank"
          rel="noopener"
          className="rounded-full bg-encre px-5 py-2.5 font-medium text-papier transition-opacity hover:opacity-85"
        >
          Ouvrir la démo en plein écran<span className="sr-only"> (nouvel onglet)</span>
        </a>
      </figcaption>
    </figure>
  );
}
