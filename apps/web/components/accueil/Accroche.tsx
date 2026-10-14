import Link from "next/link";
import { LienAuSurvol } from "@/components/layout/LienAuSurvol";
import { CompteurPresents } from "@/components/direct/CompteurPresents";
import { accrochesParAngle, salutation, type Angle } from "@/data/accueil";

/** Premier écran : promesse, signature et deux actions. */
export function Accroche({ angle = "application", nom }: { angle?: Angle; nom?: string }) {
  const accroche = accrochesParAngle[angle];
  return (
    <section
      aria-labelledby="accroche-titre"
      className="mx-auto flex min-h-[min(calc(100svh-5rem),56rem)] w-full max-w-6xl flex-col justify-end px-5 pb-16 pt-24 sm:px-8 sm:pb-24 2xl:max-w-page"
    >
      <CompteurPresents />
      {nom && (
        <p className="mb-3 break-words font-serif text-2xl text-texte sm:text-3xl 2xl:text-4xl">{salutation(nom)}</p>
      )}
      {/* Sur ordinateur, le portrait se place à gauche du surtitre et du titre ;
          sur téléphone, au-dessus (le titre n'a pas la place à côté). */}
      <div className="md:flex md:items-center md:gap-10 2xl:gap-14">
        {/* Simple <img> : `next/image` ajouterait du JS client à l'accueil, au-delà
            du budget Lighthouse, pour un fichier qui fait déjà 9 Ko. Chargé tout de
            suite, sans précharge (le titre reste l'élément LCP). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/portrait/augustin-jouan.webp"
          alt="Augustin Jouan"
          width={400}
          height={400}
          decoding="async"
          className="mb-6 size-24 shrink-0 rounded-full ring-2 ring-accent ring-offset-4 ring-offset-fond sm:size-28 md:mb-0 md:size-32 lg:size-40 2xl:size-48"
        />
        <div className="min-w-0">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-texte-doux 2xl:text-sm">
            {accroche.surtitre}
          </p>
          <h1
            id="accroche-titre"
            className="max-w-4xl font-serif text-5xl leading-[0.98] tracking-[-0.01em] break-words sm:text-7xl lg:text-8xl 2xl:max-w-6xl 2xl:text-9xl"
          >
            {accroche.titreAvant}
            <em className="text-accent">{accroche.titreAccent}</em>
            {accroche.titreApres}
          </h1>
        </div>
      </div>
      <p className="mt-6 max-w-xl text-lg text-texte-doux 2xl:max-w-2xl 2xl:text-xl">{accroche.sousTitre}</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={accroche.actionPrincipale.href}
          className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-sur-accent transition-opacity hover:opacity-85 2xl:px-7 2xl:py-3.5 2xl:text-base"
        >
          {accroche.actionPrincipale.libelle}
        </Link>
        {/* Vers /realisations : préchargé à l'intention seulement (budget JS de l'accueil). */}
        <LienAuSurvol
          href={accroche.actionSecondaire.href}
          className="rounded-full border border-trait-fort px-6 py-3 text-sm font-medium transition-[border-color] hover:border-texte 2xl:px-7 2xl:py-3.5 2xl:text-base"
        >
          {accroche.actionSecondaire.libelle}
        </LienAuSurvol>
      </div>
    </section>
  );
}
