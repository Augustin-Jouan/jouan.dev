import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

const BASE =
  "inline-flex items-center rounded-sm border leading-[1.3] whitespace-nowrap cursor-pointer " +
  "transition-[background-color,border-color] duration-120 [&_svg]:size-3.5 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const TAILLE = {
  normale: "gap-1.75 px-3.25 py-1.75 text-13",
  petite: "gap-1.75 px-2 py-1 text-12",
} as const;

const VARIANTE = {
  secondaire: "border-rule-strong bg-raise text-ink hover:border-muted hover:bg-idle-soft",
  principal: "border-accent bg-accent font-medium text-on-accent hover:border-accent-2 hover:bg-accent-2",
  discret: "border-transparent bg-transparent text-muted hover:bg-idle-soft hover:text-ink",
  danger: "border-rule-strong bg-raise text-danger hover:border-danger hover:bg-danger-soft",
} as const;

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variante?: "principal" | "secondaire" | "discret" | "danger";
  taille?: "normale" | "petite";
  /** Placement seulement. */
  className?: string;
};

export function Bouton({ variante = "secondaire", taille = "normale", className, type = "button", ...reste }: Props) {
  return <button {...reste} type={type} className={cx(BASE, TAILLE[taille], VARIANTE[variante], className)} />;
}
