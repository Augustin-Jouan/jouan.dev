import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VideoProjet as Video } from "@/data/a-propos";
import { VideoProjet } from "./VideoProjet";

const video: Video = {
  type: "video",
  webm: "/a-propos/essai.webm",
  mp4: "/a-propos/essai.mp4",
  affiche: { src: "/a-propos/essai-affiche.webp", alt: "", largeur: 1280, hauteur: 800 },
  description: "Démo d'essai : un pointage.",
};

let declencher: (visible: boolean) => void = () => {};

class ObservateurFactice {
  constructor(private rappel: (entrees: { isIntersecting: boolean }[]) => void) {
    declencher = (visible) => this.rappel([{ isIntersecting: visible }]);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

function simulerMouvementReduit(reduit: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduit && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe("VideoProjet", () => {
  let lire: ReturnType<typeof vi.spyOn>;
  let suspendre: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Sans observateur créé (mouvement réduit), déclencher ne doit rien atteindre du test précédent.
    declencher = () => {};
    vi.stubGlobal("IntersectionObserver", ObservateurFactice);
    lire = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    suspendre = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("visible : lit la vidéo ; hors écran : la met en pause", () => {
    simulerMouvementReduit(false);
    render(<VideoProjet video={video} />);
    expect(lire).not.toHaveBeenCalled();
    act(() => declencher(true));
    expect(lire).toHaveBeenCalledTimes(1);
    act(() => declencher(false));
    expect(suspendre).toHaveBeenCalled();
  });

  it("mouvement réduit : jamais de lecture automatique, et des contrôles pour la lancer", () => {
    simulerMouvementReduit(true);
    const { container } = render(<VideoProjet video={video} />);
    act(() => declencher(true));
    expect(lire).not.toHaveBeenCalled();
    expect(container.querySelector("video")).toHaveAttribute("controls");
  });

  it("deux sources, WebM AV1 d'abord puis MP4, avec leur type", () => {
    simulerMouvementReduit(false);
    const { container } = render(<VideoProjet video={video} />);
    const sources = [...container.querySelectorAll("video source")];
    expect(sources.map((s) => s.getAttribute("src"))).toEqual([video.webm, video.mp4]);
    expect(sources[0]).toHaveAttribute("type", 'video/webm; codecs="av01.0.08M.08"');
    expect(sources[1]).toHaveAttribute("type", "video/mp4");
  });

  it("affiche et dimensions posées dès le rendu, rien de préchargé, nommée par sa description", () => {
    simulerMouvementReduit(false);
    const { container } = render(<VideoProjet video={video} />);
    const element = container.querySelector("video")!;
    expect(element).toHaveAttribute("poster", video.affiche.src);
    expect(element).toHaveAttribute("width", "1280");
    expect(element).toHaveAttribute("height", "800");
    expect(element).toHaveAttribute("preload", "none");
    expect(element.muted).toBe(true);
    expect(element).toHaveAttribute("loop");
    expect(element).toHaveAttribute("playsinline");
    expect(screen.getByLabelText(video.description)).toBe(element);
  });
});
