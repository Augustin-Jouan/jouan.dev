// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { consulterLimite, reinitialiserLimites, verifierLimite } from "./rate-limit";

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

  it("consulterLimite refuse après max envois comptés", () => {
    const options = { max: 2, dureeMs: HEURE };
    verifierLimite("a", options, 0);
    verifierLimite("a", options, 0);
    expect(consulterLimite("a", options, 1000)).toEqual({ autorise: false, secondesAvantReessai: 3599 });
  });

  it("consulterLimite ne compte aucun envoi", () => {
    const options = { max: 2, dureeMs: HEURE };
    for (let i = 0; i < 10; i++) expect(consulterLimite("neuve", options, 0)).toEqual({ autorise: true, secondesAvantReessai: 0 });
    expect(verifierLimite("neuve", options, 0).autorise).toBe(true);
    expect(verifierLimite("neuve", options, 0).autorise).toBe(true);
    expect(verifierLimite("neuve", options, 0).autorise).toBe(false);
  });

  it("consulterLimite autorise une fenêtre échue", () => {
    const options = { max: 1, dureeMs: QUART_D_HEURE };
    verifierLimite("a", options, 0);
    expect(consulterLimite("a", options, QUART_D_HEURE).autorise).toBe(true);
  });

  it("ne purge pas une fenêtre d'une heure encore pleine lors d'un appel sur une fenêtre de 15 minutes", () => {
    verifierLimite("contact", { max: 1, dureeMs: HEURE }, 0);
    const vingtMinutes = 20 * 60 * 1000;
    verifierLimite("connexion", { max: 5, dureeMs: QUART_D_HEURE }, vingtMinutes);
    expect(verifierLimite("contact", { max: 1, dureeMs: HEURE }, vingtMinutes).autorise).toBe(false);
  });

  it("purge une fenêtre à sa propre échéance", () => {
    verifierLimite("contact", { max: 1, dureeMs: QUART_D_HEURE }, 0);
    verifierLimite("autre", { max: 1, dureeMs: HEURE }, QUART_D_HEURE);
    expect(consulterLimite("contact", { max: 1, dureeMs: QUART_D_HEURE }, QUART_D_HEURE).autorise).toBe(true);
  });
});
