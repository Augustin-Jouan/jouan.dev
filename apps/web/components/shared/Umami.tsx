import Script from "next/script";

// Mesure d'audience Umami Cloud : sans cookie ni identifiant personnel,
// exemptée de consentement CNIL. Absent en dev/test tant que la variable
// n'est pas renseignée, pour ne pas polluer les statistiques.
export function Umami() {
  const websiteId = process.env.UMAMI_WEBSITE_ID;
  if (!websiteId) return null;
  return (
    <Script
      src="https://cloud.umami.is/script.js"
      data-website-id={websiteId}
      strategy="afterInteractive"
    />
  );
}
