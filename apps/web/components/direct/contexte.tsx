"use client";

import { createContext, useContext } from "react";
import type { EtatDirect } from "@/lib/direct/magasin";

export type ValeurDirect = { etat: EtatDirect; pointeurFin: boolean; partage: boolean; basculerPartage(): void };

export const ContexteDirect = createContext<ValeurDirect>({
  etat: { connecte: false, presents: 0, curseurs: [] },
  pointeurFin: false,
  partage: true,
  basculerPartage: () => {},
});

export const useDirect = () => useContext(ContexteDirect);
