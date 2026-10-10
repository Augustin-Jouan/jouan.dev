# Tâche 05 — Commandes : types, filtre, contexte et liste

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **medium** (avec la tâche 06, même conversation).
> Commandes depuis la racine du dépôt. Termine par le compte rendu de `contexte.md`.

Spec : sections 5.1 (`data/commandes.ts`, `lib/commandes/filtre.ts`), 5.2 (liste des commandes) et 5.3 (« Filtrage »).

**Écart à la spec, décidé :** la liste des commandes est construite **côté serveur** (le layout la passe en props au raccourci, tâche 07). Importée par la palette, elle embarquerait les textes de l'accueil et des études de cas (14 Ko) dans son morceau de JS. Tout y est donc sérialisable : la fonction `visible?` de la spec devient une condition déclarative `condition: "intro" | "presence"`, et le libellé du curseur selon son état, `libelleInverse`.

**Files:**
- Create: `apps/web/lib/commandes/types.ts`, `apps/web/lib/commandes/evenements.ts`
- Create: `apps/web/lib/commandes/filtre.ts`, `apps/web/lib/commandes/filtre.test.ts`
- Create: `apps/web/lib/commandes/visibles.ts`, `apps/web/lib/commandes/visibles.test.ts`
- Create: `apps/web/lib/commandes/contexte.ts`, `apps/web/lib/commandes/contexte.test.ts`
- Create: `apps/web/data/commandes.ts`, `apps/web/data/commandes.test.ts`

**Interfaces:**
- Consumes: `hoteSite` (tâche 01) ; `ANCRES`, `sections`, `realisations`, `CleSection` (`data/accueil.ts`) ; `cheminEtude` (`data/realisations.ts`) ; `contact` (`data/contact.ts`).
- Produces: `GROUPES`, `Commande`, `ActionCommande`, `ContexteCommandes` (`types.ts`) ; `EVENEMENT_OUVRIR_COMMANDES`, `EVENEMENT_REJOUER_INTRO`, `EVENEMENT_BASCULER_CURSEUR` (`evenements.ts`) ; `normaliser`, `filtrerCommandes` (`filtre.ts`) ; `commandesVisibles` (`visibles.ts`) ; `lireContexte` (`contexte.ts`) ; `commandes: Commande[]` (`data/commandes.ts`).

- [ ] **Step 1: Types et événements** (sans test propre : vérifiés par les tests suivants et `tsc`)

`apps/web/lib/commandes/types.ts` :

```ts
/**
 * Commandes de la palette (Cmd+K, sous-projet 7). La liste (`data/commandes.ts`)
 * est construite côté serveur et passée au navigateur : tout y est sérialisable,
 * d'où une condition d'affichage déclarative plutôt qu'une fonction.
 */
export const GROUPES = ["Navigation", "Actions", "Pour le plaisir"] as const;
export type GroupeCommande = (typeof GROUPES)[number];

export type ActionCommande =
  | { type: "lien"; href: string; nouvelOnglet?: boolean }
  | { type: "copier"; texte: string; confirmation: string }
  | { type: "evenement"; nom: string };

/**
 * Condition d'affichage, évaluée à l'ouverture de la palette :
 * - `intro` : sur l'accueil, quand l'intro WebGL peut s'y jouer ;
 * - `presence` : quand la présence en direct est connectée (pointeur fin).
 */
export type ConditionCommande = "intro" | "presence";

export type Commande = {
  id: string;
  libelle: string;
  /** Libellé quand le partage du curseur est coupé (condition `presence`). */
  libelleInverse?: string;
  groupe: GroupeCommande;
  motsCles: string[];
  action: ActionCommande;
  condition?: ConditionCommande;
};

/** Ce que la palette lit de la page à son ouverture (`lib/commandes/contexte.ts`). */
export type ContexteCommandes = {
  chemin: string;
  introDisponible: boolean;
  presence: "connectee" | "masquee" | null;
};
```

`apps/web/lib/commandes/evenements.ts` :

