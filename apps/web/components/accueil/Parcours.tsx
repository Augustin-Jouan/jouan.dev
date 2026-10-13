import { Section } from "./Section";
import { ANCRES, parcours, sections } from "@/data/accueil";

/** L'employeur et l'école qui ont un logo, mis en avant à côté des lignes. */
const enseignes = parcours.flatMap(({ lien }) => (lien?.logo ? [{ ...lien, logo: lien.logo }] : []));

/** Parcours en quelques lignes ; la version complète viendra avec /api/me. */
export function Parcours() {
  return (
    <Section id={ANCRES.parcours} {...sections.parcours}>
      {/* Sur ordinateur, les logos à droite des lignes ; sur téléphone, en dessous et centrés. */}
      <div className="flex flex-col gap-12 md:flex-row md:items-center md:gap-16">
        <ul aria-label="Parcours" className="flex max-w-3xl flex-1 flex-col divide-y divide-trait border-y border-trait">
          {parcours.map((ligne) => (
            <li key={ligne.avant} className="py-4 text-lg">
              {ligne.avant}
              {ligne.lien && (
                <a href={ligne.lien.href} className="underline underline-offset-4 transition-[color] hover:text-accent">
                  {ligne.lien.libelle}
                </a>
              )}
              {ligne.apres}
            </li>
          ))}
        </ul>
        <ul aria-label="Employeur et école" className="flex shrink-0 justify-center gap-8 sm:gap-10 md:justify-start">
          {enseignes.map(({ href, libelle, logo }) => (
            <li key={href}>
              <a href={href} className="group flex flex-col items-center gap-4">
                {/* Rond cerclé de l'accent, comme le portrait de l'accroche : l'image porte
                    le même fond beige chaud que la photo. Simple <img> : pas de JS client en
                    plus sur l'accueil. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logo.src}
                  alt={libelle}
                  width={logo.largeur}
                  height={logo.hauteur}
                  loading="lazy"
                  decoding="async"
                  className="size-28 rounded-full ring-2 ring-accent ring-offset-4 ring-offset-fond motion-safe:transition-transform motion-safe:group-hover:scale-105 sm:size-32 lg:size-40"
                />
                {/* Le logo nomme déjà le lien : la légende n'est que visuelle. */}
                <span aria-hidden="true" className="text-sm text-texte-doux transition-[color] group-hover:text-texte">
                  {libelle}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
