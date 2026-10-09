// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const purgerVisitesAnciennes = vi.hoisted(() => vi.fn());
vi.mock("@/lib/liens/traitement", () => ({ purgerVisitesAnciennes }));
import { register } from "./instrumentation";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("register", () => {
  it("ne fait rien sans base configurée", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("DATABASE_URL", "");
    await register();
    expect(purgerVisitesAnciennes).not.toHaveBeenCalled();
  });

  it("ne fait rien hors du runtime nodejs", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    await register();
    expect(purgerVisitesAnciennes).not.toHaveBeenCalled();
  });

  it("purge au démarrage puis toutes les 24 h", async () => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    purgerVisitesAnciennes.mockResolvedValue(undefined);
    await register();
    expect(purgerVisitesAnciennes).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    expect(purgerVisitesAnciennes).toHaveBeenCalledTimes(2);
  });
});
