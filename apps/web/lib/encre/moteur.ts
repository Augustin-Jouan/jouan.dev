import { GOUTTE, cibleNuage, etatEncre, etatNuage, rayonCouverture, reposNuage, rvb, suivre, type EtatEncre, type Point } from "./chronologie";
import { COULEURS_NUAGE, semerTraits } from "./nuage";
import { SOURCE_FRAGMENT, SOURCE_SOMMET, SOURCE_TRAITS_FRAGMENT, SOURCE_TRAITS_SOMMET } from "./shader";

/** Repère ce morceau de JS dans le build (scripts/verifier-taille-encre.mjs). */
export const MARQUEUR_MOTEUR = "moteur-encre:v1";

/**
 * Pixels du canvas par pixel CSS : la densité de l'écran, plafonnée. Les
 * traits du nuage font 2 px de large : à demi-résolution, ils seraient flous.
 */
const DENSITE_MAX = 2;

/** `rendu-logiciel` : WebGL dessiné par le processeur, faute de carte graphique. */
export type RaisonEchec = "webgl2-indisponible" | "rendu-logiciel" | "shader" | "contexte-perdu";

export type OptionsMoteur = {
  canvas: HTMLCanvasElement;
  /** Joue l'intro avant de poser le nuage ; sinon, nuage directement. */
  intro: boolean;
  /** Élément HTML du nom, dont l'opacité suit l'intro. */
  nom?: HTMLElement | null;
  /** Première image dessinée : le canvas peut remplacer le nuage figé. */
  surPret?: () => void;
  surFinIntro?: () => void;
  surEchec?: (raison: RaisonEchec) => void;
};

export type Moteur = {
  demarrer(): void;
  /** Termine l'intro immédiatement : le nuage se pose. */
  sauter(): void;
  /** Position du pointeur (souris ou doigt) en fractions du canvas (y depuis le haut), ou null. */
  suivrePointeur(point: Point | null): void;
  arreter(): void;
};

/** Taille du canvas, en pixels, pour une surface affichée de `largeurCss` × `hauteurCss` sur un écran de densité `densite`. */
export function tailleRendu(largeurCss: number, hauteurCss: number, densite = 1) {
  const echelle = Math.min(densite, DENSITE_MAX);
  return {
    largeur: Math.max(1, Math.round(largeurCss * echelle)),
    hauteur: Math.max(1, Math.round(hauteurCss * echelle)),
  };
}

/** Pilotes qui dessinent WebGL au processeur : SwiftShader (Chrome), llvmpipe et softpipe (Mesa), pilote de base de Windows. */
const RENDU_LOGICIEL = /swiftshader|llvmpipe|softpipe|software|basic render driver/i;

export function estRenduLogiciel(nom: string): boolean {
  return RENDU_LOGICIEL.test(nom);
}

/**
 * Nom du moteur de rendu. Firefox le donne dans `RENDERER` (et avertit dans la
 * console si l'on demande l'extension) ; Chrome y met « WebKit WebGL » et le
 * donne par `WEBGL_debug_renderer_info`.
 */
export function nomDuRendu(gl: WebGL2RenderingContext): string {
  const brut = gl.getParameter(gl.RENDERER);
  if (typeof brut === "string" && brut !== "WebKit WebGL") return brut;
  const extension = gl.getExtension("WEBGL_debug_renderer_info");
  const detaille = extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null;
  return typeof detaille === "string" ? detaille : "";
}

