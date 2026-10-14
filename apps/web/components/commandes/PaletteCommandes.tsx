"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { lireContexte } from "@/lib/commandes/contexte";
import { executerAction } from "@/lib/commandes/executer";
import { filtrerCommandes } from "@/lib/commandes/filtre";
import type { Commande } from "@/lib/commandes/types";
import { commandesVisibles } from "@/lib/commandes/visibles";

/** Repère ce morceau de JS dans le build (scripts/verifier-taille-commandes.mjs). */
export const MARQUEUR_PALETTE = "palette-commandes:v1";

export type ProprietesPalette = {
  commandes: Commande[];
  ouverte: boolean;
  fermer: () => void;
};

/** Durée d'affichage du message de copie. */
const DUREE_MESSAGE_MS = 4000;

/**
 * Palette de commandes (Cmd+K), chargée à la demande par RaccourciCommandes et
 * montée à neuf à chaque ouverture : saisie vide, contexte de la page relu.
 * `<dialog>` modal natif (focus piégé, Échap, focus rendu à la fermeture) ;
 * champ en combobox ARIA, le focus y reste et `aria-activedescendant` désigne
 * l'option choisie. Le message de copie vit hors du dialogue : il reste lisible
 * une fois la palette fermée.
 */
export function PaletteCommandes({ commandes, ouverte, fermer }: ProprietesPalette) {
  const router = useRouter();
  const dialogue = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [contexte] = useState(lireContexte);
  const [saisie, setSaisie] = useState("");
  const [indice, setIndice] = useState(0);
  const [message, setMessage] = useState("");

  const groupes = useMemo(() => {
    const trouvees = filtrerCommandes(commandesVisibles(commandes, contexte), saisie);
    // Les groupes dans l'ordre de leur meilleur résultat ; dans un groupe, l'ordre du filtre.
    return [...new Set(trouvees.map((c) => c.groupe))].map((groupe) => ({
      groupe,
      commandes: trouvees.filter((c) => c.groupe === groupe),
    }));
  }, [commandes, contexte, saisie]);
  const affichees = groupes.flatMap((g) => g.commandes);
  const actif = affichees.length > 0 ? affichees[Math.min(indice, affichees.length - 1)] : undefined;
  const idOption = (commande: Commande) => `${id}-${commande.id}`;
  const idListe = `${id}-liste`;
  const idActif = actif ? idOption(actif) : undefined;

  useEffect(() => {
    const d = dialogue.current;
    if (!d) return;
    if (ouverte && !d.open) d.showModal();
    else if (!ouverte && d.open) d.close();
  }, [ouverte]);

  useEffect(() => {
    if (idActif) document.getElementById(idActif)?.scrollIntoView?.({ block: "nearest" });
  }, [idActif]);

  useEffect(() => {
    if (!message) return;
    const minuterie = window.setTimeout(() => setMessage(""), DUREE_MESSAGE_MS);
    return () => window.clearTimeout(minuterie);
  }, [message]);

  const executer = (commande: Commande) => {
    // La palette se ferme (le focus revient où il était), puis l'action s'exécute.
    dialogue.current?.close();
    void executerAction(commande.action, { naviguer: (href) => router.push(href), annoncer: setMessage });
  };

  const surTouche = (e: KeyboardEvent<HTMLInputElement>) => {
    const nombre = affichees.length;
    const courant = Math.min(indice, nombre - 1);
    const aller = (vers: number) => {
      e.preventDefault();
      setIndice(vers);
    };
    if (e.key === "ArrowDown" && nombre > 0) aller((courant + 1) % nombre);
    else if (e.key === "ArrowUp" && nombre > 0) aller((courant - 1 + nombre) % nombre);
    else if (e.key === "Home" && nombre > 0) aller(0);
    else if (e.key === "End" && nombre > 0) aller(nombre - 1);
    else if (e.key === "Enter" && actif) {
      e.preventDefault();
      executer(actif);
    }
  };

  return (
    <>
      <dialog
        ref={dialogue}
        aria-label="Commandes"
        data-marqueur={MARQUEUR_PALETTE}
        // La molette fait défiler la liste, jamais la page derrière (défilement doux).
        data-lenis-prevent
        onClose={fermer}
        // Un clic sur le fond atteint le dialogue lui-même, hors de son contenu.
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="mx-auto mt-[12vh] w-[calc(100%-2.5rem)] max-w-xl overflow-hidden rounded-2xl border border-trait-fort bg-surface p-0 text-texte backdrop:backdrop-brightness-50 motion-safe:transition-opacity motion-safe:duration-150 motion-safe:starting:open:opacity-0"
      >
        <input
          role="combobox"
          aria-expanded={affichees.length > 0}
          aria-controls={affichees.length > 0 ? idListe : undefined}
          aria-activedescendant={idActif}
          aria-autocomplete="list"
          aria-label="Rechercher une page ou une action"
          placeholder="Rechercher une page ou une action…"
          autoComplete="off"
          spellCheck={false}
          value={saisie}
          onChange={(e) => {
            setSaisie(e.target.value);
            setIndice(0);
          }}
          onKeyDown={surTouche}
          className="w-full border-b border-trait bg-surface px-5 py-4 text-base placeholder:text-texte-doux"
        />
        {affichees.length > 0 ? (
          <div id={idListe} role="listbox" aria-label="Commandes" className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
            {groupes.map(({ groupe, commandes: duGroupe }) => (
              <div key={groupe} role="group" aria-label={groupe} className="pb-1">
                <div aria-hidden="true" className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-texte-doux">
                  {groupe}
                </div>
                {duGroupe.map((commande) => (
                  <div
                    key={commande.id}
                    id={idOption(commande)}
                    role="option"
                    aria-selected={commande === actif}
                    onClick={() => executer(commande)}
                    onMouseMove={() => setIndice(affichees.indexOf(commande))}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm aria-selected:bg-accent aria-selected:text-sur-accent"
                  >
                    {commande.libelle}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-texte-doux">{`Aucune commande pour «\u00a0${saisie.trim()}\u00a0»`}</p>
        )}
      </dialog>
      <p
        role="status"
        className={
          message
            ? "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-trait-fort bg-surface px-4 py-2 text-sm text-texte"
            : "sr-only"
        }
      >
        {message}
      </p>
    </>
  );
}
