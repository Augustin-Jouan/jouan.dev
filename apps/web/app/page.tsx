import type { Metadata } from "next";
import Link from "next/link";
import { siteName, siteDescription } from "@/data/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Page d'accueil placeholder : à remplacer entièrement par le design du site. */
export default function HomePage() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold">{siteName}</h1>
      <p>{siteDescription}</p>
      <p>
        <Link href="/contact" className="underline">
          Nous contacter
        </Link>
      </p>
    </section>
  );
}
