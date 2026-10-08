import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PersonJsonLd } from "./PersonJsonLd";
import { contact } from "@/data/contact";
import { siteName, siteUrl } from "@/data/site";

function lireJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  return JSON.parse(script?.textContent ?? "{}");
}

describe("PersonJsonLd", () => {
  it("décrit une personne, son métier et son profil GitHub", () => {
    const { container } = render(<PersonJsonLd />);
    const jsonLd = lireJsonLd(container);
    expect(jsonLd["@type"]).toBe("Person");
    expect(jsonLd.name).toBe(siteName);
    expect(jsonLd.url).toBe(siteUrl);
    expect(jsonLd.jobTitle).toMatch(/full stack/i);
    expect(jsonLd.sameAs).toEqual([contact.github]);
    expect(jsonLd.knowsAbout).toContain("Next.js");
  });

  it("ne publie ni adresse ni téléphone", () => {
    const jsonLd = lireJsonLd(render(<PersonJsonLd />).container);
    expect(jsonLd).not.toHaveProperty("address");
    expect(jsonLd).not.toHaveProperty("telephone");
  });
});
