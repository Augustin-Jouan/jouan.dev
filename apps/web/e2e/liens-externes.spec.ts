import { expect, test } from "@playwright/test";

const PAGES = ["/", "/realisations", "/coulisses", "/contact", "/mentions-legales", "/politique-de-confidentialite"];

for (const chemin of PAGES) {
  test(`${chemin} : les liens vers un autre site s'ouvrent dans un nouvel onglet`, async ({ page, baseURL }) => {
    await page.goto(chemin);
    const origine = new URL(baseURL!).origin;
    const liens = await page.locator("a[href^='http']").evaluateAll((as) =>
      as.map((a) => ({ href: (a as HTMLAnchorElement).href, target: a.getAttribute("target"), rel: a.getAttribute("rel") ?? "" })),
    );
    const externes = liens.filter((l) => new URL(l.href).origin !== origine);
    for (const lien of externes) {
      expect(lien, lien.href).toMatchObject({ target: "_blank", rel: expect.stringMatching(/\bnoopener\b/) });
    }
  });
}

test("un lien externe ouvre un nouvel onglet et laisse le site affiché", async ({ page, context }) => {
  // Intro déjà vue : ni WebGL ni retour en haut pendant le clic, qui ne porte que sur le lien.
  await page.addInitScript(() => sessionStorage.setItem("jouan.dev:intro-vue", "1"));
  await page.goto("/");
  // Le nouvel onglet est fermé aussitôt : le test ne dépend pas du site visé.
  context.on("page", (onglet) => void onglet.close());
  const ouverture = context.waitForEvent("page");
  await page.getByRole("contentinfo").getByRole("link", { name: /GitHub/ }).click();
  await ouverture;
  await expect(page).toHaveURL(/\/$/);
});
