import { LienAuSurvol } from "@/components/layout/LienAuSurvol";
import type { Realisation } from "@/data/accueil";
import { cheminEtude } from "@/data/realisations";

/**
 * Carte d'une réalisation : besoin, livrable, technologies. Toute la carte
 * ouvre l'étude de cas ; « Voir le site », posé au-dessus, ouvre le site du client.
 */
export function CarteRealisation({ realisation: r, niveau: Titre }: { realisation: Realisation; niveau: "h2" | "h3" }) {
  return (
    <article className="relative flex flex-col gap-5 rounded-3xl border border-trait p-8">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-texte-doux">{r.contexte}</p>
      <Titre className="font-serif text-3xl">
        {/* Préchargé à l'intention seulement : le JS de /realisations hors du budget de l'accueil. */}
        <LienAuSurvol href={cheminEtude(r.slug)} className="after:absolute after:inset-0">
          {r.titre}
        </LienAuSurvol>
      </Titre>
      <dl className="flex flex-col gap-4 text-texte-doux">
        <div>
          <dt className="text-sm font-medium text-texte">Le besoin</dt>
          <dd className="mt-1">{r.besoin}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-texte">Ce que j&apos;ai livré</dt>
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
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium">
        <p aria-hidden="true" className="text-accent">
          Voir l&apos;étude de cas →
        </p>
        {r.site && (
          <a href={r.site} className="relative z-10 text-texte-doux underline transition-[color] hover:text-texte">
            Voir le site<span aria-hidden="true"> ↗</span>
          </a>
        )}
      </div>
    </article>
  );
}
