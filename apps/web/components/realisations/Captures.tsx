import Image from "next/image";
import type { Image as ImageEtude } from "@/data/realisations";

/** Captures du site : ordinateur dans une fenêtre de navigateur, téléphone dans son cadre. */
export function Captures({ images }: { images: ImageEtude[] }) {
  const [ordinateur, mobile] = images;

  return (
    <div className="flex flex-col items-center gap-8 md:flex-row md:items-end">
      {ordinateur && (
        <figure className="w-full overflow-hidden rounded-3xl border border-trait bg-surface shadow-fenetre md:flex-1">
          <div aria-hidden="true" className="flex items-center gap-2 border-b border-trait px-5 py-3">
            <span className="size-3 rounded-full bg-trait" />
            <span className="size-3 rounded-full bg-trait" />
            <span className="size-3 rounded-full bg-trait" />
          </div>
          <Image
            src={ordinateur.src}
            alt={ordinateur.alt}
            width={ordinateur.largeur}
            height={ordinateur.hauteur}
            sizes="(min-width: 1152px) 720px, (min-width: 768px) 60vw, 100vw"
            className="block h-auto w-full"
          />
        </figure>
      )}
      {mobile && (
        <figure className="w-56 shrink-0 overflow-hidden rounded-[2.5rem] border-8 border-trait bg-trait shadow-fenetre">
          <Image
            src={mobile.src}
            alt={mobile.alt}
            width={mobile.largeur}
            height={mobile.hauteur}
            sizes="224px"
            className="block h-auto w-full rounded-[2rem]"
          />
        </figure>
      )}
    </div>
  );
}
