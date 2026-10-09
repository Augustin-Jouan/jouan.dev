import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DateRelative } from "./DateRelative";

describe("DateRelative", () => {
  it("reprend la date absolue formatée au build, sans la recalculer dans le navigateur (hydratation)", () => {
    // Le navigateur peut formater autrement que Node (ICU) : son texte ne doit jamais servir.
    render(<DateRelative iso="2026-10-09T14:00:00.000Z" absolue="9 octobre 2026 à 16 h 00 (build)" />);
    const date = document.querySelector("time")!;
    expect(date).toHaveAttribute("dateTime", "2026-10-09T14:00:00.000Z");
    expect(date).toHaveAttribute("title", "9 octobre 2026 à 16 h 00 (build)");
  });
});
