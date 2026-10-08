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
    <section className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-16">
      <h1 className="font-serif text-5xl">Mentions légales</h1>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Éditeur du site</h2>
        <dl className="flex flex-col gap-2">
          <Ligne label="Éditeur :" valeur={m.editeur} />
          <Ligne label="Statut :" valeur={m.statut} />
          <Ligne label="Adresse :" valeur={m.adresse} />
          <Ligne label="Téléphone :" valeur={m.telephone} />
          <Ligne label="Email :" valeur={m.email} />
          <Ligne label="SIREN :" valeur={m.siren} />
          <Ligne label="TVA :" valeur={m.tva} />
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
        <h2 className="text-xl font-semibold">Médiation de la consommation</h2>
        <p>
          Conformément aux articles L.611-1 et L.616-1 du code de la
          consommation, en cas de litige vous pouvez recourir gratuitement au
          médiateur de la consommation dont relève {m.editeur}, après avoir
          adressé une réclamation écrite préalable.
        </p>
        <dl className="flex flex-col gap-2">
          <Ligne label="Médiateur :" valeur={m.mediateur.nom} />
          <Ligne label="Adresse :" valeur={m.mediateur.adresse} />
          <Ligne label="Site internet :" valeur={m.mediateur.site} />
        </dl>
      </div>
    </section>
  );
}
