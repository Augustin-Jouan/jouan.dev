# Tâche 03 — JSON Resume et routes du CV

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **medium** (avec la tâche 04, même conversation).
> Commandes depuis la racine du dépôt. Termine par le compte rendu de `contexte.md`.

Spec : sections 3.2 (« JSON Resume ») et 4 (tableau des routes).

**Files:**
- Create: `apps/web/lib/cv/json-resume.ts`, `apps/web/lib/cv/json-resume.test.ts`
- Create: `apps/web/app/api/me/route.ts`, `apps/web/app/api/me/route.test.ts`
- Create: `apps/web/app/cv.txt/route.ts`, `apps/web/app/cv.txt/route.test.ts`
- Create: `apps/web/app/cv.ansi/route.ts`, `apps/web/app/cv.ansi/route.test.ts`

**Interfaces:**
- Consumes: `construireCv` (tâche 01), `rendreCvTerminal` (tâche 02).
- Produces: `versJsonResume(cv, dateBuild)` ; routes `GET /api/me`, `GET /cv.txt`, `GET /cv.ansi`, pré-rendues au build (`dynamic = "force-static"`).

Avant d'écrire les routes, lire `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (sections `GET` et `dynamic`).

Décisions déjà vérifiées sur un build : les en-têtes posés par une route statique (`Cache-Control`, `Access-Control-Allow-Origin`, `Vary`) sont conservés ; un dossier `app/cv.txt/` donne bien l'adresse `/cv.txt`. `Vary: User-Agent` est posé par `/cv.ansi` : Next l'écrase sur la page d'accueil, seule la réponse du CV peut le porter.

- [ ] **Step 1: Tests (échouent)**

`apps/web/lib/cv/json-resume.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { realisations } from "@/data/accueil";
import { competences } from "@/data/competences";
import { construireCv } from "./modele";
import { SCHEMA_JSON_RESUME, versJsonResume } from "./json-resume";

describe("versJsonResume", () => {
  const json = versJsonResume(construireCv("https://exemple.dev"), "2026-10-10T08:00:00");

  it("décrit la personne et son profil GitHub", () => {
    expect(json.$schema).toBe(SCHEMA_JSON_RESUME);
    expect(json.basics.name).toBe("Augustin Jouan");
    expect(json.basics.url).toBe("https://exemple.dev");
    expect(json.basics.profiles).toEqual([
      { network: "GitHub", username: "Augustin-Jouan", url: "https://github.com/Augustin-Jouan" },
    ]);
  });

  it("donne les projets avec des adresses absolues, et les compétences par thème", () => {
    expect(json.projects.map((p) => p.name)).toEqual(realisations.map((r) => r.titre));
    for (const projet of json.projects) expect(projet.url).toMatch(/^https:\/\/exemple\.dev\/realisations\//);
    expect(json.skills.map((s) => s.name)).toEqual(competences.map((g) => g.nom));
    expect(json.meta).toEqual({ canonical: "https://exemple.dev/api/me", lastModified: "2026-10-10T08:00:00" });
  });

  it("ne nomme aucune entreprise et ne porte aucune date", () => {
    expect(json.work.map((w) => w.name)).toEqual(["Indépendant", "Alternance"]);
    expect(JSON.stringify(json)).not.toMatch(/"(startDate|endDate|date)"/);
  });
});
```

`apps/web/app/api/me/route.test.ts` :

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { siteUrl } from "@/data/site";
import { GET } from "./route";

