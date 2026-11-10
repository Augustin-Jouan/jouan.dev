/**
 * Fabrique la carte de visite aux couleurs du site (charte « Nuit mauve ») :
 * - recto : le premier écran de l'accueil (nuage de traits, nom, métier) ;
 * - verso : la section Contact (le trait conducteur part du QR code du site, signe et file jusqu'au bouton).
 *
 * Format : 85 × 55 mm, plus 3 mm de fond perdu de chaque côté (91 × 61 mm).
 * Sorties, dans docs/carte-de-visite/ :
 * - carte-de-visite.pdf : deux pages (recto, verso) au format avec fond perdu, pour l'imprimeur ;
 * - apercu.png : les deux faces au format fini, pour relire à l'écran.
 *
 * Couleurs, nuage, signature, nom et adresses viennent du site (lib/charte.ts,
 * lib/encre/nuage.ts, lib/trait/signature.ts, data/site.ts, data/contact.ts, data/legal.ts pour le
 * téléphone). Le QR code mène à l'adresse du site.
 *
 * Usage : `pnpm fabriquer-carte-de-visite`. Sans le Chromium de Playwright (`playwright install`),
 * donner celui de la machine : `CHROMIUM=/chemin/vers/chromium pnpm fabriquer-carte-de-visite`.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import qrcode from "qrcode-generator";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");

// Les modules du site s'importent entre eux sans extension (`../charte`) ou par l'alias `@/` : Node
// exige l'extension et ne connaît pas l'alias.
registerHooks({
  resolve(cible, contexte, suivant) {
    const chemin = cible.startsWith("@/") ? pathToFileURL(join(app, cible.slice(2))).href : cible;
    try {
      return suivant(chemin, contexte);
    } catch (erreur) {
      if (chemin !== cible || cible.startsWith(".")) return suivant(`${chemin}.ts`, contexte);
      throw erreur;
    }
  },
});

const { couleur } = await import("../lib/charte.ts");
const { COULEURS_NUAGE, opaciteTrait, semerTraits } = await import("../lib/encre/nuage.ts");
const { SIGNATURE, SIGNATURE_DEPART } = await import("../lib/trait/signature.ts");
const { hoteSite, siteMetier, siteName, siteUrl } = await import("../data/site.ts");
const { contact } = await import("../data/contact.ts");
const { mentionsLegales } = await import("../data/legal.ts");

const sortie = join(app, "../../docs/carte-de-visite");

/** Format fini et fond perdu, en millimètres. */
const LARGEUR = 85;
const HAUTEUR = 55;
const FOND_PERDU = 3;
/** Marge du texte depuis le bord fini. */
const MARGE = 7;

const TEXTES = {
  surtitre: `${siteMetier} · indépendant`,
  offre: "Applications métier sur mesure et sites vitrines,",
  offreSuite: "conçus, développés et hébergés de A à Z.",
  surtitreContact: "Contact",
  titreContact: "Parlons de votre projet",
  profils: [contact.linkedin, contact.github].map((adresse) => adresse.replace(/^https:\/\/(www\.)?/, "")),
};

const n = (valeur) => Math.round(valeur * 100) / 100;

/** Police du site en `@font-face`, le fichier dans la page (aucune requête au rendu). */
function police(famille, paquet, fichier, graisse) {
  const donnees = readFileSync(join(app, "node_modules/@fontsource", paquet, "files", fichier)).toString("base64");
  return `@font-face{font-family:"${famille}";font-weight:${graisse};src:url(data:font/woff2;base64,${donnees}) format("woff2")}`;
}

/**
 * Nuage de traits du recto : le nuage au repos de l'accueil (mêmes semis, opacités et couleurs que
 * `nuageFige`), ramené au millimètre. Les traits sont allongés et épaissis : à cette taille, ceux de
 * l'écran ne s'imprimeraient pas. `reserve` : le coin bas gauche laissé au texte.
 */
