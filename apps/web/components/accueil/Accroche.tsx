import Link from "next/link";
import { accrochesParAngle, salutation, type Angle } from "@/data/accueil";

/** Premier écran : promesse, signature et deux actions. */
export function Accroche({ angle = "application", nom }: { angle?: Angle; nom?: string }) {
  const accroche = accrochesParAngle[angle];
  return (
    <section
      aria-labelledby="accroche-titre"
      className="mx-auto flex min-h-[min(calc(100svh-5rem),56rem)] w-full max-w-6xl flex-col justify-end px-5 pb-16 pt-24 sm:px-8 sm:pb-24 2xl:max-w-page"
    >
      {/* Le compteur de visiteurs (sous-projet 4) se placera aussi au-dessus du surtitre. */}
      {nom && (
        <p className="mb-3 font-serif text-2xl text-encre sm:text-3xl 2xl:text-4xl">{salutation(nom)}</p>
      )}
      <p className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-terre 2xl:text-sm">
        {accroche.surtitre}
      </p>
      <h1
        id="accroche-titre"
        className="max-w-4xl font-serif text-5xl leading-[0.98] tracking-[-0.01em] break-words sm:text-7xl lg:text-8xl 2xl:max-w-6xl 2xl:text-9xl"
      >
        {accroche.titreAvant}
        <em className="text-brique">{accroche.titreAccent}</em>
        {accroche.titreApres}
      </h1>
      <p className="mt-6 max-w-xl text-lg text-encre-douce 2xl:max-w-2xl 2xl:text-xl">{accroche.sousTitre}</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={accroche.actionPrincipale.href}
          className="rounded-full bg-encre px-6 py-3 text-sm font-medium text-papier transition-opacity hover:opacity-85 2xl:px-7 2xl:py-3.5 2xl:text-base"
        >
          {accroche.actionPrincipale.libelle}
        </Link>
        <Link
          href={accroche.actionSecondaire.href}
          className="rounded-full border border-trait px-6 py-3 text-sm font-medium transition-colors hover:border-encre 2xl:px-7 2xl:py-3.5 2xl:text-base"
        >
          {accroche.actionSecondaire.libelle}
        </Link>
      </div>
    </section>
  );
}
