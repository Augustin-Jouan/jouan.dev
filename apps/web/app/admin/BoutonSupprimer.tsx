"use client";

import { supprimerLienAction } from "./actions";

export function BoutonSupprimer({ id, nom }: { id: string; nom: string }) {
  return (
    <form
      action={supprimerLienAction}
      onSubmit={(e) => {
        if (!confirm(`Supprimer le lien de ${nom} et ses visites ?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="text-alerte underline underline-offset-4">Supprimer</button>
    </form>
  );
}
