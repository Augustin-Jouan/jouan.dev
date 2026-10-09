import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Surcouche } from "./Surcouche";

function Exemple() {
  const [panneau, setPanneau] = useState(false);
  const [apercu, setApercu] = useState(false);
  return (
    <>
      <button onClick={() => setPanneau(true)}>Ouvrir</button>
      <Surcouche ouverte={panneau} titre="Lot 07" variante="panneau" surFermeture={() => setPanneau(false)}>
        <button onClick={() => setApercu(true)}>Certificat</button>
        <Surcouche ouverte={apercu} titre="Certificat" variante="apercu" surFermeture={() => setApercu(false)}>
          <input aria-label="Cumul" />
        </Surcouche>
      </Surcouche>
    </>
  );
}

describe("Surcouche", () => {
  it("Échap ferme la plus haute et rend le focus à son déclencheur", async () => {
    render(<Exemple />);
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    expect(screen.getByRole("dialog", { name: "Lot 07" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Certificat" }));
    expect(screen.getByRole("dialog", { name: "Certificat" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Certificat" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Lot 07" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Certificat" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Ouvrir" })).toHaveFocus();
  });

  it("garde le focus à l'intérieur", async () => {
    render(<Exemple />);
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    for (let i = 0; i < 5; i += 1) await userEvent.tab();
    expect(screen.getByRole("dialog", { name: "Lot 07" })).toContainElement(document.activeElement as HTMLElement);
    for (let i = 0; i < 5; i += 1) await userEvent.tab({ shift: true });
    expect(screen.getByRole("dialog", { name: "Lot 07" })).toContainElement(document.activeElement as HTMLElement);
  });

  it("est modale, déplace le focus à l'ouverture et fige la page", async () => {
    render(<Exemple />);
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    const dialogue = screen.getByRole("dialog", { name: "Lot 07" });
    expect(dialogue).toHaveAttribute("aria-modal", "true");
    expect(dialogue).toContainElement(document.activeElement as HTMLElement);
    expect(document.querySelector("[data-verrou-defilement]")).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    expect(document.querySelector("[data-verrou-defilement]")).toBeNull();
  });
});

function Imbriquees({ surExterne, surInterne, interneOuverte = true }: { surExterne(): void; surInterne(): void; interneOuverte?: boolean }) {
  return (
    <Surcouche ouverte titre="Externe" variante="panneau" surFermeture={surExterne}>
      <button>Dans externe</button>
      <Surcouche ouverte={interneOuverte} titre="Interne" variante="apercu" surFermeture={surInterne}>
        <button>Dans interne</button>
        <button>Autre dans interne</button>
      </Surcouche>
    </Surcouche>
  );
}

const voiles = () => Array.from(document.querySelectorAll<HTMLElement>("[data-voile]"));
const verrou = () => document.querySelector("[data-verrou-defilement]") !== null;
const z = (el: Element) => Number(/(?:^|\s)z-(\d+)(?:\s|$)/.exec(el.className)?.[1]);

describe("Surcouche imbriquées", () => {
  it("la plus interne recouvre l'externe, voile compris", () => {
    render(<Imbriquees surExterne={() => {}} surInterne={() => {}} />);
    const externe = screen.getByRole("dialog", { name: "Externe" });
    const interne = screen.getByRole("dialog", { name: "Interne" });
    const [voileExt, voileInt] = voiles();
    expect(z(voileInt!)).toBeGreaterThan(z(externe));
    expect(z(interne)).toBeGreaterThan(z(voileInt!));
    expect(z(voileExt!)).toBeLessThan(z(externe));
  });

  it("ouvertes ensemble dès le départ, Échap ne ferme que l'interne", async () => {
    const ext = vi.fn();
    const int = vi.fn();
    render(<Imbriquees surExterne={ext} surInterne={int} />);
    await userEvent.keyboard("{Escape}");
    expect(int).toHaveBeenCalledTimes(1);
    expect(ext).not.toHaveBeenCalled();
  });

  it("Échap avec le focus dans l'interne ne ferme que l'interne", async () => {
    const ext = vi.fn();
    const int = vi.fn();
    render(<Imbriquees surExterne={ext} surInterne={int} />);
    screen.getByRole("button", { name: "Dans interne" }).focus();
    await userEvent.keyboard("{Escape}");
    expect(int).toHaveBeenCalledTimes(1);
    expect(ext).not.toHaveBeenCalled();
  });

  it("un clic sur un voile ne ferme que sa surcouche", async () => {
    const ext = vi.fn();
    const int = vi.fn();
    render(<Imbriquees surExterne={ext} surInterne={int} />);
    await userEvent.click(voiles()[1]!);
    expect(int).toHaveBeenCalledTimes(1);
    expect(ext).not.toHaveBeenCalled();
  });

  it("le verrou de défilement dure jusqu'à la dernière fermeture", () => {
    const { rerender } = render(<Imbriquees surExterne={() => {}} surInterne={() => {}} />);
    expect(verrou()).toBe(true);
    rerender(<Imbriquees surExterne={() => {}} surInterne={() => {}} interneOuverte={false} />);
    expect(screen.queryByRole("dialog", { name: "Interne" })).not.toBeInTheDocument();
    expect(verrou()).toBe(true);
    rerender(<div />);
    expect(verrou()).toBe(false);
  });

  it("le démontage libère la pile : une surcouche suivante reçoit Échap", async () => {
    const { unmount } = render(<Imbriquees surExterne={() => {}} surInterne={() => {}} />);
    unmount();
    expect(verrou()).toBe(false);
    const f = vi.fn();
    render(<Surcouche ouverte titre="Suivante" variante="panneau" surFermeture={f}>x</Surcouche>);
    await userEvent.keyboard("{Escape}");
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("fermer ne plante pas si l'élément d'ouverture a disparu", () => {
    function Ex() {
      const [ouvert, setOuvert] = useState(false);
      const [declencheur, setDeclencheur] = useState(true);
      return (
        <>
          {declencheur && <button onClick={() => setOuvert(true)}>Ouvrir</button>}
          <button onClick={() => setDeclencheur(false)}>Retirer</button>
          <Surcouche ouverte={ouvert} titre="T" variante="panneau" surFermeture={() => setOuvert(false)}>
            <button>Dedans</button>
          </Surcouche>
        </>
      );
    }
    render(<Ex />);
    return (async () => {
      await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
      await userEvent.click(screen.getByRole("button", { name: "Retirer" }));
      expect(screen.queryByRole("button", { name: "Ouvrir" })).not.toBeInTheDocument();
      await userEvent.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    })();
  });

  it("Maj+Tab depuis le premier focalisable boucle sur le dernier", async () => {
    render(<Surcouche ouverte titre="T" variante="panneau" surFermeture={() => {}}><button>A</button><button>B</button></Surcouche>);
    screen.getByRole("button", { name: "Fermer" }).focus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "B" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Fermer" })).toHaveFocus();
  });

  it("ignore les éléments sous un ancêtre hidden", async () => {
    render(
      <Surcouche ouverte titre="T" variante="panneau" surFermeture={() => {}}>
        <button>A</button>
        <div hidden><button>Caché</button></div>
      </Surcouche>,
    );
    screen.getByRole("button", { name: "A" }).focus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Fermer" })).toHaveFocus();
  });
});
