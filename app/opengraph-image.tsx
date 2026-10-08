import { ImageResponse } from "next/og";
import { siteName, siteDescription } from "@/data/site";

// Vignette de partage (WhatsApp, Facebook, LinkedIn, iMessage). Next la câble
// automatiquement sur `og:image` et `twitter:image` pour tout le site, et la
// génère une fois pour toutes au build. À refaire avec le design du site
// (logo, couleurs) ; la version neutre reste correcte en attendant.
export const alt = siteName;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
          padding: "72px",
          background: "#111827",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{siteName}</div>
        <div style={{ fontSize: 30, color: "#d1d5db", maxWidth: 1000 }}>{siteDescription}</div>
      </div>
    ),
    size
  );
}
