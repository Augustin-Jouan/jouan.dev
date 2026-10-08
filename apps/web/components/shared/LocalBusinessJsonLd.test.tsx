import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LocalBusinessJsonLd } from "./LocalBusinessJsonLd";
import { contact } from "@/data/contact";
import { siteName, siteUrl } from "@/data/site";

function lireJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  return JSON.parse(script?.textContent ?? "{}");
}

describe("LocalBusinessJsonLd", () => {
  it("décrit un LocalBusiness par défaut, avec l'adresse structurée", () => {
    const { container } = render(<LocalBusinessJsonLd />);
    const jsonLd = lireJsonLd(container);
    expect(jsonLd["@type"]).toBe("LocalBusiness");
    expect(jsonLd.name).toBe(siteName);
    expect(jsonLd.url).toBe(siteUrl);
    expect(jsonLd.image).toBe(`${siteUrl}/opengraph-image`);
    expect(jsonLd.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: contact.adressePostale.rue,
      postalCode: contact.adressePostale.codePostal,
      addressLocality: contact.adressePostale.ville,
      addressRegion: contact.adressePostale.region,
      addressCountry: "FR",
    });
  });

  it("accepte un type schema.org plus précis", () => {
    const { container } = render(<LocalBusinessJsonLd type="Restaurant" />);
    expect(lireJsonLd(container)["@type"]).toBe("Restaurant");
  });

  it("n'émet ni sameAs ni geo tant qu'ils ne sont pas renseignés", () => {
    const { container } = render(<LocalBusinessJsonLd />);
    expect(lireJsonLd(container)).not.toHaveProperty("sameAs");
    expect(lireJsonLd(container)).not.toHaveProperty("geo");
  });
});
