/**
 * Couleurs de la scène 3D : la nuit de la page (fond, brouillard, plateaux,
 * grille), une couleur par lieu (où chaque service tourne), la sélection en
 * accent. Recopiées de lib/charte.ts plutôt qu'importées : un module partagé
 * avec l'intro deviendrait un morceau de JS à part, hors du budget 3D
 * (verifier-taille-3d). couleurs3d.test.ts vérifie qu'elles restent égales aux
 * rôles de la charte.
 */
export const COULEURS_3D = {
  fond: "#2a2127",
  surface: "#352a31",
  grille: "#4a3b44",
  liaison: "#8a7480",
  actif: "#eab595",
  lieux: { "chez-vous": "#f3efe7", vps: "#d87f81", github: "#7e9680", externe: "#b9a3b0" },
} as const;
