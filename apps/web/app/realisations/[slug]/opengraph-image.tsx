import { notFound } from "next/navigation";
import { etudesDeCas, trouverEtude } from "@/data/realisations";
import { tailleVignette, vignette } from "@/lib/vignette";

export const size = tailleVignette;
export const alt = "Étude de cas";
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return etudesDeCas.map((etude) => ({ slug: etude.slug }));
}

export default async function Image({ params }: Props) {
  const etude = trouverEtude((await params).slug);
  if (!etude) notFound();
  return vignette({ surtitre: etude.surtitre, titre: etude.titre, sousTitre: etude.sousTitre });
}
