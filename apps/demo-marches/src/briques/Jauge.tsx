import { cx } from "./cx";
import { CHIFFRES } from "./typo";

/** Un indicateur de progression de 0 à 100 : piste, remplissage et pourcentage. */
export function Jauge({ libelle, valeur }: { libelle: string; valeur: number }) {
  const v = Math.max(0, Math.min(100, Math.round(valeur)));
  return (
    <div className="flex items-center gap-2.5">
      <div
        role="meter"
        aria-label={libelle}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-valuetext={`${v} %`}
        className="h-1.5 w-24 overflow-hidden rounded-full bg-band"
      >
        <div className="h-full bg-accent" style={{ width: `${v}%` }} />
      </div>
      <span aria-hidden="true" className={cx(CHIFFRES, "w-9 text-right text-12 text-muted")}>
        {v} %
      </span>
    </div>
  );
}
