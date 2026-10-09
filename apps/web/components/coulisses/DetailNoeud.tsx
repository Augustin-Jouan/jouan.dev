import type { Noeud } from "@/data/architecture";
import { texteSerie } from "@/lib/coulisses/format";
import type { EtatMesures } from "@/lib/coulisses/magasin";

/**
 * Détail du nœud choisi. Seul le texte du nœud est annoncé (aria-live) ; sa
 * mesure, qui change toutes les 2 s, reste hors de la zone annoncée.
 */
export function DetailNoeud({ noeud, mesures }: { noeud: Noeud; mesures: EtatMesures }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-trait p-5">
      <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-3">
        <h3 className="font-serif text-2xl">{noeud.nom}</h3>
        <dl className="flex flex-col gap-2 text-sm">
          <div>
            <dt className="font-semibold">Rôle</dt>
            <dd>{noeud.role}</dd>
          </div>
          <div>
            <dt className="font-semibold">Technologie</dt>
            <dd>{noeud.techno}</dd>
          </div>
          <div>
            <dt className="font-semibold">Pourquoi</dt>
            <dd>{noeud.pourquoi}</dd>
          </div>
        </dl>
      </div>
      {noeud.mesure && (
        <dl className="text-sm">
          <dt className="font-semibold">Mesure en direct</dt>
          <dd className="tabular-nums">{texteSerie(mesures[noeud.mesure])}</dd>
        </dl>
      )}
    </div>
  );
}
