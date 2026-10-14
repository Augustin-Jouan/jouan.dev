/**
 * Messages du service sur `/direct` : le nombre de personnes présentes sur l'accueil, rien
 * d'autre. Le navigateur n'envoie rien ; ce qu'il enverrait quand même (une page restée
 * ouverte sur une ancienne version) est ignoré, dans la limite de taille et de débit.
 */
export const TAILLE_MAX_MESSAGE = 128;

export type MessageServeur = { type: "bienvenue"; presents: number } | { type: "presents"; nombre: number };

export const encoder = (m: MessageServeur): string => JSON.stringify(m);
