/**
 * « Augustin Jouan », écrit d'un seul trait par le trait conducteur sous l'adresse e-mail du Contact.
 * Repère local : origine sur la ligne de base, au pied du A ; hauteur d'x 18, majuscules 54, y vers le bas.
 * Pas de lever de plume : le i n'a pas de point, la barre du t est une boucle qui croise la hampe, le J est
 * lié au n. Le dernier n part en paraphe et souligne la signature, de droite à gauche.
 */

/** Départ de l'amorce, à gauche du A : le trait y arrive depuis la marge droite. */
export const SIGNATURE_DEPART = { x: -6, y: -64 };

/** Courbes de Bézier cubiques à la suite, six nombres chacune : contrôle 1, contrôle 2, arrivée. */
export const SIGNATURE = [
  // Amorce, puis A : montée, descente, barre en boucle.
  -24, -52, -26, -17, 0, 4, 9, -17, 19, -42, 32, -54, 34, -37, 38, -12, 41, -2, 38, -14, 22, -18, 18, -20, 14, -22, 26,
  -26, 54, -18,
  // u
  52, -8, 54, 0, 60, 0, 66, 0, 70, -8, 72, -18, 71, -10, 71, -2, 76, 0,
  // g
  80, 0, 82, -18, 90, -18, 82, -19, 78, -10, 81, -4, 84, 1, 92, -2, 93, -16, 93, 4, 94, 20, 86, 24, 78, 26, 78, 16, 86,
  10, 92, 6, 98, -6, 102, -16,
  // u
  100, -6, 102, 0, 108, 0, 114, 0, 118, -8, 120, -18, 119, -8, 119, -1, 124, 0,
  // s
  128, -2, 130, -18, 134, -18, 140, -10, 142, 0, 132, 1, 126, 1, 126, -3, 130, -4, 136, -5, 140, 0, 146, -2,
  // t
  150, -12, 152, -26, 154, -36, 153, -22, 152, -6, 158, 0, 166, 2, 166, -12, 146, -18, 162, -22, 170, -20, 176, -16,
  // i, n
  176, -6, 177, 0, 182, 0, 186, -6, 188, -14, 189, -18, 189, -10, 188, -4, 188, 0, 190, -12, 198, -20, 202, -16, 205,
  -12, 203, -4, 206, 0,
  // Liaison, J
  210, 2, 214, -4, 218, -12, 224, -27, 230, -44, 244, -52, 240, -32, 238, -2, 234, 18, 230, 30, 218, 26, 222, 16, 226, 6,
  244, 0, 254, -4,
  // o
  258, -8, 260, -18, 266, -18, 256, -18, 254, 0, 262, 0, 270, 0, 272, -14, 266, -18, 270, -18, 274, -16, 276, -14,
  // u
  274, -6, 276, 0, 282, 0, 288, 0, 292, -8, 294, -18, 293, -8, 293, -2, 298, 0,
  // a
  302, -2, 304, -18, 312, -18, 304, -19, 300, -10, 303, -4, 306, 2, 314, -2, 315, -18, 314, -10, 314, -2, 320, 0,
  // n
  324, -4, 326, -14, 327, -18, 327, -10, 326, -4, 326, 0, 328, -12, 336, -20, 340, -16, 343, -12, 341, -4, 344, 0,
  // Paraphe : boucle, puis le soulignement part vers la gauche.
  362, 2, 374, -10, 366, 8, 360, 20, 344, 24, 314, 26,
];

/** Étendue de la signature dans son repère, amorce et paraphe compris. */
export const SIGNATURE_GAUCHE = -26;
export const SIGNATURE_DROITE = 374;
/** Le trait arrive par le haut : il plonge jusqu'ici avant de rejoindre l'amorce. */
export const SIGNATURE_HAUT = -110;
/** Hauteur du soulignement, prolongé en ligne droite jusqu'au bouton d'envoi. */
export const SIGNATURE_BAS = 28;
