import { describe, it, expect } from "vitest";
import sitemap from "./sitemap";
import { siteUrl } from "@/data/site";

describe("sitemap", () => {
  it("inclut l'accueil, le contact, les études de cas et les pages légales", () => {
    const urls = sitemap().map((entree) => entree.url);
    expect(urls).toContain(`${siteUrl}`);
    expect(urls).toContain(`${siteUrl}/contact`);
    expect(urls).toContain(`${siteUrl}/realisations`);
    expect(urls).not.toContain(`${siteUrl}/realisations/suivi-de-marches`);
    expect(urls).not.toContain(`${siteUrl}/realisations/site-artisan`);
    expect(urls).toContain(`${siteUrl}/mentions-legales`);
    expect(urls).toContain(`${siteUrl}/politique-de-confidentialite`);
    expect(urls).toContain(`${siteUrl}/coulisses`);
  });

  it("les coulisses ont la priorité 0,5", () => {
    const entree = sitemap().find((e) => e.url === `${siteUrl}/coulisses`);
    expect(entree?.priority).toBe(0.5);
  });

  it("ne déclare aucune URL en double", () => {
    const urls = sitemap().map((entree) => entree.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