function nuage({ x, y, rayon }, reserve) {
  const rayonEcran = 160;
  const echelle = rayon / rayonEcran;
  const cote = 4 * rayonEcran;
  const groupes = new Map();
  for (const t of semerTraits(cote, cote)) {
    const dx = t.x - cote / 2;
    const dy = t.y - cote / 2;
    const d = Math.hypot(dx, dy) || 0.001;
    const opacite = opaciteTrait(d, rayonEcran);
    if (opacite < 0.2) continue;
    const proche = Math.exp(-d / rayonEcran);
    const [ux, uy] = [dx / d, dy / d];
    const longueur = t.longueur * (0.6 + 0.6 * proche) * 1.5;
    const cx = dx + ux * 14 * proche;
    const cy = dy + uy * 14 * proche;
    // Aucun trait sur le texte : à cette taille, il gênerait la lecture.
    if (x + cx * echelle < reserve.droite && y + cy * echelle > reserve.haut) continue;
    const angle = (((Math.atan2(dy, dx) / (2 * Math.PI)) % 1) + 1) % 1;
    const teinte = COULEURS_NUAGE[Math.floor(angle * COULEURS_NUAGE.length + 0.5) % COULEURS_NUAGE.length];
    const palier = Math.ceil(opacite * 4) / 4;
    const cle = `${teinte}-${palier}`;
    const groupe = groupes.get(cle) ?? { teinte, opacite: palier * 0.9, chemin: "" };
    groupe.chemin +=
      `M${n(x + (cx - (ux * longueur) / 2) * echelle)} ${n(y + (cy - (uy * longueur) / 2) * echelle)}` +
      `l${n(ux * longueur * echelle)} ${n(uy * longueur * echelle)}`;
    groupes.set(cle, groupe);
  }
  return [...groupes.values()]
    .map(
      (g) =>
        `<path d="${g.chemin}" fill="none" stroke="${g.teinte}" stroke-opacity="${n(g.opacite)}" stroke-width="0.2" stroke-linecap="round"/>`
    )
    .join("");
}

/** Bouton pêche du verso, où le trait arrive (le bouton « Envoyer » du site). */
const BOUTON = { x: MARGE, y: 42.6, largeur: 23, hauteur: 6.6 };
/** Tuile du QR code, en haut à droite du verso : le trait en part, comme il part du portrait sur l'accueil. */
const TUILE = { x: LARGEUR - MARGE - 14.5, y: MARGE, cote: 14.5, marge: 1.5 };

/**
 * QR code de l'adresse du site : modules nuit sur une tuile pêche (un code clair sur fond sombre se lit
 * mal sur certains téléphones). La marge de la tuile fait la zone de silence du code.
 */
function qr() {
  const code = qrcode(0, "M");
  code.addData(siteUrl);
  code.make();
  const modules = code.getModuleCount();
  const pas = (TUILE.cote - 2 * TUILE.marge) / modules;
  let d = "";
  for (let ligne = 0; ligne < modules; ligne++) {
    for (let colonne = 0; colonne < modules; colonne++) {
      if (!code.isDark(ligne, colonne)) continue;
      d += `M${n(TUILE.x + TUILE.marge + colonne * pas)} ${n(TUILE.y + TUILE.marge + ligne * pas)}h${n(pas)}v${n(pas)}h${n(-pas)}z`;
    }
  }
  return `
    <rect x="${TUILE.x}" y="${TUILE.y}" width="${TUILE.cote}" height="${TUILE.cote}" rx="1.6" fill="${couleur("accent")}"/>
    <path d="${d}" fill="${couleur("sur-accent")}"/>`;
}

/**
 * Trait conducteur du verso : il part du bas de la tuile du QR code, descend dans la marge droite, écrit
 * « Augustin Jouan » d'un seul trait puis son soulignement file jusqu'au bouton, comme sous l'adresse
 * e-mail du Contact (lib/trait/trace.ts, `ecrireSignature`).
 */
