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
