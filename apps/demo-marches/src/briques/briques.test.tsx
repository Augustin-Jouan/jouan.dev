import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CleValeur } from "./CleValeur";
import { Etiquette } from "./Etiquette";
import { Tableau } from "./Tableau";
import { cx } from "./cx";

describe("briques simples", () => {
  it("cx ignore les valeurs vides", () => {
    expect(cx("a", false, null, undefined, "", "b")).toBe("a b");
  });
  it("Etiquette affiche son texte", () => {
    render(<Etiquette ton="alerte">Retard</Etiquette>);
    expect(screen.getByText("Retard")).toBeInTheDocument();
  });
  it("CleValeur associe clé et valeur", () => {
    render(<CleValeur cle="Cumul" valeur="12" />);
    expect(screen.getByText("Cumul").tagName).toBe("DT");
    expect(screen.getByText("12").tagName).toBe("DD");
  });
  it("Tableau rend une table", () => {
    render(<Tableau variante="lots"><tbody><tr data-ouvert><td data-droite>1</td></tr></tbody></Tableau>);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});

describe("variantes et attributs", () => {
  it("chaque ton d'étiquette a sa variante", () => {
    const tons = ["neutre", "accent", "alerte", "danger"] as const;
    const classes = tons.map((t) => {
      const { unmount, container } = render(<Etiquette ton={t}>x</Etiquette>);
      const c = (container.firstChild as HTMLElement).className;
      unmount();
      return c;
    });
    expect(new Set(classes).size).toBe(4);
  });
  it("Tableau laisse passer les data-* des cellules", () => {
    render(<Tableau variante="plain"><tbody><tr data-actif><td data-droite data-premiere>1</td></tr></tbody></Tableau>);
    expect(screen.getByRole("cell")).toHaveAttribute("data-droite");
    expect(screen.getByRole("cell")).toHaveAttribute("data-premiere");
    expect(screen.getByRole("row")).toHaveAttribute("data-actif");
  });
});
