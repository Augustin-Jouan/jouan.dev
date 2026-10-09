// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const trouverLienActif = vi.hoisted(() => vi.fn());
vi.mock("./depot", () => ({ trouverLienActif }));
import { lienPourAffichage } from "./affichage";

describe("lienPourAffichage", () => {
  afterEach(() => {
    trouverLienActif.mockReset();
    delete process.env.DATABASE_URL;
  });

  it("renvoie le lien actif", async () => {
    process.env.DATABASE_URL = "postgresql://x";
    trouverLienActif.mockResolvedValue({ nom: "Boulangerie Martin", angle: "vitrine" });
    expect(await lienPourAffichage("boulangerie-martin-k7f3")).toEqual({ nom: "Boulangerie Martin", angle: "vitrine" });
  });
  it("n'interroge pas la base pour un jeton mal formé", async () => {
    process.env.DATABASE_URL = "postgresql://x";
    expect(await lienPourAffichage("Boulangerie Martin")).toBeNull();
    expect(trouverLienActif).not.toHaveBeenCalled();
  });
  it("renvoie null sans base configurée", async () => {
    expect(await lienPourAffichage("boulangerie-martin-k7f3")).toBeNull();
    expect(trouverLienActif).not.toHaveBeenCalled();
  });
  it("renvoie null si la base est indisponible, sans lever", async () => {
    process.env.DATABASE_URL = "postgresql://x";
    vi.spyOn(console, "error").mockImplementation(() => {});
    trouverLienActif.mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await lienPourAffichage("boulangerie-martin-k7f3")).toBeNull();
  });
});
