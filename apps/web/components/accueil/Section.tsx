type Props = {
  id: string;
  surtitre: string;
  titre: string;
  children: React.ReactNode;
};

/** Section de l'accueil : ancre, surtitre, titre, puis contenu. */
export function Section({ id, surtitre, titre, children }: Props) {
  const titreId = `${id}-titre`;

  return (
    <section
      id={id}
      aria-labelledby={titreId}
      data-direct-section={id}
      className="mx-auto w-full max-w-6xl 2xl:max-w-page scroll-mt-8 px-5 py-20 sm:px-8 sm:py-28"
    >
      {/* Repère des curseurs en direct (table REPERES de lib/direct/coordonnees.ts). */}
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-terre">{surtitre}</p>
      <h2 id={titreId} className="mb-12 max-w-3xl font-serif text-4xl leading-[1.05] sm:text-5xl 2xl:text-6xl">
        {titre}
      </h2>
      {children}
    </section>
  );
}
