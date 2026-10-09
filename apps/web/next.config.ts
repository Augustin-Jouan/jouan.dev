import type { NextConfig } from "next";
import path from "node:path";
import { redirections } from "./data/redirections";

const enDeveloppement = process.env.NODE_ENV === "development";

/**
 * Le site ne charge aucune police externe au runtime (next/font les sert
 * depuis le domaine) et ne dépose aucun cookie : la politique peut donc
 * rester stricte sans rien casser.
 *
 * Seule exception : Umami Cloud (mesure d'audience, voir
 * components/shared/Umami.tsx), autorisé dans `script-src` et `connect-src`.
 *
 * `unsafe-inline` reste nécessaire pour les styles : Tailwind et next/font
 * injectent des balises <style>. Les scripts, eux, sont limités au domaine.
 *
 * `unsafe-eval` n'est ajouté qu'en développement : React s'en sert pour ses
 * outils de débogage (reconstruction des piles d'appel, Fast Refresh). Il
 * n'en a aucun usage en production, où la directive reste donc absente.
 */
// Le script est servi par cloud.umami.is mais envoie les visites à
// gateway.umami.is : les deux hôtes sont nécessaires.
const umamiScript = "https://cloud.umami.is";
const umamiApi = "https://gateway.umami.is";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${umamiScript}${enDeveloppement ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // En développement, Fast Refresh passe par un websocket vers l'hôte local.
  `connect-src 'self' ${umamiApi}${enDeveloppement ? " ws: wss:" : ""}`,
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(enDeveloppement ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Le site n'utilise aucune de ces API : on les refuse explicitement.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS n'a de sens que servi en https : inutile et gênant sur localhost.
  ...(enDeveloppement
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

// La démo (public/demo, construite depuis apps/demo-marches) s'affiche dans
// une iframe des études de cas : elle seule accepte d'être incluse, et
// seulement par le site lui-même. La dernière règle qui pose un en-tête l'emporte.
const entetesDemo = [
  { key: "Content-Security-Policy", value: csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'") },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

// Monorepo : le lockfile pnpm et les dépendances hissées sont à la racine du
// dépôt. Le traçage du mode standalone et Turbopack doivent partir de là,
// sinon l'image Docker manque des modules (doc Next : output.md, turbopack.md).
const racineDepot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  // Hébergement : VPS OVH via Coolify, qui tire l'image construite par
  // GitHub Actions à partir du `Dockerfile` du dépôt. Le build ne garde que
  // les fichiers réellement importés (`.next/standalone`) : l'image finale se
  // passe de node_modules.
  //
  // Vercel (vitrine temporaire) branche son propre adaptateur de build, qui
  // lit `.next/next-server.js.nft.json` — fichier que le mode standalone ne
  // produit pas. Next prévient que les deux sont incompatibles : on n'active
  // le standalone qu'en dehors de Vercel.
  output: process.env.VERCEL ? undefined : "standalone",
  outputFileTracingRoot: racineDepot,
  turbopack: { root: racineDepot },

  // `quality={90}` sur une photo importante serait sinon recalé sur 75 par
  // Next 16 ; garder 90 dans la liste.
  images: {
    qualities: [75, 90],
  },
  // N'annonce pas la pile technique aux robots de reconnaissance.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/demo/:path*", headers: entetesDemo },
    ];
  },
  // Next ne sert pas l'index.html d'un dossier de `public` : l'adresse naturelle
  // de la démo est réécrite vers son fichier (les en-têtes ci-dessus s'appliquent
  // au chemin demandé). Les ressources de la démo sont en URL absolues (base Vite).
  async rewrites() {
    return [{ source: "/demo/suivi-de-marches", destination: "/demo/suivi-de-marches/index.html" }];
  },
  async redirects() {
    return redirections;
  },
};

export default nextConfig;
