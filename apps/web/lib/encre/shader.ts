/**
 * Shaders de l'encre (GLSL ES 3.0). Un seul triangle couvre l'écran ; le
 * fragment shader dessine une forme ronde au bord organique : distance au
 * centre, déformée par un bruit fractal qui ondule lentement.
 */

export const SOURCE_SOMMET = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const SOURCE_FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 uResolution;     // pixels
uniform vec2 uCentre;         // fractions de l'écran, y depuis le haut
uniform float uRayon;         // hauteurs d'écran
uniform float uFlou;          // demi-largeur du bord, hauteurs d'écran
uniform vec3 uCouleur;
uniform vec3 uCouleurClaire;  // bord du halo
uniform float uMelange;       // 0 encre unie, 1 dégradé du halo
uniform float uTemps;         // secondes

out vec4 fragColor;

float hachage(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float bruit(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hachage(i), hachage(i + vec2(1.0, 0.0)), u.x),
    mix(hachage(i + vec2(0.0, 1.0)), hachage(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float valeur = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    valeur += amplitude * bruit(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return valeur;
}

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 p = (pixel - uCentre * uResolution) / uResolution.y;
  float d = length(p);
  // Bruit lu le long du contour (direction), donc sans couture.
  vec2 direction = p / max(d, 1e-4);
  float ondulation = (fbm(direction * 1.8 + uTemps * 0.25) - 0.5) * 0.22 * uRayon;
  float bord = d - (uRayon + ondulation);
  float alpha = 1.0 - smoothstep(-uFlou, uFlou + 0.002, bord);
  float versBord = smoothstep(0.0, uRayon + uFlou, d);
  vec3 couleur = mix(uCouleur, uCouleurClaire, versBord * uMelange);
  alpha *= mix(1.0, 0.85, uMelange);
  fragColor = vec4(couleur * alpha, alpha);
}
`;
