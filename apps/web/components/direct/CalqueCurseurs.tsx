"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { boitesDesSections, versPage } from "@/lib/direct/coordonnees";
import type { CurseurAffiche } from "@/lib/direct/magasin";

/** Un curseur immobile depuis 10 s s'estompe (affichage seulement). */
const ESTOMPE_APRES_MS = 10_000;

const jamais = () => () => {};
const abonnerRedimensionnement = (fn: () => void) => {
  window.addEventListener("resize", fn);
  return () => window.removeEventListener("resize", fn);
};
const largeurFenetre = () => window.innerWidth;

/**
 * Curseurs des autres visiteurs, dans `body`, en coordonnées de document : le
 * calque défile avec la page, sans écouteur de défilement ; les positions sont
 * recalculées à chaque lot et au redimensionnement. Transparent aux clics et
 * ignoré des lecteurs d'écran.
 */
export function CalqueCurseurs({ curseurs }: { curseurs: CurseurAffiche[] }) {
  const monte = useSyncExternalStore(jamais, () => true, () => false);
  useSyncExternalStore(abonnerRedimensionnement, largeurFenetre, () => 0);
  const [maintenant, setMaintenant] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setMaintenant(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  if (!monte || curseurs.length === 0) return null;
  const boites = boitesDesSections();

  return createPortal(
    <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-40">
      {curseurs.map((c) => {
        const point = versPage(c, boites);
        if (!point) return null;
        const estompe = maintenant > 0 && maintenant - c.vuLe > ESTOMPE_APRES_MS;
        return (
          <svg
            key={c.id}
            data-curseur=""
            width="18"
            height="22"
            viewBox="0 0 18 22"
            className="absolute left-0 top-0 transition-[transform,opacity] duration-150 ease-linear motion-reduce:transition-opacity"
            style={{ transform: `translate(${point.x}px, ${point.y}px)`, opacity: estompe ? 0 : 1 }}
          >
            <path
              d="M1 1 L1 18 L6 13.5 L9.5 21 L12.5 19.6 L9 12.3 L16 12.3 Z"
              fill={c.couleur}
              stroke="#f3efe7"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </div>,
    document.body,
  );
}
