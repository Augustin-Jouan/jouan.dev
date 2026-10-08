import "@testing-library/jest-dom/vitest";

// jsdom n'implémente pas matchMedia : par défaut, aucune requête ne correspond.
// Les tests qui ont besoin d'une autre réponse la remplacent (vi.stubGlobal).
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
