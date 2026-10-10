import { render } from "@testing-library/react";
import { gzipSync } from "node:zlib";
import { describe, it, expect } from "vitest";
import { NuageFige } from "./NuageFige";
import { COULEURS_NUAGE } from "@/lib/encre/nuage";

describe("NuageFige", () => {
  it("dessine le nuage au repos en SVG décoratif, en quelques chemins", () => {
    const { container } = render(<NuageFige />);
    const svg = container.querySelector("svg.nuage-fige")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox", "-400 -400 800 800");
    const chemins = svg.querySelectorAll("path");
    expect(chemins.length).toBeGreaterThan(0);
    expect(chemins.length).toBeLessThanOrEqual(16);
    for (const chemin of chemins) expect(COULEURS_NUAGE).toContain(chemin.getAttribute("stroke"));
  });

  // Relecture finale (I3) : le nuage figé est dans le HTML de l'accueil (et
  // dans la charge RSC) : environ 250 traits, 2,5 Ko compressés au plus.
  it("reste léger : environ 250 traits, en coordonnées entières, sous 2,5 Ko compressés", () => {
    const { container } = render(<NuageFige />);
    const balisage = container.innerHTML;
    const traits = balisage.match(/M/g)?.length ?? 0;
    expect(traits).toBeGreaterThan(180);
    expect(traits).toBeLessThan(300);
    expect(balisage).not.toMatch(/d="[^"]*\d\.\d/);
    expect(gzipSync(balisage).length).toBeLessThan(2.5 * 1024);
  });
});
