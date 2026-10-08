import type { Metadata } from "next";
import { A_COMPLETER, mentionsLegales as m } from "@/data/legal";
import { siteName } from "@/data/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: `Mentions légales du site de ${siteName}.`,
  alternates: { canonical: "/mentions-legales" },
};

function Ligne({ label, valeur }: { label: string; valeur: string }) {
  const placeholder = valeur === A_COMPLETER;

  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="font-semibold">{label}</dt>
      <dd className={placeholder ? "italic" : undefined}>{valeur}</dd>
    </div>
  );
}

export default function MentionsLegalesPage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">Mentions légales</h1>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Éditeur du site</h2>
        <dl className="flex flex-col gap-2">
          <Ligne label="Raison sociale :" valeur={m.raisonSociale} />
          <Ligne label="Capital social :" valeur={m.capitalSocial} />
          <Ligne label="Adresse :" valeur={m.adresse} />
          <Ligne label="Téléphone :" valeur={m.telephone} />
          <Ligne label="Email :" valeur={m.email} />
          <Ligne label="RCS :" valeur={m.rcs} />
          <Ligne label="N° TVA intracommunautaire :" valeur={m.tvaIntracommunautaire} />
          <Ligne label="Directeur de la publication :" valeur={m.directeurPublication} />
        </dl>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Hébergement</h2>
        <dl className="flex flex-col gap-2">
          <Ligne label="Hébergeur :" valeur={m.hebergeur.nom} />
          <Ligne label="Adresse :" valeur={m.hebergeur.adresse} />
          <Ligne label="Téléphone :" valeur={m.hebergeur.telephone} />
        </dl>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">
          Médiation de la consommation
        </h2>
        <p>
          Conformément aux articles L.611-1 et L.616-1 du code de la
          consommation, en cas de litige vous pouvez recourir gratuitement au
          médiateur de la consommation dont relève {m.raisonSociale}, après avoir
          adressé une réclamation écrite préalable.
        </p>
        <dl className="flex flex-col gap-2">
          <Ligne label="Médiateur :" valeur={m.mediateur.nom} />
          <Ligne label="Adresse :" valeur={m.mediateur.adresse} />
          <Ligne label="Site internet :" valeur={m.mediateur.site} />
        </dl>
      </div>

      {m.assurance && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">
            Assurance professionnelle
          </h2>
          <p>
            Conformément à l&apos;article 22-2 de la loi n° 96-603 du 5 juillet
            1996, {m.raisonSociale} dispose d&apos;une assurance de
            responsabilité civile professionnelle et de garantie décennale.
          </p>
          <dl className="flex flex-col gap-2">
            <Ligne label="Assureur :" valeur={m.assurance.assureur} />
            <Ligne label="Adresse :" valeur={m.assurance.adresse} />
            <Ligne label="N° de contrat :" valeur={m.assurance.contrat} />
            <Ligne label="Garanties :" valeur={m.assurance.garanties} />
            <Ligne
              label="Couverture géographique :"
              valeur={m.assurance.couvertureGeographique}
            />
          </dl>
        </div>
      )}
    </section>
  );
}
