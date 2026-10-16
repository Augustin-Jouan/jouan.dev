import { Section } from "./Section";
import { ContactForm } from "@/components/contact/ContactForm";
import { ANCRES, sections } from "@/data/accueil";
import { contact } from "@/data/contact";

/** Formulaire de contact du châssis, et l'e-mail pour qui préfère écrire. */
export function SectionContact({ jeton }: { jeton?: string }) {
  return (
    <Section id={ANCRES.contact} {...sections.contact}>
      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <ContactForm jeton={jeton} />
        {/* Le trait conducteur (lib/trait) signe dans la place libre sous l'adresse. */}
        {/* Centré sur téléphone ; l'espace insécable garde le deux-points avec son mot. */}
        <div data-trait="signature" className="flex flex-col gap-3 text-texte-doux max-sm:items-center max-sm:text-center">
          <p>Vous préférez l&apos;e-mail ? Écrivez-moi directement&nbsp;:</p>
          <p>
            <a
              href={`mailto:${contact.email}`}
              className="font-serif text-3xl break-all text-texte underline decoration-trait-fort underline-offset-4 hover:decoration-accent"
            >
              {contact.email}
            </a>
          </p>
        </div>
      </div>
    </Section>
  );
}
