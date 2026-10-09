/** Dates lisibles en français, heure de Paris (mails et administration). */

const relatif = new Intl.RelativeTimeFormat("fr", { numeric: "always" });
const dateHeure = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  dateStyle: "full",
  timeStyle: "short",
});

export function ilYA(passe: Date, maintenant: Date): string {
  const secondes = Math.max(0, Math.round((maintenant.getTime() - passe.getTime()) / 1000));
  if (secondes < 60) return "à l'instant";
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return relatif.format(-minutes, "minute");
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return relatif.format(-heures, "hour");
  return relatif.format(-Math.floor(heures / 24), "day");
}

export function dateHeureParis(date: Date): string {
  return dateHeure.format(date);
}
