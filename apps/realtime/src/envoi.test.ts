import { describe, expect, it, vi } from "vitest";
import { envoyer } from "./envoi.js";

function fausseConnexion(enAttente: number) {
  const raw = { bufferedAmount: enAttente, terminate: vi.fn() };
  return { raw, send: vi.fn() };
}

describe("envoyer", () => {
  it("envoie tant que la file d'envoi reste sous le plafond", () => {
    const ws = fausseConnexion(100);
    expect(envoyer(ws as never, "x", 1_024)).toBe(true);
    expect(ws.send).toHaveBeenCalledWith("x");
    expect(ws.raw.terminate).not.toHaveBeenCalled();
  });

  it("coupe un client qui ne lit plus : sa file dépasse le plafond", () => {
    const ws = fausseConnexion(2_000);
    expect(envoyer(ws as never, "x", 1_024)).toBe(false);
    expect(ws.send).not.toHaveBeenCalled();
    expect(ws.raw.terminate).toHaveBeenCalled();
  });
});
