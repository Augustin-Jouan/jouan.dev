/** Les trois indices des easter eggs : console du navigateur et source HTML. */
export function indices(hote: string): string[] {
  return [
    `${`curl -L ${hote}`.padEnd(24)}le CV dans le terminal`,
    `${`${hote}/api/me`.padEnd(24)}le CV en JSON (JSON Resume)`,
    `${"⌘K ou Ctrl+K".padEnd(24)}la palette de commandes`,
  ];
}

/** Texte complet, pour la console et le commentaire en tête de la page. */
export function texteIndices(hote: string): string {
  return ["Bonjour, curieux ! Ce site a quelques portes dérobées :", ...indices(hote).map((ligne) => `  ${ligne}`)].join("\n");
}
