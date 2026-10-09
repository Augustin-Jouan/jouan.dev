import { accroche } from "@/data/accueil";
import { siteName, siteDescription } from "@/data/site";
import { tailleVignette, vignette } from "@/lib/vignette";

// Vignette de partage (LinkedIn, WhatsApp, iMessage…). Next la câble sur
// `og:image` et `twitter:image` pour tout le site et la génère au build.
export const alt = siteName;
export const size = tailleVignette;
export const contentType = "image/png";

export default function Image() {
  return vignette({ surtitre: accroche.surtitre, titre: siteName, sousTitre: siteDescription });
}
