# Tâche 02 — CV en terminal (80 colonnes, couleurs de la charte)

> Suite de la tâche 01, même conversation (niveau **medium**). Termine par **un** compte rendu pour les tâches 01 et 02.

Spec : section 3.1 (« Rendu terminal »).

**Files:**
- Create: `apps/web/lib/cv/couleurs-terminal.ts`, `apps/web/lib/cv/couleurs-terminal.test.ts`
- Create: `apps/web/lib/cv/terminal.ts`, `apps/web/lib/cv/terminal.test.ts`

**Interfaces:**
- Consumes: `construireCv`, `CvModele` (tâche 01) ; `couleur(role)`, `Role` (`lib/charte.ts`).
- Produces: `versXterm256(hex)`, `SEQUENCES`, `REMISE_A_ZERO` (`couleurs-terminal.ts`) ; `rendreCvTerminal(cv, { couleurs }): string`, `sansAnsi`, `largeurAffichee`, `couper`, `LARGEUR` (`terminal.ts`).

Points d'attention :
- La couleur xterm est cherchée **parmi les 240 couleurs fixes** (indices 16 à 255) : la formule « rapide » qu'on trouve en ligne se trompe dans 4,5 % des cas, ne pas la reprendre.
- Le bandeau du nom est une liste de chaînes avec des `\\` (barres obliques inverses échappées) : recopie-le **caractère pour caractère**. Le test de largeur et le rendu le vérifient.

- [ ] **Step 1: Tests (échouent)**

`apps/web/lib/cv/couleurs-terminal.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { REMISE_A_ZERO, SEQUENCES, rvbXterm, versXterm256 } from "./couleurs-terminal";

describe("versXterm256", () => {
  it("décode le cube et les gris de xterm", () => {
    expect(rvbXterm(16)).toEqual([0, 0, 0]);
    expect(rvbXterm(180)).toEqual([215, 175, 135]);
    expect(rvbXterm(231)).toEqual([255, 255, 255]);
    expect(rvbXterm(232)).toEqual([8, 8, 8]);
    expect(rvbXterm(255)).toEqual([238, 238, 238]);
  });

  it("trouve la couleur la plus proche, gris compris", () => {
    expect(versXterm256("#000000")).toBe(16);
    expect(versXterm256("#ffffff")).toBe(231);
    expect(versXterm256("#808080")).toBe(244);
  });
});

describe("styles du terminal", () => {
  it("prennent le code le plus proche du rôle de la charte", () => {
    expect(SEQUENCES.accent).toBe("\x1b[38;5;180m"); // accent, pêche #eab595
    expect(SEQUENCES.attenue).toBe("\x1b[38;5;145m"); // texte-doux, mauve clair #b9a3b0
    expect(SEQUENCES.souligne).toBe("\x1b[4;38;5;255m"); // texte, papier #f3efe7, souligné
    expect(REMISE_A_ZERO).toBe("\x1b[0m");
  });
});
```

