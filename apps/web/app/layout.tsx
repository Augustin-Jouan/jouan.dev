import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SkipLink, CONTENU_ID } from "@/components/layout/SkipLink";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LocalBusinessJsonLd } from "@/components/shared/LocalBusinessJsonLd";
import { Umami } from "@/components/shared/Umami";
import { siteUrl, siteName, siteDescription } from "@/data/site";

// Police neutre par défaut ; à remplacer avec le design du site. next/font
// sert le fichier depuis le domaine : la CSP n'a pas besoin de Google Fonts.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Pas de `alternates` ici : les champs de metadata sont hérités par les
// segments enfants, et une canonical posée à la racine ferait déclarer à
// chaque page qu'elle est un doublon de l'accueil. Chaque page pose la sienne.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s — ${siteName}`,
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName,
    title: siteName,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        <LocalBusinessJsonLd />
        <Umami />
        <SkipLink />
        <Header />
        {/* tabIndex -1 : sans lui, Safari et Firefox défilent jusqu'au
            contenu mais laissent le focus sur le lien d'évitement. */}
        <main id={CONTENU_ID} tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
