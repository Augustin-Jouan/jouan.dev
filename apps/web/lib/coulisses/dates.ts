const relatif = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
const absolu = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });

export const formaterDateAbsolue = (iso: string) => absolu.format(new Date(iso));

const UNITES: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** « il y a 3 heures », « hier »… ; moins d'une minute : « à l'instant ». */
export function dateRelative(iso: string, maintenant: number): string {
  const secondes = Math.round((Date.parse(iso) - maintenant) / 1_000);
  for (const [unite, duree] of UNITES) {
    if (Math.abs(secondes) >= duree) return relatif.format(Math.round(secondes / duree), unite);
  }
  return "à l'instant";
}
