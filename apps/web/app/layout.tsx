import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SkipLink, CONTENU_ID } from "@/components/layout/SkipLink";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MessageConsole } from "@/components/commandes/MessageConsole";
import { RaccourciCommandes } from "@/components/commandes/RaccourciCommandes";
import { PersonJsonLd } from "@/components/shared/PersonJsonLd";
import { Umami } from "@/components/shared/Umami";
import { commandes } from "@/data/commandes";
import { hoteSite, siteUrl, siteName, siteDescription } from "@/data/site";
import { couleur } from "@/lib/charte";
import { texteIndices } from "@/lib/commandes/indices";
import { SCRIPT_VOILE } from "@/lib/encre/voile";

// next/font sert les fichiers depuis le domaine : la CSP n'a pas besoin de
// Google Fonts.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
});

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

/** Indices des easter eggs pour qui lit la source de la page (sous-projet 7). */
const COMMENTAIRE_SOURCE = `<!--\n${texteIndices(hoteSite)}\n-->`;

/** Barre du navigateur mobile et contrôles natifs aux couleurs de la nuit. */
export const viewport: Viewport = {
  themeColor: couleur("fond"),
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning : le script du voile ajoute `data-voile-intro` à
    // <html> avant l'hydratation ; ne vaut que pour les attributs de <html>.
    <html lang="fr" className={`${inter.variable} ${instrument.variable}`} suppressHydrationWarning>
      {/* Avant le premier affichage : voile de l'intro (lib/encre/voile.ts). */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_VOILE }} />
      </head>
      {/* `relative` : le fond de l'accueil se positionne par rapport au corps. */}
      <body className="relative flex min-h-screen flex-col font-sans text-texte">
        <div hidden dangerouslySetInnerHTML={{ __html: COMMENTAIRE_SOURCE }} />
        <PersonJsonLd />
        <Umami />
        <SkipLink />
        <Header />
        {/* tabIndex -1 : sans lui, Safari et Firefox défilent jusqu'au
            contenu mais laissent le focus sur le lien d'évitement. */}
        <main id={CONTENU_ID} tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <Footer />
        <RaccourciCommandes commandes={commandes} />
        <MessageConsole hote={hoteSite} />
      </body>
    </html>
  );
}
