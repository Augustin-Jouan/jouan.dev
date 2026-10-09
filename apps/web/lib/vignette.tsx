import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const tailleVignette = { width: 1200, height: 630 };

// next/og ne lit ni le woff2 ni le CSS du site : la police est lue au build
// (les vignettes sont prérendues), au format woff.
export async function chargerInstrumentSerif(): Promise<ArrayBuffer> {
  const fichier = await readFile(
    join(
      process.cwd(),
      "node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff"
    )
  );
  return fichier.buffer.slice(fichier.byteOffset, fichier.byteOffset + fichier.byteLength) as ArrayBuffer;
}

type Contenu = { surtitre: string; titre: string; sousTitre: string };

// Couleurs de l'Atelier clair, en dur : le CSS du site n'existe pas ici.
// Une seule police est chargée (Instrument Serif) : Satori l'applique à tout le texte.
export async function vignette({ surtitre, titre, sousTitre }: Contenu) {
  const police = await chargerInstrumentSerif();
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
          {surtitre}
        </div>
        <div style={{ fontSize: 84, lineHeight: 1.02, fontFamily: "Instrument Serif" }}>{titre}</div>
        <div style={{ fontSize: 30, color: "#5b574f", maxWidth: 960 }}>
          {sousTitre}
        </div>
      </div>
    ),
    {
      ...tailleVignette,
      fonts: [{ name: "Instrument Serif", data: police, style: "normal", weight: 400 }],
    }
  );
}
