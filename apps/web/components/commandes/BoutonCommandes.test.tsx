import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EVENEMENT_OUVRIR_COMMANDES } from "@/lib/commandes/evenements";
import { BoutonCommandes } from "./BoutonCommandes";

afterEach(() => vi.unstubAllGlobals());

const agent = (userAgent: string) => vi.stubGlobal("navigator", { ...navigator, userAgent });

describe("BoutonCommandes", () => {
  it("ouvre la palette par son événement", () => {
    const recu = vi.fn();
    window.addEventListener(EVENEMENT_OUVRIR_COMMANDES, recu);
    render(<BoutonCommandes />);
    fireEvent.click(screen.getByRole("button", { name: /pour naviguer/ }));
    window.removeEventListener(EVENEMENT_OUVRIR_COMMANDES, recu);
    expect(recu).toHaveBeenCalledTimes(1);
  });

  it("affiche ⌘K sur un appareil Apple, Ctrl+K ailleurs", () => {
    agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)");
    const { unmount } = render(<BoutonCommandes />);
    expect(screen.getByRole("button")).toHaveTextContent("⌘K pour naviguer");
    unmount();
    agent("Mozilla/5.0 (X11; Linux x86_64)");
    render(<BoutonCommandes />);
    expect(screen.getByRole("button")).toHaveTextContent("Ctrl+K pour naviguer");
  });
});
