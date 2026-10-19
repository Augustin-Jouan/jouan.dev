import { enTeteAPropos } from "@/data/a-propos";
import { tailleVignette, vignette } from "@/lib/vignette";

export const size = tailleVignette;
export const alt = "À propos";
export const contentType = "image/png";

export default function Image() {
  return vignette({ surtitre: enTeteAPropos.surtitre, titre: enTeteAPropos.titre, sousTitre: enTeteAPropos.intro });
}
