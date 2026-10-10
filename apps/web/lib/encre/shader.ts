/**
 * Shaders de l'encre (GLSL ES 3.0).
 * - La goutte : un seul triangle couvre l'écran ; le fragment shader dessine
 *   une forme ronde au bord organique (distance au centre, déformée par un
 *   bruit fractal qui ondule lentement).
 * - Les traits du nuage : un rectangle répété une fois par trait (rendu
 *   instancié). Mêmes formules que lib/encre/nuage.ts (`opaciteTrait`,
 *   `nuageFige`).
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
uniform vec3 uCouleur;
uniform float uTemps;         // secondes

out vec4 fragColor;

// Bord net de la goutte (demi-largeur, hauteurs d'écran).
const float FLOU = 0.004;

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
  float alpha = 1.0 - smoothstep(-FLOU, FLOU + 0.002, bord);
  fragColor = vec4(uCouleur * alpha, alpha);
}
`;

export const SOURCE_TRAITS_SOMMET = `#version 300 es
in vec2 aCoin;            // coin du rectangle : x le long du trait, y en travers (de -0,5 à 0,5)
in vec4 aTrait;           // place (px CSS), longueur (px), phase (radians)

uniform vec2 uTaille;     // surface (px CSS)
uniform vec2 uCentre;     // centre du nuage (px CSS)
uniform vec2 uOrigine;    // centre de la goutte qui éclate (px CSS)
uniform float uRayon;     // rayon du nuage (px CSS)
uniform float uEclat;     // 0 : traits dans la goutte ; 1 : à leur place
uniform float uTemps;     // secondes
uniform vec3 uCouleurs[4];

out vec4 vCouleur;
out vec2 vPoint;          // position dans le trait (px), le long et en travers
out float vDemi;          // demi-longueur du trait (px), sans les bouts arrondis

void main() {
  float rayon = uRayon * (1.0 + 0.08 * sin(uTemps * 0.8));
  vec2 ecart = aTrait.xy - uCentre;
  float d = max(length(ecart), 0.001);
  vec2 rayonVers = ecart / d;
  // Vide au centre, estompe au loin : opaciteTrait de lib/encre/nuage.ts.
  float vide = clamp((d - 0.14 * rayon) / (0.25 * rayon), 0.0, 1.0);
  float loin = max(0.0, 1.0 - pow(max(0.0, d - 0.35 * rayon) / (1.6 * rayon), 1.4));
  float proche = exp(-d / rayon);
  vec2 place = aTrait.xy + rayonVers * 14.0 * proche
    + vec2(cos(uTemps * 0.7 + aTrait.w), sin(uTemps * 0.9 + aTrait.w)) * 1.5;
  // Éclatement : chaque trait part du centre de la goutte et ralentit en arrivant.
  float e = 1.0 - pow(1.0 - uEclat, 3.0);
  place = mix(uOrigine, place, e);
  float longueur = aTrait.z * (0.6 + 0.6 * proche);
  vec2 travers = vec2(-rayonVers.y, rayonVers.x);
  vec2 point = place + rayonVers * aCoin.x * (longueur + 2.0) + travers * aCoin.y * 2.0;
  gl_Position = vec4(point / uTaille * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);

  float angle = fract(atan(rayonVers.y, rayonVers.x) / 6.2831853 + 0.1 * sin(uTemps * 0.2)) * 4.0;
  int i = int(angle);
  vec3 c = mix(uCouleurs[i], uCouleurs[(i + 1) % 4], fract(angle));
  vCouleur = vec4(c, vide * loin * 0.9 * smoothstep(0.0, 0.25, uEclat));
  vPoint = vec2(aCoin.x * (longueur + 2.0), aCoin.y * 2.0);
  vDemi = longueur / 2.0;
}
`;

export const SOURCE_TRAITS_FRAGMENT = `#version 300 es
precision highp float;

in vec4 vCouleur;
in vec2 vPoint;
in float vDemi;

out vec4 fragColor;

void main() {
  // Distance au segment central : bouts arrondis, 1 px de rayon.
  float d = length(vec2(max(abs(vPoint.x) - vDemi, 0.0), vPoint.y));
  float alpha = vCouleur.a * (1.0 - smoothstep(0.5, 1.0, d));
  fragColor = vec4(vCouleur.rgb * alpha, alpha);
}
`;