`apps/web/lib/cv/terminal.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { contact } from "@/data/contact";
import { construireCv } from "./modele";
import { LARGEUR, couper, largeurAffichee, rendreCvTerminal, sansAnsi } from "./terminal";

const ESC = "\x1b";

describe("couper", () => {
  it("coupe aux espaces sans dépasser la largeur", () => {
    expect(couper("un deux trois quatre", 9)).toEqual(["un deux", "trois", "quatre"]);
  });

  it("laisse entier un mot plus long que la largeur", () => {
    expect(couper("https://exemple.dev/une/longue/adresse fin", 10)).toEqual([
      "https://exemple.dev/une/longue/adresse",
      "fin",
    ]);
  });
});

describe("rendreCvTerminal", () => {
  const cv = construireCv("https://jouan.dev");
  const colore = rendreCvTerminal(cv, { couleurs: true });
  const brut = rendreCvTerminal(cv, { couleurs: false });

  it("tient en 80 colonnes, séquences ANSI exclues", () => {
    for (const texte of [colore, rendreCvTerminal(construireCv("https://portfolio.exemple-long.dev"), { couleurs: true })]) {
      const tropLongues = texte.split("\n").filter((ligne) => largeurAffichee(ligne) > LARGEUR);
      expect(tropLongues).toEqual([]);
    }
  });

  it("sans couleur : aucun octet ESC", () => {
    expect(brut).not.toContain(ESC);
  });

  it("avec couleur : le même texte une fois les séquences retirées", () => {
    expect(colore).toContain(`${ESC}[`);
    expect(sansAnsi(colore)).toBe(brut);
  });

  it("referme chaque segment coloré sur sa ligne, puis le texte entier", () => {
    const sequences = colore.match(/\x1b\[[0-9;]*m/g)!;
    expect(sequences.at(-1)).toBe(`${ESC}[0m`);
    sequences.slice(0, -1).forEach((sequence, i) => {
      expect(sequence === `${ESC}[0m`, `séquence ${i}`).toBe(i % 2 === 1);
    });
    expect(colore).not.toMatch(/\x1b\[(?!0m)[0-9;]*m[^\x1b]*\n/);
  });

  it("donne le nom, les sections, le contact et les autres formats", () => {
    expect(brut).toContain("Augustin Jouan · Développeur full stack · indépendant");
    for (const section of ["OFFRE", "RÉALISATIONS", "COMPÉTENCES", "PARCOURS", "CONTACT"]) {
      expect(brut).toContain(`── ${section} ─`);
    }
    expect(brut).toContain("https://jouan.dev/realisations/suivi-de-marches");
    expect(brut).toContain(contact.email);
    expect(brut).toContain("curl -L jouan.dev/api/me");
    expect(brut).toContain("curl -L jouan.dev/cv.txt");
  });

  it("se termine par une ligne vide", () => {
    expect(brut.endsWith("\n\n")).toBe(true);
    expect(colore.endsWith(`${ESC}[0m\n\n`)).toBe(true);
  });
});
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run lib/cv --reporter=dot`
Expected: FAIL — modules `./couleurs-terminal` et `./terminal` introuvables.

- [ ] **Step 2: Couleurs**

`apps/web/lib/cv/couleurs-terminal.ts` :

```ts
/**
 * Couleurs du CV en terminal : codes 256 couleurs (`ESC[38;5;<n>m`), compris par
 * tous les terminaux courants (Terminal.app de macOS ignore les couleurs 24 bits).
 * Chaque code est la couleur xterm la plus proche d'un rôle de la charte.
 */
import { couleur, type Role } from "@/lib/charte";

/** Niveaux du cube 6 × 6 × 6 de xterm (indices 16 à 231). */
const NIVEAUX = [0, 95, 135, 175, 215, 255];

/** Couleur RVB d'un indice xterm de 16 à 255 : le cube, puis 24 gris (232 à 255). */
export function rvbXterm(indice: number): [number, number, number] {
  if (indice >= 232) {
    const gris = 8 + 10 * (indice - 232);
    return [gris, gris, gris];
  }
  const n = indice - 16;
  return [NIVEAUX[Math.floor(n / 36)]!, NIVEAUX[Math.floor(n / 6) % 6]!, NIVEAUX[n % 6]!];
}

/**
 * Indice xterm-256 le plus proche d'une couleur `#rrggbb` (distance en RVB),
 * cherché parmi les 240 couleurs fixes : les 16 couleurs système, que chaque
 * terminal redéfinit, sont écartées.
 */
export function versXterm256(hex: string): number {
  const cible = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  let meilleur = 16;
  let distanceMin = Infinity;
  for (let indice = 16; indice < 256; indice++) {
    const distance = rvbXterm(indice).reduce((somme, c, i) => somme + (c - cible[i]!) ** 2, 0);
    if (distance < distanceMin) {
      distanceMin = distance;
      meilleur = indice;
    }
  }
  return meilleur;
}

export type StyleTerminal = "accent" | "attenue" | "souligne";

/** Rôle de la charte de chaque style : titres et bandeau, texte secondaire, adresses. */
export const ROLE_DU_STYLE: Record<StyleTerminal, Role> = {
  accent: "accent",
  attenue: "texte-doux",
  souligne: "texte",
};

const ouverture = (style: StyleTerminal) =>
  `\x1b[${style === "souligne" ? "4;" : ""}38;5;${versXterm256(couleur(ROLE_DU_STYLE[style]))}m`;

/** Séquence qui ouvre chaque style ; `REMISE_A_ZERO` la referme. */
export const SEQUENCES: Record<StyleTerminal, string> = {
  accent: ouverture("accent"),
  attenue: ouverture("attenue"),
  souligne: ouverture("souligne"),
};

export const REMISE_A_ZERO = "\x1b[0m";
```

- [ ] **Step 3: Rendu**

`apps/web/lib/cv/terminal.ts` :

```ts
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
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run lib/cv --reporter=dot`
Expected: PASS (`lib/cv` : 3 fichiers, 14 tests).

- [ ] **Step 4: Insécables**

`grep -cP "[\x{00a0}\x{202f}]" apps/web/lib/cv/*.ts` doit donner `0` pour chaque fichier.

- [ ] **Step 5: Commiter**

```bash
git add apps/web/lib/cv/couleurs-terminal.ts
git add apps/web/lib/cv/couleurs-terminal.test.ts
git add apps/web/lib/cv/terminal.ts
git add apps/web/lib/cv/terminal.test.ts
git commit -m "CV : rendu terminal en 80 colonnes, couleurs xterm tirées de la charte"
```
