import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { contact } from "@/data/contact";
import { siteName } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contacter ${siteName}, développeur full stack indépendant : formulaire ou e-mail.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-10 px-5 py-16">
      <h1 className="font-serif text-5xl">Contact</h1>

      <ContactForm />

      <div>
        <h2 className="mb-2 font-semibold">Écrire directement</h2>
        <p>
          <a href={`mailto:${contact.email}`} className="underline">
            {contact.email}
          </a>
        </p>
      </div>
    </section>
  );
}
