"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Déclenche l'allumage de la frise de la méthode (CSS : app/globals.css,
 * « Méthode »). Le défilement ne fait que donner le départ : chaque animation se
 * joue ensuite jusqu'au bout, même si l'on s'arrête de défiler.
 *
 * - Ordinateur : la frise entière s'allume en cascade quand elle arrive à l'écran.
 * - Téléphone : chaque étape s'allume en arrivant, avec celles du dessus.
 *
 * `data-animation` n'est posé qu'ici : sans JS, en mouvement réduit, sans
 * IntersectionObserver ou si la frise est déjà à l'écran au chargement, elle
 * reste finie. Une fois allumée, elle le reste.
 */
export function FriseMethode({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frise = ref.current;
    if (!frise || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cadre = frise.getBoundingClientRect();
    if (cadre.top < window.innerHeight && cadre.bottom > 0) return;

    const etapes = [...frise.querySelectorAll<HTMLElement>(".methode-etape")];
    frise.setAttribute("data-animation", "");
    /** Étapes allumées jusqu'à `rang` inclus ; le fil rejoint le bas de la dernière. */
    const allumerJusqua = (rang: number) => {
      etapes.slice(0, rang + 1).forEach((etape) => etape.setAttribute("data-allumee", ""));
      const derniere = etapes[rang]!;
      const hauteur = frise.offsetHeight;
      const avance =
        rang === etapes.length - 1
          ? 1
          : hauteur > 0
            ? (derniere.offsetTop + derniere.offsetHeight) / hauteur
            : (rang + 1) / etapes.length;
      const actuelle = Number(frise.style.getPropertyValue("--avance") || 0);
      frise.style.setProperty("--avance", String(Math.min(1, Math.max(actuelle, avance))));
      if (rang === etapes.length - 1) frise.setAttribute("data-complete", "");
    };

    // Déclenché quand l'élément passe le dernier quart de l'écran.
    const options = { rootMargin: "0px 0px -25% 0px" };
    if (window.matchMedia("(width >= 64rem)").matches) {
      const observateur = new IntersectionObserver(([entree]) => {
        if (!entree?.isIntersecting) return;
        allumerJusqua(etapes.length - 1);
        observateur.disconnect();
      }, options);
      observateur.observe(frise);
      return () => observateur.disconnect();
    }
    const observateur = new IntersectionObserver((entrees) => {
      for (const entree of entrees) {
        if (!entree.isIntersecting) continue;
        allumerJusqua(etapes.indexOf(entree.target as HTMLElement));
      }
      etapes.filter((etape) => etape.hasAttribute("data-allumee")).forEach((etape) => observateur.unobserve(etape));
      if (frise.hasAttribute("data-complete")) observateur.disconnect();
    }, options);
    etapes.forEach((etape) => observateur.observe(etape));
    return () => observateur.disconnect();
  }, []);

  return (
    <div ref={ref} className="methode-frise">
      {children}
    </div>
  );
}
