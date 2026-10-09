import { useEffect, useRef, useState } from "react";
import { Carte } from "../briques/Carte";
import { CleValeur } from "../briques/CleValeur";
import { SURTITRE } from "../briques/typo";
import { CHANTIER, type Lot } from "../donnees/chantier";
import { placerBarre, semainesEntre } from "../domaine/planning";
import { nomLot } from "./Marches";
import "./planning.css";

const COURT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const LONG = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const date = (iso: string) => new Date(`${iso}T00:00:00Z`);

const SEMAINES = semainesEntre(CHANTIER.debut, CHANTIER.fin);

/** La frise des lots, en lecture seule : une barre par lot, un détail au clic. */
export function Planning({ lots }: { lots: readonly Lot[] }) {
  const racine = useRef<HTMLDivElement>(null);
  const [actifId, setActifId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const choisi = lots.find((l) => l.id === selId);

  useEffect(() => {
    if (!selId) return;
    const touche = (e: KeyboardEvent) => {
      // Un onglet masqué ou une surcouche ouverte garde sa touche Échap.
      if (e.key !== "Escape" || e.defaultPrevented || racine.current?.closest("[hidden]")) return;
      setSelId(null);
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [selId]);

  return (
    <div ref={racine} className="flex flex-col gap-4">
      <div className="gantt">
        <table className="g-table">
          <caption className="sr-only">Planning des lots, par semaine</caption>
          <thead>
            <tr>
              <th scope="col" className="g-fixe g-angle">Lot</th>
              {SEMAINES.map((s) => (
                <th key={s.lundi} scope="col" title={`Semaine du ${s.libelle}`}>{s.libelle}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => {
              const { colonne, duree } = placerBarre(lot.debut, lot.fin, CHANTIER.debut);
              const actif = actifId === lot.id || selId === lot.id;
              const nom = `${nomLot(lot)} — ${lot.intitule}, du ${COURT.format(date(lot.debut))} au ${COURT.format(date(lot.fin))}`;
              return (
                <tr key={lot.id} className="g-ligne" data-actif={actif ? "" : undefined}>
                  <th scope="row" className="g-fixe">
                    <span className="g-lot">
                      <span className="g-nom">{nomLot(lot)} · {lot.intitule}</span>
                      <span className="g-sous">{lot.entreprise}</span>
                    </span>
                  </th>
                  <td colSpan={SEMAINES.length} className="g-piste">
                    <button
                      type="button"
                      className="g-bar"
                      data-testid={`barre-${lot.id}`}
                      data-actif={actif ? "" : undefined}
                      aria-label={nom}
                      aria-pressed={selId === lot.id}
                      style={{ "--col": colonne, "--duree": duree } as React.CSSProperties}
                      onPointerEnter={() => setActifId(lot.id)}
                      onPointerLeave={() => setActifId(null)}
                      onFocus={() => setActifId(lot.id)}
                      onBlur={() => setActifId(null)}
                      onClick={() => setSelId(selId === lot.id ? null : lot.id)}
                    >
                      <span aria-hidden="true">{lot.intitule}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {choisi && (
        <Carte role="region" aria-label="Détail du lot">
          <p className={SURTITRE}>{nomLot(choisi)}</p>
          <h2 className="font-titre text-18">{choisi.intitule}</h2>
          <CleValeur cle="Entreprise" valeur={choisi.entreprise} />
          <CleValeur cle="Période" valeur={`du ${LONG.format(date(choisi.debut))} au ${LONG.format(date(choisi.fin))}`} />
        </Carte>
      )}
    </div>
  );
}
