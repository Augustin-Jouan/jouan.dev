import { ImageResponse } from "next/og";
import { siteName, siteDescription } from "@/data/site";

// Vignette de partage (LinkedIn, WhatsApp, iMessage…). Next la câble sur
// `og:image` et `twitter:image` pour tout le site et la génère au build.
// Couleurs de l'Atelier clair, en dur : le CSS du site n'existe pas ici.
export const alt = siteName;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 20,
          padding: "72px",
          background: "#f3efe7",
          color: "#1b1a17",
          fontFamily: "serif",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -140,
            top: -180,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, #e0582b 0%, #ef9c62 40%, rgba(243,239,231,0) 70%)",
          }}
        />
        <div style={{ fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "#8a5a3c" }}>
          Développeur full stack · indépendant
        </div>
        <div style={{ fontSize: 84, lineHeight: 1.02 }}>{siteName}</div>
        <div style={{ fontSize: 30, color: "#5b574f", maxWidth: 960, fontFamily: "sans-serif" }}>
          {siteDescription}
        </div>
      </div>
    ),
    size
  );
}
