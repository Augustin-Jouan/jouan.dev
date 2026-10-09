import type { Metadata } from "next";
import { Accueil } from "@/components/accueil/Accueil";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <Accueil />;
}
