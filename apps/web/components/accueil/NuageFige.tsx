import { nuageFige } from "@/lib/encre/nuage";

/**
 * Nuage de traits figé (`.nuage-fige` dans app/globals.css) : rendu au serveur,
 * présent dans le HTML dès la première réponse. Il suffit sans JavaScript, avec
 * le mouvement réduit ou quand WebGL échoue, et sert d'image d'attente avant le
 * moteur. Passé en prop à IntroEncre (composant client), il n'est jamais
 * recalculé dans le navigateur.
 */
export function NuageFige() {
  return (
    <svg className="nuage-fige" viewBox="-400 -400 800 800" aria-hidden="true" focusable="false">
      {nuageFige().map((groupe) => (
        <path
          key={`${groupe.couleur}-${groupe.opacite}`}
          d={groupe.chemin}
          fill="none"
          stroke={groupe.couleur}
          strokeOpacity={groupe.opacite}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
