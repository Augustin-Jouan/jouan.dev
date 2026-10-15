"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CATEGORIES_DES_ANCRES, categorieDeAncre, categories, type Categorie } from "@/data/realisations";

/**
 * Lu pendant l'analyse de la page, avant l'affichage : choisit l'onglet d'après
 * l'ancre, pour qu'une arrivée sur `#site-vitrine` ne montre pas d'abord l'autre
 * étude (et que le navigateur descende au bon endroit). Sans JavaScript, aucun
 * onglet : les études restent à la suite.
 */
const SCRIPT_ONGLET = `(function(){var t=${JSON.stringify(CATEGORIES_DES_ANCRES)},c;try{c=t[decodeURIComponent(location.hash.slice(1))]}catch(e){}document.currentScript.parentElement.dataset.categorie=c||${JSON.stringify(categories[0]!.id)}})()`;

/** Masque d'un panneau quand un autre onglet est choisi (classes écrites en entier pour Tailwind). */
const MASQUES: Record<Categorie, string> = {
  "application-metier": "group-data-[categorie=site-vitrine]/onglets:hidden",
  "site-vitrine": "group-data-[categorie=application-metier]/onglets:hidden",
};

const idOnglet = (c: Categorie) => `onglet-${c}`;
const idPanneau = (c: Categorie) => `panneau-${c}`;

/**
 * Deux onglets, « Application métier » et « Site vitrine », au-dessus des études
 * de /realisations : on ne voit que celles qui nous intéressent. L'onglet choisi
 * s'inscrit dans l'ancre de l'adresse, que les liens de l'accueil visent déjà.
 */
export function OngletsRealisations({ panneaux }: { panneaux: Record<Categorie, ReactNode> }) {
  const racine = useRef<HTMLDivElement>(null);
  const onglets = useRef(new Map<Categorie, HTMLButtonElement>());
  // Rien de choisi au rendu serveur : sans JavaScript, ni attribut ni onglets, les études se suivent.
  const [choisi, setChoisi] = useState<Categorie | null>(null);
  const actif = choisi ?? categories[0]!.id;

  /** Écrit aussi l'attribut tout de suite, sans attendre React : le défilement vers l'ancre trouve l'étude affichée. */
  const choisir = (c: Categorie) => {
    racine.current?.setAttribute("data-categorie", c);
    setChoisi(c);
  };

  // Avant l'affichage, et avant que Next ne défile vers l'ancre après une navigation. Puis l'ancre est
  // suivie quand elle change sur la page : retour arrière, palette de commandes, défilement doux.
  useLayoutEffect(() => {
    const suivre = () => choisir(categorieDeAncre(window.location.hash));
    suivre();
    const navigation = (window as { navigation?: EventTarget }).navigation;
    window.addEventListener("hashchange", suivre);
    window.addEventListener("popstate", suivre);
    navigation?.addEventListener("currententrychange", suivre);
    return () => {
      window.removeEventListener("hashchange", suivre);
      window.removeEventListener("popstate", suivre);
      navigation?.removeEventListener("currententrychange", suivre);
    };
  }, []);

  const ouvrir = (c: Categorie) => {
    choisir(c);
    // Remplace l'entrée (garder l'état de Next) : changer d'onglet n'ajoute rien au bouton retour.
    window.history.replaceState(window.history.state, "", `#${c}`);
  };

  const auClavier = (evenement: KeyboardEvent, i: number) => {
    const n = categories.length;
    const cible = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[evenement.key];
    if (cible === undefined) return;
    evenement.preventDefault();
    const c = categories[(cible + n) % n]!.id;
    ouvrir(c);
    onglets.current.get(c)?.focus();
  };

  return (
    // L'attribut est posé par le script avant l'hydratation : React ne doit pas s'en étonner.
    <div ref={racine} className="group/onglets" data-categorie={choisi ?? undefined} suppressHydrationWarning>
      {/* Exécuté au chargement seulement : après une navigation, `type` en fait un bloc de données
          (React n'exécute pas les scripts qu'il crée, et le signale), et l'effet ci-dessus fait le travail. */}
      <script
        type={typeof window === "undefined" ? undefined : "application/json"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: SCRIPT_ONGLET }}
      />
      <div
        role="tablist"
        aria-label="Type de projet"
        className="mx-auto hidden w-full max-w-6xl 2xl:max-w-page gap-2 px-5 pb-10 sm:px-8 group-data-[categorie]/onglets:flex"
      >
        {categories.map(({ id, libelle }, i) => (
          <button
            key={id}
            ref={(bouton) => {
              if (bouton) onglets.current.set(id, bouton);
              else onglets.current.delete(id);
            }}
            type="button"
            role="tab"
            id={idOnglet(id)}
            aria-controls={idPanneau(id)}
            aria-selected={id === actif}
            tabIndex={id === actif ? 0 : -1}
            onClick={() => ouvrir(id)}
            onKeyDown={(e) => auClavier(e, i)}
            className="rounded-full border border-trait px-5 py-2 font-medium text-texte-doux transition-colors hover:border-trait-fort hover:text-texte aria-selected:border-accent aria-selected:bg-accent aria-selected:text-sur-accent"
          >
            {libelle}
          </button>
        ))}
      </div>
      {categories.map(({ id }) => (
        <div key={id} role="tabpanel" id={idPanneau(id)} aria-labelledby={idOnglet(id)} className={MASQUES[id]}>
          {panneaux[id]}
        </div>
      ))}
    </div>
  );
}
