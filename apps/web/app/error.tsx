"use client"; // Les error boundaries doivent être des Client Components

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-24">
      <h1 className="font-serif text-5xl">Une erreur est survenue</h1>
      <p>Désolé, un problème est survenu. Vous pouvez réessayer ou me contacter directement.</p>
      <p className="flex gap-4">
        <button type="button" onClick={() => window.location.reload()} className="underline">
          Réessayer
        </button>
        <Link href="/" className="underline">
          Accueil
        </Link>
      </p>
    </section>
  );
}
