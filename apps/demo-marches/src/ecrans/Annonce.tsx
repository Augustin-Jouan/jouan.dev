import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

const Contexte = createContext<(message: string) => void>(() => {});

/** Annonce un message aux lecteurs d'écran : à appeler depuis une action, jamais pendant le rendu. */
export const useAnnonce = () => useContext(Contexte);

/** La région vivante unique de l'application ; ses enfants annoncent par `useAnnonce()`. */
export function Annonce({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const annoncer = useCallback((m: string) => setMessage(m), []);
  return (
    <Contexte.Provider value={annoncer}>
      {children}
      <div role="status" aria-live="polite" className="sr-only">
        {message}
      </div>
    </Contexte.Provider>
  );
}
