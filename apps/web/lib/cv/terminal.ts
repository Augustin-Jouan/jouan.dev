/**
 * CV en terminal (`curl -L jouan.dev`) : 80 colonnes au plus, séquences ANSI
 * exclues, avec trois styles tirés de la charte (`lib/cv/couleurs-terminal.ts`).
 * Sans couleur (`/cv.txt`), c'est exactement le même texte, sans aucun octet ESC.
 */
import { REMISE_A_ZERO, SEQUENCES, type StyleTerminal } from "./couleurs-terminal";
import type { CvModele } from "./modele";

export const LARGEUR = 80;
const RETRAIT = "  ";
/** Retrait du texte sous une puce (`  ▸ `). */
const RETRAIT_SUITE = "    ";

/** Le nom en lettres ASCII (police « small » de figlet), figé : aucune dépendance. */
const BANDEAU = [
  "   _                         _    _                _",
  "  /_\\  _  _  __ _  _  _  ___| |_ (_) _ _        _ | | ___  _  _  __ _  _ _",
  " / _ \\| || |/ _` || || |(_-<|  _|| || ' \\      | || |/ _ \\| || |/ _` || ' \\",
  "/_/ \\_\\\\_,_|\\__, | \\_,_|/__/ \\__||_||_||_|      \\__/ \\___/ \\_,_|\\__,_||_||_|",
  "            |___/",
];

/** Retire les séquences de couleur ANSI. */
export const sansAnsi = (texte: string) => texte.replace(/\x1b\[[0-9;]*m/g, "");

/** Largeur affichée d'une ligne, en caractères, séquences ANSI exclues. */
export const largeurAffichee = (ligne: string) => [...sansAnsi(ligne)].length;

/** Coupe un texte aux espaces pour tenir dans `largeur` ; un mot plus long reste entier. */
export function couper(texte: string, largeur: number): string[] {
  const lignes: string[] = [];
  let courante = "";
  for (const mot of texte.split(/\s+/).filter(Boolean)) {
    if (!courante) courante = mot;
    else if ([...courante].length + 1 + [...mot].length <= largeur) courante += ` ${mot}`;
    else {
      lignes.push(courante);
      courante = mot;
    }
  }
  if (courante) lignes.push(courante);
  return lignes;
}

export function rendreCvTerminal(cv: CvModele, { couleurs }: { couleurs: boolean }): string {
  const style = (nom: StyleTerminal, texte: string) =>
    couleurs && texte ? `${SEQUENCES[nom]}${texte}${REMISE_A_ZERO}` : texte;
  const lignes: string[] = [];

  /** Texte coupé, chaque ligne au même retrait. */
  const texte = (retrait: string, contenu: string, nom?: StyleTerminal) => {
    for (const ligne of couper(contenu, LARGEUR - retrait.length)) {
      lignes.push(retrait + (nom ? style(nom, ligne) : ligne));
    }
  };
  /** Puce : `  ▸ ` puis le texte, ses suites alignées dessous. */
  const puce = (contenu: string) => {
    couper(contenu, LARGEUR - RETRAIT_SUITE.length).forEach((ligne, i) => {
      lignes.push((i === 0 ? `${RETRAIT}▸ ` : RETRAIT_SUITE) + ligne);
    });
  };
  /** Titre de section, filet jusqu'à la dernière colonne. */
  const titre = (contenu: string) => {
    const debut = `── ${contenu.toUpperCase()} `;
    const filet = "─".repeat(LARGEUR - RETRAIT.length - [...debut].length);
    lignes.push("", RETRAIT + style("accent", debut + filet));
  };

  for (const ligne of BANDEAU) lignes.push(RETRAIT + style("accent", ligne));
  lignes.push("");
  texte(RETRAIT, `${cv.nom} · ${cv.accroche.surtitre}`, "attenue");
  texte(RETRAIT, cv.accroche.titre);

  titre("Offre");
  for (const offre of cv.offres) {
    puce(offre.titre);
    texte(RETRAIT_SUITE, offre.ligne);
  }

  titre("Réalisations");
  for (const r of cv.realisations) {
    puce(`${r.titre} · ${r.contexte}`);
    texte(RETRAIT_SUITE, r.stack.join(" · "), "attenue");
    lignes.push(RETRAIT_SUITE + style("souligne", r.url));
  }

  titre("Compétences");
  for (const groupe of cv.competences) puce(`${groupe.nom} : ${groupe.elements.join(", ")}`);

  titre("Parcours");
  for (const ligne of cv.parcours) puce(ligne);

  titre("Contact");
  lignes.push(
    `${RETRAIT}✉  ${cv.contact.email}`,
    `${RETRAIT}⌂  ${style("souligne", cv.contact.page)}`,
    `${RETRAIT}⌥  ${style("souligne", cv.contact.github)}`,
    "",
  );
  texte(RETRAIT, `JSON : curl -L ${cv.hote}/api/me`, "attenue");
  texte(RETRAIT, `Sans couleurs : curl -L ${cv.hote}/cv.txt`, "attenue");
  texte(RETRAIT, "Sur le site : ⌘K (ou Ctrl+K) ouvre la palette de commandes.", "attenue");

  // Une ligne vide à la fin : l'invite du shell ne colle pas au CV.
  return `${lignes.join("\n")}${couleurs ? REMISE_A_ZERO : ""}\n\n`;
}
