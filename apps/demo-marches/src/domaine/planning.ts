const JOUR = 86_400_000;
const LIBELLE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

const versDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const versIso = (date: Date) => date.toISOString().slice(0, 10);

/** Lundi de la semaine d'une date ISO (AAAA-MM-JJ), calcul en UTC. */
export function lundiDe(iso: string): string {
  const date = versDate(iso);
  const decalage = (date.getUTCDay() + 6) % 7; // lundi → 0
  return versIso(new Date(date.getTime() - decalage * JOUR));
}

export type Semaine = { index: number; lundi: string; libelle: string };

export function semainesEntre(debutIso: string, finIso: string): Semaine[] {
  const premier = versDate(lundiDe(debutIso)).getTime();
  const dernier = versDate(lundiDe(finIso)).getTime();
  const semaines: Semaine[] = [];
  for (let t = premier, index = 0; t <= dernier; t += 7 * JOUR, index += 1) {
    const lundi = new Date(t);
    semaines.push({ index, lundi: versIso(lundi), libelle: LIBELLE.format(lundi) });
  }
  return semaines;
}

/** Position d'une barre dans la grille des semaines qui commence au lundi `origineIso`. */
export function placerBarre(debutIso: string, finIso: string, origineIso: string) {
  const origine = versDate(lundiDe(origineIso)).getTime();
  const colonne = Math.round((versDate(lundiDe(debutIso)).getTime() - origine) / (7 * JOUR));
  const derniere = Math.round((versDate(lundiDe(finIso)).getTime() - origine) / (7 * JOUR));
  return { colonne, duree: derniere - colonne + 1 };
}
