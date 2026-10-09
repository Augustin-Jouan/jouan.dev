import type { HTMLAttributes } from "react";
import { cx } from "./cx";

/** Une feuille de document : le papier d'un certificat, posé sur la surcouche. */
export function Feuille({ className, ...reste }: Omit<HTMLAttributes<HTMLElement>, "className"> & {
  /** Placement seulement. */
  className?: string;
}) {
  return (
    <article
      {...reste}
      className={cx("flex flex-col gap-3 rounded-sm border border-feuille-trait bg-feuille p-4 text-feuille-encre", className)}
    />
  );
}
