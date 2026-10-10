# Tâche 01 — Modèle du CV et compétences

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **medium** (avec la tâche 02, même conversation).
> Commandes depuis la racine du dépôt. Termine par le compte rendu de `contexte.md`.

Spec : section 3 (« Le CV : un modèle, trois rendus »), premier tableau et `data/competences.ts`.

**Files:**
- Modify: `apps/web/data/site.ts` (ajout de `hoteSite`)
- Create: `apps/web/data/competences.ts`, `apps/web/data/competences.test.ts`
- Create: `apps/web/lib/cv/modele.ts`, `apps/web/lib/cv/modele.test.ts`

**Interfaces:**
- Produces: `hoteSite: string` (`data/site.ts`) ; `GroupeCompetences`, `competences` (`data/competences.ts`) ; `CvModele`, `construireCv(url?: string): CvModele` (`lib/cv/modele.ts`).

- [ ] **Step 1: Tests (échouent)**

`apps/web/data/competences.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { realisations } from "./accueil";
import { competences } from "./competences";
import { etudesDeCas } from "./realisations";

describe("competences", () => {
  const toutes = competences.flatMap((groupe) => groupe.elements);

  it("contient chaque techno des réalisations et des études de cas", () => {
    const citees = [...realisations, ...etudesDeCas].flatMap((r) => r.stack);
    expect(citees.filter((techno) => !toutes.includes(techno))).toEqual([]);
  });

  it("ne cite aucune techno deux fois", () => {
    expect(new Set(toutes).size).toBe(toutes.length);
  });
});
```

`apps/web/lib/cv/modele.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { offres, parcours, realisations } from "@/data/accueil";
import { competences } from "@/data/competences";
import { contact } from "@/data/contact";
import { siteUrl } from "@/data/site";
import { construireCv } from "./modele";

describe("construireCv", () => {
  const cv = construireCv("https://exemple.dev");

  it("reprend les données du site, sans les recopier", () => {
    expect(cv.nom).toBe("Augustin Jouan");
    expect(cv.accroche.titre).toBe("Des applications métier sur mesure, qui remplacent vos tableurs.");
    expect(cv.offres.map((o) => o.titre)).toEqual(offres.map((o) => o.titre));
    expect(cv.realisations.map((r) => r.titre)).toEqual(realisations.map((r) => r.titre));
    expect(cv.parcours).toEqual(parcours);
    expect(cv.competences).toEqual(competences);
    expect(cv.contact.email).toBe(contact.email);
    expect(cv.contact.utilisateurGithub).toBe("Augustin-Jouan");
  });

  it("construit des adresses absolues depuis l'URL du site", () => {
    expect(cv.hote).toBe("exemple.dev");
    expect(cv.contact.page).toBe("https://exemple.dev/contact");
    expect(cv.realisations.map((r) => r.url)).toEqual([
      "https://exemple.dev/realisations/suivi-de-marches",
      "https://exemple.dev/realisations/site-artisan",
    ]);
  });

  it("prend l'URL du site par défaut", () => {
    expect(construireCv().site).toBe(siteUrl);
  });
});
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run data/competences.test.ts lib/cv/modele.test.ts --reporter=dot`
Expected: FAIL — `Failed to resolve import "./competences"` et `"./modele"`.

- [ ] **Step 2: `hoteSite`**

Dans `apps/web/data/site.ts`, juste après la ligne `export const siteUrl = resolveSiteUrl();`, ajouter :

```ts

/** Hôte public (`jouan.dev`), pour les commandes à taper : `curl -L jouan.dev`. */
export const hoteSite = new URL(siteUrl).host;
```

- [ ] **Step 3: Compétences et modèle**

`apps/web/data/competences.ts` :

```ts
/**
 * Compétences, groupées par thème : CV en terminal et `/api/me` (sous-projet 7).
 * `data/competences.test.ts` vérifie que chaque techno citée par une réalisation
 * ou une étude de cas y figure.
 */
export type GroupeCompetences = { nom: string; elements: string[] };

export const competences: GroupeCompetences[] = [
  { nom: "Front", elements: ["Next.js", "React", "TypeScript", "Tailwind CSS"] },
  { nom: "Back", elements: ["Node.js", "Hono", "WebSocket"] },
  { nom: "Données", elements: ["PostgreSQL", "Prisma"] },
  { nom: "Infrastructure", elements: ["Docker", "GitHub Actions", "Coolify"] },
  { nom: "Qualité", elements: ["Vitest", "Playwright"] },
];
```

`apps/web/lib/cv/modele.ts` :

```ts
/**
 * Le CV du site (sous-projet 7), construit depuis les données existantes, sans
 * recopier de texte. Trois rendus : terminal (`lib/cv/terminal.ts`), le même
 * sans couleur (`/cv.txt`) et JSON Resume (`lib/cv/json-resume.ts`).
 * Toutes les adresses sont absolues, construites depuis l'URL du site : elles
 * suivent un changement de domaine sans retouche.
 */
import { accroche, offres, parcours, realisations } from "@/data/accueil";
import { competences, type GroupeCompetences } from "@/data/competences";
import { contact } from "@/data/contact";
import { cheminEtude } from "@/data/realisations";
import { siteDescription, siteName, siteUrl } from "@/data/site";

export type CvModele = {
  nom: string;
  description: string;
  /** URL du site, sans barre finale (`https://jouan.dev`). */
  site: string;
  /** Hôte, pour les commandes à taper (`jouan.dev`). */
  hote: string;
  accroche: { surtitre: string; titre: string };
  offres: { titre: string; ligne: string }[];
  realisations: { titre: string; contexte: string; livre: string; stack: string[]; url: string }[];
  parcours: string[];
  contact: { email: string; github: string; utilisateurGithub: string; page: string };
  competences: GroupeCompetences[];
};

export function construireCv(url: string = siteUrl): CvModele {
  return {
    nom: siteName,
    description: siteDescription,
    site: url,
    hote: new URL(url).host,
    accroche: {
      surtitre: accroche.surtitre,
      titre: `${accroche.titreAvant}${accroche.titreAccent}${accroche.titreApres}`,
    },
    offres: offres.map((offre) => ({ titre: offre.titre, ligne: offre.pourQui })),
    realisations: realisations.map((r) => ({
      titre: r.titre,
      contexte: r.contexte,
      livre: r.livre,
      stack: r.stack,
      url: `${url}${cheminEtude(r.slug)}`,
    })),
    parcours,
    contact: {
      email: contact.email,
      github: contact.github,
      utilisateurGithub: new URL(contact.github).pathname.split("/").filter(Boolean).at(-1) ?? "",
      page: `${url}/contact`,
    },
    competences,
  };
}
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run data/competences.test.ts lib/cv/modele.test.ts --reporter=dot`
Expected: PASS (5 tests).

- [ ] **Step 4: Commiter**

```bash
git add apps/web/data/site.ts
git add apps/web/data/competences.ts
git add apps/web/data/competences.test.ts
git add apps/web/lib/cv/modele.ts
git add apps/web/lib/cv/modele.test.ts
git commit -m "CV : modèle commun tiré des données du site, compétences par thème"
```

Puis passe à `tache-02.md`, dans la même conversation.
