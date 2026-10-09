import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

const BASE = "inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

const CADRE =
  "rounded-sm border leading-[1.3] whitespace-nowrap transition-[background-color,border-color] duration-120 [&_svg]:size-3.5";

/** Un bouton qui se lit comme un lien : texte souligné, sans cadre, il peut passer à la ligne. */
const LIEN =
  "bg-transparent p-0 text-left text-ink font-medium underline decoration-rule-strong underline-offset-3 " +
  "hover:text-accent hover:decoration-accent";

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
  variante?: "principal" | "secondaire" | "discret" | "danger" | "lien";
  taille?: "normale" | "petite";
  /** Placement seulement. */
  className?: string;
};

export function Bouton({ variante = "secondaire", taille = "normale", className, type = "button", ...reste }: Props) {
  const apparence = variante === "lien" ? LIEN : cx(CADRE, TAILLE[taille], VARIANTE[variante]);
  return <button {...reste} type={type} className={cx(BASE, apparence, className)} />;
}
