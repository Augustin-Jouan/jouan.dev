import { describe, expect, it } from "vitest";
import { texteIndices } from "./indices";

describe("texteIndices", () => {
  it("donne curl, /api/me et le raccourci, alignés", () => {
    expect(texteIndices("jouan.dev")).toBe(
      [
        "Bonjour, curieux ! Ce site a quelques portes dérobées :",
        "  curl -L jouan.dev       le CV dans le terminal",
        "  jouan.dev/api/me        le CV en JSON (JSON Resume)",
        "  ⌘K ou Ctrl+K            la palette de commandes",
      ].join("\n"),
    );
  });

  it("ne contient pas « -- », qui fermerait un commentaire HTML", () => {
    expect(texteIndices("jouan.dev")).not.toContain("--");
  });
});
