import { formaterMs, texteSerie } from "@/lib/coulisses/format";
import { SERIES, type EtatMesures, type Serie } from "@/lib/coulisses/magasin";
import { Courbe } from "./Courbe";

const LIBELLES: Record<Serie, string> = {
  site: "Vous → site",
  base: "Site → base",
  tempsReel: "Vous → temps réel",
};

/** Les trois mesures en direct ; pas d'aria-live : elles changent toutes les 2 s. */
export function PanneauEnDirect({ mesures }: { mesures: EtatMesures }) {
  return (
    <section aria-labelledby="titre-en-direct" className="flex flex-col gap-4 rounded-xl border border-trait p-5">
      <h3 id="titre-en-direct" className="flex items-center gap-2 font-semibold">
        <span aria-hidden="true" className="size-2 rounded-full bg-emerald-600 motion-safe:animate-pulse" />
        En direct
      </h3>
      <dl className="flex flex-col gap-4">
        {SERIES.map((serie) => {
          const s = mesures[serie];
          return (
            <div key={serie} data-testid={`mesure-${serie}`} className="flex flex-col gap-1">
              <dt className="text-sm text-encre-douce">{LIBELLES[serie]}</dt>
              <dd className="flex items-baseline justify-between gap-3">
                <span className="font-serif text-2xl tabular-nums">{texteSerie(s)}</span>
                {s.disponible && s.mediane !== null && (
                  <span className="text-xs text-encre-douce tabular-nums">médiane {formaterMs(s.mediane)}</span>
                )}
              </dd>
              <dd>
                <Courbe valeurs={s.disponible ? s.valeurs : []} />
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