export function creerMoteur(options: OptionsMoteur): Moteur | null {
  const { canvas } = options;
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) {
    options.surEchec?.("webgl2-indisponible");
    return null;
  }
  // Sans carte graphique, l'animation occuperait le fil principal pendant des
  // secondes (et la batterie) : on garde le nuage figé. Les navigateurs sans tête
  // de la CI, sans GPU, passent eux aussi par ce chemin.
  if (estRenduLogiciel(nomDuRendu(gl))) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    options.surEchec?.("rendu-logiciel");
    return null;
  }

  const goutte = compiler(gl, SOURCE_SOMMET, SOURCE_FRAGMENT);
  const traits = goutte && compiler(gl, SOURCE_TRAITS_SOMMET, SOURCE_TRAITS_FRAGMENT);
  if (!goutte || !traits) {
    options.surEchec?.("shader");
    return null;
  }
  canvas.dataset.moteur = MARQUEUR_MOTEUR;
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // couleurs prémultipliées

  // Goutte : un triangle qui déborde de l'écran le couvre entièrement.
  const vaoGoutte = gl.createVertexArray();
  gl.bindVertexArray(vaoGoutte);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  attribut(gl, goutte, "aPosition", 2, 0);

  // Traits : un rectangle (deux triangles), répété une fois par trait.
  const vaoTraits = gl.createVertexArray();
  gl.bindVertexArray(vaoTraits);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5]),
    gl.STATIC_DRAW
  );
  attribut(gl, traits, "aCoin", 2, 0);
  const tamponTraits = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tamponTraits);
  attribut(gl, traits, "aTrait", 4, 1);
  gl.bindVertexArray(null);

  const ug = (nom: string) => gl.getUniformLocation(goutte, nom);
  const ut = (nom: string) => gl.getUniformLocation(traits, nom);
  const uGoutte = { resolution: ug("uResolution"), centre: ug("uCentre"), rayon: ug("uRayon"), temps: ug("uTemps") };
  const uTraits = {
    taille: ut("uTaille"),
    centre: ut("uCentre"),
    origine: ut("uOrigine"),
    rayon: ut("uRayon"),
    eclat: ut("uEclat"),
    temps: ut("uTemps"),
  };
  gl.useProgram(goutte);
  gl.uniform3fv(ug("uCouleur"), GOUTTE);
  gl.useProgram(traits);
  gl.uniform3fv(ut("uCouleurs"), COULEURS_NUAGE.flatMap(rvb));

  /** Instant (horloge rAF) de la première image d'intro ; posé à ce moment-là. */
  let debut: number | null = null;
  let demarre = false;
  /** Horloge des shaders (ms) : n'avance que sur les images dessinées, sans saut après une pause. */
  let horloge = 0;
  let precedent: number | null = null;
  let introFinie = !options.intro;
  let repos = reposNuage(canvas.clientWidth || 1, canvas.clientHeight || 1);
  /** Centre du nuage, en fractions du canvas. */
  let nuage: Point = repos.centre;
  let pointeur: Point | null = null;
  /** Surface (px CSS) du semis envoyé à la carte graphique, et nombre de traits. */
  let semis = { largeur: 0, hauteur: 0, nombre: 0 };
  let image = 0;
  let pret = false;
  let arrete = false;
  /** Le haut de page est à l'écran ; sinon, inutile de dessiner. */
  let aLEcran = true;
  /**
   * Seule la goutte est à l'écran (intro avant l'éclatement) : son shader
   * calcule un bruit fractal sur chaque pixel, à densité 1 pour ménager la
   * carte graphique (son bord est adouci). Les traits, eux, suivent la densité.
   */
  let goutteSeule = options.intro;

  function redimensionner() {
    const largeurCss = canvas.clientWidth || 1;
    const hauteurCss = canvas.clientHeight || 1;
    const densite = goutteSeule ? 1 : window.devicePixelRatio || 1;
    const { largeur, hauteur } = tailleRendu(largeurCss, hauteurCss, densite);
    if (canvas.width !== largeur || canvas.height !== hauteur) {
      canvas.width = largeur;
      canvas.height = hauteur;
    }
    gl!.viewport(0, 0, canvas.width, canvas.height);
    repos = reposNuage(largeurCss, hauteurCss);
    if (semis.largeur !== largeurCss || semis.hauteur !== hauteurCss) {
      const liste = semerTraits(largeurCss, hauteurCss);
      gl!.bindBuffer(gl!.ARRAY_BUFFER, tamponTraits);
      gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(liste.flatMap((t) => [t.x, t.y, t.longueur, t.phase])), gl!.STATIC_DRAW);
      semis = { largeur: largeurCss, hauteur: hauteurCss, nombre: liste.length };
    }
  }

  /** Dessine la goutte (si elle a encore un rayon) puis les traits (dès l'éclatement), autour de `centreNuage`. */
  function dessiner(etat: EtatEncre, centreNuage: Point, maintenant: number) {
    horloge += precedent === null ? 0 : Math.min(maintenant - precedent, 50);
    precedent = maintenant;
    const temps = (horloge / 1000) % 1000;
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    if (etat.rayon > 0) {
      gl!.useProgram(goutte);
      gl!.bindVertexArray(vaoGoutte);
      gl!.uniform2f(uGoutte.resolution, canvas.width, canvas.height);
      gl!.uniform2f(uGoutte.centre, etat.centre.x, etat.centre.y);
      gl!.uniform1f(uGoutte.rayon, etat.rayon);
      gl!.uniform1f(uGoutte.temps, temps);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }
    if (etat.eclat > 0) {
      const { largeur, hauteur, nombre } = semis;
      gl!.useProgram(traits);
      gl!.bindVertexArray(vaoTraits);
      gl!.uniform2f(uTraits.taille, largeur, hauteur);
      gl!.uniform2f(uTraits.centre, centreNuage.x * largeur, centreNuage.y * hauteur);
      gl!.uniform2f(uTraits.origine, etat.centre.x * largeur, etat.centre.y * hauteur);
      gl!.uniform1f(uTraits.rayon, repos.rayon * hauteur);
      gl!.uniform1f(uTraits.eclat, etat.eclat);
      gl!.uniform1f(uTraits.temps, temps);
      gl!.drawArraysInstanced(gl!.TRIANGLES, 0, 6, nombre);
    }
    if (!pret) {
      pret = true;
      options.surPret?.();
    }
  }

  function terminerIntro() {
    introFinie = true;
    goutteSeule = false;
    nuage = repos.centre;
    if (options.nom) options.nom.style.opacity = "0";
    options.surFinIntro?.();
  }

  function boucle(maintenant: number) {
    image = 0;
    if (arrete) return;
    redimensionner();

    if (!introFinie) {
      const etat = etatEncre(maintenant - (debut ??= maintenant), rayonCouverture(canvas.width, canvas.height), repos);
      if (options.nom) options.nom.style.opacity = String(etat.opaciteNom);
      goutteSeule = etat.eclat === 0;
      // Pendant l'éclatement, le nuage naît à sa place de repos.
      dessiner(etat, repos.centre, maintenant);
      if (etat.terminee) terminerIntro();
      demanderImage();
      return;
    }

    nuage = suivre(nuage, cibleNuage(pointeur, repos.centre));
    dessiner(etatNuage(repos), nuage, maintenant);
    // Le nuage respire : on dessine tant que le haut de page est à l'écran et l'onglet visible.
    demanderImage();
  }

  function demanderImage() {
    if (image || !demarre || arrete || !aLEcran || document.visibilityState !== "visible") return;
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
      : new IntersectionObserver((entrees) => {
          aLEcran = entrees[entrees.length - 1].isIntersecting;
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
    // Libère le contexte tout de suite, sans attendre le ramasse-miettes : le
    // navigateur en limite le nombre (≈ 16) et perd d'office le plus ancien
    // au-delà, après des allers-retours entre l'accueil et les autres pages.
    // Écouteur `webglcontextlost` déjà retiré : la perte volontaire n'est pas
    // prise pour un échec.
    if (!gl!.isContextLost()) gl!.getExtension("WEBGL_lose_context")?.loseContext();
  }

  document.addEventListener("visibilitychange", surVisibilite);
  canvas.addEventListener("webglcontextlost", surContextePerdu);
  observateur?.observe(canvas);
  vigie?.observe(canvas);

  return {
    demarrer() {
      demarre = true;
      demanderImage();
    },
    sauter() {
      if (arrete || introFinie) return;
      terminerIntro();
      demanderImage();
    },
    suivrePointeur(point) {
      if (arrete) return;
      pointeur = point;
      demanderImage();
    },
    arreter,
  };
}

function compiler(gl: WebGL2RenderingContext, sourceSommet: string, sourceFragment: string): WebGLProgram | null {
  const sommet = shader(gl, gl.VERTEX_SHADER, sourceSommet);
  const fragment = shader(gl, gl.FRAGMENT_SHADER, sourceFragment);
  if (!sommet || !fragment) return null;

  const programme = gl.createProgram();
  gl.attachShader(programme, sommet);
  gl.attachShader(programme, fragment);
  gl.linkProgram(programme);
  if (!gl.getProgramParameter(programme, gl.LINK_STATUS)) {
    // Avertissement et non erreur : le repli prend le relais.
    console.warn("[encre] Édition des liens du shader impossible :", gl.getProgramInfoLog(programme));
    return null;
  }
  return programme;
}

/** Branche l'attribut `nom` sur le tampon courant : `diviseur` 1, une valeur par trait (instance). */
function attribut(gl: WebGL2RenderingContext, programme: WebGLProgram, nom: string, taille: number, diviseur: number) {
  const position = gl.getAttribLocation(programme, nom);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, taille, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(position, diviseur);
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
