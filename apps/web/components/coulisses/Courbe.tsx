import { HISTORIQUE } from "@/lib/coulisses/magasin";

const LARGEUR = 120;
const HAUTEUR = 28;

/** Courbe des dernières valeurs ; hauteur fixe, même vide (aucun décalage). */
export function Courbe({ valeurs }: { valeurs: readonly number[] }) {
  const min = Math.min(...valeurs);
  const ecart = Math.max(...valeurs) - min || 1;
  const points = valeurs
    .map((v, i) => `${((i * LARGEUR) / (HISTORIQUE - 1)).toFixed(1)},${(HAUTEUR - 2 - ((v - min) / ecart) * (HAUTEUR - 4)).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} preserveAspectRatio="none" aria-hidden="true" className="h-7 w-full">
      {valeurs.length >= 2 && (
        <polyline points={points} fill="none" strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="stroke-brique" />
      )}
    </svg>
  );
}
