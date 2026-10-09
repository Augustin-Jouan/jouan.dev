/**
 * Limitation de débit en mémoire, dimensionnée pour ce site : une seule
 * instance, quelques envois par jour. Elle protège la boîte mail du client et
 * son compte SMTP d'un bot qui aurait passé le honeypot — pas d'une attaque
 * distribuée, qui relève de l'hébergeur.
 *
 * Chaque limite a sa propre table (`nom`), plafonnée et purgée séparément :
 * un afflux de clés sur l'une (jetons aléatoires des signaux de visite) ne
 * peut pas priver les autres (contact, connexion) de leurs nouvelles clés.
 *
 * Le compteur repart de zéro à chaque redémarrage du serveur : c'est
 * acceptable ici, et cela évite d'ajouter une dépendance de stockage.
 */

// La durée d'une fenêtre est fixée par l'appel qui la crée : une même clé doit toujours
// être utilisée avec les mêmes options.
type Fenetre = { debut: number; envois: number; dureeMs: number };
type Table = { fenetres: Map<string, Fenetre>; dernierePurge: number };

const tables = new Map<string, Table>();
let purgeReguliere: ReturnType<typeof setInterval> | null = null;

// Les jetons aléatoires au bon format créent chacun une entrée : on borne chaque table,
// et on ne la parcourt pas à chaque appel.
const CLES_MAX = 10_000;
const PURGE_ESPACEMENT_MS = 60 * 1000;

export type LimiteOptions = {
  /** Nom de la limite : chaque nom a sa propre table (« contact », « connexion-admin »…). */
  nom: string;
  /** Nombre d'envois autorisés par fenêtre. */
  max: number;
  /** Durée de la fenêtre, en millisecondes. */
  dureeMs: number;
};

export function verifierLimite(
  cle: string,
  { nom, max, dureeMs }: LimiteOptions,
  maintenant: number = Date.now()
): { autorise: boolean; secondesAvantReessai: number } {
  const table = tableDe(nom);
  const fenetres = table.fenetres;
  purger(table, maintenant);

  let fenetre = fenetres.get(cle);
  // La purge est espacée : une fenêtre échue peut encore être là, on la traite comme absente.
  if (fenetre && maintenant - fenetre.debut >= fenetre.dureeMs) {
    fenetres.delete(cle);
    fenetre = undefined;
  }

  if (!fenetre) {
    // Table pleine : une nouvelle clé est refusée, les clés existantes continuent.
    if (fenetres.size >= CLES_MAX) return { autorise: false, secondesAvantReessai: Math.ceil(dureeMs / 1000) };
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
export function rendreLimite(cle: string, { nom }: Pick<LimiteOptions, "nom">): void {
  const fenetre = tables.get(nom)?.fenetres.get(cle);
  if (fenetre) fenetre.envois = Math.max(0, fenetre.envois - 1);
}

function secondesRestantes(fenetre: Fenetre, maintenant: number): number {
  return Math.ceil((fenetre.dureeMs - (maintenant - fenetre.debut)) / 1000);
}

function tableDe(nom: string): Table {
  let table = tables.get(nom);
  if (!table) {
    table = { fenetres: new Map(), dernierePurge: 0 };
    tables.set(nom, table);
    lancerPurgeReguliere();
  }
  return table;
}

/**
 * Purge chaque minute, même sans nouvel appel : une adresse IP ne reste jamais
 * en mémoire plus d'une minute après la fin de sa fenêtre (politique de
 * confidentialité). La minuterie ne retient pas le processus.
 */
function lancerPurgeReguliere(): void {
  if (purgeReguliere) return;
  purgeReguliere = setInterval(() => {
    const maintenant = Date.now();
    for (const table of tables.values()) purger(table, maintenant);
  }, PURGE_ESPACEMENT_MS);
  purgeReguliere.unref?.();
}

/**
 * Évite que la table grossisse indéfiniment sur un serveur au long cours.
 * Chaque fenêtre n'est purgée qu'à sa propre échéance. Au plus une purge par
 * minute et par table.
 */
function purger(table: Table, maintenant: number): void {
  if (maintenant - table.dernierePurge < PURGE_ESPACEMENT_MS) return;
  table.dernierePurge = maintenant;
  for (const [cle, fenetre] of table.fenetres) {
    if (maintenant - fenetre.debut >= fenetre.dureeMs) {
      table.fenetres.delete(cle);
    }
  }
}

/** Réservé aux tests : remet les compteurs à zéro. */
export function reinitialiserLimites(): void {
  tables.clear();
  if (purgeReguliere) clearInterval(purgeReguliere);
  purgeReguliere = null;
}

/** Réservé aux tests : nombre de clés gardées en mémoire pour une limite. */
export function clesEnMemoire(nom: string): number {
  return tables.get(nom)?.fenetres.size ?? 0;
}