function trait() {
  const echelle = 0.088;
  const arrivee = { x: BOUTON.x + BOUTON.largeur, y: BOUTON.y + BOUTON.hauteur / 2 };
  // Le paraphe finit 26 unités sous la ligne de base : c'est la hauteur du soulignement.
  const origine = { x: 46.1, y: arrivee.y - 26 * echelle };
  const local = (x, y) => `${n(origine.x + x * echelle)} ${n(origine.y + y * echelle)}`;
  const droite = 78.5;
  const depart = { x: TUILE.x + TUILE.cote / 2, y: TUILE.y + TUILE.cote };
  const avant = n(origine.y - 110 * echelle);
  let d = `M${depart.x} ${depart.y}`;
  d += `C${depart.x} ${n(depart.y + 6)} ${droite} ${n(avant - 6)} ${droite} ${avant}`;
  d += `C${droite} ${n(origine.y - 60 * echelle)} ${local(44, -92)} ${local(SIGNATURE_DEPART.x, SIGNATURE_DEPART.y)}`;
  for (let i = 0; i < SIGNATURE.length; i += 6) {
    const [a, b, c, e, f, g] = SIGNATURE.slice(i, i + 6);
    d += `C${local(a, b)} ${local(c, e)} ${local(f, g)}`;
  }
  d += `L${arrivee.x} ${arrivee.y}`;
  return `
    <defs>
      <radialGradient id="tete">
        <stop offset="0.25" stop-color="${couleur("accent")}" stop-opacity="0.85"/>
        <stop offset="0.6" stop-color="${couleur("lueur")}" stop-opacity="0.35"/>
        <stop offset="1" stop-color="${couleur("lueur")}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <path d="${d}" fill="none" stroke="${couleur("lueur")}" stroke-opacity="0.28" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${couleur("accent")}" stroke-width="0.23" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${arrivee.x}" cy="${arrivee.y}" r="1.7" fill="url(#tete)"/>
    <circle cx="${arrivee.x}" cy="${arrivee.y}" r="0.5" fill="${couleur("texte")}"/>`;
}

/** Une face : son décor en SVG et son texte, dans un repère en millimètres dont l'origine est le coin fini. */
function face(nom, decor, texte) {
  const [l, h] = [LARGEUR + 2 * FOND_PERDU, HAUTEUR + 2 * FOND_PERDU];
  return `
    <section class="face" id="${nom}">
      <svg viewBox="${-FOND_PERDU} ${-FOND_PERDU} ${l} ${h}" width="${l}mm" height="${h}mm">${decor}</svg>
      <div class="texte">${texte}</div>
    </section>`;
}

const recto = face(
  "recto",
  nuage({ x: 70.5, y: 13, rayon: 13.5 }, { droite: 63, haut: 23.5 }),
  `<div class="bloc" style="left:${MARGE}mm;bottom:${MARGE - 0.4}mm">
     <p class="surtitre">${TEXTES.surtitre}</p>
     <p class="nom">${siteName}</p>
     <p class="doux">${TEXTES.offre}<br>${TEXTES.offreSuite}</p>
   </div>`
);

const verso = face(
  "verso",
  trait() + qr(),
  `<div class="bloc" style="left:${MARGE}mm;top:${MARGE - 0.2}mm">
     <p class="surtitre">${TEXTES.surtitreContact}</p>
     <p class="titre">${TEXTES.titreContact}</p>
     <p class="email">${contact.email}</p>
     <p class="telephone">${mentionsLegales.telephone}</p>
     <p class="doux profils">${TEXTES.profils.join("<br>")}</p>
   </div>
   <p class="bouton" style="left:${BOUTON.x}mm;top:${BOUTON.y}mm;width:${BOUTON.largeur}mm;height:${BOUTON.hauteur}mm">${hoteSite}</p>`
);

