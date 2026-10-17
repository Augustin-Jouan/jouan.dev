import type { Metadata } from "next";
import Image from "next/image";
import { BlocProjet } from "@/components/a-propos/BlocProjet";
import { CarteFreelance } from "@/components/a-propos/CarteFreelance";
import { FriseParcours } from "@/components/a-propos/FriseParcours";
import { enTeteAPropos, etapesParcours, projetsEcole, projetsFreelance } from "@/data/a-propos";
import { siteName } from "@/data/site";

const description = `${enTeteAPropos.intro} Projets d'école, projets freelance et parcours de ${siteName}.`;

export const metadata: Metadata = {
  title: "À propos",
  description,
  alternates: { canonical: "/a-propos" },
  // Fusion superficielle des métadonnées : sans ces blocs, la page hériterait de ceux de l'accueil.
  // L'image vient du fichier opengraph-image voisin.
  openGraph: { type: "profile", locale: "fr_FR", siteName, url: "/a-propos", title: "À propos", description },
  twitter: { card: "summary_large_image", title: "À propos", description },
};

const bloc = "mx-auto w-full max-w-6xl 2xl:max-w-page px-5 sm:px-8";
const surtitre = "text-xs font-medium uppercase tracking-[0.14em] text-texte-doux";
const titreSection = "mb-12 font-serif text-3xl sm:text-4xl";

/** Qui est derrière le site : les projets d'abord (la preuve), puis le parcours détaillé. */
export default function AProposPage() {
  return (
    <div>
      <header className={`${bloc} flex flex-col gap-6 pb-6 pt-10 sm:flex-row sm:items-center sm:gap-8 sm:pt-14`}>
        <Image
          src="/portrait/augustin-jouan.webp"
          alt=""
          width={400}
          height={400}
          sizes="(min-width: 640px) 112px, 96px"
          className="size-24 shrink-0 rounded-full ring-2 ring-accent ring-offset-4 ring-offset-fond sm:size-28"
        />
        <div>
          <p className={`mb-2 ${surtitre}`}>{enTeteAPropos.surtitre}</p>
          <h1 className="font-serif text-4xl leading-[1.05] sm:text-5xl">{enTeteAPropos.titre}</h1>
          <p className="mt-3 text-lg text-texte-doux">{enTeteAPropos.intro}</p>
        </div>
      </header>

      <section aria-labelledby="projets" className={`${bloc} py-14 sm:py-20`}>
        <h2 id="projets" className={titreSection}>
          Quelques exemples de projets
        </h2>
        <div className="flex flex-col gap-20 sm:gap-28">
          {projetsEcole.map((projet, i) => (
            <BlocProjet key={projet.slug} projet={projet} inverse={i % 2 === 1} prioritaire={i === 0} />
          ))}
        </div>
        <p className={`mb-6 mt-20 sm:mt-28 ${surtitre}`}>En freelance</p>
        <div className="grid gap-6 md:grid-cols-2">
          {projetsFreelance.map((slug) => (
            <CarteFreelance key={slug} slug={slug} />
          ))}
        </div>
      </section>

      <section aria-labelledby="parcours" className={bloc}>
        {/* Le filet sur un bloc intérieur : il s'arrête aux bords du contenu, pas des marges. */}
        <div className="border-t border-trait py-14 sm:py-20">
          <h2 id="parcours" className={titreSection}>
            Parcours
          </h2>
          <FriseParcours etapes={etapesParcours} />
        </div>
      </section>
    </div>
  );
}
