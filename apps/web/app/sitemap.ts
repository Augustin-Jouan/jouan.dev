import type { MetadataRoute } from "next";
import { siteUrl } from "@/data/site";

/** Ajouter ici chaque page créée. Les pages légales restent en priorité basse. */
const pages = [
  "",
  "/contact",
  "/realisations",
  "/coulisses",
  "/mentions-legales",
  "/politique-de-confidentialite",
];

const priorite = (chemin: string) =>
  chemin === "" ? 1 : chemin === "/coulisses" ? 0.5 : chemin.startsWith("/mentions") || chemin.startsWith("/politique") ? 0.3 : 0.8;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return pages.map((chemin) => ({
    url: `${siteUrl}${chemin}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: priorite(chemin),
  }));
}
