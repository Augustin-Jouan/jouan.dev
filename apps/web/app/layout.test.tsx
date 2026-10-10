import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { SCRIPT_VOILE } from "@/lib/encre/voile";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "police-inter" }),
  Instrument_Serif: () => ({ variable: "police-instrument" }),
}));

import RootLayout from "./layout";

describe("layout racine", () => {
  const html = RootLayout({ children: null }) as ReactElement<{ suppressHydrationWarning?: boolean; children: ReactElement[] }>;

  it("pose le script du voile en tête de page", () => {
    const tete = html.props.children.find((enfant) => enfant?.type === "head") as ReactElement<{ children: ReactElement<{ dangerouslySetInnerHTML: { __html: string } }> }>;
    expect(tete.props.children.props.dangerouslySetInnerHTML.__html).toBe(SCRIPT_VOILE);
  });

  // Le script ajoute data-voile-intro à <html> avant l'hydratation : React ne
  // doit pas y voir une erreur (attributs de <html> seulement, pas ses enfants).
  it("accepte sur <html> l'attribut posé par le script avant l'hydratation", () => {
    expect(html.type).toBe("html");
    expect(html.props.suppressHydrationWarning).toBe(true);
  });
});
