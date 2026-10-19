import { describe, it, expect } from "vitest";
import sitemap from "./sitemap";
import { siteUrl } from "@/data/site";

describe("sitemap", () => {
  it("inclut l'accueil, le contact, les réalisations, les coulisses et la politique de confidentialité", () => {
    const urls = sitemap().map((entree) => entree.url);
    expect(urls).toContain(`${siteUrl}`);
    expect(urls).toContain(`${siteUrl}/contact`);
    expect(urls).toContain(`${siteUrl}/realisations`);
    expect(urls).not.toContain(`${siteUrl}/realisations/suivi-de-marches`);
    expect(urls).not.toContain(`${siteUrl}/realisations/site-artisan`);
    // Non indexées : téléphone et SIREN hors des résultats de recherche.
    expect(urls).not.toContain(`${siteUrl}/mentions-legales`);
    expect(urls).toContain(`${siteUrl}/politique-de-confidentialite`);
    expect(urls).toContain(`${siteUrl}/coulisses`);
    expect(urls).toContain(`${siteUrl}/a-propos`);
  });

  it("la page À propos a la priorité 0,8", () => {
    expect(sitemap().find((e) => e.url === `${siteUrl}/a-propos`)?.priority).toBe(0.8);
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