const styles = `
  ${police("Instrument Serif", "instrument-serif", "instrument-serif-latin-400-normal.woff2", 400)}
  ${police("Inter", "inter", "inter-latin-400-normal.woff2", 400)}
  ${police("Inter", "inter", "inter-latin-500-normal.woff2", 500)}
  *{margin:0;padding:0;box-sizing:border-box}
  html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .face{position:relative;width:${LARGEUR + 2 * FOND_PERDU}mm;height:${HAUTEUR + 2 * FOND_PERDU}mm;overflow:hidden;
    background:${couleur("fond")};color:${couleur("texte")};font-family:Inter,sans-serif}
  .face svg{position:absolute;inset:0;display:block}
  .texte{position:absolute;left:${FOND_PERDU}mm;top:${FOND_PERDU}mm;width:${LARGEUR}mm;height:${HAUTEUR}mm}
  .bloc{position:absolute}
  p{white-space:nowrap}
  .surtitre{font-size:5.8pt;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:${couleur("accent")}}
  .nom{margin-top:1.2mm;font-family:"Instrument Serif",serif;font-size:28pt;line-height:1;letter-spacing:-0.01em}
  .doux{margin-top:2.2mm;font-size:6.5pt;line-height:1.5;color:${couleur("texte-doux")}}
  .titre{margin-top:1.2mm;font-family:"Instrument Serif",serif;font-size:16pt;line-height:1.05}
  .email,.telephone{font-family:"Instrument Serif",serif;font-size:12pt;line-height:1.1}
  .telephone{margin-top:0.9mm}
  .email{margin-top:3.2mm;
    text-decoration:underline;text-decoration-color:${couleur("trait-fort")};text-decoration-thickness:0.18mm;text-underline-offset:0.9mm}
  .profils{margin-top:1.9mm;font-size:6.2pt;line-height:1.45}
  .bouton{position:absolute;display:flex;align-items:center;justify-content:center;border-radius:99mm;
    background:${couleur("accent")};color:${couleur("sur-accent")};font-size:7.4pt;font-weight:500}
`;

const document = (corps, plus = "") =>
  `<!doctype html><html lang="fr"><meta charset="utf-8"><title>${siteName} — carte de visite</title><style>${styles}${plus}</style>${corps}</html>`;

/** Pour l'imprimeur : une face par page, fond perdu compris. */
const pagePdf = document(
  recto + verso,
  `@page{size:${LARGEUR + 2 * FOND_PERDU}mm ${HAUTEUR + 2 * FOND_PERDU}mm;margin:0}.face{break-after:page}`
);

/** Pour relire : les deux faces coupées au format fini, posées côte à côte. */
const pageApercu = document(
  `<main>${recto}${verso}</main>`,
  `body{background:#16110f}main{display:flex;gap:10mm;padding:10mm;width:max-content}
   .face{width:${LARGEUR}mm;height:${HAUTEUR}mm;border-radius:1mm;box-shadow:0 3mm 8mm -3mm #000}
   .face svg{inset:${-FOND_PERDU}mm}.texte{left:0;top:0}`
);

const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
try {
  mkdirSync(sortie, { recursive: true });

  const pdf = await navigateur.newPage();
  await pdf.setContent(pagePdf);
  await pdf.evaluate(() => globalThis.document.fonts.ready);
  await pdf.pdf({ path: join(sortie, "carte-de-visite.pdf"), preferCSSPageSize: true, printBackground: true });

  const apercu = await navigateur.newPage({ deviceScaleFactor: 4 });
  await apercu.setContent(pageApercu);
  await apercu.evaluate(() => globalThis.document.fonts.ready);
  writeFileSync(join(sortie, "apercu.png"), await apercu.locator("main").screenshot({ type: "png" }));

  console.log(`Carte de visite fabriquée : ${sortie}`);
} finally {
  await navigateur.close();
}
