/**
 * Bornes de saisie. Elles servent autant à la qualité des demandes qu'à
 * empêcher qu'un envoi automatisé remplisse la boîte mail.
 */
export const LIMITES = {
  nom: 80,
  email: 254,
  telephone: 30,
  message: 5000,
} as const;
