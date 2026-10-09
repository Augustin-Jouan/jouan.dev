import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const lienPourAffichage = vi.hoisted(() => vi.fn());
vi.mock("@/lib/liens/affichage", () => ({ lienPourAffichage }));
vi.mock("@/components/accueil/SignalVisite", () => ({
  SignalVisite: ({ jeton }: { jeton: string }) => <div data-testid="signal">{jeton}</div>,
}));
import PagePersonnalisee, { metadata } from "./page";

const ouvrir = (jeton: string, apercu?: string) =>
  PagePersonnalisee({ params: Promise.resolve({ jeton }), searchParams: Promise.resolve({ apercu }) });

describe("page personnalisée", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    lienPourAffichage.mockReset();
  });

  it("salue le prospect et signale la visite", async () => {
    lienPourAffichage.mockResolvedValue({ nom: "Boulangerie Martin", angle: "vitrine" });
    render(await ouvrir("boulangerie-martin-k7f3"));
    expect(screen.getByText("Bonjour Boulangerie Martin,")).toBeInTheDocument();
    expect(screen.getByTestId("signal")).toHaveTextContent("boulangerie-martin-k7f3");
  });
  it("n'envoie rien en aperçu", async () => {
    lienPourAffichage.mockResolvedValue({ nom: "Boulangerie Martin", angle: "vitrine" });
    render(await ouvrir("boulangerie-martin-k7f3", "1"));
    expect(screen.queryByTestId("signal")).toBeNull();
  });
  it("affiche l'accueil normal pour un lien inconnu", async () => {
    lienPourAffichage.mockResolvedValue(null);
    render(await ouvrir("inconnu-0000"));
    expect(screen.queryByText(/^Bonjour/)).toBeNull();
    expect(screen.queryByTestId("signal")).toBeNull();
  });
  it("n'est pas indexée et renvoie vers l'accueil", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates?.canonical).toBe("/");
  });
});
