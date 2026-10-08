"use client";

import { useEffect, useRef, useState } from "react";
import { HaloCss } from "./HaloCss";
import { siteName } from "@/data/site";
import {
  deciderMode,
  introDejaVue,
  marquerIntroVue,
  stockageLocal,
  type ModeEncre,
} from "@/lib/encre/decision";
import type { Moteur } from "@/lib/encre/moteur";

/** Un geste du visiteur termine l'intro immédiatement. */
const EVENEMENTS_SAUT = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/**
 * Fond de l'accueil. Rendu côté serveur, c'est un simple halo CSS ; une fois
 * monté, il décide s'il faut jouer l'intro « goutte d'encre », puis importe
 * le moteur WebGL dans son propre morceau de JS, après l'affichage.
 *
 * Attributs lus par le CSS et les tests de bout en bout :
 * - data-mode : intro | halo-anime | halo-css
 * - data-intro : en-cours | terminee (absent hors intro)
 * - data-encre : actif (canvas affiché) | repli (WebGL a échoué)
 */
export function IntroEncre() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nomRef = useRef<HTMLParagraphElement>(null);
  const [mode, setMode] = useState<ModeEncre>("halo-css");
  const [intro, setIntro] = useState<"en-cours" | "terminee">();
  const [encre, setEncre] = useState<"actif" | "repli">();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la décision dépend du navigateur : impossible au rendu serveur
    setMode(
      deciderMode({
        mouvementReduit: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        webgl2: typeof WebGL2RenderingContext !== "undefined",
        dejaVu: introDejaVue(stockageLocal()),
        defilee: window.scrollY > 0,
      })
    );
  }, []);

  useEffect(() => {
    if (mode === "halo-css") return;

    const jouerIntro = mode === "intro";
    let moteur: Moteur | null = null;
    let annule = false;

    const sauter = () => moteur?.sauter();
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
        moteur = creerMoteur({
          canvas: canvasRef.current,
          intro: jouerIntro,
          nom: nomRef.current,
          tactile: window.matchMedia("(pointer: coarse)").matches,
          surPret: () => {
            setEncre("actif");
            if (jouerIntro) setIntro("en-cours");
          },
          surFinIntro: () => {
            setIntro("terminee");
            marquerIntroVue(stockageLocal());
          },
          surEchec: echouer,
        });
        moteur?.demarrer();
      })
      // Morceau de JS introuvable (réseau coupé, déploiement en cours).
      .catch(echouer);

    if (jouerIntro) {
      EVENEMENTS_SAUT.forEach((nom) => window.addEventListener(nom, sauter, { passive: true }));
    }
    window.addEventListener("pointermove", suivre, { passive: true });

    return () => {
      annule = true;
      moteur?.arreter();
      EVENEMENTS_SAUT.forEach((nom) => window.removeEventListener(nom, sauter));
      window.removeEventListener("pointermove", suivre);
    };
  }, [mode]);

  return (
    <div
      className="fond-accueil"
      data-mode={mode}
      data-intro={intro}
      data-encre={encre}
      aria-hidden="true"
    >
      <HaloCss />
      {mode !== "halo-css" && <canvas ref={canvasRef} />}
      {mode === "intro" && (
        <p ref={nomRef} className="fond-accueil__nom">
          {siteName}
        </p>
      )}
    </div>
  );
}
