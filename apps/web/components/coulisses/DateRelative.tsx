"use client";

import { useSyncExternalStore } from "react";
import { dateRelative } from "@/lib/coulisses/dates";

const MINUTE = 60_000;
const abonnerMinute = (fn: () => void) => {
  const id = window.setInterval(fn, MINUTE);
  return () => window.clearInterval(id);
};
const minuteCourante = () => Math.floor(Date.now() / MINUTE);

/**
 * Date du build : absolue au rendu serveur (la page reste statique), relative
 * dans le navigateur (« il y a 3 heures »), sur une seule ligne dans les deux cas.
 * La forme absolue est formatée au build et passée telle quelle : le navigateur
 * (autre version d'ICU) pourrait l'écrire autrement et faire échouer l'hydratation.
 */
export function DateRelative({ iso, absolue }: { iso: string; absolue: string }) {
  const minute = useSyncExternalStore(abonnerMinute, minuteCourante, () => null);
  return (
    <time dateTime={iso} title={absolue} className="whitespace-nowrap text-sm text-encre-douce">
      {minute === null ? absolue : dateRelative(iso, minute * MINUTE)}
    </time>
  );
}
