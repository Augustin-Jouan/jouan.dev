/**
 * Adaptations du site de l'artisan (dépôt sdjElec) pour sa copie de démo,
 * servie par jouan.dev sous /demo/site-artisan : fonctions pures sur le texte
 * des fichiers, testées à part (demo-site-artisan.test.ts). Le script
 * fabriquer-demo-site-artisan.mjs les applique à une extraction du dépôt.
 *
 * Chaque remplacement exige de trouver sa cible : sinon le site a changé, et la
 * copie serait bancale. On s'arrête en nommant le fichier.
 */

export const BASE = "/demo/site-artisan";

export const MESSAGE_DEMO = "Démo : ce message n'est pas envoyé. Pour joindre l'entreprise, passez par son vrai site.";

function echec(fichier, quoi) {
  return new Error(`Adaptation impossible (${fichier}) : ${quoi} introuvable. Le site de l'artisan a changé : revoir scripts/demo-site-artisan.mjs.`);
}

function remplacer(texte, avant, apres, fichier) {
  const trouve = typeof avant === "string" ? texte.includes(avant) : avant.test(texte);
  if (!trouve) throw echec(fichier, `« ${String(avant).slice(0, 70)} »`);
  return texte.replace(avant, apres);
}

function extraire(texte, motif, fichier) {
  const resultat = texte.match(motif);
  if (!resultat) throw echec(fichier, `« ${String(motif).slice(0, 70)} »`);
  return resultat[0];
}

/** Export statique sous le préfixe, sans barre finale (comme jouan.dev), images par le chargeur de démo. */
export function adapterConfig(source) {
  const f = "next.config.ts";
  let s = remplacer(source, 'output: process.env.VERCEL ? undefined : "standalone",', `output: "export",\n  basePath: "${BASE}",\n  trailingSlash: false,`, f);
  s = remplacer(s, "qualities: [75, 90],", 'qualities: [75, 90],\n    loader: "custom",\n    loaderFile: "./chargeur-images-demo.ts",', f);
  // En-têtes et redirections : sans effet (et refusés) dans un export statique.
  s = remplacer(s, /\n {2}async headers\(\) \{\n[\s\S]*?\n {2}\},\n/, "\n", f);
  s = remplacer(s, /\n {2}async redirects\(\) \{\n[\s\S]*?\n {2}\},\n/, "\n", f);
  s = remplacer(s, 'import { redirections } from "./data/redirections";\n', "", f);
  return s;
}

/** `next/image` n'ajoute pas `basePath` aux chemins absolus : le chargeur s'en charge. */
export function chargeurImages() {
  return `// Copie de démo (jouan.dev) : ajoute le préfixe aux images servies par le site.
export default function chargeur({ src }: { src: string }) {
  return src.startsWith("/") ? "${BASE}" + src : src;
}
`;
}

/**
 * Action du formulaire : plus d'action serveur (export statique) ni d'envoi. Le
 * type, la regex et la validation sont repris du vrai fichier : mêmes messages
 * d'erreur. Un envoi valide répond par le message de démo.
 */
export function adapterActions(source) {
  const f = "app/contact/actions.ts";
  const limites = extraire(source, /^import \{ LIMITES \} from "\.\/limites";$/m, f);
  const type = extraire(source, /^export type ContactFormState = \{[\s\S]*?^\};$/m, f);
  const regex = extraire(source, /^const EMAIL_REGEX = .*;$/m, f);
  const champs = extraire(source, /^type Champs = .*;$/m, f);
  const valider = extraire(source, /^function valider\([\s\S]*?^\}$/m, f);
  return `// Copie de démo (jouan.dev) : le formulaire valide comme le vrai, mais n'envoie rien.
${limites}

${type}

${regex}

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const champ = (nom: string) => String(formData.get(nom) ?? "").trim();
  const invalide = valider({ nom: champ("nom"), email: champ("email"), telephone: champ("telephone"), message: champ("message") });
  if (invalide) return invalide;
  return { status: "success", message: ${JSON.stringify(MESSAGE_DEMO)} };
}

${champs}

${valider}
`;
}

/** Le bandeau de démo en tête de `<body>`. */
export function adapterLayout(source) {
  const f = "app/layout.tsx";
  let s = remplacer(source, 'import "./globals.css";\n', 'import "./globals.css";\nimport { BandeauDemo } from "@/components/demo/BandeauDemo";\n', f);
  s = remplacer(s, /(\n(\s*)<body[^>]*>)\n/, "$1\n$2  <BandeauDemo />\n", f);
  return s;
}

/**
 * Bandeau de la copie, visible hors d'une iframe seulement : un script lu avant
 * l'affichage pose `data-plein-ecran` sur <html>, rien ne bouge à l'arrivée.
 * Liens `<a>` simples : `basePath` ne les préfixe pas.
 */
export function bandeauDemo(siteEnLigne) {
  return `// Copie de démo (jouan.dev) : rappelle, en plein écran, que ce n'est pas le vrai site.
export function BandeauDemo() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: "if(window.self===window.top)document.documentElement.setAttribute('data-plein-ecran','')",
        }}
      />
      <aside
        aria-label="Copie de démonstration"
        className="hidden bg-brand-blue px-4 py-2 text-center text-sm text-white [html[data-plein-ecran]_&]:block"
      >
        Démo réalisée par Augustin Jouan ·{" "}
        <a href="${siteEnLigne}" target="_blank" rel="noopener" className="font-semibold underline underline-offset-2">
          Le vrai site<span aria-hidden="true"> ↗</span>
          <span className="sr-only"> (nouvel onglet)</span>
        </a>{" "}
        ·{" "}
        <a href="/realisations#site-vitrine" className="font-semibold underline underline-offset-2">
          Retour au portfolio
        </a>
      </aside>
    </>
  );
}
`;
}

/** Adresse en ligne du site, lue dans data/realisations.ts (une seule source). */
export function lireSiteEnLigne(source) {
  const resultat = source.match(/export const SITE_ARTISAN = "([^"]+)";/);
  if (!resultat) throw new Error("SITE_ARTISAN introuvable dans data/realisations.ts.");
  return resultat[1];
}
