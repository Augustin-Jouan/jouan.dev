import { cx } from "./cx";

const TON = {
  neutre: "border-rule-strong text-muted",
  accent: "border-accent text-accent-2",
  alerte: "border-alerte-trait text-alerte",
  danger: "border-danger text-danger",
} as const;

/** Le marqueur encadré posé à côté d'une désignation. */
export function Etiquette({ ton, children }: { ton: keyof typeof TON; children: React.ReactNode }) {
  return (
    <span
      className={cx(
        "rounded-xs border pt-0.25 px-1.25 pb-0.5 font-titre text-10 font-semibold tracking-[0.05em] uppercase whitespace-nowrap",
        TON[ton],
      )}
    >
      {children}
    </span>
  );
}
