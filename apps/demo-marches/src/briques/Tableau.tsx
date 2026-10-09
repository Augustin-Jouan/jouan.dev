import type { ReactNode } from "react";
import { cx } from "./cx";

const ENTETE =
  "[&_thead_th]:border-b [&_thead_th]:border-rule-strong [&_thead_th]:bg-surface [&_thead_th]:text-left [&_thead_th]:font-titre " +
  "[&_thead_th]:text-11 [&_thead_th]:font-semibold [&_thead_th]:tracking-[0.07em] [&_thead_th]:whitespace-nowrap [&_thead_th]:text-muted [&_thead_th]:uppercase";

/**
 * Écarts demandés par attribut : data-droite, data-premiere, data-attenue, data-fort ;
 * lignes : data-ouvert, data-actif.
 */
const CELLULES =
  "[&_[data-droite]]:text-right [&_[data-droite]]:font-mono [&_[data-droite]]:tabular-nums [&_[data-droite]]:whitespace-nowrap " +
  "[&_[data-premiere]]:pl-4 [&_[data-attenue]]:text-muted [&_[data-fort]]:font-medium " +
  "[&_[data-nowrap]]:whitespace-nowrap [&_[data-numero]]:mr-2 [&_[data-numero]]:font-mono [&_[data-numero]]:text-12 [&_[data-numero]]:tabular-nums [&_[data-numero]]:text-muted";

const VARIANTE = {
  plain:
    `min-w-184 ${ENTETE} [&_thead_th]:px-3 [&_thead_th]:py-2 [&_tbody_td]:border-b [&_tbody_td]:border-rule [&_tbody_td]:px-3 [&_tbody_td]:py-1.75 ` +
    "[&_tbody_tr:hover]:bg-surface",
  lots:
    `min-w-208 ${ENTETE} [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-5 [&_thead_th]:px-3 [&_thead_th]:py-2 ` +
    "[&_tbody_td]:border-b [&_tbody_td]:border-rule [&_tbody_td]:px-3 [&_tbody_td]:py-1.75 [&_tbody_td]:align-middle [&_tbody_tr]:cursor-pointer " +
    "[&_tbody_tr]:bg-paper [&_tbody_tr:not([data-ouvert]):hover]:bg-surface [&_tbody_tr[data-ouvert]]:bg-accent-soft [&_tbody_tr[data-actif]]:bg-accent-soft " +
    /* La colonne figée (data-colle) reprend le fond de sa ligne ; son en-tête garde celui de l'en-tête. */
    "[&_[data-colle]]:sticky [&_[data-colle]]:left-0 [&_[data-colle]]:z-10 [&_[data-colle]]:min-w-44 [&_[data-colle]]:shadow-colle " +
    "[&_tbody_[data-colle]]:bg-inherit [&_tfoot_[data-colle]]:bg-inherit " +
    /* Le pied : la ligne des totaux. */
    "[&_tfoot_tr]:bg-surface [&_tfoot_tr]:font-semibold [&_tfoot_th]:px-3 [&_tfoot_th]:py-2.5 [&_tfoot_th]:text-left [&_tfoot_td]:px-3 [&_tfoot_td]:py-2.5",
  certificat:
    "[&_tr]:border-b [&_tr]:border-feuille-trait [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-13 [&_th]:font-normal [&_td]:px-2 [&_td]:py-1.5 [&_td]:text-13 " +
    "[&_thead_th]:text-11 [&_thead_th]:font-semibold [&_thead_th]:text-feuille-gris [&_tr[data-total]]:bg-feuille-zone [&_tr[data-total]]:font-semibold",
} as const;

/** Un tableau : les cellules restent du HTML, leurs écarts passent par des attributs data-*. */
export function Tableau({ variante, className, children }: { variante: keyof typeof VARIANTE; children: ReactNode; className?: string }) {
  return <table className={cx("w-full border-collapse", CELLULES, VARIANTE[variante], className)}>{children}</table>;
}
