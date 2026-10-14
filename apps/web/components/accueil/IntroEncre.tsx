"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { siteMetier, siteName } from "@/data/site";
import { EVENEMENT_REJOUER_INTRO } from "@/lib/commandes/evenements";
import {
  deciderMode,
  introDejaVue,
  marquerIntroVue,
  stockageSession,
  type ModeEncre,
} from "@/lib/encre/decision";
import type { Moteur } from "@/lib/encre/moteur";
import { leverVoile } from "@/lib/encre/voile";
import { remonterEnHaut } from "@/lib/defilement";

/**
 * Un geste du visiteur termine l'intro immédiatement. `scroll` couvre aussi
 * le glisser de la barre de défilement, qui n'émet ni `wheel` ni `pointerdown`.
 */
const EVENEMENTS_SAUT = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;

/**
 * Au-delà de ce délai après le montage, le moteur arrive trop tard : le
 * visiteur lit déjà la page, une intro qui la recouvrirait n'en est plus une.
 * On pose alors directement le nuage.
 */
const DELAI_MAX_INTRO_MS = 3000;

/**
 * Fond de l'accueil. Rendu côté serveur, c'est le nuage figé (`repli`) ; une fois
 * monté, il décide s'il faut jouer l'intro (une fois par visite), puis importe
 * le moteur WebGL dans son propre morceau de JS, après l'affichage.
 *
 * Attributs lus par le CSS et les tests de bout en bout :
 * - data-mode : intro | nuage-anime | nuage-fige
 * - data-intro : en-cours | terminee (absent hors intro)
 * - data-encre : actif (canvas affiché) | repli (WebGL a échoué)
 *
 * La commande « Rejouer l'intro » (palette, sous-projet 7) émet
 * `jouan:rejouer-intro` : retour en haut, puis l'intro repart sur un canvas neuf
 * (l'arrêt du moteur libère le contexte WebGL de l'ancien).
 */
export function IntroEncre({ repli }: { repli?: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nomRef = useRef<HTMLParagraphElement>(null);
  /** Instant du montage (performance.now), point de départ de DELAI_MAX_INTRO_MS. */
  const montageRef = useRef(0);
  const [mode, setMode] = useState<ModeEncre>("nuage-fige");
  const [intro, setIntro] = useState<"en-cours" | "terminee">();
  const [encre, setEncre] = useState<"actif" | "repli">();
  /** Numéro de l'intro jouée : change à chaque « Rejouer l'intro ». */
  const [tour, setTour] = useState(0);

  useEffect(() => {
    montageRef.current = performance.now();
    const decision = deciderMode({
      mouvementReduit: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      webgl2: typeof WebGL2RenderingContext !== "undefined",
      dejaVu: introDejaVue(stockageSession()),
      defilee: window.scrollY > 0,
    });
    // Le voile du script de tête ne cache la page que pour l'intro.
    if (decision !== "intro") leverVoile();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la décision dépend du navigateur : impossible au rendu serveur
    setMode(decision);
    // Départ vers une autre page avant que la goutte couvre l'écran : le voile ne
    // doit pas la cacher. Le démontage-remontage du mode strict (développement)
    // laisse le fond en place : le voile reste alors.
    return () => {
      setTimeout(() => {
        if (!document.querySelector(".fond-accueil")) leverVoile();
      });
    };
  }, []);

  useEffect(() => {
    let image = 0;
    const rejouer = () => {
      remonterEnHaut();
      // Le `scroll` de ce retour en haut part avant la prochaine image : l'intro
      // ne repart qu'après, sinon elle se sauterait elle-même.
      cancelAnimationFrame(image);
      image = requestAnimationFrame(() => {
        montageRef.current = performance.now();
        setIntro(undefined);
        setMode((actuel) => (actuel === "nuage-fige" ? actuel : "intro"));
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
    if (mode === "nuage-fige") return;

    const jouerIntro = mode === "intro";
    let moteur: Moteur | null = null;
    let annule = false;
    /** Geste fait avant l'arrivée du moteur : l'intro ne doit plus se jouer. */
    let sautDemande = false;

    const sauter = () => {
      if (moteur) moteur.sauter();
      else sautDemande = true;
      leverVoile();
    };
    const retirerSaut = () =>
      EVENEMENTS_SAUT.forEach((nom) => window.removeEventListener(nom, sauter));
    /** Pointeur en (x, y) px de la fenêtre, transmis en fractions du canvas. */
    const viser = (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cadre = canvas.getBoundingClientRect();
      moteur?.suivrePointeur({ x: (x - cadre.left) / cadre.width, y: (y - cadre.top) / cadre.height });
    };
    // Le doigt passe par `touchstart` / `touchmove`, qui continuent pendant le
    // défilement (les événements de pointeur s'y arrêtent : `pointercancel`).
    /** Dernière position de la souris dans la fenêtre : le défilement la redonne au moteur. */
    let souris: { x: number; y: number } | null = null;
    const suivreSouris = (evenement: PointerEvent) => {
      if (evenement.pointerType === "touch") return;
      souris = { x: evenement.clientX, y: evenement.clientY };
      viser(souris.x, souris.y);
    };
    // Défiler sans bouger la souris déplace le canvas sous elle : le nuage
    // reste sous le curseur au lieu de partir avec la page.
    const suivreDefilement = () => {
      if (souris) viser(souris.x, souris.y);
    };
    const suivreDoigt = (evenement: TouchEvent) => {
      const doigt = evenement.touches[0];
      if (doigt) viser(doigt.clientX, doigt.clientY);
    };
    /** Souris sortie de la fenêtre, doigt levé : le nuage revient à sa place. */
    const oublier = () => {
      souris = null;
      moteur?.suivrePointeur(null);
    };

    const echouer = () => {
      leverVoile();
      moteur?.arreter();
      setEncre("repli");
      setIntro(undefined);
      setMode("nuage-fige");
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
        if (!introEffective) leverVoile();
        moteur = creerMoteur({
          canvas: canvasRef.current,
          intro: introEffective,
          nom: nomRef.current,
          surPret: () => {
            setEncre("actif");
            if (introEffective) setIntro((etat) => etat ?? "en-cours");
          },
          // La goutte cache maintenant la page : le voile peut partir sans se voir.
          surCouvert: leverVoile,
          surFinIntro: () => {
            leverVoile();
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
    window.addEventListener("pointermove", suivreSouris, { passive: true });
    window.addEventListener("scroll", suivreDefilement, { passive: true });
    window.addEventListener("touchstart", suivreDoigt, { passive: true });
    window.addEventListener("touchmove", suivreDoigt, { passive: true });
    window.addEventListener("touchend", oublier);
    window.addEventListener("touchcancel", oublier);
    document.documentElement.addEventListener("mouseleave", oublier);

    return () => {
      annule = true;
      moteur?.arreter();
      retirerSaut();
      window.removeEventListener("pointermove", suivreSouris);
      window.removeEventListener("scroll", suivreDefilement);
      window.removeEventListener("touchstart", suivreDoigt);
      window.removeEventListener("touchmove", suivreDoigt);
      window.removeEventListener("touchend", oublier);
      window.removeEventListener("touchcancel", oublier);
      document.documentElement.removeEventListener("mouseleave", oublier);
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
      {repli}
      {mode !== "nuage-fige" && <canvas key={tour} ref={canvasRef} />}
      {mode === "intro" && (
        <p ref={nomRef} className="fond-accueil__nom">
          {siteName}
          <span className="fond-accueil__metier">{siteMetier}</span>
        </p>
      )}
    </div>
  );
}
