/**
 * WebGL 2 est-il disponible ? Three.js l'exige (WebGL 1 ne suffit pas).
 * Calculé une fois (un canvas d'essai, dont le contexte est aussitôt libéré),
 * puis gardé.
 */
let disponible: boolean | null = null;

export function webglDisponible(): boolean {
  if (disponible !== null) return disponible;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    disponible = gl !== null;
    gl?.getExtension?.("WEBGL_lose_context")?.loseContext();
  } catch {
    disponible = false;
  }
  return disponible;
}

/** Réservé aux tests. */
export function oublierWebgl(): void {
  disponible = null;
}
