import type { Metadata } from "next";
import { Accueil } from "@/components/accueil/Accueil";
import { lienPourAffichage } from "@/lib/liens/affichage";

/** Accueil personnalisé d'un prospect (`/?pour=<jeton>`, réécrit par proxy.ts). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: "/" },
};

type Props = {
  params: Promise<{ jeton: string }>;
  searchParams: Promise<{ apercu?: string | string[] }>;
};

export default async function PagePersonnalisee({ params, searchParams }: Props) {
  const { jeton } = await params;
  const { apercu } = await searchParams;
  const lien = await lienPourAffichage(jeton);
  if (!lien) return <Accueil />;
  return <Accueil personnalisation={{ ...lien, jeton }} signalerVisite={apercu !== "1"} />;
}
