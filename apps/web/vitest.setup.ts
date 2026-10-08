import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Header et Footer lisent le chemin courant pour marquer la page active.
// Hors d'un routeur Next, on sert l'accueil.
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    refresh: () => {},
    back: () => {},
    forward: () => {},
    prefetch: () => {},
  }),
  useSearchParams: () => new URLSearchParams(),
}));

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
