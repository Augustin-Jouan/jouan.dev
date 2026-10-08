/**
 * Limitation de débit en mémoire, dimensionnée pour ce site : une seule
 * instance, quelques envois par jour. Elle protège la boîte mail du client et
 * son compte SMTP d'un bot qui aurait passé le honeypot — pas d'une attaque
 * distribuée, qui relève de l'hébergeur.
 *
 * Le compteur repart de zéro à chaque redémarrage du serveur : c'est
 * acceptable ici, et cela évite d'ajouter une dépendance de stockage.
 */

type Fenetre = { debut: number; envois: number };

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
  purger(maintenant, dureeMs);

  const fenetre = fenetres.get(cle);

  if (!fenetre || maintenant - fenetre.debut >= dureeMs) {
    fenetres.set(cle, { debut: maintenant, envois: 1 });
    return { autorise: true, secondesAvantReessai: 0 };
  }

  if (fenetre.envois >= max) {
    const reste = dureeMs - (maintenant - fenetre.debut);
    return {
      autorise: false,
      secondesAvantReessai: Math.ceil(reste / 1000),
    };
  }

  fenetre.envois += 1;
  return { autorise: true, secondesAvantReessai: 0 };
}

/** Évite que la table grossisse indéfiniment sur un serveur au long cours. */
function purger(maintenant: number, dureeMs: number): void {
  for (const [cle, fenetre] of fenetres) {
    if (maintenant - fenetre.debut >= dureeMs) {
      fenetres.delete(cle);
    }
  }
}

/** Réservé aux tests : remet le compteur à zéro. */
export function reinitialiserLimites(): void {
  fenetres.clear();
}
