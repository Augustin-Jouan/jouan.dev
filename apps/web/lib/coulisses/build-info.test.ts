import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { FICHIER_BUILD_INFO, lireBuildInfo } from "./build-info";
import { INFOS_EXEMPLE } from "./outils-test";

const dossier = (contenu?: string) => {
  const d = mkdtempSync(join(tmpdir(), "build-info-"));
  if (contenu !== undefined) writeFileSync(join(d, FICHIER_BUILD_INFO), contenu);
  return d;
};

describe("lireBuildInfo", () => {
  it("fichier absent (build local) : null", () => {
    expect(lireBuildInfo(dossier())).toBeNull();
  });
  it("fichier valide : ses infos", () => {
    expect(lireBuildInfo(dossier(JSON.stringify(INFOS_EXEMPLE)))).toEqual(INFOS_EXEMPLE);
  });
  it("fichier invalide ou illisible : null, avec un avertissement au build", () => {
    const avertir = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(lireBuildInfo(dossier("{ pas du json"))).toBeNull();
    expect(lireBuildInfo(dossier(JSON.stringify({ ...INFOS_EXEMPLE, sha: "court" })))).toBeNull();
    expect(avertir).toHaveBeenCalledTimes(2);
    avertir.mockRestore();
  });
});
