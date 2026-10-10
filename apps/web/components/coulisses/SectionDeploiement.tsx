import type { InfosBuild } from "@/lib/coulisses/build-info";
import { formaterDateAbsolue } from "@/lib/coulisses/dates";
import { DateRelative } from "./DateRelative";

const note = (v: number) => Math.round(v * 100);
const ko = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Identité du build en ligne et preuves de qualité mesurées par la CI sur ce commit. */
export function SectionDeploiement({ infos }: { infos: InfosBuild | null }) {
  return (
    <section aria-labelledby="titre-deploiement" className="flex flex-col gap-6">
      <h2 id="titre-deploiement" className="font-serif text-3xl">
        Dernier déploiement
      </h2>
      {infos ? (
        <>
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <code className="rounded bg-surface px-1.5 py-0.5 text-sm">{infos.sha.slice(0, 7)}</code>
            <span>{infos.titre}</span>
            <DateRelative iso={infos.date} absolue={formaterDateAbsolue(infos.date)} />
          </p>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-xl border border-trait p-5">
              <dt className="text-sm text-texte-doux">Tests</dt>
              <dd>
                {infos.tests.unitaires} tests unitaires et d&apos;intégration, {infos.tests.boutEnBout} de bout en bout
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-trait p-5">
              <dt className="text-sm text-texte-doux">Lighthouse (sur 100)</dt>
              <dd>
                Performance {note(infos.lighthouse.performance)} · Accessibilité {note(infos.lighthouse.accessibilite)} ·
                Bonnes pratiques {note(infos.lighthouse.bonnesPratiques)} · Référencement{" "}
                {note(infos.lighthouse.referencement)}
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-trait p-5">
              <dt className="text-sm text-texte-doux">JavaScript de l&apos;accueil</dt>
              <dd>{`${ko.format(infos.poidsJsAccueil / 1_024)}\u00a0Ko transférés`}</dd>
            </div>
          </dl>
          <p className="text-sm text-texte-doux">
            Mesurés par la CI sur ce commit. Notes Lighthouse : la plus basse des {infos.lighthouse.pages} pages
            mesurées.
          </p>
        </>
      ) : (
        <p className="text-texte-doux">Build local : pas de mesures CI.</p>
      )}
    </section>
  );
}
