import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const lenis = vi.hoisted(() => ({ options: null as unknown, instance: null as null | { scrollTo: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> } }));
vi.mock("lenis", () => ({
  default: class {
    scrollTo = vi.fn();
    destroy = vi.fn();
    constructor(options: unknown) {
      lenis.options = options;
      lenis.instance = this;
    }
  },
}));

import { demarrerDefilement } from "./defilement-lenis";

let arreter: () => void;

beforeEach(() => {
  document.body.innerHTML = `
    <a id="ancre" href="#offre">Offre</a>
    <a id="evitement" href="#offre" data-defilement-natif>Aller au contenu</a>
    <a id="ailleurs" href="/coulisses#outils">Coulisses</a>
    <a id="onglet" href="#offre" target="_blank">Onglet</a>
    <section id="offre"></section>`;
  window.history.replaceState(null, "", "/?pour=boulangerie-k7f3");
  arreter = demarrerDefilement();
});
afterEach(() => {
  arreter();
  window.history.replaceState(null, "", "/");
});

const cliquer = (id: string, init: MouseEventInit = {}) =>
  document.getElementById(id)!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init }));

describe("demarrerDefilement", () => {
  it("lisse la molette sur toute la page, laisse défiler les zones internes et arrête l'élan en changeant de page", () => {
    expect(lenis.options).toMatchObject({ autoRaf: true, allowNestedScroll: true, stopInertiaOnNavigate: true });
    expect(lenis.options).not.toHaveProperty("anchors", true);
  });

  it("un lien d'ancre de la page glisse jusqu'à sa section, sans navigation native", () => {
    expect(cliquer("ancre")).toBe(false);
    expect(lenis.instance!.scrollTo).toHaveBeenCalledWith(document.getElementById("offre"));
    expect(window.location.hash).toBe("#offre");
  });

  it.each([
    ["le lien d'évitement (clavier)", "evitement", {}],
    ["un lien vers une autre page", "ailleurs", {}],
    ["un lien en nouvel onglet", "onglet", {}],
    ["un clic avec modificateur", "ancre", { ctrlKey: true }],
  ])("laisse le navigateur faire : %s", (_cas, id, init) => {
    expect(cliquer(id, init)).toBe(true);
    expect(lenis.instance!.scrollTo).not.toHaveBeenCalled();
  });

  it("à l'arrêt : détruit Lenis et n'intercepte plus rien", () => {
    const instance = lenis.instance!;
    arreter();
    expect(instance.destroy).toHaveBeenCalled();
    expect(cliquer("ancre")).toBe(true);
    arreter = () => {};
  });
});
