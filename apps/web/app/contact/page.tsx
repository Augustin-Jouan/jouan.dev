import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { contact } from "@/data/contact";
import { siteName } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contactez ${siteName} : formulaire, téléphone et adresse.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-16">
      <h1 className="text-3xl font-semibold">Contact</h1>

      <ContactForm />

      <address className="not-italic">
        <h2 className="mb-2 font-semibold">Nos coordonnées</h2>
        <p>{contact.adresse}</p>
        <p>
          <a href={contact.telephoneLien}>{contact.telephone}</a>
        </p>
        <p>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </p>
      </address>
    </section>
  );
}
