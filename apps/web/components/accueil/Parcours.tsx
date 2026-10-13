import { Section } from "./Section";
import { ANCRES, parcours, sections } from "@/data/accueil";

/** Parcours en quelques lignes ; la version complète viendra avec /api/me. */
export function Parcours() {
  return (
    <Section id={ANCRES.parcours} {...sections.parcours}>
      <ul className="flex max-w-3xl flex-col divide-y divide-trait border-y border-trait">
        {parcours.map((ligne) => (
          <li key={ligne.avant} className="py-4 text-lg">
            {ligne.avant}
            {ligne.lien && (
              <a href={ligne.lien.href} className="underline underline-offset-4 transition-[color] hover:text-accent">
                {ligne.lien.logo && (
                  // Pastille couleur papier : les logos sont dessinés pour un fond clair (le
                  // leur est teinté du même papier). Simple <img>, comme le portrait : pas de
                  // JS client en plus sur l'accueil.
                  <span className="mr-2 inline-flex rounded-md bg-texte px-1.5 py-1 align-middle">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ligne.lien.logo.src}
                      alt=""
                      width={ligne.lien.logo.largeur}
                      height={ligne.lien.logo.hauteur}
                      loading="lazy"
                      decoding="async"
                      className="h-5 w-auto"
                    />
                  </span>
                )}
                {ligne.lien.libelle}
              </a>
            )}
            {ligne.apres}
          </li>
        ))}
      </ul>
    </Section>
  );
}
