import type { Page } from "@playwright/test";

/**
 * Les navigateurs de test dessinent WebGL au processeur (SwiftShader, sans
 * carte graphique) : le moteur de l'encre reconnaît ce rendu logiciel et garde
 * le halo CSS. Pour tester l'intro elle-même, on fait passer le moteur de rendu
 * pour une carte graphique.
 */
export async function simulerGpu(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const RENDERER = 0x1f01;
    const UNMASKED_RENDERER_WEBGL = 0x9246;
    const original = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (this: WebGL2RenderingContext, nom: number) {
      if (nom === RENDERER || nom === UNMASKED_RENDERER_WEBGL) return "GPU simulé (tests)";
      return original.call(this, nom);
    };
  });
}

/** Collecte les erreurs de console et les exceptions de la page. */
export function surveillerErreurs(page: Page): string[] {
  const erreurs: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") erreurs.push(message.text());
  });
  page.on("pageerror", (erreur) => erreurs.push(erreur.message));
  return erreurs;
}
