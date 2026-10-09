import { createContext, useContext, useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Bouton } from "./Bouton";
import { cx } from "./cx";
import { Croix } from "./icones";

/** Les surcouches ouvertes, la plus haute en dernier : seule elle réagit à Échap et à Tab. */
const pile: { jeton: symbol; niveau: number }[] = [];

/** La plus haute : le niveau d'imbrication le plus grand, puis la plus récemment ouverte. */
function haute() {
  let h: (typeof pile)[number] | undefined;
  for (const e of pile) if (!h || e.niveau >= h.niveau) h = e;
  return h?.jeton;
}

/** Le niveau d'imbrication de la surcouche parente (0 hors surcouche). */
const Niveau = createContext(0);

/** Voile puis boîte : une surcouche interne recouvre toujours l'externe, voile compris. */
const COUCHE = [
  { voile: "z-40", boite: "z-50" },
  { voile: "z-55", boite: "z-60" },
  { voile: "z-65", boite: "z-70" },
] as const;

const FOCALISABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const VARIANTE = {
  panneau:
    "fixed inset-y-0 right-0 flex w-[min(31rem,100vw)] flex-col overflow-hidden rounded-l-lg border-l border-rule-strong bg-paper shadow-ombre-h max-etroit:w-screen max-etroit:rounded-none",
  apercu:
    "fixed top-1/2 left-1/2 flex max-h-[90vh] w-[min(48rem,100vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-rule-strong bg-paper shadow-ombre-h max-etroit:h-dvh max-etroit:max-h-none max-etroit:w-screen max-etroit:rounded-none",
} as const;

/** Une boîte de dialogue modale : tiroir à droite (panneau) ou feuille centrée (apercu). */
export function Surcouche({ ouverte, titre, surFermeture, variante, children }: {
  ouverte: boolean;
  titre: string;
  surFermeture(): void;
  variante: keyof typeof VARIANTE;
  children: ReactNode;
}) {
  const idTitre = useId();
  const niveau = useContext(Niveau) + 1;
  const boite = useRef<HTMLDivElement>(null);
  const fermer = useRef(surFermeture);
  useEffect(() => {
    fermer.current = surFermeture;
  });

  useEffect(() => {
    if (!ouverte) return;
    const jeton = Symbol("surcouche");
    const avant = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    pile.push({ jeton, niveau });
    const el = boite.current;
    (el?.querySelector<HTMLElement>(FOCALISABLES) ?? el)?.focus();

    const touche = (e: KeyboardEvent) => {
      if (haute() !== jeton) return;
      if (e.key === "Escape") {
        e.preventDefault();
        fermer.current();
        return;
      }
      if (e.key !== "Tab" || !el) return;
      const liste = Array.from(el.querySelectorAll<HTMLElement>(FOCALISABLES)).filter((x) => !x.closest("[hidden]"));
      if (liste.length === 0) {
        e.preventDefault();
        el.focus();
        return;
      }
      const premier = liste[0];
      const dernier = liste[liste.length - 1];
      if (!premier || !dernier) return;
      const actif = document.activeElement;
      if (e.shiftKey && (actif === premier || actif === el || !el.contains(actif))) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && (actif === dernier || !el.contains(actif))) {
        e.preventDefault();
        premier.focus();
      }
    };
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("keydown", touche);
      const i = pile.findIndex((e) => e.jeton === jeton);
      if (i >= 0) pile.splice(i, 1);
      if (avant?.isConnected) avant.focus();
    };
  }, [ouverte, niveau]);

  if (!ouverte) return null;
  const couche = COUCHE[Math.min(niveau, COUCHE.length) - 1]!;
  return createPortal(
    <>
      <div aria-hidden="true" onClick={() => fermer.current()} data-voile=""
        className={cx("fixed inset-0 bg-voile/42", couche.voile)} />
      {/* data-verrou-defilement : base.css fige la page tant qu'une surcouche est dans le document. */}
      <div
        ref={boite}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        tabIndex={-1}
        data-surcouche={variante}
        data-ouvert=""
        data-verrou-defilement=""
        data-niveau={niveau}
        className={cx(VARIANTE[variante], couche.boite)}
      >
        <div className="flex items-start justify-between gap-4 border-b border-rule bg-surface px-5 pt-4 pb-3.5">
          <h2 id={idTitre} className="text-18">
            {titre}
          </h2>
          <Bouton variante="discret" taille="petite" aria-label="Fermer" onClick={() => fermer.current()}>
            <Croix />
          </Bouton>
        </div>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto overscroll-contain p-5 *:flex-none">
          <Niveau.Provider value={niveau}>{children}</Niveau.Provider>
        </div>
      </div>
    </>,
    document.body,
  );
}
