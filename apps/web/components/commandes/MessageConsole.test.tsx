import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { texteIndices } from "@/lib/commandes/indices";
import { MessageConsole } from "./MessageConsole";

let informer: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  window.sessionStorage.clear();
  informer = vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("MessageConsole", () => {
  it("en production, une fois par session", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<MessageConsole hote="jouan.dev" />).unmount();
    render(<MessageConsole hote="jouan.dev" />);
    expect(informer).toHaveBeenCalledTimes(1);
    expect(informer).toHaveBeenCalledWith(texteIndices("jouan.dev"));
  });

  it("stockage refusé : le message s'affiche quand même, sans erreur", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("refusé", "SecurityError");
    });
    render(<MessageConsole hote="jouan.dev" />);
    expect(informer).toHaveBeenCalledTimes(1);
  });

  it("rien hors production", () => {
    render(<MessageConsole hote="jouan.dev" />);
    expect(informer).not.toHaveBeenCalled();
  });
});
