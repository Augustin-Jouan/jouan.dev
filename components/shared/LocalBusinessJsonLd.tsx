import { contact } from "@/data/contact";
import { siteUrl, siteName, siteDescription } from "@/data/site";

type Props = {
  /**
   * Type schema.org de l'entreprise. `LocalBusiness` convient à tout le
   * monde ; un sous-type (`Restaurant`, `Electrician`, `Dentist`, `Store`…)
   * est plus parlant pour Google. Liste : https://schema.org/LocalBusiness
   */
  type?: string;
};

// Données structurées schema.org pour le référencement local (pack local,
// résultats enrichis). Rendu dans le layout, donc sur toutes les pages.
export function LocalBusinessJsonLd({ type = "LocalBusiness" }: Props) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": type,
    name: siteName,
    description: siteDescription,
    url: siteUrl,
    // Vignette générée par app/opengraph-image.tsx.
    image: `${siteUrl}/opengraph-image`,
    telephone: contact.telephone,
    email: contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.adressePostale.rue,
      postalCode: contact.adressePostale.codePostal,
      addressLocality: contact.adressePostale.ville,
      addressRegion: contact.adressePostale.region,
      addressCountry: "FR",
    },
    hasMap: contact.lienCarte,
    ...(contact.geo
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: contact.geo.latitude,
            longitude: contact.geo.longitude,
          },
        }
      : {}),
    ...(contact.profils.length > 0 ? { sameAs: contact.profils } : {}),
  };

  return (
    <script
      type="application/ld+json"
      // Sérialisation contrôlée d'un objet statique, pas d'entrée utilisateur.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
