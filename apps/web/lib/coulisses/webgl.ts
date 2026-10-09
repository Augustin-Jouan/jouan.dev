/** WebGL est-il disponible ? Calculé une fois (création d'un canvas), puis gardé. */
let disponible: boolean | null = null;

export function webglDisponible(): boolean {
  if (disponible !== null) return disponible;
  try {
    const canvas = document.createElement("canvas");
    disponible = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    disponible = false;
  }
  return disponible;
}

/** Réservé aux tests. */
export function oublierWebgl(): void {
  disponible = null;
}
