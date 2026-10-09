"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { CADRES, LIAISONS, NOEUDS, noeudDe, type IdNoeud, type Variante } from "@/data/architecture";
import { dureeDefilement, texteSerie } from "@/lib/coulisses/format";
import { derniere, type EtatMesures } from "@/lib/coulisses/magasin";

type Props = { choisi: IdNoeud; choisir(id: IdNoeud): void; mesures: EtatMesures };

/**
 * Schéma 2D de l'architecture, rendu par le serveur. Deux variantes : large
 * (à partir de `sm`) et étroite (mobile) ; celle qui est masquée l'est en
 * `display: none`, donc hors de l'arbre d'accessibilité.
 */
export function Schema(props: Props) {
  return (
    <>
      <VarianteSchema {...props} variante="large" className="hidden sm:block" />
      <VarianteSchema {...props} variante="etroite" className="sm:hidden" />
    </>
  );
}

function VarianteSchema({ variante, className, choisi, choisir, mesures }: Props & { variante: Variante; className: string }) {
  const cadre = CADRES[variante];
  const { largeur: l, hauteur: h } = cadre.noeud;
  const surTouche = (e: KeyboardEvent, id: IdNoeud) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    choisir(id);
  };

  return (
    <svg
      viewBox={`0 0 ${cadre.largeur} ${cadre.hauteur}`}
      role="group"
      aria-label="Schéma de l'architecture"
      className={`h-full w-full ${className}`}
    >
      {LIAISONS.map((liaison) => {
        const a = noeudDe(liaison.de).positions[variante];
        const b = noeudDe(liaison.vers).positions[variante];
        const serie = liaison.mesure ? mesures[liaison.mesure] : null;
        const style = serie ? ({ "--duree": `${dureeDefilement(derniere(serie))}s` } as CSSProperties) : undefined;
        return (
          <g key={`${liaison.de}-${liaison.vers}`}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeWidth={2}
              strokeDasharray={!serie && noeudDe(liaison.de).groupe === "deploiement" ? "2 6" : undefined}
              className={serie ? "liaison-mesuree stroke-brique" : "stroke-trait"}
              style={style}
            />
            {serie && (
              <text
                x={(a.x + b.x) / 2}
                y={(a.y + b.y) / 2 - 8}
                textAnchor="middle"
                paintOrder="stroke"
                stroke="var(--color-papier)"
                strokeWidth={5}
                className="fill-encre text-[13px] tabular-nums"
              >
                {texteSerie(serie)}
              </text>
            )}
          </g>
        );
      })}
      {NOEUDS.map((n) => {
        const p = n.positions[variante];
        const actif = n.id === choisi;
        return (
          <g
            key={n.id}
            role="button"
            tabIndex={0}
            aria-label={`${n.nom} : ${n.role}`}
            aria-pressed={actif}
            onClick={() => choisir(n.id)}
            onKeyDown={(e) => surTouche(e, n.id)}
            className="group cursor-pointer outline-none"
          >
            <rect
              x={p.x - l / 2}
              y={p.y - h / 2}
              width={l}
              height={h}
              rx={10}
              strokeWidth={actif ? 2.5 : 1.5}
              className={`${actif ? "fill-brique/10 stroke-brique" : "fill-papier stroke-encre-douce"} group-focus-visible:stroke-brique group-focus-visible:[stroke-width:3]`}
            />
            <text x={p.x} y={p.y + 5} textAnchor="middle" className="fill-encre text-[15px] font-semibold">
              {n.nom}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
