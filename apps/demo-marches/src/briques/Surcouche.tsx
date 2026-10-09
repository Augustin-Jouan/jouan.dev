import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Bouton } from "./Bouton";
import { cx } from "./cx";
import { Croix } from "./icones";

/** Les surcouches ouvertes, la plus haute en dernier : seule elle réagit à Échap et à Tab. */
const pile: symbol[] = [];

const FOCALISABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const VARIANTE = {
  panneau:
    "fixed inset-y-0 right-0 z-50 flex w-[min(31rem,100vw)] flex-col overflow-hidden rounded-l-lg border-l border-rule-strong bg-paper shadow-ombre-h max-etroit:w-screen max-etroit:rounded-none",
  apercu:
    "fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[min(48rem,100vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-rule-strong bg-paper shadow-ombre-h max-etroit:h-screen max-etroit:max-h-none max-etroit:w-screen max-etroit:rounded-none",
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
  const boite = useRef<HTMLDivElement>(null);
  const fermer = useRef(surFermeture);
  useEffect(() => {
    fermer.current = surFermeture;
  });

  useEffect(() => {
    if (!ouverte) return;
    const jeton = Symbol("surcouche");
    const avant = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    pile.push(jeton);
    const el = boite.current;
    (el?.querySelector<HTMLElement>(FOCALISABLES) ?? el)?.focus();

    const touche = (e: KeyboardEvent) => {
      if (pile[pile.length - 1] !== jeton) return;
      if (e.key === "Escape") {
        e.preventDefault();
        fermer.current();
        return;
      }
      if (e.key !== "Tab" || !el) return;
      const liste = Array.from(el.querySelectorAll<HTMLElement>(FOCALISABLES));
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
      const i = pile.indexOf(jeton);
      if (i >= 0) pile.splice(i, 1);
      if (avant?.isConnected) avant.focus();
    };
  }, [ouverte]);

  if (!ouverte) return null;
  return createPortal(
    <>
      <div aria-hidden="true" onClick={() => fermer.current()} className="fixed inset-0 z-40 bg-voile/42" />
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
        className={cx(VARIANTE[variante])}
      >
        <div className="flex items-start justify-between gap-4 border-b border-rule bg-surface px-5 pt-4 pb-3.5">
          <h2 id={idTitre} className="text-18">
            {titre}
          </h2>
          <Bouton variante="discret" taille="petite" aria-label="Fermer" onClick={() => fermer.current()}>
            <Croix />
          </Bouton>
        </div>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto overscroll-contain p-5 *:flex-none">{children}</div>
      </div>
    </>,
    document.body,
  );
}
