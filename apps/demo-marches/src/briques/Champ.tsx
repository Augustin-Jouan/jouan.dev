import { useId } from "react";
import type { InputHTMLAttributes } from "react";

const SAISIE =
  "w-full rounded-sm border border-rule-strong bg-surface px-2.5 py-2 text-ink " +
  "transition-[border-color,background-color] duration-120 focus:border-accent focus:bg-raise focus:outline-none " +
  "aria-invalid:border-danger aria-invalid:bg-danger-soft";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  libelle: string;
  erreur?: string;
  aide?: string;
};

/** Un champ de formulaire : libellé relié, aide, erreur annoncée par aria-describedby. */
export function Champ({ libelle, erreur, aide, id, ...reste }: Props) {
  const auto = useId();
  const idChamp = id ?? auto;
  const idErreur = `${idChamp}-erreur`;
  const idAide = `${idChamp}-aide`;
  const decrit = [erreur && idErreur, aide && idAide].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={idChamp} className="text-12 text-muted">
        {libelle}
      </label>
      <input {...reste} id={idChamp} aria-invalid={erreur ? true : undefined} aria-describedby={decrit} className={SAISIE} />
      {aide && (
        <span id={idAide} className="text-11 text-faint">
          {aide}
        </span>
      )}
      {erreur && (
        <p id={idErreur} className="m-0 text-11 text-danger">
          {erreur}
        </p>
      )}
    </div>
  );
}
