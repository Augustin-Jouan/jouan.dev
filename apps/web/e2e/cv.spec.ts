import { expect, test } from "@playwright/test";

const NAVIGATEUR = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// Requêtes HTTP seules : un projet suffit.
test.skip(({ isMobile }) => isMobile, "Requêtes HTTP sans navigateur : ordinateur seulement.");

test("curl sur / reçoit le CV coloré, qui varie selon le User-Agent", async ({ request }) => {
  const reponse = await request.get("/", { headers: { "User-Agent": "curl/8.5.0" } });
  expect(reponse.status()).toBe(200);
  expect(reponse.headers()["content-type"]).toBe("text/plain; charset=utf-8");
  expect(reponse.headers()["vary"]).toMatch(/User-Agent/i);
  const texte = await reponse.text();
  expect(texte).toContain("Augustin Jouan");
  expect(texte).toContain("\x1b[38;5;180m");
});

test("curl sur un lien personnalisé reçoit aussi le CV", async ({ request }) => {
  const reponse = await request.get("/?pour=exemple-0000", { headers: { "User-Agent": "Wget/1.21.4" } });
  expect(reponse.headers()["content-type"]).toBe("text/plain; charset=utf-8");
});

test("un navigateur, un robot ou un User-Agent qui cite curl reçoivent la page", async ({ request }) => {
  for (const userAgent of [NAVIGATEUR, "Mozilla/5.0 (compatible; Googlebot/2.1)", "Mozilla/5.0 (compatible; curl)"]) {
    const reponse = await request.get("/", { headers: { "User-Agent": userAgent } });
    expect(reponse.headers()["content-type"], userAgent).toContain("text/html");
  }
});

test("/cv.txt : le même CV, sans aucune séquence de couleur", async ({ request }) => {
  const reponse = await request.get("/cv.txt");
  expect(reponse.headers()["content-type"]).toBe("text/plain; charset=utf-8");
  const texte = await reponse.text();
  expect(texte).toContain("Augustin Jouan");
  expect(texte).not.toContain("\x1b");
});

test("/api/me : JSON Resume valide, lisible depuis d'autres sites", async ({ request }) => {
  const reponse = await request.get("/api/me");
  expect(reponse.headers()["content-type"]).toBe("application/json; charset=utf-8");
  expect(reponse.headers()["access-control-allow-origin"]).toBe("*");
  const cv = await reponse.json();
  expect(cv.basics.name).toBe("Augustin Jouan");
  expect(cv.meta.canonical).toMatch(/\/api\/me$/);
});

test("la source de la page cache les indices dans un commentaire", async ({ request }) => {
  const html = await (await request.get("/", { headers: { "User-Agent": NAVIGATEUR } })).text();
  expect(html).toMatch(/<!--\nBonjour, curieux ![\s\S]*curl -L [\s\S]*\/api\/me[\s\S]*⌘K ou Ctrl\+K[\s\S]*-->/);
});
