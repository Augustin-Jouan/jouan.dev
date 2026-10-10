/** Minuscules, sans accents : « Étude » et « etude » se valent. */
export function normaliser(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Filtre de la palette : chaque mot de la saisie doit apparaître dans le libellé
 * ou les mots-clés. Les libellés qui commencent par la saisie passent en tête,
 * puis l'ordre d'origine. Saisie vide : tout.
 */
export function filtrerCommandes<T extends { libelle: string; motsCles: string[] }>(commandes: T[], saisie: string): T[] {
  const recherche = normaliser(saisie).trim();
  const mots = recherche.split(/\s+/).filter(Boolean);
  if (mots.length === 0) return commandes;
  const retenues = commandes.filter((commande) => {
    const texte = normaliser([commande.libelle, ...commande.motsCles].join(" "));
    return mots.every((mot) => texte.includes(mot));
  });
  const enTete = (commande: T) => normaliser(commande.libelle).startsWith(recherche);
  return [...retenues.filter(enTete), ...retenues.filter((commande) => !enTete(commande))];
}
