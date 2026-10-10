"use client";

import { useEffect, useRef, useState } from "react";
import { HaloCss } from "./HaloCss";
import { siteName } from "@/data/site";
import { EVENEMENT_REJOUER_INTRO } from "@/lib/commandes/evenements";
import {
  deciderMode,
  introDejaVue,
  marquerIntroVue,
  stockageSession,
  type ModeEncre,
} from "@/lib/encre/decision";
import type { Moteur } from "@/lib/encre/moteur";

/**
 * Un geste du visiteur termine l'intro immédiatement. `scroll` couvre aussi
 * le glisser de la barre de défilement, qui n'émet ni `wheel` ni `pointerdown`.
 */
const EVENEMENTS_SAUT = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;

/**
 * Au-delà de ce délai après le montage, le moteur arrive trop tard : le
 * visiteur lit déjà la page, une intro qui la recouvrirait n'en est plus une.
 * On pose alors directement le halo.
 */
const DELAI_MAX_INTRO_MS = 3000;

/**
 * Fond de l'accueil. Rendu côté serveur, c'est un simple halo CSS ; une fois
 * monté, il décide s'il faut jouer l'intro (une fois par visite), puis importe
 * le moteur WebGL dans son propre morceau de JS, après l'affichage.
 *
 * Attributs lus par le CSS et les tests de bout en bout :
 * - data-mode : intro | halo-anime | halo-css
 * - data-intro : en-cours | terminee (absent hors intro)
 * - data-encre : actif (canvas affiché) | repli (WebGL a échoué)
 *
 * La commande « Rejouer l'intro » (palette, sous-projet 7) émet
 * `jouan:rejouer-intro` : retour en haut, puis l'intro repart sur un canvas neuf
 * (l'arrêt du moteur libère le contexte WebGL de l'ancien).
 */
export function IntroEncre() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nomRef = useRef<HTMLParagraphElement>(null);
  /** Instant du montage (performance.now), point de départ de DELAI_MAX_INTRO_MS. */
  const montageRef = useRef(0);
  const [mode, setMode] = useState<ModeEncre>("halo-css");
  const [intro, setIntro] = useState<"en-cours" | "terminee">();
  const [encre, setEncre] = useState<"actif" | "repli">();
  /** Numéro de l'intro jouée : change à chaque « Rejouer l'intro ». */
  const [tour, setTour] = useState(0);

  useEffect(() => {
    montageRef.current = performance.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la décision dépend du navigateur : impossible au rendu serveur
    setMode(
      deciderMode({
        mouvementReduit: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        webgl2: typeof WebGL2RenderingContext !== "undefined",
        dejaVu: introDejaVue(stockageSession()),
        defilee: window.scrollY > 0,
      })
    );
  }, []);

  useEffect(() => {
    let image = 0;
    const rejouer = () => {
      window.scrollTo({ top: 0, behavior: "instant" });
      // Le `scroll` de ce retour en haut part avant la prochaine image : l'intro
      // ne repart qu'après, sinon elle se sauterait elle-même.
      cancelAnimationFrame(image);
      image = requestAnimationFrame(() => {
        montageRef.current = performance.now();
        setIntro(undefined);
        setMode((actuel) => (actuel === "halo-css" ? actuel : "intro"));
        setTour((n) => n + 1);
      });
    };
    window.addEventListener(EVENEMENT_REJOUER_INTRO, rejouer);
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener(EVENEMENT_REJOUER_INTRO, rejouer);
    };
  }, []);

  useEffect(() => {
    if (mode === "halo-css") return;

    const jouerIntro = mode === "intro";
    let moteur: Moteur | null = null;
    let annule = false;
    /** Geste fait avant l'arrivée du moteur : l'intro ne doit plus se jouer. */
    let sautDemande = false;

    const sauter = () => {
      if (moteur) moteur.sauter();
      else sautDemande = true;
    };
    const retirerSaut = () =>
      EVENEMENTS_SAUT.forEach((nom) => window.removeEventListener(nom, sauter));
    const suivre = (evenement: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cadre = canvas.getBoundingClientRect();
      moteur?.suivreSouris({
        x: (evenement.clientX - cadre.left) / cadre.width,
        y: (evenement.clientY - cadre.top) / cadre.height,
      });
    };

    const echouer = () => {
      moteur?.arreter();
      setEncre("repli");
      setIntro(undefined);
      setMode("halo-css");
    };

    import("@/lib/encre/moteur")
      .then(({ creerMoteur }) => {
        if (annule || !canvasRef.current) return;
        // L'intro ne se joue que si rien n'a bougé pendant le chargement : ni
        // geste, ni défilement, ni attente trop longue.
        const introEffective =
          jouerIntro &&
          !sautDemande &&
          window.scrollY === 0 &&
          performance.now() - montageRef.current <= DELAI_MAX_INTRO_MS;
        // Intro annulée avant d'avoir commencé : elle est terminée d'emblée,
        // sans être marquée comme vue (le visiteur ne l'a pas vue).
        if (jouerIntro && !introEffective) {
          retirerSaut();
          setIntro("terminee");
        }
        moteur = creerMoteur({
          canvas: canvasRef.current,
          intro: introEffective,
          nom: nomRef.current,
          tactile: window.matchMedia("(pointer: coarse)").matches,
          surPret: () => {
            setEncre("actif");
            if (introEffective) setIntro((etat) => etat ?? "en-cours");
          },
          surFinIntro: () => {
            retirerSaut();
            setIntro("terminee");
            marquerIntroVue(stockageSession());
          },
          surEchec: echouer,
        });
        moteur?.demarrer();
      })
      // Morceau de JS introuvable (réseau coupé, déploiement en cours).
      .catch(() => {
        if (!annule) echouer();
      });

    if (jouerIntro) {
      EVENEMENTS_SAUT.forEach((nom) => window.addEventListener(nom, sauter, { passive: true }));
    }
    window.addEventListener("pointermove", suivre, { passive: true });

    return () => {
      annule = true;
      moteur?.arreter();
      retirerSaut();
      window.removeEventListener("pointermove", suivre);
    };
  }, [mode, tour]);

  return (
    <div
      className="fond-accueil"
      data-mode={mode}
      data-intro={intro}
      data-encre={encre}
      aria-hidden="true"
    >
      <HaloCss />
      {mode !== "halo-css" && <canvas key={tour} ref={canvasRef} />}
      {mode === "intro" && (
        <p ref={nomRef} className="fond-accueil__nom">
          {siteName}
        </p>
      )}
    </div>
  );
}
