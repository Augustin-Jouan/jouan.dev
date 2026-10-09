import { describe, expect, it } from "vitest";
import { chargerInstrumentSerif } from "./vignette";

describe("chargerInstrumentSerif", () => {
  it("renvoie une police woff non vide", async () => {
    const donnees = await chargerInstrumentSerif();
    expect(donnees.byteLength).toBeGreaterThan(0);
    expect(new DataView(donnees).getUint32(0)).toBe(0x774f4646);
  });
});
