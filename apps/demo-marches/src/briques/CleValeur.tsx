import type { ReactNode } from "react";

/** Une paire clé — valeur sur deux colonnes. */
export function CleValeur({ cle, valeur }: { cle: string; valeur: ReactNode }) {
  return (
    <dl className="m-0 grid grid-cols-[9rem_minmax(0,1fr)] gap-x-3.5">
      <dt className="text-12 text-muted">{cle}</dt>
      <dd className="m-0 text-13">{valeur}</dd>
    </dl>
  );
}
