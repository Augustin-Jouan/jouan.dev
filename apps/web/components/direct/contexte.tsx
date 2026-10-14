"use client";

import { createContext, useContext } from "react";
import type { EtatDirect } from "@/lib/direct/magasin";

export type ValeurDirect = { etat: EtatDirect };

export const ContexteDirect = createContext<ValeurDirect>({ etat: { connecte: false, presents: 0 } });

export const useDirect = () => useContext(ContexteDirect);
