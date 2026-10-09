// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const depot = vi.hoisted(() => ({
  enregistrerVisite: vi.fn(),
  marquerMailEnvoye: vi.fn(),
  purgerVisites: vi.fn(),
}));
const envoyerMail = vi.hoisted(() => vi.fn());
vi.mock("./depot", () => depot);
vi.mock("@/lib/email", () => ({ envoyerMail }));
import { reinitialiserLimites } from "@/lib/rate-limit";
import { purgerVisitesAnciennes, traiterVisite } from "./traitement";

const le = new Date("2026-10-09T12:00:00Z");

describe("traiterVisite", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://x";
    reinitialiserLimites();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    delete process.env.DATABASE_URL;
    vi.resetAllMocks();
  });

  it("enregistre, envoie le mail, le marque et purge", async () => {
    depot.enregistrerVisite.mockResolvedValue({ id: "v1", nom: "Boulangerie Martin", numero: 1, precedente: null });
    envoyerMail.mockResolvedValue(undefined);
    await traiterVisite("boulangerie-martin-k7f3", "mobile", le);
    expect(depot.enregistrerVisite).toHaveBeenCalledWith("boulangerie-martin-k7f3", "mobile", le);
    expect(envoyerMail).toHaveBeenCalledWith(
      expect.objectContaining({ sujet: "Boulangerie Martin a ouvert son lien — 1re visite" }),
    );
    expect(depot.marquerMailEnvoye).toHaveBeenCalledWith("v1");
    expect(depot.purgerVisites).toHaveBeenCalledWith(new Date(le.getTime() - 365 * 24 * 60 * 60 * 1000));
  });

  it("n'envoie rien si la visite n'est pas nouvelle ou le lien inconnu", async () => {
    depot.enregistrerVisite.mockResolvedValue(null);
    await traiterVisite("boulangerie-martin-k7f3", "mobile", le);
    expect(envoyerMail).not.toHaveBeenCalled();
  });

  it("garde la visite non marquée si le mail échoue, et purge quand même", async () => {
    depot.enregistrerVisite.mockResolvedValue({ id: "v1", nom: "X", numero: 2, precedente: le });
    envoyerMail.mockRejectedValue(new Error("EAUTH"));
    await traiterVisite("x-0000", "ordinateur", le);
    expect(depot.marquerMailEnvoye).not.toHaveBeenCalled();
    expect(depot.purgerVisites).toHaveBeenCalled();
  });

  it("ne lève jamais, même base indisponible", async () => {
    depot.enregistrerVisite.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(traiterVisite("x-0000", "mobile", le)).resolves.toBeUndefined();
  });

  it("ne fait rien sans base configurée", async () => {
    delete process.env.DATABASE_URL;
    await traiterVisite("x-0000", "mobile", le);
    expect(depot.enregistrerVisite).not.toHaveBeenCalled();
  });

  it("limite à 10 signaux par heure et par jeton", async () => {
    depot.enregistrerVisite.mockResolvedValue(null);
    for (let i = 0; i < 12; i++) await traiterVisite("x-0000", "mobile", le);
    expect(depot.enregistrerVisite).toHaveBeenCalledTimes(10);
  });

  it("isole les quotas par jeton", async () => {
    depot.enregistrerVisite.mockResolvedValue(null);
    for (let i = 0; i < 10; i++) await traiterVisite("a-0000", "mobile", le);
    await traiterVisite("b-0000", "mobile", le);
    expect(depot.enregistrerVisite).toHaveBeenCalledTimes(11);
  });

  it("ne lève pas si le marquage échoue, et purge quand même", async () => {
    depot.enregistrerVisite.mockResolvedValue({ id: "v1", nom: "X", numero: 1, precedente: null });
    envoyerMail.mockResolvedValue(undefined);
    depot.marquerMailEnvoye.mockRejectedValue(new Error("ECONNRESET"));
    await expect(traiterVisite("x-0000", "mobile", le)).resolves.toBeUndefined();
    expect(depot.purgerVisites).toHaveBeenCalled();
  });

  it("ne lève pas si la purge échoue", async () => {
    depot.enregistrerVisite.mockResolvedValue({ id: "v1", nom: "X", numero: 1, precedente: null });
    envoyerMail.mockResolvedValue(undefined);
    depot.purgerVisites.mockRejectedValue(new Error("ECONNRESET"));
    await expect(traiterVisite("x-0000", "mobile", le)).resolves.toBeUndefined();
  });
});

describe("purgerVisitesAnciennes", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => vi.resetAllMocks());

  it("purge les visites de plus de douze mois", async () => {
    await purgerVisitesAnciennes(le);
    expect(depot.purgerVisites).toHaveBeenCalledWith(new Date(le.getTime() - 365 * 24 * 60 * 60 * 1000));
  });

  it("ne lève pas sur une erreur et la journalise", async () => {
    depot.purgerVisites.mockRejectedValue(new Error("ECONNRESET"));
    await expect(purgerVisitesAnciennes(le)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});
