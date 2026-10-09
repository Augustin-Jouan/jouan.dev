import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const exigerSession = vi.hoisted(() => vi.fn());
const listerLiens = vi.hoisted(() => vi.fn());
vi.mock("@/lib/admin/acces", () => ({ exigerSession }));
vi.mock("@/lib/liens/depot", () => ({ listerLiens }));
vi.mock("./actions", () => ({ changerEtatAction: vi.fn(), creerLienAction: vi.fn(), supprimerLienAction: vi.fn() }));
vi.mock("./connexion/actions", () => ({ seDeconnecter: vi.fn() }));
import PageAdmin from "./page";

describe("page d'administration", () => {
  afterEach(() => {
    delete process.env.DATABASE_URL;
    vi.resetAllMocks();
  });

  it("vérifie la session", async () => {
    exigerSession.mockRejectedValue(new Error("REDIRECT /admin/connexion"));
    await expect(PageAdmin()).rejects.toThrow("REDIRECT");
    expect(listerLiens).not.toHaveBeenCalled();
  });

  it("affiche le bandeau sans base", async () => {
    render(await PageAdmin());
    expect(screen.getByRole("alert")).toHaveTextContent("Base de données indisponible.");
  });

  it("liste les liens avec leurs visites et actions", async () => {
    process.env.DATABASE_URL = "postgresql://x";
    listerLiens.mockResolvedValue([
      {
        id: "l1",
        jeton: "boulangerie-martin-k7f3",
        nom: "Boulangerie Martin",
        angle: "vitrine",
        actif: true,
        creeLe: new Date(),
        visites: [{ le: new Date(), appareil: "mobile", numero: 1, mailEnvoye: false }],
      },
    ]);
    render(await PageAdmin());
    expect(screen.getByRole("heading", { level: 2, name: "Boulangerie Martin" })).toBeInTheDocument();
    expect(screen.getByText(/Site vitrine · actif · 1 visite/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Aperçu/ })).toHaveAttribute(
      "href",
      "/?pour=boulangerie-martin-k7f3&apercu=1",
    );
    expect(screen.getByRole("button", { name: "Désactiver" })).toBeInTheDocument();
    expect(screen.getByText(/mail non envoyé/)).toBeInTheDocument();
  });

  it("garde un nom très long dans la mise en page", async () => {
    process.env.DATABASE_URL = "postgresql://x";
    listerLiens.mockResolvedValue([
      {
        id: "l2",
        jeton: "x",
        nom: "A".repeat(60),
        angle: "application",
        actif: false,
        creeLe: new Date(),
        visites: [],
      },
    ]);
    render(await PageAdmin());
    expect(screen.getByRole("heading", { level: 2, name: "A".repeat(60) })).toHaveClass("break-words");
    expect(screen.getByRole("button", { name: "Réactiver" })).toBeInTheDocument();
    expect(screen.getByText(/aucune visite/)).toBeInTheDocument();
  });
});
