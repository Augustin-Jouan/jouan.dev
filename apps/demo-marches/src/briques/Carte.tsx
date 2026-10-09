import type { HTMLAttributes } from "react";
import { cx } from "./cx";

/** Le cadre d'une carte : fond, filet, rondeur, empilement espacé. */
export function Carte({ className, ...reste }: Omit<HTMLAttributes<HTMLDivElement>, "className"> & {
  /** Placement seulement. */
  className?: string;
}) {
  return <div {...reste} className={cx("flex flex-col gap-3 rounded-md border border-rule bg-surface p-4", className)} />;
}
