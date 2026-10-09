// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { reinitialiserLimites, rendreLimite, verifierLimite } from "./rate-limit";

const HEURE = 60 * 60 * 1000;
const QUART_D_HEURE = 15 * 60 * 1000;

describe("rate-limit", () => {
  beforeEach(() => reinitialiserLimites());

  it("autorise jusqu'à max envois puis refuse avec le délai restant", () => {
    const options = { max: 2, dureeMs: HEURE };
    expect(verifierLimite("a", options, 0).autorise).toBe(true);
    expect(verifierLimite("a", options, 1000).autorise).toBe(true);
    expect(verifierLimite("a", options, 2000)).toEqual({ autorise: false, secondesAvantReessai: 3598 });
  });

  it("rouvre la fenêtre une fois sa durée écoulée", () => {
    const options = { max: 1, dureeMs: HEURE };
    verifierLimite("a", options, 0);
    expect(verifierLimite("a", options, HEURE).autorise).toBe(true);
  });

  it("rendreLimite rembourse un envoi réservé", () => {
    const options = { max: 1, dureeMs: HEURE };
    verifierLimite("a", options, 0);
    rendreLimite("a");
    expect(verifierLimite("a", options, 0).autorise).toBe(true);
    expect(verifierLimite("a", options, 0).autorise).toBe(false);
  });

  it("rendreLimite ne fait rien sur une clé inconnue", () => {
    expect(() => rendreLimite("inconnue")).not.toThrow();
    expect(verifierLimite("inconnue", { max: 1, dureeMs: HEURE }, 0).autorise).toBe(true);
  });

  it("rendreLimite ne descend pas sous 0", () => {
    const options = { max: 1, dureeMs: HEURE };
    verifierLimite("a", options, 0);
    rendreLimite("a");
    rendreLimite("a");
    expect(verifierLimite("a", options, 0).autorise).toBe(true);
    expect(verifierLimite("a", options, 0).autorise).toBe(false);
  });

  it("ne purge pas une fenêtre d'une heure encore pleine lors d'un appel sur une fenêtre de 15 minutes", () => {
    verifierLimite("contact", { max: 1, dureeMs: HEURE }, 0);
    const vingtMinutes = 20 * 60 * 1000;
    verifierLimite("connexion", { max: 5, dureeMs: QUART_D_HEURE }, vingtMinutes);
    expect(verifierLimite("contact", { max: 1, dureeMs: HEURE }, vingtMinutes).autorise).toBe(false);
  });

  it("ne purge la table qu'une fois par minute au plus, sans rendre une fenêtre échue bloquante", () => {
    const options = { max: 1, dureeMs: 1000 };
    verifierLimite("a", options, 60_000); // purge à 60 000
    verifierLimite("b", options, 60_500);
    verifierLimite("c", options, 61_500); // b est échue mais pas purgée (< 1 min)
    // b, échue, est traitée comme absente : nouvelle fenêtre
    expect(verifierLimite("b", options, 61_500).autorise).toBe(true);
    expect(verifierLimite("b", options, 61_500).autorise).toBe(false);
  });

  it("plafonne la table : une nouvelle clé est refusée, les existantes continuent", () => {
    const options = { max: 2, dureeMs: HEURE };
    for (let i = 0; i < 10_000; i++) verifierLimite(`k${i}`, options, 0);
    expect(verifierLimite("nouvelle", options, 0).autorise).toBe(false);
    expect(verifierLimite("k0", options, 0).autorise).toBe(true);
    expect(verifierLimite("k0", options, 0).autorise).toBe(false);
  });

  it("purge une fenêtre à sa propre échéance", () => {
    verifierLimite("contact", { max: 1, dureeMs: QUART_D_HEURE }, 0);
    verifierLimite("autre", { max: 1, dureeMs: HEURE }, QUART_D_HEURE);
    expect(verifierLimite("contact", { max: 1, dureeMs: QUART_D_HEURE }, QUART_D_HEURE).autorise).toBe(true);
  });
});
