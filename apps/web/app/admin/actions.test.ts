// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const exigerSession = vi.hoisted(() => vi.fn());
const depot = vi.hoisted(() => ({
  creerLien: vi.fn(),
  changerEtat: vi.fn(),
  supprimerLien: vi.fn(),
}));
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("@/lib/admin/acces", () => ({ exigerSession }));
vi.mock("@/lib/liens/depot", () => depot);
vi.mock("next/cache", () => ({ revalidatePath }));
import { changerEtatAction, creerLienAction, supprimerLienAction } from "./actions";

const formulaire = (champs: Record<string, string>) => {
  const f = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) f.set(cle, valeur);
  return f;
};

describe("actions de l'administration", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://x";
  });
  afterEach(() => {
    delete process.env.DATABASE_URL;
    vi.resetAllMocks();
  });

  it("exige la session avant toute chose", async () => {
    exigerSession.mockRejectedValue(new Error("REDIRECT /admin/connexion"));
    await expect(creerLienAction({}, formulaire({ nom: "X", angle: "vitrine" }))).rejects.toThrow("REDIRECT");
    await expect(changerEtatAction(formulaire({ id: "1", actif: "false" }))).rejects.toThrow("REDIRECT");
    await expect(supprimerLienAction(formulaire({ id: "1" }))).rejects.toThrow("REDIRECT");
    expect(depot.creerLien).not.toHaveBeenCalled();
    expect(depot.changerEtat).not.toHaveBeenCalled();
    expect(depot.supprimerLien).not.toHaveBeenCalled();
  });

  it("crée un lien et renvoie son adresse", async () => {
    depot.creerLien.mockResolvedValue({ jeton: "boulangerie-martin-k7f3" });
    const etat = await creerLienAction({}, formulaire({ nom: "  Boulangerie Martin ", angle: "vitrine" }));
    expect(depot.creerLien).toHaveBeenCalledWith("Boulangerie Martin", "vitrine");
    expect(etat.lien?.nom).toBe("Boulangerie Martin");
    expect(etat.lien?.url).toMatch(/\/\?pour=boulangerie-martin-k7f3$/);
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it.each([
    [{ nom: "   ", angle: "vitrine" }, "Indiquez le nom du prospect."],
    [{ nom: "a".repeat(61), angle: "vitrine" }, "Le nom ne doit pas dépasser 60 caractères."],
    [{ nom: "X", angle: "autre" }, "Choisissez un angle."],
    [{ nom: "X", angle: "toString" }, "Choisissez un angle."],
    [{ nom: "X" }, "Choisissez un angle."],
  ])("refuse %o", async (champs, erreur) => {
    expect(await creerLienAction({}, formulaire(champs))).toEqual({ erreur });
    expect(depot.creerLien).not.toHaveBeenCalled();
  });

  it("signale une base indisponible", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    depot.creerLien.mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await creerLienAction({}, formulaire({ nom: "X", angle: "vitrine" }))).toEqual({
      erreur: "Base de données indisponible.",
    });
  });

  it("désactive, réactive et supprime", async () => {
    await changerEtatAction(formulaire({ id: "l1", actif: "false" }));
    await changerEtatAction(formulaire({ id: "l1", actif: "true" }));
    await supprimerLienAction(formulaire({ id: "l1" }));
    expect(depot.changerEtat.mock.calls).toEqual([["l1", false], ["l1", true]]);
    expect(depot.supprimerLien).toHaveBeenCalledWith("l1");
    expect(revalidatePath).toHaveBeenCalledTimes(3);
  });

  it("ignore un formulaire forgé sans toucher à la base", async () => {
    await changerEtatAction(formulaire({ actif: "true" }));
    await changerEtatAction(formulaire({ id: "", actif: "true" }));
    await changerEtatAction(formulaire({ id: "l1", actif: "peut-être" }));
    await changerEtatAction(formulaire({ id: "x".repeat(200), actif: "true" }));
    await supprimerLienAction(formulaire({}));
    await supprimerLienAction(formulaire({ id: "" }));
    expect(depot.changerEtat).not.toHaveBeenCalled();
    expect(depot.supprimerLien).not.toHaveBeenCalled();
  });

  it("absorbe un lien déjà supprimé (P2025) et revalide la page", async () => {
    const absent = Object.assign(new Error("not found"), { code: "P2025" });
    depot.changerEtat.mockRejectedValue(absent);
    depot.supprimerLien.mockRejectedValue(absent);
    await expect(changerEtatAction(formulaire({ id: "l1", actif: "true" }))).resolves.toBeUndefined();
    await expect(supprimerLienAction(formulaire({ id: "l1" }))).resolves.toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledTimes(2);
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("laisse remonter une autre erreur de base", async () => {
    depot.supprimerLien.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(supprimerLienAction(formulaire({ id: "l1" }))).rejects.toThrow("ECONNREFUSED");
  });
});
