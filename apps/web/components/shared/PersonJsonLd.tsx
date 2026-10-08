import { contact } from "@/data/contact";
import { siteUrl, siteName, siteDescription } from "@/data/site";

// Données structurées schema.org : une personne qui propose ses services.
// Rendu dans le layout, donc sur toutes les pages. Ni adresse ni téléphone :
// le site n'en publie pas.
export function PersonJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteName,
    jobTitle: "Développeur full stack indépendant",
    description: siteDescription,
    url: siteUrl,
    // Vignette générée par app/opengraph-image.tsx.
    image: `${siteUrl}/opengraph-image`,
    email: `mailto:${contact.email}`,
    sameAs: [contact.github],
    knowsAbout: ["Next.js", "React", "TypeScript", "Node.js", "PostgreSQL", "Docker"],
  };

  return (
    <script
      type="application/ld+json"
      // Sérialisation contrôlée d'un objet statique, pas d'entrée utilisateur.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
