import { describe, expect, it } from "vitest";
import {
  BASE,
  adapterActions,
  adapterConfig,
  adapterLayout,
  bandeauDemo,
  chargeurImages,
  lireSiteEnLigne,
} from "./demo-site-artisan.mjs";

const CONFIG = `import type { NextConfig } from "next";
import { redirections } from "./data/redirections";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  images: {
    qualities: [75, 90],
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return redirections;
  },
};

export default nextConfig;
`;

const ACTIONS = `"use server";

import { headers } from "next/headers";
import { sendContactEmail } from "@/lib/email";
import { verifierLimite } from "@/lib/rate-limit";
import { LIMITES } from "./limites";

export type ContactFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

const EMAIL_REGEX = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const invalide = valider({ nom: "", email: "", telephone: "", message: "" });
  if (invalide) return invalide;
  await sendContactEmail({});
  return { status: "success", message: "Merci, votre message a bien été envoyé." };
}

type Champs = { nom: string; email: string; telephone: string; message: string };

function valider({ nom, email, telephone, message }: Champs): ContactFormState | null {
  if (!nom) {
    return { status: "error", message: "Merci d'indiquer votre nom." };
  }
  return null;
}

async function cleAppelant(): Promise<string> {
  const enTetes = await headers();
  return "inconnu";
}
`;

const LAYOUT = `import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col">
        <Header />
        {children}
      </body>
    </html>
  );
}
`;

describe("copie de démo du site de l'artisan : adaptations", () => {
  it("next.config : export statique sous le préfixe, chargeur d'images, ni en-têtes ni redirections", () => {
    const sortie = adapterConfig(CONFIG);
    expect(sortie).toContain('output: "export"');
    expect(sortie).toContain(`basePath: "${BASE}"`);
    expect(sortie).toContain("trailingSlash: false");
    expect(sortie).toContain('loader: "custom"');
    expect(sortie).toContain('loaderFile: "./chargeur-images-demo.ts"');
    expect(sortie).not.toMatch(/headers\(\)|redirects\(\)|redirections/);
    expect(sortie).toContain("poweredByHeader: false");
  });

  it("le chargeur d'images préfixe les chemins absolus et laisse les autres", async () => {
    const source = chargeurImages();
    const chargeur = await import(`data:text/javascript,${encodeURIComponent(source.replace(/: \{[^}]*\}/, ""))}`);
    expect(chargeur.default({ src: "/images/logo.jpeg" })).toBe(`${BASE}/images/logo.jpeg`);
    expect(chargeur.default({ src: "https://exemple.fr/a.png" })).toBe("https://exemple.fr/a.png");
    expect(chargeur.default({ src: "data:image/png;base64,AA" })).toBe("data:image/png;base64,AA");
  });

  it("action du formulaire : garde type et validation, n'envoie rien et répond par le message de démo", () => {
    const sortie = adapterActions(ACTIONS);
    expect(sortie).not.toMatch(/use server|sendContactEmail|verifierLimite|next\/headers|cleAppelant/);
    expect(sortie).toContain('import { LIMITES } from "./limites";');
    expect(sortie).toContain("export type ContactFormState");
    expect(sortie).toContain("const EMAIL_REGEX");
    expect(sortie).toContain("function valider(");
    expect(sortie).toContain("Merci d'indiquer votre nom.");
    expect(sortie).toContain("export async function submitContactForm(");
    expect(sortie).toContain("Démo : ce message n'est pas envoyé. Pour joindre l'entreprise, passez par son vrai site.");
  });

  it("mise en page : le bandeau en tête de <body>", () => {
    const sortie = adapterLayout(LAYOUT);
    expect(sortie).toContain('import { BandeauDemo } from "@/components/demo/BandeauDemo";');
    expect(sortie).toMatch(/<body className="flex min-h-screen flex-col">\n\s*<BandeauDemo \/>\n\s*<Header \/>/);
  });

  it("le bandeau : visible hors d'une iframe seulement, avec le vrai site et le retour au portfolio", () => {
    const source = bandeauDemo("https://sdj-elec.jouan.dev/");
    expect(source).toContain("window.self===window.top");
    expect(source).toContain("data-plein-ecran");
    expect(source).toContain("[html[data-plein-ecran]_&]:block");
    expect(source).toContain("Démo réalisée par Augustin Jouan");
    expect(source).toContain('href="https://sdj-elec.jouan.dev/"');
    expect(source).toContain('href="/realisations#site-vitrine"');
  });

  it("une cible introuvable arrête tout, en nommant le fichier", () => {
    expect(() => adapterConfig("export default {};")).toThrow(/next\.config\.ts/);
    expect(() => adapterActions("export {};")).toThrow(/actions\.ts/);
    expect(() => adapterLayout("export {};")).toThrow(/layout\.tsx/);
  });

  it("l'adresse en ligne vient de data/realisations.ts", () => {
    expect(lireSiteEnLigne('export const SITE_ARTISAN = "https://sdj-elec.jouan.dev/";')).toBe("https://sdj-elec.jouan.dev/");
    expect(() => lireSiteEnLigne("rien")).toThrow(/SITE_ARTISAN/);
  });
});
