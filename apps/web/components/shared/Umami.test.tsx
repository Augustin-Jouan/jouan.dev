import { render } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { Umami } from "./Umami";

// next/script injecte le <script> dans le <head> hors de l'arbre React :
// on le remplace par un <script> inerte pour pouvoir lire ses attributs.
vi.mock("next/script", () => ({
  default: (props: Record<string, string>) => <script {...props} />,
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Umami", () => {
  it("ne rend rien sans identifiant de site (dev, tests)", () => {
    vi.stubEnv("UMAMI_WEBSITE_ID", "");
    const { container } = render(<Umami />);
    expect(container.querySelector("script")).toBeNull();
  });

  it("charge le script Umami Cloud avec l'identifiant du site", () => {
    vi.stubEnv("UMAMI_WEBSITE_ID", "abc-123");
    const { container } = render(<Umami />);
    const script = container.querySelector("script");
    expect(script).toHaveAttribute("src", "https://cloud.umami.is/script.js");
    expect(script).toHaveAttribute("data-website-id", "abc-123");
  });
});
