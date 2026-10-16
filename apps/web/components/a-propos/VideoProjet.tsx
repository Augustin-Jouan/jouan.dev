"use client";

import { useEffect, useRef, useState } from "react";
import type { VideoProjet as Video } from "@/data/a-propos";

/**
 * Vidéo muette d'un projet : rien n'est téléchargé avant qu'elle soit lue
 * (`preload="none"`, l'affiche tient sa place). Elle joue en boucle tant qu'elle
 * est à l'écran et se met en pause dès qu'elle en sort. Avec le mouvement réduit,
 * ou sans IntersectionObserver, elle ne démarre jamais seule : des contrôles
 * permettent de la lancer.
 */
export function VideoProjet({ video }: { video: Video }) {
  const { webm, mp4, affiche, description } = video;
  const element = useRef<HTMLVideoElement>(null);
  const [controles, setControles] = useState(false);

  useEffect(() => {
    const lecteur = element.current;
    if (!lecteur) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduit || typeof IntersectionObserver === "undefined") {
      // Choix fait une seule fois, au montage : pas de lecture automatique.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setControles(true);
      return;
    }
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((entree) => entree.isIntersecting)) {
          // Lecture refusée (économie d'énergie…) : l'affiche reste, sans erreur.
          lecteur.play()?.catch(() => {});
        } else {
          lecteur.pause();
        }
      },
      { threshold: 0.25 },
    );
    observateur.observe(lecteur);
    return () => observateur.disconnect();
  }, []);

  return (
    <video
      ref={element}
      aria-label={description}
      poster={affiche.src}
      width={affiche.largeur}
      height={affiche.hauteur}
      preload="none"
      muted
      loop
      playsInline
      controls={controles}
      className="block h-auto w-full rounded-3xl border border-trait bg-surface shadow-fenetre"
    >
      <source src={webm} type='video/webm; codecs="av01.0.08M.08"' />
      <source src={mp4} type="video/mp4" />
    </video>
  );
}
