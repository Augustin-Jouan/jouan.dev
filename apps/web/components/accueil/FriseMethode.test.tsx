import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FriseMethode } from "./FriseMethode";

/** Observateur factice : on déclenche nous-mêmes l'entrée à l'écran d'un élément observé. */
class Observateur {
  static dernier: Observateur | null = null;
  observes = new Set<Element>();
  constructor(
    private readonly rappel: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    Observateur.dernier = this;
  }
  observe(el: Element) {
    this.observes.add(el);
  }
  unobserve(el: Element) {
    this.observes.delete(el);
  }
  disconnect() {
    this.observes.clear();
  }
  entrer(el: Element) {
    act(() => this.rappel([{ target: el, isIntersecting: true } as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver));
  }
}

function medias(ordinateur: boolean, reduit = false) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q === "(width >= 64rem)" ? ordinateur : q === "(prefers-reduced-motion: reduce)" ? reduit : false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  }));
}

/** Position de la frise à l'écran au montage : sous l'écran par défaut. */
function positionFrise(haut: number) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return (this.classList.contains("methode-frise") ? { top: haut, bottom: haut + 400 } : { top: 0, bottom: 0 }) as DOMRect;
  });
}

function rendre() {
  const { container } = render(
    <FriseMethode>
      <ol>
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="methode-etape" />
        ))}
      </ol>
    </FriseMethode>,
  );
  const frise = container.querySelector<HTMLElement>(".methode-frise")!;
  return { frise, etapes: [...frise.querySelectorAll<HTMLElement>(".methode-etape")] };
}

const allumees = (etapes: HTMLElement[]) => etapes.map((e) => e.hasAttribute("data-allumee"));

beforeEach(() => {
  Observateur.dernier = null;
  vi.stubGlobal("IntersectionObserver", Observateur);
  vi.stubGlobal("innerHeight", 800);
  positionFrise(2_000);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FriseMethode", () => {
  it("ordinateur : tout s'allume d'un coup quand la frise arrive, en cascade, puis le paquet part", () => {
    medias(true);
    const { frise, etapes } = rendre();
    expect(frise).toHaveAttribute("data-animation");
    expect(allumees(etapes)).toEqual([false, false, false, false, false]);
    Observateur.dernier!.entrer(frise);
    expect(allumees(etapes)).toEqual([true, true, true, true, true]);
    expect(frise.style.getPropertyValue("--avance")).toBe("1");
    expect(frise).toHaveAttribute("data-complete");
    expect(Observateur.dernier!.observes.size).toBe(0);
  });

  it("téléphone : chaque étape s'allume en arrivant, avec celles du dessus, et le fil la rejoint", () => {
    medias(false);
    const { frise, etapes } = rendre();
    const observateur = Observateur.dernier!;
    expect([...observateur.observes]).toEqual(etapes);
    observateur.entrer(etapes[0]!);
    expect(allumees(etapes)).toEqual([true, false, false, false, false]);
    observateur.entrer(etapes[2]!);
    expect(allumees(etapes)).toEqual([true, true, true, false, false]);
    expect(frise).not.toHaveAttribute("data-complete");
    observateur.entrer(etapes[4]!);
    expect(allumees(etapes)).toEqual([true, true, true, true, true]);
    expect(frise.style.getPropertyValue("--avance")).toBe("1");
    expect(frise).toHaveAttribute("data-complete");
  });

  it("frise déjà à l'écran au chargement (page rechargée plus bas) : laissée finie, sans clignotement", () => {
    medias(true);
    positionFrise(300);
    const { frise } = rendre();
    expect(frise).not.toHaveAttribute("data-animation");
  });

  it("mouvement réduit : laissée finie", () => {
    medias(true, true);
    const { frise } = rendre();
    expect(frise).not.toHaveAttribute("data-animation");
  });

  it("sans IntersectionObserver : laissée finie", () => {
    medias(true);
    vi.stubGlobal("IntersectionObserver", undefined);
    const { frise } = rendre();
    expect(frise).not.toHaveAttribute("data-animation");
  });
});
