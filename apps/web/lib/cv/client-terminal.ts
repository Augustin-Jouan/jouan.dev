/**
 * Client en ligne de commande (`curl`, `wget`, HTTPie, `xh`) : la valeur de son
 * User-Agent commence par le nom de l'outil (`curl/8.5.0`). Même motif que le
 * `matcher` de proxy.ts, où il doit être recopié tel quel (Next n'y accepte que
 * des valeurs littérales) ; Next l'y ancre (`^…$`), sensible à la casse.
 */
export const MOTIF_CLIENT_TERMINAL = "(curl|Wget|HTTPie|xh)/.*";

const MOTIF = new RegExp(`^${MOTIF_CLIENT_TERMINAL}$`);

export function estClientTerminal(userAgent: string | null | undefined): boolean {
  return MOTIF.test(userAgent ?? "");
}
