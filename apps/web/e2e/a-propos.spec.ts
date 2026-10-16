import { expect, test } from "@playwright/test";

test("téléphone de 360 px : avec « À propos », le menu du haut tient sur une ligne sans déborder", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Largeur de téléphone seulement.");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/a-propos");
  const menu = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(menu.getByRole("link", { name: "À propos" })).toBeVisible();
  const { hauts, deborde } = await menu.locator("ul").evaluate((ul) => ({
    hauts: [...ul.children].map((li) => (li as HTMLElement).offsetTop),
    deborde: ul.scrollWidth > ul.clientWidth || document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  expect(new Set(hauts).size).toBe(1);
  expect(deborde).toBe(false);
});
