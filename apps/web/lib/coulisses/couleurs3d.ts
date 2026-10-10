/**
 * Couleurs de la scène 3D : blocs clairs sur la nuit, sélection en accent,
 * liaisons en trait fort. Recopiées de lib/charte.ts plutôt qu'importées : un
 * module partagé avec l'intro deviendrait un morceau de JS à part, hors du
 * budget 3D (verifier-taille-3d). couleurs3d.test.ts vérifie qu'elles
 * restent égales aux rôles `texte-doux`, `accent` et `trait-fort`.
 */
export const COULEURS_3D = { bloc: "#b9a3b0", actif: "#eab595", liaison: "#8a7480" } as const;
