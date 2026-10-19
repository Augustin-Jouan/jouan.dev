import Image from "next/image";
import Link from "next/link";
import type { EtapeParcours } from "@/data/a-propos";

/**
 * Le parcours en frise verticale : l'année à gauche, le fil lumineux au milieu (comme celui de la
 * Méthode), puis l'étape et son récit. Sur téléphone, l'année passe au-dessus du titre.
 */
export function FriseParcours({ etapes }: { etapes: EtapeParcours[] }) {
  return (
    <ol aria-label="Parcours" className="flex flex-col">
      {etapes.map((etape, i) => {
        const derniere = i === etapes.length - 1;
        return (
          <li
            key={etape.titre}
            className="grid grid-cols-[1.25rem_1fr] gap-x-4 sm:grid-cols-[8rem_1.5rem_1fr] sm:gap-x-6"
          >
            <p className="col-start-2 row-start-1 font-serif text-lg text-accent sm:col-start-1 sm:pt-0.5 sm:text-right">
              {etape.annee}
            </p>
            {/* Le fil et son point : décoratifs. Le fil s'arrête au point de la dernière étape. */}
            <div aria-hidden="true" className="relative col-start-1 row-span-2 row-start-1 sm:col-start-2">
              <span
                className={`absolute left-1/2 top-0 w-px -translate-x-1/2 bg-trait-fort ${derniere ? "h-3" : "bottom-0"}`}
              />
              <span className="absolute left-1/2 top-2 size-2.5 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)]" />
            </div>
            <div className={`col-start-2 sm:col-start-3 sm:row-start-1 ${derniere ? "" : "pb-12"}`}>
              <h3 className="text-lg font-medium">{etape.titre}</h3>
              {etape.lieu && (
                <p className="mt-1 flex items-center gap-2 text-texte-doux">
                  {etape.lieu.logo && (
                    <Image
                      src={etape.lieu.logo.src}
                      alt=""
                      width={etape.lieu.logo.largeur}
                      height={etape.lieu.logo.hauteur}
                      sizes="28px"
                      className="size-7 rounded-full ring-1 ring-accent"
                    />
                  )}
                  {etape.lieu.href ? (
                    <a
                      href={etape.lieu.href}
                      target="_blank"
                      rel="noopener"
                      className="underline underline-offset-4 transition-[color] hover:text-accent"
                    >
                      {etape.lieu.libelle}
                      <span className="sr-only"> (nouvel onglet)</span>
                    </a>
                  ) : (
                    etape.lieu.libelle
                  )}
                </p>
              )}
              <p className="mt-3 max-w-3xl text-texte-doux">{etape.recit}</p>
              {etape.lien && (
                <Link href={etape.lien.href} className="mt-3 inline-block font-medium text-accent underline-offset-4 hover:underline">
                  {etape.lien.libelle}
                  <span aria-hidden="true"> →</span>
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
