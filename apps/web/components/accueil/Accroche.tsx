import Link from "next/link";
import { accroche } from "@/data/accueil";

/** Premier écran : promesse, signature et deux actions. */
export function Accroche() {
  return (
    <section
      aria-labelledby="accroche-titre"
      className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-6xl flex-col justify-end px-5 pb-16 pt-24 sm:px-8 sm:pb-24"
    >
      {/* L'accueil personnalisé (?pour=…) et le compteur de visiteurs se
          placeront au-dessus du surtitre (sous-projets 3 et 4). */}
      <p className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-terre">
        {accroche.surtitre}
      </p>
      <h1
        id="accroche-titre"
        className="max-w-4xl font-serif text-5xl leading-[0.98] tracking-[-0.01em] break-words sm:text-7xl lg:text-8xl"
      >
        {accroche.titreAvant}
        <em className="text-brique">{accroche.titreAccent}</em>
        {accroche.titreApres}
      </h1>
      <p className="mt-6 max-w-xl text-lg text-encre-douce">{accroche.sousTitre}</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={accroche.actionPrincipale.href}
          className="rounded-full bg-encre px-6 py-3 text-sm font-medium text-papier transition-opacity hover:opacity-85"
        >
          {accroche.actionPrincipale.libelle}
        </Link>
        <Link
          href={accroche.actionSecondaire.href}
          className="rounded-full border border-trait px-6 py-3 text-sm font-medium transition-colors hover:border-encre"
        >
          {accroche.actionSecondaire.libelle}
        </Link>
      </div>
    </section>
  );
}
