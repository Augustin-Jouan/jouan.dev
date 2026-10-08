import {
  BRAISE_CLAIRE,
  HALO,
  cibleHalo,
  etatEncre,
  etatHalo,
  rayonCouverture,
  suivre,
  type EtatEncre,
  type Point,
} from "./chronologie";
import { SOURCE_FRAGMENT, SOURCE_SOMMET } from "./shader";

/** Repère ce morceau de JS dans le build (scripts/verifier-taille-encre.mjs). */
export const MARQUEUR_MOTEUR = "moteur-encre:v1";

/** Au-delà, le coût GPU augmente sans gain visible sur un fond flou. */
const DPR_MAX = 1.5;
/** Écart au-dessous duquel le halo est considéré arrivé : on cesse de dessiner. */
const REPOS = 0.0005;

export type RaisonEchec = "webgl2-indisponible" | "shader" | "contexte-perdu";

export type OptionsMoteur = {
  canvas: HTMLCanvasElement;
  /** Joue l'intro avant de poser le halo ; sinon, halo directement. */
  intro: boolean;
  /** Élément HTML du nom, dont l'opacité suit l'intro. */
  nom?: HTMLElement | null;
  /** Écran tactile : le halo dérive seul au lieu de suivre la souris. */
  tactile: boolean;
  /** Première image dessinée : le canvas peut remplacer le halo CSS. */
  surPret?: () => void;
  surFinIntro?: () => void;
  surEchec?: (raison: RaisonEchec) => void;
};

export type Moteur = {
  demarrer(): void;
  /** Termine l'intro immédiatement : on saute à l'état « halo ». */
  sauter(): void;
  /** Position de la souris en fractions du canvas (y depuis le haut), ou null. */
  suivreSouris(point: Point | null): void;
  arreter(): void;
};

export function creerMoteur(options: OptionsMoteur): Moteur | null {
  const { canvas } = options;
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) {
    options.surEchec?.("webgl2-indisponible");
    return null;
  }

  const programme = compiler(gl);
  if (!programme) {
    options.surEchec?.("shader");
    return null;
  }
  canvas.dataset.moteur = MARQUEUR_MOTEUR;

  gl.useProgram(programme);
  const tampon = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tampon);
  // Un triangle qui déborde de l'écran le couvre entièrement.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(programme, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const u = (nom: string) => gl.getUniformLocation(programme, nom);
  const uniformes = {
    resolution: u("uResolution"),
    centre: u("uCentre"),
    rayon: u("uRayon"),
    flou: u("uFlou"),
    couleur: u("uCouleur"),
    couleurClaire: u("uCouleurClaire"),
    melange: u("uMelange"),
    temps: u("uTemps"),
  };
  gl.uniform3fv(uniformes.couleurClaire, BRAISE_CLAIRE);

  let debut = 0;
  let introFinie = !options.intro;
  let halo: Point = { x: HALO.x, y: HALO.y };
  let souris: Point | null = null;
  let image = 0;
  let pret = false;
  let arrete = false;
  /** Le haut de page est à l'écran ; sinon, inutile de dessiner (dérive tactile). */
  let aLEcran = true;

  function redimensionner() {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    const largeur = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const hauteur = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== largeur || canvas.height !== hauteur) {
      canvas.width = largeur;
      canvas.height = hauteur;
    }
    gl!.viewport(0, 0, canvas.width, canvas.height);
  }

  function dessiner(etat: EtatEncre, maintenant: number) {
    gl!.uniform2f(uniformes.resolution, canvas.width, canvas.height);
    gl!.uniform2f(uniformes.centre, etat.centre.x, etat.centre.y);
    gl!.uniform1f(uniformes.rayon, etat.rayon);
    gl!.uniform1f(uniformes.flou, etat.flou);
    gl!.uniform3fv(uniformes.couleur, etat.couleur);
    gl!.uniform1f(uniformes.melange, etat.melange);
    gl!.uniform1f(uniformes.temps, maintenant / 1000);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    if (!pret) {
      pret = true;
      options.surPret?.();
    }
  }

  function terminerIntro() {
    introFinie = true;
    if (options.nom) options.nom.style.opacity = "0";
    options.surFinIntro?.();
  }

  function boucle(maintenant: number) {
    image = 0;
    if (arrete) return;
    redimensionner();

    if (!introFinie) {
      const etat = etatEncre(maintenant - debut, rayonCouverture(canvas.width, canvas.height));
      if (options.nom) options.nom.style.opacity = String(etat.opaciteNom);
      dessiner(etat, maintenant);
      if (etat.terminee) terminerIntro();
      demanderImage();
      return;
    }

    const cible = cibleHalo(souris, maintenant, options.tactile);
    halo = suivre(halo, cible);
    dessiner(etatHalo(halo), maintenant);
    // Au repos, plus rien ne bouge : la prochaine image viendra d'un mouvement
    // de souris, d'un redimensionnement ou du retour sur l'onglet.
    const auRepos = !options.tactile && Math.hypot(cible.x - halo.x, cible.y - halo.y) < REPOS;
    if (!auRepos) demanderImage();
  }

  function demanderImage() {
    if (image || arrete || !aLEcran || document.visibilityState !== "visible") return;
    image = requestAnimationFrame(boucle);
  }

  const surVisibilite = () => demanderImage();
  const surContextePerdu = (evenement: Event) => {
    evenement.preventDefault();
    arreter();
    options.surEchec?.("contexte-perdu");
  };
  const observateur =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => demanderImage());
  const vigie =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entree]) => {
          aLEcran = entree.isIntersecting;
          demanderImage();
        });

  function arreter() {
    arrete = true;
    if (image) cancelAnimationFrame(image);
    image = 0;
    document.removeEventListener("visibilitychange", surVisibilite);
    canvas.removeEventListener("webglcontextlost", surContextePerdu);
    observateur?.disconnect();
    vigie?.disconnect();
  }

  document.addEventListener("visibilitychange", surVisibilite);
  canvas.addEventListener("webglcontextlost", surContextePerdu);
  observateur?.observe(canvas);
  vigie?.observe(canvas);

  return {
    demarrer() {
      debut = performance.now();
      demanderImage();
    },
    sauter() {
      if (introFinie) return;
      terminerIntro();
      demanderImage();
    },
    suivreSouris(point) {
      souris = point;
      demanderImage();
    },
    arreter,
  };
}

function compiler(gl: WebGL2RenderingContext): WebGLProgram | null {
  const sommet = shader(gl, gl.VERTEX_SHADER, SOURCE_SOMMET);
  const fragment = shader(gl, gl.FRAGMENT_SHADER, SOURCE_FRAGMENT);
  if (!sommet || !fragment) return null;

  const programme = gl.createProgram();
  gl.attachShader(programme, sommet);
  gl.attachShader(programme, fragment);
  gl.linkProgram(programme);
  if (!gl.getProgramParameter(programme, gl.LINK_STATUS)) {
    // Avertissement et non erreur : le repli CSS prend le relais.
    console.warn("[encre] Édition des liens du shader impossible :", gl.getProgramInfoLog(programme));
    return null;
  }
  return programme;
}

function shader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const resultat = gl.createShader(type);
  if (!resultat) return null;
  gl.shaderSource(resultat, source);
  gl.compileShader(resultat);
  if (!gl.getShaderParameter(resultat, gl.COMPILE_STATUS)) {
    console.warn("[encre] Compilation du shader impossible :", gl.getShaderInfoLog(resultat));
    return null;
  }
  return resultat;
}
