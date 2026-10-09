// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const URL_TEST = process.env.DATABASE_URL_TEST;

describe.skipIf(!URL_TEST)("dépôt des liens (Postgres)", () => {
  let depot: typeof import("./depot");
  let base: typeof import("@/lib/base/client").base;

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST;
    depot = await import("./depot");
    ({ base } = await import("@/lib/base/client"));
  });

  beforeEach(async () => {
    await base().visite.deleteMany();
    await base().lien.deleteMany();
  });

  const t0 = new Date("2026-10-09T12:00:00Z");
  const plus = (minutes: number) => new Date(t0.getTime() + minutes * 60 * 1000);

  it("crée un lien actif retrouvable par son jeton", async () => {
    const { jeton } = await depot.creerLien("Boulangerie Martin", "vitrine");
    expect(jeton).toMatch(/^boulangerie-martin-[a-z0-9]{4}$/);
    expect(await depot.trouverLienActif(jeton)).toEqual({ nom: "Boulangerie Martin", angle: "vitrine" });
  });

  it("ne retrouve ni un jeton inconnu ni un lien désactivé", async () => {
    const { jeton } = await depot.creerLien("Garage Durand", "application");
    const [lien] = await depot.listerLiens();
    await depot.changerEtat(lien.id, false);
    expect(await depot.trouverLienActif(jeton)).toBeNull();
    expect(await depot.trouverLienActif("inconnu-0000")).toBeNull();
  });

  it("numérote les visites et applique la règle des 30 minutes", async () => {
    const { jeton } = await depot.creerLien("Boulangerie Martin", "application");
    const v1 = await depot.enregistrerVisite(jeton, "mobile", t0);
    expect(v1).toMatchObject({ nom: "Boulangerie Martin", numero: 1, precedente: null });
    expect(await depot.enregistrerVisite(jeton, "mobile", plus(10))).toBeNull();
    const v2 = await depot.enregistrerVisite(jeton, "ordinateur", plus(31));
    expect(v2).toMatchObject({ numero: 2, precedente: t0 });
  });

  it("n'enregistre qu'une visite pour des signaux simultanés", async () => {
    const { jeton } = await depot.creerLien("Boulangerie Martin", "application");
    const resultats = await Promise.all([1, 2, 3].map(() => depot.enregistrerVisite(jeton, "mobile", t0)));
    expect(resultats.filter(Boolean)).toHaveLength(1);
    const [lien] = await depot.listerLiens();
    expect(lien.visites).toHaveLength(1);
  });

  it("compte toutes les visites alors que la liste est limitée à 50", async () => {
    const { jeton } = await depot.creerLien("Boulangerie Martin", "application");
    for (let i = 0; i < 51; i++) await depot.enregistrerVisite(jeton, "mobile", plus(i * 31));
    const [lien] = await depot.listerLiens();
    expect(lien.nombreVisites).toBe(51);
    expect(lien.visites).toHaveLength(50);
  });

  it("ignore les visites d'un lien désactivé", async () => {
    const { jeton } = await depot.creerLien("Boulangerie Martin", "application");
    const [lien] = await depot.listerLiens();
    await depot.changerEtat(lien.id, false);
    expect(await depot.enregistrerVisite(jeton, "mobile", t0)).toBeNull();
  });

  it("marque le mail, purge les vieilles visites et supprime en cascade", async () => {
    const { jeton } = await depot.creerLien("Boulangerie Martin", "application");
    const v1 = await depot.enregistrerVisite(jeton, "mobile", t0);
    await depot.marquerMailEnvoye(v1!.id);
    let [lien] = await depot.listerLiens();
    expect(lien.visites[0]).toMatchObject({ numero: 1, mailEnvoye: true, appareil: "mobile" });
    expect(await depot.purgerVisites(plus(1))).toBe(1);
    await depot.enregistrerVisite(jeton, "mobile", plus(60));
    [lien] = await depot.listerLiens();
    await depot.supprimerLien(lien.id);
    expect(await depot.listerLiens()).toEqual([]);
    expect(await base().visite.count()).toBe(0);
  });
});
