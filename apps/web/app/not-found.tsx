import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-24">
      <h1 className="font-serif text-5xl">Page introuvable</h1>
      <p>La page que vous cherchez n&apos;existe pas ou a été déplacée.</p>
      <p>
        <Link href="/" className="underline">
          Retour à l&apos;accueil
        </Link>
      </p>
    </section>
  );
}
