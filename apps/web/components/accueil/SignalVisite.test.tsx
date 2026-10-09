import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DUREE_VISIBLE_MS, SignalVisite } from "./SignalVisite";

function definirVisibilite(etat: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => etat });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("SignalVisite", () => {
  const sendBeacon = vi.fn(() => true);
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: sendBeacon });
    definirVisibilite("visible");
  });
  afterEach(() => {
    vi.useRealTimers();
    sendBeacon.mockClear();
  });

  it("envoie le jeton une seule fois après 3 s de page visible", () => {
    render(<SignalVisite jeton="boulangerie-k7f3" />);
    act(() => vi.advanceTimersByTime(DUREE_VISIBLE_MS - 1));
    expect(sendBeacon).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(sendBeacon).toHaveBeenCalledWith("/api/visites", "boulangerie-k7f3");
    act(() => vi.advanceTimersByTime(60_000));
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it("ne compte pas le temps passé en arrière-plan", () => {
    render(<SignalVisite jeton="boulangerie-k7f3" />);
    act(() => vi.advanceTimersByTime(2000));
    act(() => definirVisibilite("hidden"));
    act(() => vi.advanceTimersByTime(60_000));
    expect(sendBeacon).not.toHaveBeenCalled();
    act(() => definirVisibilite("visible"));
    act(() => vi.advanceTimersByTime(999));
    expect(sendBeacon).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });
});
