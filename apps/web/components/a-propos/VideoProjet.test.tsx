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

  it("visible : attend le premier geste du visiteur, puis lit la vidéo ; hors écran : la met en pause", () => {
    simulerMouvementReduit(false);
    render(<VideoProjet video={video} />);
    act(() => declencher(true));
    // Avant tout geste, Chrome compterait la première image de la vidéo comme LCP.
    expect(lire).not.toHaveBeenCalled();
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(lire).toHaveBeenCalledTimes(1);
    act(() => declencher(false));
    expect(suspendre).toHaveBeenCalled();
    act(() => declencher(true));
    expect(lire).toHaveBeenCalledTimes(2);
  });

  it("après un geste, une vidéo qui arrive à l'écran démarre aussitôt", () => {
    simulerMouvementReduit(false);
    render(<VideoProjet video={video} />);
    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });
    expect(lire).not.toHaveBeenCalled();
    act(() => declencher(true));
    expect(lire).toHaveBeenCalledTimes(1);
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

  it("l'affiche est une vraie image par-dessus la vidéo jusqu'au début de la lecture (LCP), puis s'efface", () => {
    simulerMouvementReduit(false);
    const { container } = render(<VideoProjet video={video} />);
    const image = () => container.querySelector(`img[src="${video.affiche.src}"]`);
    expect(image()).toHaveAttribute("alt", "");
    expect(image()).toHaveAttribute("loading", "lazy");
    act(() => {
      container.querySelector("video")!.dispatchEvent(new Event("playing"));
    });
    expect(image()).toBeNull();
  });

  it("prioritaire (premier écran) : l'image d'affiche se charge tout de suite, en priorité haute", () => {
    simulerMouvementReduit(false);
    const { container } = render(<VideoProjet video={video} prioritaire />);
    const image = container.querySelector(`img[src="${video.affiche.src}"]`);
    expect(image).toHaveAttribute("fetchpriority", "high");
    expect(image).not.toHaveAttribute("loading", "lazy");
  });

  it("mouvement réduit : pas d'image par-dessus, l'affiche passe sur la vidéo et les contrôles restent accessibles", () => {
    simulerMouvementReduit(true);
    const { container } = render(<VideoProjet video={video} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("video")).toHaveAttribute("poster", video.affiche.src);
  });

  it("affiche et dimensions posées dès le rendu, rien de préchargé, nommée par sa description", () => {
    simulerMouvementReduit(false);
    const { container } = render(<VideoProjet video={video} />);
    const element = container.querySelector("video")!;
    // L'affiche est l'image posée dessus, seule candidate au LCP : pas de poster en double sur la vidéo.
    expect(element).not.toHaveAttribute("poster");
    expect(container.querySelector("img")).toHaveAttribute("width", "1280");
    expect(element).toHaveAttribute("width", "1280");
    expect(element).toHaveAttribute("height", "800");
    expect(element).toHaveAttribute("preload", "none");
    expect(element.muted).toBe(true);
    expect(element).toHaveAttribute("loop");
    expect(element).toHaveAttribute("playsinline");
    expect(screen.getByLabelText(video.description)).toBe(element);
  });
});
