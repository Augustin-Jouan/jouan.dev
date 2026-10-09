/**
 * Limitation de débit en mémoire, dimensionnée pour ce site : une seule
 * instance, quelques envois par jour. Elle protège la boîte mail du client et
 * son compte SMTP d'un bot qui aurait passé le honeypot — pas d'une attaque
 * distribuée, qui relève de l'hébergeur.
 *
 * Le compteur repart de zéro à chaque redémarrage du serveur : c'est
 * acceptable ici, et cela évite d'ajouter une dépendance de stockage.
 */

// La durée d'une fenêtre est fixée par l'appel qui la crée : une même clé doit toujours
// être utilisée avec les mêmes options.
type Fenetre = { debut: number; envois: number; dureeMs: number };

const fenetres = new Map<string, Fenetre>();

export type LimiteOptions = {
  /** Nombre d'envois autorisés par fenêtre. */
  max: number;
  /** Durée de la fenêtre, en millisecondes. */
  dureeMs: number;
};

export function verifierLimite(
  cle: string,
  { max, dureeMs }: LimiteOptions,
  maintenant: number = Date.now()
): { autorise: boolean; secondesAvantReessai: number } {
  purger(maintenant);

  const fenetre = fenetres.get(cle);

  if (!fenetre) {
    fenetres.set(cle, { debut: maintenant, envois: 1, dureeMs });
    return { autorise: true, secondesAvantReessai: 0 };
  }

  if (fenetre.envois >= max) {
    return { autorise: false, secondesAvantReessai: secondesRestantes(fenetre, maintenant) };
  }

  fenetre.envois += 1;
  return { autorise: true, secondesAvantReessai: 0 };
}

/**
 * Rend un envoi réservé par `verifierLimite` : pour les limites qui ne
 * comptent que les échecs (réserver avant l'opération, rembourser au succès).
 * Sans effet si la fenêtre n'existe pas ; le compteur ne descend pas sous 0.
 */
export function rendreLimite(cle: string): void {
  const fenetre = fenetres.get(cle);
  if (fenetre) fenetre.envois = Math.max(0, fenetre.envois - 1);
}

function secondesRestantes(fenetre: Fenetre, maintenant: number): number {
  return Math.ceil((fenetre.dureeMs - (maintenant - fenetre.debut)) / 1000);
}

/**
 * Évite que la table grossisse indéfiniment sur un serveur au long cours.
 * Chaque fenêtre n'est purgée qu'à sa propre échéance : les limites ont des
 * durées différentes (une heure pour le contact, un quart d'heure pour la
 * connexion) et ne doivent pas se purger les unes les autres.
 */
function purger(maintenant: number): void {
  for (const [cle, fenetre] of fenetres) {
    if (maintenant - fenetre.debut >= fenetre.dureeMs) {
      fenetres.delete(cle);
    }
  }
}

/** Réservé aux tests : remet le compteur à zéro. */
export function reinitialiserLimites(): void {
  fenetres.clear();
}
