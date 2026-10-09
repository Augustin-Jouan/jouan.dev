import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "./cx";

type Onglet = { id: string; titre: string };

const idOnglet = (id: string) => `onglet-${id}`;
const idPanneau = (id: string) => `panneau-${id}`;

/** Une liste d'onglets : flèches, Début, Fin ; seul l'actif est dans l'ordre de tabulation. */
export function Onglets({ libelle, onglets, actif, surChangement }: {
  libelle: string;
  onglets: Onglet[];
  actif: string;
  surChangement(id: string): void;
}) {
  function touche(e: KeyboardEvent<HTMLDivElement>) {
    const i = onglets.findIndex((o) => o.id === actif);
    let cible: number | null = null;
    if (e.key === "ArrowRight") cible = (i + 1) % onglets.length;
    else if (e.key === "ArrowLeft") cible = (i - 1 + onglets.length) % onglets.length;
    else if (e.key === "Home") cible = 0;
    else if (e.key === "End") cible = onglets.length - 1;
    if (cible === null) return;
    e.preventDefault();
    const o = onglets[cible];
    if (!o) return;
    surChangement(o.id);
    document.getElementById(idOnglet(o.id))?.focus();
  }
  return (
    <div role="tablist" aria-label={libelle} onKeyDown={touche} className="flex gap-0.5 overflow-x-auto border-b border-rule">
      {onglets.map((o) => {
        const courant = o.id === actif;
        return (
          <button
            key={o.id}
            id={idOnglet(o.id)}
            type="button"
            role="tab"
            aria-selected={courant}
            aria-controls={idPanneau(o.id)}
            tabIndex={courant ? 0 : -1}
            onClick={() => surChangement(o.id)}
            className={cx(
              "flex-none cursor-pointer border-b-2 bg-transparent px-3.5 pt-2.75 pb-2.25 text-14 whitespace-nowrap transition-[color,border-color] duration-120",
              courant ? "border-accent font-semibold text-accent" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {o.titre}
          </button>
        );
      })}
    </div>
  );
}

export function PanneauOnglet({ id, actif, children }: { id: string; actif: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={idPanneau(id)} aria-labelledby={idOnglet(id)} hidden={id !== actif}>
      {children}
    </div>
  );
}