```ts
/**
 * Événements de la palette de commandes, émis sur `window` : le bouton du pied
 * de page l'ouvre, deux commandes ludiques pilotent l'intro et la présence.
 */
export const EVENEMENT_OUVRIR_COMMANDES = "jouan:ouvrir-commandes";
export const EVENEMENT_REJOUER_INTRO = "jouan:rejouer-intro";
export const EVENEMENT_BASCULER_CURSEUR = "jouan:basculer-curseur";
```

- [ ] **Step 2: Tests (échouent)**

`apps/web/lib/commandes/filtre.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { filtrerCommandes, normaliser } from "./filtre";

const liste = [
  { libelle: "Accueil · Contact", motsCles: ["contact"] },
  { libelle: "Étude de cas · Site vitrine d'artisan", motsCles: ["Électricien-plombier", "Docker"] },
  { libelle: "Contact", motsCles: ["devis"] },
  { libelle: "Copier l'e-mail", motsCles: ["contact@jouan.dev", "mail"] },
];
const libelles = (saisie: string) => filtrerCommandes(liste, saisie).map((c) => c.libelle);

describe("normaliser", () => {
  it("retire accents et majuscules", () => {
    expect(normaliser("Étude ÉLECTRICIEN")).toBe("etude electricien");
  });
});

describe("filtrerCommandes", () => {
  it("ignore les accents et la casse", () => {
    expect(libelles("ETUDE")).toEqual(["Étude de cas · Site vitrine d'artisan"]);
    expect(libelles("electricien")).toEqual(["Étude de cas · Site vitrine d'artisan"]);
  });

  it("exige chaque mot de la saisie, dans le libellé ou les mots-clés", () => {
    expect(libelles("copier mail")).toEqual(["Copier l'e-mail"]);
    expect(libelles("copier docker")).toEqual([]);
  });

  it("met en tête les libellés qui commencent par la saisie, puis garde l'ordre", () => {
    expect(libelles("contact")).toEqual(["Contact", "Accueil · Contact", "Copier l'e-mail"]);
  });

  it("rend tout pour une saisie vide ou blanche, rien sans correspondance", () => {
    expect(libelles("")).toHaveLength(4);
    expect(libelles("   ")).toHaveLength(4);
    expect(libelles("zzz")).toEqual([]);
  });
});
```

`apps/web/lib/commandes/visibles.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Commande, ContexteCommandes } from "./types";
import { commandesVisibles } from "./visibles";

const lien = { type: "lien", href: "/" } as const;
const liste: Commande[] = [
  { id: "accueil", libelle: "Accueil", groupe: "Navigation", motsCles: [], action: lien },
  { id: "intro", libelle: "Rejouer l'intro", groupe: "Pour le plaisir", motsCles: [], action: lien, condition: "intro" },
  {
    id: "curseur",
    libelle: "Masquer mon curseur",
    libelleInverse: "Montrer mon curseur",
    groupe: "Pour le plaisir",
    motsCles: [],
    action: lien,
    condition: "presence",
  },
];
const ids = (contexte: Partial<ContexteCommandes>) =>
  commandesVisibles(liste, { chemin: "/", introDisponible: false, presence: null, ...contexte }).map((c) => c.libelle);

describe("commandesVisibles", () => {
  it("propose l'intro sur l'accueil, personnalisé compris, quand elle peut se jouer", () => {
    expect(ids({ introDisponible: true })).toEqual(["Accueil", "Rejouer l'intro"]);
    expect(ids({ chemin: "/pour/boulangerie-martin-k7f3", introDisponible: true })).toContain("Rejouer l'intro");
    expect(ids({ introDisponible: false })).not.toContain("Rejouer l'intro");
    expect(ids({ chemin: "/contact", introDisponible: true })).not.toContain("Rejouer l'intro");
  });

  it("propose le curseur selon la présence, avec le bon libellé", () => {
    expect(ids({ presence: null })).toEqual(["Accueil"]);
    expect(ids({ presence: "connectee" })).toContain("Masquer mon curseur");
    expect(ids({ presence: "masquee" })).toContain("Montrer mon curseur");
  });
});
```

`apps/web/lib/commandes/contexte.test.ts` :

