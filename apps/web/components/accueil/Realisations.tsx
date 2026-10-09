import Link from "next/link";
import { Section } from "./Section";
import { ANCRES, realisationsPour, sections, type Angle } from "@/data/accueil";
import { cheminEtude } from "@/data/realisations";

/** Réalisations anonymisées : besoin, livrable, technologies. */
export function Realisations({ angle = "application" }: { angle?: Angle }) {
  return (
    <Section id={ANCRES.realisations} {...sections.realisations}>
      <div className="grid gap-5 md:grid-cols-2">
        {realisationsPour(angle).map((r) => (
          <article key={r.titre} className="relative flex flex-col gap-5 rounded-3xl border border-trait p-8">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-terre">{r.contexte}</p>
            <h3 className="font-serif text-3xl">
              <Link href={cheminEtude(r.slug)} className="after:absolute after:inset-0">
                {r.titre}
              </Link>
            </h3>
            <dl className="flex flex-col gap-4 text-encre-douce">
              <div>
                <dt className="text-sm font-medium text-encre">Le besoin</dt>
                <dd className="mt-1">{r.besoin}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-encre">Ce que j&apos;ai livré</dt>
                <dd className="mt-1">{r.livre}</dd>
              </div>
            </dl>
            <ul aria-label="Technologies" className="mt-auto flex flex-wrap gap-2">
              {r.stack.map((techno) => (
                <li key={techno} className="rounded-full border border-trait px-3 py-1 text-xs">
                  {techno}
                </li>
              ))}
            </ul>
            <p aria-hidden="true" className="text-sm font-medium text-brique">
              Voir l&apos;étude de cas →
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}
