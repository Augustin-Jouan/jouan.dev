import { describe, expect, it } from "vitest";
import { REMISE_A_ZERO, SEQUENCES, rvbXterm, versXterm256 } from "./couleurs-terminal";

describe("versXterm256", () => {
  it("décode le cube et les gris de xterm", () => {
    expect(rvbXterm(16)).toEqual([0, 0, 0]);
    expect(rvbXterm(180)).toEqual([215, 175, 135]);
    expect(rvbXterm(231)).toEqual([255, 255, 255]);
    expect(rvbXterm(232)).toEqual([8, 8, 8]);
    expect(rvbXterm(255)).toEqual([238, 238, 238]);
  });

  it("trouve la couleur la plus proche, gris compris", () => {
    expect(versXterm256("#000000")).toBe(16);
    expect(versXterm256("#ffffff")).toBe(231);
    expect(versXterm256("#808080")).toBe(244);
  });
});

describe("styles du terminal", () => {
  it("prennent le code le plus proche du rôle de la charte", () => {
    expect(SEQUENCES.accent).toBe("\x1b[38;5;180m"); // accent, pêche #eab595
    expect(SEQUENCES.attenue).toBe("\x1b[38;5;145m"); // texte-doux, mauve clair #b9a3b0
    expect(SEQUENCES.souligne).toBe("\x1b[4;38;5;255m"); // texte, papier #f3efe7, souligné
    expect(REMISE_A_ZERO).toBe("\x1b[0m");
  });
});