describe("GET /api/me", () => {
  it("renvoie le JSON Resume indenté, ouvert à toutes les origines, en cache une heure", async () => {
    const reponse = GET();
    expect(reponse.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(reponse.headers.get("access-control-allow-origin")).toBe("*");
    expect(reponse.headers.get("cache-control")).toBe("public, max-age=3600");
    const texte = await reponse.text();
    expect(texte).toMatch(/^\{\n {2}"\$schema"/);
    const json = JSON.parse(texte);
    expect(json.basics.name).toBe("Augustin Jouan");
    expect(json.meta.canonical).toBe(`${siteUrl}/api/me`);
    expect(json.meta.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });
});
```

`apps/web/app/cv.txt/route.test.ts` :

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /cv.txt", () => {
  it("renvoie le CV en texte brut, sans aucune séquence de couleur", async () => {
    const reponse = GET();
    expect(reponse.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const texte = await reponse.text();
    expect(texte).toContain("Augustin Jouan");
    expect(texte).not.toContain("\x1b");
  });
});
```

`apps/web/app/cv.ansi/route.test.ts` :

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /cv.ansi", () => {
  it("renvoie le CV coloré, qui varie selon le User-Agent", async () => {
    const reponse = GET();
    expect(reponse.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(reponse.headers.get("vary")).toBe("User-Agent");
    const texte = await reponse.text();
    expect(texte).toContain("Augustin Jouan");
    expect(texte).toContain("\x1b[38;5;180m");
  });
});
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run lib/cv/json-resume.test.ts app/api/me app/cv.txt app/cv.ansi --reporter=dot`
Expected: FAIL — modules introuvables.

- [ ] **Step 2: Implémenter**

`apps/web/lib/cv/json-resume.ts` :

```ts
/**
 * Le CV au format standard JSON Resume (`/api/me`) : clés anglaises du schéma,
 * valeurs en français. Aucune date de poste ni de formation : absentes des
 * données. L'alternance est citée sans nom d'entreprise.
 */
import type { CvModele } from "./modele";

export const SCHEMA_JSON_RESUME = "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json";

export function versJsonResume(cv: CvModele, dateBuild: string) {
  return {
    $schema: SCHEMA_JSON_RESUME,
    basics: {
      name: cv.nom,
      label: cv.accroche.surtitre,
      email: cv.contact.email,
      url: cv.site,
      summary: cv.description,
      profiles: [{ network: "GitHub", username: cv.contact.utilisateurGithub, url: cv.contact.github }],
    },
    work: [
      {
        name: "Indépendant",
        position: "Développeur full stack",
        url: cv.site,
        summary: cv.offres.map((offre) => offre.titre).join(" · "),
      },
      { name: "Alternance", position: "Développeur full stack" },
    ],
    education: [{ institution: "Epitech", studyType: "Master of Science", area: "Informatique" }],
    projects: cv.realisations.map((r) => ({ name: r.titre, description: r.livre, url: r.url, keywords: r.stack })),
    skills: cv.competences.map((groupe) => ({ name: groupe.nom, keywords: groupe.elements })),
    meta: { canonical: `${cv.site}/api/me`, lastModified: dateBuild },
  };
}
```

`apps/web/app/api/me/route.ts` :

```ts
/**
 * Le CV au format JSON Resume (sous-projet 7), pré-rendu au build : la date du
 * build sert de `meta.lastModified`. Lisible depuis n'importe quel site.
 */
import { versJsonResume } from "@/lib/cv/json-resume";
import { construireCv } from "@/lib/cv/modele";

export const dynamic = "force-static";

export function GET() {
  const json = versJsonResume(construireCv(), new Date().toISOString().slice(0, 19));
  return new Response(`${JSON.stringify(json, null, 2)}\n`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

`apps/web/app/cv.txt/route.ts` :

```ts
/** Le CV en texte brut, sans couleur (sous-projet 7) : `curl -L jouan.dev/cv.txt`. */
import { construireCv } from "@/lib/cv/modele";
import { rendreCvTerminal } from "@/lib/cv/terminal";

export const dynamic = "force-static";

export function GET() {
  return new Response(rendreCvTerminal(construireCv(), { couleurs: false }), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

`apps/web/app/cv.ansi/route.ts` :

```ts
/**
 * Le CV coloré (sous-projet 7), servi pour `/` aux clients en ligne de commande
 * (`curl -L jouan.dev`, réécriture de proxy.ts) ; non annoncé. `Vary: User-Agent` :
 * un cache placé devant le site ne doit pas servir ce texte à un navigateur.
 * (Next écrase `Vary` sur la page d'accueil : seul ce côté peut le porter.)
 */
import { construireCv } from "@/lib/cv/modele";
import { rendreCvTerminal } from "@/lib/cv/terminal";

export const dynamic = "force-static";

export function GET() {
  return new Response(rendreCvTerminal(construireCv(), { couleurs: true }), {
    headers: { "Content-Type": "text/plain; charset=utf-8", Vary: "User-Agent" },
  });
}
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run lib/cv app/api/me app/cv.txt app/cv.ansi --reporter=dot`
Expected: PASS (7 fichiers, 20 tests).

- [ ] **Step 3: Pré-rendues au build**

```bash
./docs/superpowers/plans/easter-eggs/court.sh pnpm build
grep -E "○ /(api/me|cv\.ansi|cv\.txt)$" <journal indiqué par court.sh>
./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web verifier-accueil-statique
```

Expected: les trois lignes `○ /api/me`, `○ /cv.ansi`, `○ /cv.txt` ; « Pages prérendues : /, /coulisses : OK. »

- [ ] **Step 4: Commiter**

```bash
git add apps/web/lib/cv/json-resume.ts
git add apps/web/lib/cv/json-resume.test.ts
git add apps/web/app/api/me/route.ts
git add apps/web/app/api/me/route.test.ts
git add apps/web/app/cv.txt/route.ts
git add apps/web/app/cv.txt/route.test.ts
git add apps/web/app/cv.ansi/route.ts
git add apps/web/app/cv.ansi/route.test.ts
git commit -m "CV : /api/me (JSON Resume), /cv.txt et /cv.ansi pré-rendus au build"
```

Puis passe à `tache-04.md`, dans la même conversation.
