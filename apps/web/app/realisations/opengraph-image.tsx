import { tailleVignette, vignette } from "@/lib/vignette";

export const size = tailleVignette;
export const alt = "Réalisations";
export const contentType = "image/png";

export default function Image() {
  return vignette({
    surtitre: "Réalisations",
    titre: "Quelques projets récents",
    sousTitre: "Une application de suivi de marchés de travaux et le site vitrine d'un artisan.",
  });
}
