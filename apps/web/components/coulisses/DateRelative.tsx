"use client";

import { useSyncExternalStore } from "react";
import { dateRelative, formaterDateAbsolue } from "@/lib/coulisses/dates";

const MINUTE = 60_000;
const abonnerMinute = (fn: () => void) => {
  const id = window.setInterval(fn, MINUTE);
  return () => window.clearInterval(id);
};
const minuteCourante = () => Math.floor(Date.now() / MINUTE);

/**
 * Date du build : absolue au rendu serveur (la page reste statique), relative
 * dans le navigateur (« il y a 3 heures »), sur une seule ligne dans les deux cas.
 */
export function DateRelative({ iso }: { iso: string }) {
  const minute = useSyncExternalStore(abonnerMinute, minuteCourante, () => null);
  const absolue = formaterDateAbsolue(iso);
  return (
    <time dateTime={iso} title={absolue} className="whitespace-nowrap text-sm text-encre-douce">
      {minute === null ? absolue : dateRelative(iso, minute * MINUTE)}
    </time>
  );
}
