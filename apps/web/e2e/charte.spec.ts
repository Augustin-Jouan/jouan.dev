import { expect, test } from "@playwright/test";
import sharp from "sharp";

test("navigateur, icône et vignette aux couleurs de la nuit", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#2a2127");
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "dark");

  expect(await (await request.get("/icon.svg")).text()).toContain("#eab595");

  // Vignette Open Graph : le coin bas gauche (marge, loin du halo et du texte) est nuit.
  const adresse = new URL((await page.locator('meta[property="og:image"]').getAttribute("content"))!);
  const image = await request.get(adresse.pathname + adresse.search);
  expect(image.headers()["content-type"]).toContain("image/png");
  const pixel = await sharp(Buffer.from(await image.body()))
    .extract({ left: 4, top: 620, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer();
  const [r, v, b] = [...pixel];
  for (const [mesure, attendu] of [[r, 42], [v, 33], [b, 39]] as const) {
    expect(Math.abs(mesure! - attendu)).toBeLessThanOrEqual(2);
  }
});
