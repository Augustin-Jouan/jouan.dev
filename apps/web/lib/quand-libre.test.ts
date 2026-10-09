import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { quandLibre } from "./quand-libre";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("quandLibre", () => {
  it("page déjà chargée : lance la fonction dans un temps libre", () => {
    const fn = vi.fn();
    quandLibre(fn);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("page en cours de chargement : attend l'événement load", () => {
    vi.spyOn(Document.prototype, "readyState", "get").mockReturnValue("loading");
    const fn = vi.fn();
    quandLibre(fn);
    vi.advanceTimersByTime(5_000);
    expect(fn).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("load"));
    vi.advanceTimersByTime(1_000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("annulée avant le temps libre : la fonction ne part jamais", () => {
    const fn = vi.fn();
    const annuler = quandLibre(fn);
    annuler();
    vi.advanceTimersByTime(5_000);
    expect(fn).not.toHaveBeenCalled();
  });
});
