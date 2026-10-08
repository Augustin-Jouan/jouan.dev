import { test, expect } from "@playwright/test";

const CLE = "jouan.dev:intro-vue";

test("première visite : l'intro se joue puis devient le halo", async ({ page }) => {
  await page.goto("/");
  const fond = page.locator(".fond-accueil");
  await expect(fond).toHaveAttribute("data-mode", "intro");
  await expect(fond).toHaveAttribute("data-encre", "actif");
  await expect(fond).toHaveAttribute("data-intro", "terminee", { timeout: 5000 });
  expect(await page.evaluate((cle) => localStorage.getItem(cle), CLE)).toBe("1");
});

test("un clic termine l'intro immédiatement", async ({ page }) => {
  await page.goto("/");
  const fond = page.locator(".fond-accueil");
  await expect(fond).toHaveAttribute("data-intro", "en-cours");
  await page.mouse.click(5, 5);
  await expect(fond).toHaveAttribute("data-intro", "terminee", { timeout: 500 });
});

// Review Focus 3 : le clavier n'est jamais piégé sous l'encre.
test("Tab termine l'intro et atteint le lien d'évitement", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Pas de clavier sur mobile.");
  await page.goto("/");
  const fond = page.locator(".fond-accueil");
  await expect(fond).toHaveAttribute("data-intro", "en-cours");
  await page.keyboard.press("Tab");
  await expect(fond).toHaveAttribute("data-intro", "terminee", { timeout: 500 });
  await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeFocused();
});

test("visite suivante : pas d'intro, halo animé", async ({ page }) => {
  await page.addInitScript((cle) => localStorage.setItem(cle, "1"), CLE);
  await page.goto("/");
  const fond = page.locator(".fond-accueil");
  await expect(fond).toHaveAttribute("data-mode", "halo-anime");
  await expect(fond).toHaveAttribute("data-encre", "actif");
  await expect(fond).not.toHaveAttribute("data-intro", /.+/);
});