```ts
import { afterEach, describe, expect, it } from "vitest";
import { lireContexte } from "./contexte";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("lireContexte", () => {
  it("sans fond d'accueil ni présence : ni intro ni curseur", () => {
    expect(lireContexte()).toEqual({ chemin: "/", introDisponible: false, presence: null });
  });

  it("intro disponible quand le fond peut jouer l'encre, pas avec le halo CSS", () => {
    document.body.innerHTML = '<div class="fond-accueil" data-mode="halo-anime"></div>';
    expect(lireContexte().introDisponible).toBe(true);
    document.body.innerHTML = '<div class="fond-accueil" data-mode="halo-css"></div>';
    expect(lireContexte().introDisponible).toBe(false);
  });

  it("lit l'état du curseur sur son bouton", () => {
    document.body.innerHTML = '<button data-presence="masquee"></button>';
    expect(lireContexte().presence).toBe("masquee");
    document.body.innerHTML = '<button data-presence="autre"></button>';
    expect(lireContexte().presence).toBeNull();
  });
});
```

`apps/web/data/commandes.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { EVENEMENT_BASCULER_CURSEUR, EVENEMENT_REJOUER_INTRO } from "@/lib/commandes/evenements";
import { GROUPES } from "@/lib/commandes/types";
import { ANCRES, realisations } from "./accueil";
import { commandes } from "./commandes";
import { contact } from "./contact";
import { cheminEtude } from "./realisations";
import { hoteSite } from "./site";

const commande = (id: string) => commandes.find((c) => c.id === id)!;
const liens = commandes.flatMap((c) => (c.action.type === "lien" ? [c.action.href] : []));

describe("commandes", () => {
  it("ont des identifiants uniques et sont rangées par groupe", () => {
    expect(new Set(commandes.map((c) => c.id)).size).toBe(commandes.length);
    const rangs = commandes.map((c) => GROUPES.indexOf(c.groupe));
    expect(rangs).toEqual([...rangs].sort((a, b) => a - b));
  });

  it("mènent à chaque section de l'accueil, chaque étude de cas et chaque page", () => {
    for (const ancre of Object.values(ANCRES)) expect(liens).toContain(`/#${ancre}`);
    for (const r of realisations) expect(liens).toContain(cheminEtude(r.slug));
    for (const page of ["/", "/coulisses", "/contact", "/mentions-legales", "/politique-de-confidentialite"]) {
      expect(liens).toContain(page);
    }
  });

  it("copient l'e-mail et la commande curl du site", () => {
    expect(commande("copier-email").action).toEqual({ type: "copier", texte: contact.email, confirmation: "E-mail copié" });
    expect(commande("copier-curl").action).toEqual({
      type: "copier",
      texte: `curl -L ${hoteSite}`,
      confirmation: "Commande copiée",
    });
  });

  it("ouvrent GitHub et le CV JSON dans un nouvel onglet", () => {
    expect(commande("github").action).toEqual({ type: "lien", href: contact.github, nouvelOnglet: true });
    expect(commande("cv-json").action).toEqual({ type: "lien", href: "/api/me", nouvelOnglet: true });
  });

  it("relient les commandes ludiques à l'intro, au curseur et à la 3D", () => {
    expect(commande("rejouer-intro")).toMatchObject({
      condition: "intro",
      action: { type: "evenement", nom: EVENEMENT_REJOUER_INTRO },
    });
    expect(commande("curseur")).toMatchObject({
      condition: "presence",
      libelleInverse: "Montrer mon curseur",
      action: { type: "evenement", nom: EVENEMENT_BASCULER_CURSEUR },
    });
    expect(commande("architecture-3d").action).toEqual({ type: "lien", href: "/coulisses?vue=3d" });
  });
});
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run data/commandes.test.ts lib/commandes --reporter=dot`
Expected: FAIL — modules introuvables.

- [ ] **Step 3: Implémenter**

`apps/web/lib/commandes/filtre.ts` :

```ts
/** Minuscules, sans accents : « Étude » et « etude » se valent. */
export function normaliser(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Filtre de la palette : chaque mot de la saisie doit apparaître dans le libellé
 * ou les mots-clés. Les libellés qui commencent par la saisie passent en tête,
 * puis l'ordre d'origine. Saisie vide : tout.
 */
export function filtrerCommandes<T extends { libelle: string; motsCles: string[] }>(commandes: T[], saisie: string): T[] {
  const recherche = normaliser(saisie).trim();
  const mots = recherche.split(/\s+/).filter(Boolean);
  if (mots.length === 0) return commandes;
  const retenues = commandes.filter((commande) => {
    const texte = normaliser([commande.libelle, ...commande.motsCles].join(" "));
    return mots.every((mot) => texte.includes(mot));
  });
  const enTete = (commande: T) => normaliser(commande.libelle).startsWith(recherche);
  return [...retenues.filter(enTete), ...retenues.filter((commande) => !enTete(commande))];
}
```

`apps/web/lib/commandes/visibles.ts` :

```ts
import type { Commande, ContexteCommandes } from "./types";

const surAccueil = (chemin: string) => chemin === "/" || chemin.startsWith("/pour/");

/** Les commandes à proposer dans ce contexte, libellé du curseur selon son état. */
export function commandesVisibles(commandes: Commande[], contexte: ContexteCommandes): Commande[] {
  return commandes.flatMap((commande) => {
    if (commande.condition === "intro" && !(contexte.introDisponible && surAccueil(contexte.chemin))) return [];
    if (commande.condition === "presence") {
      if (!contexte.presence) return [];
      if (contexte.presence === "masquee" && commande.libelleInverse) {
        return [{ ...commande, libelle: commande.libelleInverse }];
      }
    }
    return [commande];
  });
}
```

`apps/web/lib/commandes/contexte.ts` :

```ts
import type { ContexteCommandes } from "./types";

/**
 * Contexte lu dans la page à l'ouverture de la palette : l'intro est disponible
 * quand le fond de l'accueil peut jouer l'encre (`data-mode` intro ou halo animé,
 * pas le halo CSS du mouvement réduit ou sans WebGL) ; la présence, quand le
 * bouton du curseur est affiché (`data-presence`, components/direct/CompteurPresents.tsx).
 */
export function lireContexte(): ContexteCommandes {
  const mode = document.querySelector(".fond-accueil")?.getAttribute("data-mode");
  const presence = document.querySelector("[data-presence]")?.getAttribute("data-presence");
  return {
    chemin: window.location.pathname,
    introDisponible: mode === "intro" || mode === "halo-anime",
    presence: presence === "connectee" || presence === "masquee" ? presence : null,
  };
}
```

`apps/web/data/commandes.ts` :

```ts
/**
 * Commandes de la palette (Cmd+K, sous-projet 7), dans l'ordre d'affichage :
 * navigation, actions, puis les commandes ludiques. Libellés et adresses viennent
 * des données existantes. La liste est construite côté serveur (app/layout.tsx) :
 * le morceau de JS de la palette n'embarque pas les textes de l'accueil.
 * Ajouter une commande : une entrée ici (type `Commande`, lib/commandes/types.ts).
 */
import { EVENEMENT_BASCULER_CURSEUR, EVENEMENT_REJOUER_INTRO } from "@/lib/commandes/evenements";
import type { Commande } from "@/lib/commandes/types";
import { ANCRES, realisations, sections, type CleSection } from "./accueil";
import { contact } from "./contact";
import { cheminEtude } from "./realisations";
import { hoteSite } from "./site";

const CLES_SECTIONS = Object.keys(ANCRES) as CleSection[];

export const commandes: Commande[] = [
  {
    id: "accueil",
    libelle: "Accueil",
    groupe: "Navigation",
    motsCles: ["début", "page d'accueil"],
    action: { type: "lien", href: "/" },
  },
  ...CLES_SECTIONS.map(
    (cle): Commande => ({
      id: `section-${cle}`,
      libelle: `Accueil · ${sections[cle].surtitre}`,
      groupe: "Navigation",
      motsCles: [cle, sections[cle].titre],
      action: { type: "lien", href: `/#${ANCRES[cle]}` },
    }),
  ),
  ...realisations.map(
    (realisation): Commande => ({
      id: `etude-${realisation.slug}`,
      libelle: `Étude de cas · ${realisation.titre}`,
      groupe: "Navigation",
      motsCles: ["réalisation", realisation.contexte, ...realisation.stack],
      action: { type: "lien", href: cheminEtude(realisation.slug) },
    }),
  ),
  {
    id: "coulisses",
    libelle: "Coulisses",
    groupe: "Navigation",
    motsCles: ["architecture", "technique", "performances", "mesures"],
    action: { type: "lien", href: "/coulisses" },
  },
  {
    id: "contact",
    libelle: "Contact",
    groupe: "Navigation",
    motsCles: ["écrire", "devis", "message", "formulaire"],
    action: { type: "lien", href: "/contact" },
  },
  {
    id: "mentions-legales",
    libelle: "Mentions légales",
    groupe: "Navigation",
    motsCles: ["éditeur", "hébergeur"],
    action: { type: "lien", href: "/mentions-legales" },
  },
  {
    id: "confidentialite",
    libelle: "Politique de confidentialité",
    groupe: "Navigation",
    motsCles: ["rgpd", "données personnelles", "cookies"],
    action: { type: "lien", href: "/politique-de-confidentialite" },
  },
  {
    id: "copier-email",
    libelle: "Copier l'e-mail",
    groupe: "Actions",
    motsCles: [contact.email, "mail", "adresse"],
    action: { type: "copier", texte: contact.email, confirmation: "E-mail copié" },
  },
  {
    id: "github",
    libelle: "Ouvrir GitHub",
    groupe: "Actions",
    motsCles: ["code", "dépôts", "profil"],
    action: { type: "lien", href: contact.github, nouvelOnglet: true },
  },
  {
    id: "copier-curl",
    libelle: "Copier la commande curl",
    groupe: "Actions",
    motsCles: [`curl -L ${hoteSite}`, "terminal", "cv", "ligne de commande"],
    action: { type: "copier", texte: `curl -L ${hoteSite}`, confirmation: "Commande copiée" },
  },
  {
    id: "cv-json",
    libelle: "Ouvrir le CV en JSON",
    groupe: "Actions",
    motsCles: ["api", "json resume", "/api/me"],
    action: { type: "lien", href: "/api/me", nouvelOnglet: true },
  },
  {
    id: "rejouer-intro",
    libelle: "Rejouer l'intro",
    groupe: "Pour le plaisir",
    motsCles: ["animation", "goutte", "lumière"],
    action: { type: "evenement", nom: EVENEMENT_REJOUER_INTRO },
    condition: "intro",
  },
  {
    id: "curseur",
    libelle: "Masquer mon curseur",
    libelleInverse: "Montrer mon curseur",
    groupe: "Pour le plaisir",
    motsCles: ["présence", "direct", "souris"],
    action: { type: "evenement", nom: EVENEMENT_BASCULER_CURSEUR },
    condition: "presence",
  },
  {
    id: "architecture-3d",
    libelle: "Voir l'architecture en 3D",
    groupe: "Pour le plaisir",
    motsCles: ["coulisses", "schéma", "webgl"],
    action: { type: "lien", href: "/coulisses?vue=3d" },
  },
];
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run data/commandes.test.ts lib/commandes --reporter=dot`
Expected: PASS (4 fichiers, 15 tests).

- [ ] **Step 4: Commiter**

```bash
git add apps/web/lib/commandes/types.ts
git add apps/web/lib/commandes/evenements.ts
git add apps/web/lib/commandes/filtre.ts
git add apps/web/lib/commandes/filtre.test.ts
git add apps/web/lib/commandes/visibles.ts
git add apps/web/lib/commandes/visibles.test.ts
git add apps/web/lib/commandes/contexte.ts
git add apps/web/lib/commandes/contexte.test.ts
git add apps/web/data/commandes.ts
git add apps/web/data/commandes.test.ts
git commit -m "Commandes : liste construite côté serveur, filtre sans accents, contexte de la page"
```

Puis passe à `tache-06.md`, dans la même conversation.
