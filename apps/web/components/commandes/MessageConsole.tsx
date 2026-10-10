"use client";

import { useEffect } from "react";
import { texteIndices } from "@/lib/commandes/indices";

const CLE = "jouan.dev:message-console";

/** Message pour qui ouvre la console : en production, une fois par session. */
export function MessageConsole({ hote }: { hote: string }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    try {
      if (window.sessionStorage.getItem(CLE)) return;
      window.sessionStorage.setItem(CLE, "1");
    } catch {
      // Stockage refusé : le message revient à chaque page, sans erreur.
    }
    console.info(texteIndices(hote));
  }, [hote]);
  return null;
}
