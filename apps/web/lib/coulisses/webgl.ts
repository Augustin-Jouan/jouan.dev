/**
 * WebGL 2 est-il disponible ? Three.js l'exige (WebGL 1 ne suffit pas). Et
 * dessine-t-il au processeur (SwiftShader, llvmpipe…) ? La 3D ne s'ouvre alors
 * pas d'elle-même : elle ralentirait toute la page.
 * Calculé une fois (un canvas d'essai, dont le contexte est aussitôt libéré),
 * puis gardé. Sans Three.js : ce module est dans le JS de la page.
 */
type Sonde = { disponible: boolean; processeur: boolean };
let sonde: Sonde | null = null;

/**
 * Même liste que `estRenduLogiciel` de lib/encre/moteur.ts, recopiée : un
 * module partagé avec l'intro deviendrait un morceau à part.
 */
const RENDU_LOGICIEL = /swiftshader|llvmpipe|softpipe|software|basic render driver/i;

/**
 * Nom du moteur de rendu. Firefox le donne dans `RENDERER` (et avertit dans la
 * console si l'on demande l'extension) ; Chrome y met « WebKit WebGL » et le
 * donne par `WEBGL_debug_renderer_info`.
 */
function nomDuRendu(gl: WebGL2RenderingContext): string {
  if (typeof gl.getParameter !== "function") return "";
  const brut = gl.getParameter(gl.RENDERER);
  if (typeof brut === "string" && brut !== "WebKit WebGL") return brut;
  const extension = gl.getExtension("WEBGL_debug_renderer_info");
  return extension ? String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) ?? "") : "";
}

function sonder(): Sonde {
  if (sonde) return sonde;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    sonde = { disponible: gl !== null, processeur: gl !== null && RENDU_LOGICIEL.test(nomDuRendu(gl)) };
    gl?.getExtension?.("WEBGL_lose_context")?.loseContext();
  } catch {
    sonde = { disponible: false, processeur: false };
  }
  return sonde;
}

export function webglDisponible(): boolean {
  return sonder().disponible;
}

/** WebGL 2 dessiné au processeur, sans carte graphique. */
export function renduAuProcesseur(): boolean {
  return sonder().processeur;
}

/** Réservé aux tests. */
export function oublierWebgl(): void {
  sonde = null;
}
