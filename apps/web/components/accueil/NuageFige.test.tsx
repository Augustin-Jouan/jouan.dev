import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NuageFige } from "./NuageFige";
import { COULEURS_NUAGE } from "@/lib/encre/nuage";

describe("NuageFige", () => {
  it("dessine le nuage au repos en SVG décoratif, en quelques chemins", () => {
    const { container } = render(<NuageFige />);
    const svg = container.querySelector("svg.nuage-fige")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox", "-200 -200 400 400");
    const chemins = svg.querySelectorAll("path");
    expect(chemins.length).toBeGreaterThan(0);
    expect(chemins.length).toBeLessThanOrEqual(16);
    for (const chemin of chemins) expect(COULEURS_NUAGE).toContain(chemin.getAttribute("stroke"));
  });
});
