import Link from "next/link";
import { Section } from "./Section";
import { CarteRealisation } from "@/components/realisations/CarteRealisation";
import { ANCRES, realisationsPour, sections, type Angle } from "@/data/accueil";

/** Aperçu des réalisations, avec un lien vers leur page. */
export function Realisations({ angle = "application" }: { angle?: Angle }) {
  return (
    <Section id={ANCRES.realisations} {...sections.realisations}>
      <div className="grid gap-5 md:grid-cols-2">
        {realisationsPour(angle).map((r) => (
          <CarteRealisation key={r.slug} realisation={r} niveau="h3" />
        ))}
      </div>
      <Link href="/realisations" className="mt-8 inline-block font-medium text-accent underline-offset-4 hover:underline">
        Toutes les réalisations<span aria-hidden="true"> →</span>
      </Link>
    </Section>
  );
}
