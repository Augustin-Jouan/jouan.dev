import type { Page } from "@playwright/test";

/** Collecte les erreurs de console et les exceptions de la page. */
export function surveillerErreurs(page: Page): string[] {
  const erreurs: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") erreurs.push(message.text());
  });
  page.on("pageerror", (erreur) => erreurs.push(erreur.message));
  return erreurs;
}
