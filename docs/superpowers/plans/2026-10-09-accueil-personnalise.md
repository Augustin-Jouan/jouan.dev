# Accueil personnalisé — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Des liens `?pour=<jeton>` qui saluent le prospect et adaptent l'accueil à son angle, avec un mail à Augustin à chaque nouvelle visite et une page d'administration protégée pour créer et gérer les liens.

**Architecture:** Tout reste dans `apps/web` (Next.js 16). Le `proxy` réécrit `/?pour=…` vers la route dynamique `/pour/[jeton]` et garde `/admin`. Les liens et visites sont dans Postgres (Prisma 7, adaptateur `pg`). Un composant client envoie un signal (`sendBeacon`) après 3 s de page visible ; la route `/api/visites` répond `204` et traite en arrière-plan (`after()`), mail compris.

**Tech Stack:** Next.js 16.4, React 19.2.4, TypeScript, Tailwind 4, Prisma 7.10.0 + `@prisma/adapter-pg` + `pg`, nodemailer, Vitest + Testing Library, Playwright, Lighthouse CI, Docker, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-09-accueil-personnalise-design.md`

## Global Constraints

- Tout le texte visible, les commentaires, les noms de fichiers et les messages de commit sont en **français**.
- **Anonymat** : aucun nom réel de client, de projet, d'employeur, de ville, de téléphone ou d'adresse dans le dépôt ni dans les commits. Contrôle : `grep -ciF -f <(grep -v '^#' .superpowers/anonymat/termes-interdits.txt | grep -v '^$')` sur le diff et les messages → `0`. Ne jamais citer ce fichier.
- **Caractères invisibles** : U+00A0 et U+202F (produits par `Intl` en `fr-FR`) s'écrivent uniquement en échappements ` ` / ` ` dans le code et les tests ; les tests normalisent avec `.replace(/[  ]/g, " ")`.
- **Next 16 a des ruptures** : lire le guide concerné dans `apps/web/node_modules/next/dist/docs/` avant d'utiliser `proxy`, `after`, `cookies`, les Route Handlers, les Server Actions, `params`/`searchParams` (Promises).
- **Prisma épinglé à `7.10.0`** (`prisma`, `@prisma/client`, `@prisma/adapter-pg`) ; client généré dans `apps/web/lib/generated/prisma` (ignoré par Git et par ESLint).
- **Aucun cookie pour les visiteurs** ; seul `admin_session` existe, `Path=/admin`. **Aucune adresse IP stockée.**
- **L'accueil `/` reste statique** (`○` dans la sortie de `next build`) et garde ses budgets Lighthouse.
- Jetons : `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 45 caractères au plus ; tout autre `?pour=` = accueil normal.
- Style « Atelier clair » : uniquement les jetons de `apps/web/app/globals.css` (`papier`, `encre`, `encre-douce`, `brique`, `braise`, `braise-claire`, `terre`, `trait`), pas de couleur arbitraire.
- Ports : e2e `3100`, SMTP factice `2525`, Lighthouse `3000`, Postgres local `5433`. Libérer avec `fuser -k <port>/tcp`, jamais `pkill -f`.
- Commits ciblés : seulement les fichiers de la tâche, nommés un par un.

## Review Focus

1. Un `?pour=` mal formé (majuscules, espaces, `%2F`, 200 caractères) → accueil normal, aucune requête en base — test dans la tâche 5 (`proxy`).
2. Trois onglets ouverts en même temps sur le même lien → une seule visite et un seul mail — test d'intégration concurrent dans la tâche 3 (`enregistrerVisite`).
3. `ADMIN_SECRET` changé après connexion → l'ancien cookie ne vaut plus rien → retour à la connexion — test dans la tâche 2 (`verifierSession`).
4. Nom de prospect « <script>…</script> », emoji, 61 caractères ou seulement des espaces → refusé ou affiché tel quel, échappé — tests dans les tâches 1 (`nettoyerNom`) et 4 (rendu).
5. Base indisponible pendant qu'un prospect ouvre son lien → accueil normal, pas de 500 — test dans la tâche 5 (`lienPourAffichage` avec un dépôt qui lève).

---

### Task 1: Règles pures des liens et des visites

**Files:**
- Create: `apps/web/lib/liens/jeton.ts`, `apps/web/lib/liens/jeton.test.ts`
- Create: `apps/web/lib/liens/visites.ts`, `apps/web/lib/liens/visites.test.ts`
- Create: `apps/web/lib/liens/temps.ts`, `apps/web/lib/liens/temps.test.ts`
- Create: `apps/web/lib/liens/mail-visite.ts`, `apps/web/lib/liens/mail-visite.test.ts`

**Interfaces:**
- Produces:
  - `LONGUEUR_NOM_MAX = 60`, `LONGUEUR_JETON_MAX = 45`
  - `nettoyerNom(brut: string): { ok: true; nom: string } | { ok: false; erreur: string }`
  - `baseDuJeton(nom: string): string`, `genererJeton(nom: string, tirer?: (n: number) => number): string`, `estJetonValide(jeton: string): boolean`
  - `type Appareil = "mobile" | "ordinateur"`, `DELAI_NOUVELLE_VISITE_MS`, `CONSERVATION_VISITES_MS`
  - `estNouvelleVisite(derniere: Date | null, maintenant: Date): boolean`, `estRobot(ua: string | null): boolean`, `appareilDepuis(indiceMobile: string | null, ua: string | null): Appareil`
  - `ilYA(passe: Date, maintenant: Date): string`, `dateHeureParis(date: Date): string`
  - `type DonneesMailVisite = { nom: string; numero: number; appareil: Appareil; le: Date; precedente: Date | null; urlAdmin: string }`, `ordinalVisite(n: number): string`, `contenuMailVisite(d: DonneesMailVisite): { sujet: string; texte: string }`

- [ ] **Step 1: Tests du jeton** — `apps/web/lib/liens/jeton.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { baseDuJeton, estJetonValide, genererJeton, nettoyerNom } from "./jeton";

describe("nettoyerNom", () => {
  it("retire les espaces autour", () => {
    expect(nettoyerNom("  Boulangerie Martin ")).toEqual({ ok: true, nom: "Boulangerie Martin" });
  });
  it("refuse un nom vide ou fait d'espaces", () => {
    expect(nettoyerNom("   ").ok).toBe(false);
  });
  it("refuse plus de 60 caractères", () => {
    expect(nettoyerNom("a".repeat(61)).ok).toBe(false);
    expect(nettoyerNom("a".repeat(60)).ok).toBe(true);
  });
  it("garde le texte tel quel, balises comprises (React l'échappe)", () => {
    expect(nettoyerNom("<b>Café</b> 🍞")).toEqual({ ok: true, nom: "<b>Café</b> 🍞" });
  });
});

describe("baseDuJeton", () => {
  it("met en minuscules, retire accents et ligatures, sépare par des tirets", () => {
    expect(baseDuJeton("Boulangerie Martin")).toBe("boulangerie-martin");
    expect(baseDuJeton("Pâtisserie Œuvre & Cœur")).toBe("patisserie-oeuvre-coeur");
    expect(baseDuJeton("  --L'Atelier--  ")).toBe("l-atelier");
  });
  it("tronque à 40 caractères sans tiret final", () => {
    const base = baseDuJeton("abcdefghij ".repeat(6));
    expect(base.length).toBeLessThanOrEqual(40);
    expect(base.endsWith("-")).toBe(false);
  });
  it("retombe sur « prospect » si rien ne reste", () => {
    expect(baseDuJeton("🍞🍞")).toBe("prospect");
  });
});

describe("genererJeton", () => {
  it("ajoute un suffixe de 4 caractères tirés de [a-z0-9]", () => {
    const tirages = [0, 25, 26, 35];
    expect(genererJeton("Boulangerie Martin", () => tirages.shift()!)).toBe("boulangerie-martin-az09");
  });
  it("produit un jeton valide", () => {
    expect(estJetonValide(genererJeton("Pâtisserie Œuvre & Cœur"))).toBe(true);
  });
});

describe("estJetonValide", () => {
  it.each(["boulangerie-martin-k7f3", "exemple-0000"])("accepte %s", (j) => {
    expect(estJetonValide(j)).toBe(true);
  });
  it.each(["", "Boulangerie-Martin-K7F3", "a b", "a--b", "-a", "a-", "a/b", "a".repeat(46)])(
    "refuse %s",
    (j) => {
      expect(estJetonValide(j)).toBe(false);
    },
  );
});
```

- [ ] **Step 2: Lancer** — `pnpm --filter web exec vitest run lib/liens/jeton.test.ts` → FAIL (module introuvable).

- [ ] **Step 3: `apps/web/lib/liens/jeton.ts`**

```ts
/**
 * Jeton d'un lien personnalisé : le nom du prospect, lisible, suivi d'un
 * suffixe aléatoire qui empêche de deviner le lien d'un autre prospect
 * (« boulangerie-martin-k7f3 »).
 */
import { randomInt } from "node:crypto";

export const LONGUEUR_NOM_MAX = 60;
const LONGUEUR_BASE_MAX = 40;
const LONGUEUR_SUFFIXE = 4;
export const LONGUEUR_JETON_MAX = LONGUEUR_BASE_MAX + 1 + LONGUEUR_SUFFIXE;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const FORMAT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function nettoyerNom(brut: string): { ok: true; nom: string } | { ok: false; erreur: string } {
  const nom = brut.trim();
  if (!nom) return { ok: false, erreur: "Indiquez le nom du prospect." };
  if (nom.length > LONGUEUR_NOM_MAX) {
    return { ok: false, erreur: `Le nom ne doit pas dépasser ${LONGUEUR_NOM_MAX} caractères.` };
  }
  return { ok: true, nom };
}

export function baseDuJeton(nom: string): string {
  const base = nom
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "Oe")
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "Ae")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LONGUEUR_BASE_MAX)
    .replace(/-+$/, "");
  return base || "prospect";
}

export function genererJeton(nom: string, tirer: (n: number) => number = randomInt): string {
  let suffixe = "";
  for (let i = 0; i < LONGUEUR_SUFFIXE; i++) suffixe += ALPHABET[tirer(ALPHABET.length)];
  return `${baseDuJeton(nom)}-${suffixe}`;
}

export function estJetonValide(jeton: string): boolean {
  return jeton.length <= LONGUEUR_JETON_MAX && FORMAT.test(jeton);
}
```

- [ ] **Step 4: Tests des visites** — `apps/web/lib/liens/visites.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { appareilDepuis, DELAI_NOUVELLE_VISITE_MS, estNouvelleVisite, estRobot } from "./visites";

const t0 = new Date("2026-10-09T12:00:00Z");

describe("estNouvelleVisite", () => {
  it("compte la première visite", () => {
    expect(estNouvelleVisite(null, t0)).toBe(true);
  });
  it("ignore une ouverture moins de 30 minutes après la précédente", () => {
    expect(estNouvelleVisite(t0, new Date(t0.getTime() + DELAI_NOUVELLE_VISITE_MS - 1))).toBe(false);
  });
  it("compte une ouverture 30 minutes après", () => {
    expect(estNouvelleVisite(t0, new Date(t0.getTime() + DELAI_NOUVELLE_VISITE_MS))).toBe(true);
  });
});

describe("estRobot", () => {
  it.each([
    null,
    "",
    "WhatsApp/2.23.20.0",
    "facebookexternalhit/1.1",
    "Mozilla/5.0 (compatible; Googlebot/2.1)",
    "Slackbot-LinkExpanding 1.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/120.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 11) Chrome/120.0 Mobile Safari/537.36 Chrome-Lighthouse",
  ])("reconnaît %s", (ua) => {
    expect(estRobot(ua)).toBe(true);
  });
  it("laisse passer un navigateur", () => {
    expect(
      estRobot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"),
    ).toBe(false);
  });
});

describe("appareilDepuis", () => {
  it("suit l'indice Sec-CH-UA-Mobile", () => {
    expect(appareilDepuis("?1", null)).toBe("mobile");
    expect(appareilDepuis("?0", "iPhone")).toBe("ordinateur");
  });
  it("se replie sur le User-Agent", () => {
    expect(appareilDepuis(null, "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile")).toBe("mobile");
    expect(appareilDepuis(null, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("ordinateur");
    expect(appareilDepuis(null, null)).toBe("ordinateur");
  });
});
```

- [ ] **Step 5: `apps/web/lib/liens/visites.ts`**

```ts
/** Règles d'une visite sur un lien personnalisé (sans base ni réseau). */

export type Appareil = "mobile" | "ordinateur";

/** Une ouverture compte comme nouvelle visite 30 minutes après la précédente. */
export const DELAI_NOUVELLE_VISITE_MS = 30 * 60 * 1000;
/** Les visites sont conservées douze mois (politique de confidentialité). */
export const CONSERVATION_VISITES_MS = 365 * 24 * 60 * 60 * 1000;

export function estNouvelleVisite(derniere: Date | null, maintenant: Date): boolean {
  return derniere === null || maintenant.getTime() - derniere.getTime() >= DELAI_NOUVELLE_VISITE_MS;
}

/**
 * Aperçus de messageries et réseaux, moteurs, navigateurs sans interface
 * (scanners de liens) et Lighthouse : rien de tout cela n'est un prospect.
 */
const ROBOTS =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|slack|linkedin|skype|embedly|pinterest|vkshare|headlesschrome|lighthouse/i;

export function estRobot(ua: string | null): boolean {
  return !ua || ROBOTS.test(ua);
}

export function appareilDepuis(indiceMobile: string | null, ua: string | null): Appareil {
  if (indiceMobile === "?1") return "mobile";
  if (indiceMobile === "?0") return "ordinateur";
  return ua && /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "ordinateur";
}
```

- [ ] **Step 6: Tests du temps** — `apps/web/lib/liens/temps.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { dateHeureParis, ilYA } from "./temps";

const espaces = (t: string) => t.replace(/[  ]/g, " ");
const maintenant = new Date("2026-10-09T12:00:00Z");
const avant = (ms: number) => new Date(maintenant.getTime() - ms);

describe("ilYA", () => {
  it.each([
    [30 * 1000, "à l'instant"],
    [5 * 60 * 1000, "il y a 5 minutes"],
    [3 * 60 * 60 * 1000, "il y a 3 heures"],
    [2 * 24 * 60 * 60 * 1000, "il y a 2 jours"],
  ])("%i ms → %s", (ms, attendu) => {
    expect(espaces(ilYA(avant(ms), maintenant))).toBe(attendu);
  });
});

describe("dateHeureParis", () => {
  it("affiche la date et l'heure de Paris", () => {
    expect(espaces(dateHeureParis(maintenant))).toBe("vendredi 9 octobre 2026 à 14:00");
  });
});
```

- [ ] **Step 7: `apps/web/lib/liens/temps.ts`**

```ts
/** Dates lisibles en français, heure de Paris (mails et administration). */

const relatif = new Intl.RelativeTimeFormat("fr", { numeric: "always" });
const dateHeure = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  dateStyle: "full",
  timeStyle: "short",
});

export function ilYA(passe: Date, maintenant: Date): string {
  const secondes = Math.max(0, Math.round((maintenant.getTime() - passe.getTime()) / 1000));
  if (secondes < 60) return "à l'instant";
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return relatif.format(-minutes, "minute");
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return relatif.format(-heures, "hour");
  return relatif.format(-Math.floor(heures / 24), "day");
}

export function dateHeureParis(date: Date): string {
  return dateHeure.format(date);
}
```

Si le format réel de `Intl` diffère du test (par exemple « 14 h 00 »), aligner le **test** sur la sortie réelle de Node 22 en `fr-FR` et le signaler dans le rapport.

- [ ] **Step 8: Tests du mail** — `apps/web/lib/liens/mail-visite.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { contenuMailVisite, ordinalVisite } from "./mail-visite";

const espaces = (t: string) => t.replace(/[  ]/g, " ");
const base = {
  nom: "Boulangerie Martin",
  appareil: "mobile" as const,
  le: new Date("2026-10-09T12:32:00Z"),
  urlAdmin: "https://jouan.dev/admin",
};

describe("ordinalVisite", () => {
  it("écrit 1re puis 2e, 3e…", () => {
    expect([1, 2, 3, 11].map(ordinalVisite)).toEqual(["1re", "2e", "3e", "11e"]);
  });
});

describe("contenuMailVisite", () => {
  it("annonce la première visite, sans visite précédente", () => {
    const { sujet, texte } = contenuMailVisite({ ...base, numero: 1, precedente: null });
    expect(sujet).toBe("Boulangerie Martin a ouvert son lien — 1re visite");
    expect(espaces(texte)).toContain("Visite : 1re, sur mobile");
    expect(espaces(texte)).toContain("Date : vendredi 9 octobre 2026 à 14:32");
    expect(texte).not.toContain("Visite précédente");
    expect(texte).toContain("https://jouan.dev/admin");
  });
  it("indique la visite précédente ensuite", () => {
    const { sujet, texte } = contenuMailVisite({
      ...base,
      numero: 3,
      appareil: "ordinateur",
      precedente: new Date("2026-10-07T12:32:00Z"),
    });
    expect(sujet).toBe("Boulangerie Martin a ouvert son lien — 3e visite");
    expect(espaces(texte)).toContain("Visite : 3e, sur ordinateur");
    expect(espaces(texte)).toContain("Visite précédente : il y a 2 jours");
  });
});
```

- [ ] **Step 9: `apps/web/lib/liens/mail-visite.ts`**

```ts
/** Contenu du mail envoyé à Augustin quand un prospect ouvre son lien. */
import { dateHeureParis, ilYA } from "./temps";
import type { Appareil } from "./visites";

export type DonneesMailVisite = {
  nom: string;
  numero: number;
  appareil: Appareil;
  le: Date;
  precedente: Date | null;
  urlAdmin: string;
};

export function ordinalVisite(n: number): string {
  return n === 1 ? "1re" : `${n}e`;
}

export function contenuMailVisite(d: DonneesMailVisite): { sujet: string; texte: string } {
  const lignes = [
    `${d.nom} a ouvert son lien personnalisé.`,
    "",
    `Visite : ${ordinalVisite(d.numero)}, sur ${d.appareil}`,
    `Date : ${dateHeureParis(d.le)}`,
  ];
  if (d.precedente) lignes.push(`Visite précédente : ${ilYA(d.precedente, d.le)}`);
  lignes.push("", `Tous les liens : ${d.urlAdmin}`);
  return { sujet: `${d.nom} a ouvert son lien — ${ordinalVisite(d.numero)} visite`, texte: lignes.join("\n") };
}
```

- [ ] **Step 10: Lancer** — `pnpm --filter web exec vitest run lib/liens` → PASS ; `pnpm --filter web typecheck` et `pnpm --filter web lint` → OK.

- [ ] **Step 11: Commit**

```bash
git add apps/web/lib/liens/jeton.ts apps/web/lib/liens/jeton.test.ts apps/web/lib/liens/visites.ts apps/web/lib/liens/visites.test.ts apps/web/lib/liens/temps.ts apps/web/lib/liens/temps.test.ts apps/web/lib/liens/mail-visite.ts apps/web/lib/liens/mail-visite.test.ts
git commit -m "Liens personnalisés : jeton, règles de visite et contenu du mail"
```

---

### Task 2: Mot de passe et session de l'administration

**Files:**
- Create: `apps/web/lib/admin/session.ts`, `apps/web/lib/admin/session.test.ts`
- Create: `apps/web/scripts/empreinte-mot-de-passe.mjs`
- Modify: `apps/web/package.json` (script `empreinte-mot-de-passe`)

**Interfaces:**
- Produces:
  - `NOM_COOKIE = "admin_session"`, `DUREE_SESSION_MS` (30 jours)
  - `creerEmpreinte(motDePasse: string): Promise<string>` — format `scrypt$16384$8$1$<sel base64url>$<clé base64url>`
  - `verifierMotDePasse(motDePasse: string, empreinte: string): Promise<boolean>`
  - `signerSession(expireLe: number, secret: string): string` — `"<expireLe>.<hmac base64url>"`
  - `verifierSession(valeur: string | undefined, secret: string, maintenant?: number): boolean`
  - `secretSession(): string | null` — `process.env.ADMIN_SECRET` s'il fait au moins 32 caractères, sinon `null`

Avant d'écrire : lire `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (section runtime). Si le `proxy` tourne en Node.js (attendu en Next 16), `node:crypto` convient ; sinon écrire `signerSession`/`verifierSession` avec Web Crypto (`crypto.subtle`, HMAC SHA-256) et les rendre `async`, et le signaler.

- [ ] **Step 1: Tests** — `apps/web/lib/admin/session.test.ts`

```ts
// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
  creerEmpreinte,
  DUREE_SESSION_MS,
  secretSession,
  signerSession,
  verifierMotDePasse,
  verifierSession,
} from "./session";

const SECRET = "s".repeat(32);

describe("empreinte du mot de passe", () => {
  it("vérifie le bon mot de passe et refuse les autres", async () => {
    const empreinte = await creerEmpreinte("correct horse");
    expect(empreinte).toMatch(/^scrypt\$16384\$8\$1\$[\w-]+\$[\w-]+$/);
    expect(await verifierMotDePasse("correct horse", empreinte)).toBe(true);
    expect(await verifierMotDePasse("Correct horse", empreinte)).toBe(false);
  });
  it("sale chaque empreinte", async () => {
    expect(await creerEmpreinte("x")).not.toBe(await creerEmpreinte("x"));
  });
  it.each(["", "scrypt$1$2", "bcrypt$16384$8$1$a$b", "scrypt$16384$8$1$$"])(
    "refuse une empreinte mal formée (%s)",
    async (empreinte) => {
      expect(await verifierMotDePasse("x", empreinte)).toBe(false);
    },
  );
});

describe("session signée", () => {
  const maintenant = 1_000_000;
  it("accepte une session valide", () => {
    expect(verifierSession(signerSession(maintenant + 1000, SECRET), SECRET, maintenant)).toBe(true);
  });
  it("refuse une session expirée", () => {
    expect(verifierSession(signerSession(maintenant - 1, SECRET), SECRET, maintenant)).toBe(false);
  });
  it("refuse une session signée avec un autre secret (secret changé)", () => {
    expect(verifierSession(signerSession(maintenant + 1000, "a".repeat(32)), SECRET, maintenant)).toBe(false);
  });
  it("refuse une expiration modifiée", () => {
    const [, signature] = signerSession(maintenant + 1000, SECRET).split(".");
    expect(verifierSession(`${maintenant + DUREE_SESSION_MS}.${signature}`, SECRET, maintenant)).toBe(false);
  });
  it.each([undefined, "", "abc", "1.2.3", ".x"])("refuse %s", (valeur) => {
    expect(verifierSession(valeur, SECRET, maintenant)).toBe(false);
  });
});

describe("secretSession", () => {
  afterEach(() => {
    delete process.env.ADMIN_SECRET;
  });
  it("exige au moins 32 caractères", () => {
    process.env.ADMIN_SECRET = "court";
    expect(secretSession()).toBeNull();
    process.env.ADMIN_SECRET = SECRET;
    expect(secretSession()).toBe(SECRET);
  });
});
```

- [ ] **Step 2: Lancer** — `pnpm --filter web exec vitest run lib/admin` → FAIL.

- [ ] **Step 3: `apps/web/lib/admin/session.ts`**

```ts
/**
 * Accès à l'administration : un seul mot de passe, dont seule l'empreinte
 * scrypt est connue du serveur (variable ADMIN_EMPREINTE), et une session
 * sans état : un cookie qui porte son expiration et sa signature HMAC
 * (secret ADMIN_SECRET). Changer le secret déconnecte tout le monde.
 */
import { createHmac, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

export const NOM_COOKIE = "admin_session";
export const DUREE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

const N = 16384;
const R = 8;
const P = 1;
const LONGUEUR_CLE = 32;

function deriver(motDePasse: string, sel: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resoudre, rejeter) =>
    scrypt(motDePasse, sel, LONGUEUR_CLE, options, (err, cle) => (err ? rejeter(err) : resoudre(cle))),
  );
}

export async function creerEmpreinte(motDePasse: string): Promise<string> {
  const sel = randomBytes(16);
  const cle = await deriver(motDePasse, sel, { N, r: R, p: P });
  return ["scrypt", N, R, P, sel.toString("base64url"), cle.toString("base64url")].join("$");
}

export async function verifierMotDePasse(motDePasse: string, empreinte: string): Promise<boolean> {
  const [algo, n, r, p, sel, cle] = empreinte.split("$");
  if (algo !== "scrypt" || !sel || !cle) return false;
  const attendu = Buffer.from(cle, "base64url");
  if (attendu.length !== LONGUEUR_CLE) return false;
  try {
    const obtenu = await deriver(motDePasse, Buffer.from(sel, "base64url"), {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return timingSafeEqual(obtenu, attendu);
  } catch {
    return false;
  }
}

function signature(expireLe: string, secret: string): string {
  return createHmac("sha256", secret).update(expireLe).digest("base64url");
}

export function signerSession(expireLe: number, secret: string): string {
  return `${expireLe}.${signature(String(expireLe), secret)}`;
}

export function verifierSession(valeur: string | undefined, secret: string, maintenant = Date.now()): boolean {
  if (!valeur) return false;
  const morceaux = valeur.split(".");
  if (morceaux.length !== 2) return false;
  const [expireLe, recue] = morceaux;
  if (!/^\d+$/.test(expireLe) || Number(expireLe) <= maintenant) return false;
  const attendue = Buffer.from(signature(expireLe, secret));
  const donnee = Buffer.from(recue);
  return attendue.length === donnee.length && timingSafeEqual(attendue, donnee);
}

export function secretSession(): string | null {
  const secret = process.env.ADMIN_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}
```

- [ ] **Step 4: Script** — `apps/web/scripts/empreinte-mot-de-passe.mjs` (même format que `creerEmpreinte`, sans importer de TypeScript)

```js
/**
 * Demande le mot de passe de l'administration sans l'afficher et imprime son
 * empreinte, à coller dans la variable ADMIN_EMPREINTE de Coolify. Le mot de
 * passe lui-même va dans Bitwarden, jamais dans le dépôt.
 *
 * Usage : pnpm --filter web empreinte-mot-de-passe
 */
import { randomBytes, scryptSync } from "node:crypto";
import { stdin, stdout } from "node:process";

function lireMasque(question) {
  return new Promise((resoudre) => {
    stdout.write(question);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let saisie = "";
    stdin.on("data", function surTouche(touche) {
      if (touche === "\r" || touche === "\n" || touche === "\u0004") {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off("data", surTouche);
        stdout.write("\n");
        resoudre(saisie);
      } else if (touche === "\u0003") {
        process.exit(130);
      } else if (touche === "\u007f") {
        saisie = saisie.slice(0, -1);
      } else {
        saisie += touche;
      }
    });
  });
}

const motDePasse = await lireMasque("Mot de passe : ");
const confirmation = await lireMasque("Confirmation : ");
if (motDePasse.length < 12) {
  console.error("Au moins 12 caractères.");
  process.exit(1);
}
if (motDePasse !== confirmation) {
  console.error("Les deux saisies diffèrent.");
  process.exit(1);
}
const sel = randomBytes(16);
const cle = scryptSync(motDePasse, sel, 32, { N: 16384, r: 8, p: 1 });
console.log(["scrypt", 16384, 8, 1, sel.toString("base64url"), cle.toString("base64url")].join("$"));
```

Dans `apps/web/package.json`, `scripts` : `"empreinte-mot-de-passe": "node scripts/empreinte-mot-de-passe.mjs"`.

- [ ] **Step 5: Vérifier le script contre la bibliothèque** — générer une empreinte (`printf 'mot-de-passe-e2e\nmot-de-passe-e2e\n' | node apps/web/scripts/empreinte-mot-de-passe.mjs` peut échouer sans TTY : dans ce cas l'exécuter avec `script -q -c …` ou ajouter au test un cas qui vérifie une empreinte produite par `scryptSync` avec les mêmes paramètres). Ajouter ce test :

```ts
import { scryptSync } from "node:crypto";
it("accepte une empreinte au format du script", async () => {
  const sel = Buffer.from("0123456789abcdef");
  const cle = scryptSync("mot-de-passe-e2e", sel, 32, { N: 16384, r: 8, p: 1 });
  const empreinte = ["scrypt", 16384, 8, 1, sel.toString("base64url"), cle.toString("base64url")].join("$");
  expect(await verifierMotDePasse("mot-de-passe-e2e", empreinte)).toBe(true);
});
```

- [ ] **Step 6: Lancer** — `pnpm --filter web exec vitest run lib/admin` → PASS ; typecheck, lint.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/admin/session.ts apps/web/lib/admin/session.test.ts apps/web/scripts/empreinte-mot-de-passe.mjs apps/web/package.json
git commit -m "Administration : empreinte scrypt du mot de passe et session signée"
```

---

### Task 3: Base de données (Prisma, Postgres local, dépôt des liens)

**Files:**
- Create: `compose.dev.yml` (racine), `apps/web/scripts/base/init.sql`
- Create: `apps/web/prisma/schema.prisma`, `apps/web/prisma.config.ts`, `apps/web/prisma/migrations/<horodatage>_liens_personnalises/migration.sql` (généré)
- Create: `apps/web/lib/base/client.ts`
- Create: `apps/web/lib/liens/depot.ts`, `apps/web/lib/liens/depot.integration.test.ts`
- Modify: `apps/web/package.json` (dépendances, scripts), `pnpm-lock.yaml`, `.gitignore` (racine), `apps/web/eslint.config.mjs`, `apps/web/.env.example` (créer s'il n'existe pas), `README.md`

**Interfaces:**
- Consumes: `estNouvelleVisite`, `type Appareil` (tâche 1) ; `genererJeton` (tâche 1).
- Produces:
  - `baseConfiguree(): boolean`, `base(): PrismaClient`
  - `type AngleLien = "application" | "vitrine"` (exporté par `depot.ts` ; identique au type `Angle` que la tâche 4 ajoutera à `data/accueil.ts`)
  - `trouverLienActif(jeton: string): Promise<{ nom: string; angle: AngleLien } | null>`
  - `creerLien(nom: string, angle: AngleLien): Promise<{ jeton: string }>`
  - `type VisiteResume = { le: Date; appareil: Appareil; numero: number; mailEnvoye: boolean }`
  - `type LienResume = { id: string; jeton: string; nom: string; angle: AngleLien; actif: boolean; creeLe: Date; visites: VisiteResume[] }` (visites les plus récentes d'abord, 50 au plus)
  - `listerLiens(): Promise<LienResume[]>` (plus récents d'abord)
  - `changerEtat(id: string, actif: boolean): Promise<void>`, `supprimerLien(id: string): Promise<void>`
  - `type VisiteEnregistree = { id: string; nom: string; numero: number; precedente: Date | null }`
  - `enregistrerVisite(jeton: string, appareil: Appareil, maintenant: Date): Promise<VisiteEnregistree | null>`
  - `marquerMailEnvoye(id: string): Promise<void>`, `purgerVisites(avant: Date): Promise<number>`

Prisma 7 : générateur `prisma-client` avec `output` obligatoire, URL de la base dans `prisma.config.ts` (plus dans le schéma), client construit avec un adaptateur. Vérifier ces points dans le `README.md` et les types du paquet installé (`node_modules/prisma`, `node_modules/@prisma/client`) et adapter si l'API diffère ; le signaler dans le rapport.

- [ ] **Step 1: Postgres local** — `compose.dev.yml`

```yaml
# Base Postgres de développement et de test (pnpm --filter web …).
#   docker compose -f compose.dev.yml up -d
# Deux bases : `jouan` (développement) et `jouan_test` (tests d'intégration, e2e).
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: jouan
      POSTGRES_PASSWORD: jouan
      POSTGRES_DB: jouan
    ports:
      - "5433:5432"
    volumes:
      - ./apps/web/scripts/base/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
```

`apps/web/scripts/base/init.sql` :

```sql
CREATE DATABASE jouan_test;
```

`apps/web/.env.example` (ajouter ces lignes ; ne jamais créer `.env.local` dans un commit) :

```
# Base locale (compose.dev.yml)
DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan
# Tests d'intégration du dépôt (base vidée à chaque test)
DATABASE_URL_TEST=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test
# Administration : empreinte (pnpm --filter web empreinte-mot-de-passe) et secret de session (32 caractères au moins)
ADMIN_EMPREINTE=
ADMIN_SECRET=
```

- [ ] **Step 2: Dépendances**

```bash
pnpm --filter web add @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 pg
pnpm --filter web add -D prisma@7.10.0 @types/pg
```

- [ ] **Step 3: Schéma** — `apps/web/prisma/schema.prisma`

```prisma
// Liens personnalisés (sous-projet 3). Voir docs/superpowers/specs/2026-10-09-accueil-personnalise-design.md
generator client {
  provider = "prisma-client"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model Lien {
  id      String   @id @default(cuid())
  /// « boulangerie-martin-k7f3 »
  jeton   String   @unique
  /// Nom affiché au prospect, 1 à 60 caractères
  nom     String
  angle   Angle
  actif   Boolean  @default(true)
  creeLe  DateTime @default(now())
  visites Visite[]
}

model Visite {
  id         String   @id @default(cuid())
  lienId     String
  lien       Lien     @relation(fields: [lienId], references: [id], onDelete: Cascade)
  le         DateTime @default(now())
  appareil   Appareil
  /// 1re, 2e… visite de ce lien
  numero     Int
  mailEnvoye Boolean  @default(false)

  @@index([lienId, le])
}

enum Angle {
  application
  vitrine
}

enum Appareil {
  mobile
  ordinateur
}
```

`apps/web/prisma.config.ts` :

```ts
import { defineConfig } from "prisma/config";

// L'URL n'est lue que par les commandes qui touchent la base (migrate) :
// `prisma generate` fonctionne sans base, en CI comme dans le build Docker.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
```

- [ ] **Step 4: Scripts et ignorés** — dans `apps/web/package.json` :

```json
"generer-client": "prisma generate",
"build": "prisma generate && next build",
"dev": "prisma generate && next dev",
"typecheck": "prisma generate && tsc --noEmit",
"test": "prisma generate && vitest run",
"migrer": "prisma migrate deploy"
```

`.gitignore` racine : `apps/web/lib/generated/`. `apps/web/eslint.config.mjs`, dans `globalIgnores` : `"lib/generated/**"`.

- [ ] **Step 5: Migration initiale** — `docker compose -f compose.dev.yml up -d`, puis `DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan pnpm --filter web exec prisma migrate dev --name liens_personnalises`. Vérifier que `prisma/migrations/*/migration.sql` crée les deux tables, les deux enums, l'index unique sur `jeton`, l'index `(lienId, le)` et la clé étrangère `ON DELETE CASCADE`. Appliquer aussi à la base de test : `DATABASE_URL=…/jouan_test pnpm --filter web migrer`.

- [ ] **Step 6: Client** — `apps/web/lib/base/client.ts`

```ts
/**
 * Client Prisma partagé. Sans DATABASE_URL (développement sans base), les
 * appelants le vérifient avec `baseConfiguree()` et se replient : accueil
 * normal, signal ignoré, bandeau dans l'administration.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globale = globalThis as unknown as { prismaJouan?: PrismaClient };

export function baseConfiguree(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function base(): PrismaClient {
  globale.prismaJouan ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  return globale.prismaJouan;
}
```

- [ ] **Step 7: Tests d'intégration** — `apps/web/lib/liens/depot.integration.test.ts` (ignorés sans `DATABASE_URL_TEST`)

```ts
// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const URL_TEST = process.env.DATABASE_URL_TEST;

describe.skipIf(!URL_TEST)("dépôt des liens (Postgres)", () => {
  let depot: typeof import("./depot");
  let base: typeof import("@/lib/base/client").base;

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST;
    depot = await import("./depot");
    ({ base } = await import("@/lib/base/client"));
  });

  beforeEach(async () => {
    await base().visite.deleteMany();
    await base().lien.deleteMany();
  });

  const t0 = new Date("2026-10-09T12:00:00Z");
  const plus = (minutes: number) => new Date(t0.getTime() + minutes * 60 * 1000);

  it("crée un lien actif retrouvable par son jeton", async () => {
    const { jeton } = await depot.creerLien("Boulangerie Martin", "vitrine");
    expect(jeton).toMatch(/^boulangerie-martin-[a-z0-9]{4}$/);
    expect(await depot.trouverLienActif(jeton)).toEqual({ nom: "Boulangerie Martin", angle: "vitrine" });
  });

  it("ne retrouve ni un jeton inconnu ni un lien désactivé", async () => {
    const { jeton } = await depot.creerLien("Garage Durand", "application");
    const [lien] = await depot.listerLiens();
    await depot.changerEtat(lien.id, false);
    expect(await depot.trouverLienActif(jeton)).toBeNull();
    expect(await depot.trouverLienActif("inconnu-0000")).toBeNull();
  });

  it("numérote les visites et applique la règle des 30 minutes", async () => {
    const { jeton } = await depot.creerLien("Boulangerie Martin", "application");
    const v1 = await depot.enregistrerVisite(jeton, "mobile", t0);
    expect(v1).toMatchObject({ nom: "Boulangerie Martin", numero: 1, precedente: null });
    expect(await depot.enregistrerVisite(jeton, "mobile", plus(10))).toBeNull();
    const v2 = await depot.enregistrerVisite(jeton, "ordinateur", plus(31));
    expect(v2).toMatchObject({ numero: 2, precedente: t0 });
  });

  it("n'enregistre qu'une visite pour des signaux simultanés", async () => {
    const { jeton } = await depot.creerLien("Boulangerie Martin", "application");
    const resultats = await Promise.all([1, 2, 3].map(() => depot.enregistrerVisite(jeton, "mobile", t0)));
    expect(resultats.filter(Boolean)).toHaveLength(1);
    const [lien] = await depot.listerLiens();
    expect(lien.visites).toHaveLength(1);
  });

  it("ignore les visites d'un lien désactivé", async () => {
    const { jeton } = await depot.creerLien("Boulangerie Martin", "application");
    const [lien] = await depot.listerLiens();
    await depot.changerEtat(lien.id, false);
    expect(await depot.enregistrerVisite(jeton, "mobile", t0)).toBeNull();
  });

  it("marque le mail, purge les vieilles visites et supprime en cascade", async () => {
    const { jeton } = await depot.creerLien("Boulangerie Martin", "application");
    const v1 = await depot.enregistrerVisite(jeton, "mobile", t0);
    await depot.marquerMailEnvoye(v1!.id);
    let [lien] = await depot.listerLiens();
    expect(lien.visites[0]).toMatchObject({ numero: 1, mailEnvoye: true, appareil: "mobile" });
    expect(await depot.purgerVisites(plus(1))).toBe(1);
    await depot.enregistrerVisite(jeton, "mobile", plus(60));
    [lien] = await depot.listerLiens();
    await depot.supprimerLien(lien.id);
    expect(await depot.listerLiens()).toEqual([]);
    expect(await base().visite.count()).toBe(0);
  });
});
```

- [ ] **Step 8: Lancer** — `DATABASE_URL_TEST=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm --filter web exec vitest run lib/liens/depot.integration.test.ts` → FAIL (module `./depot` introuvable).

- [ ] **Step 9: `apps/web/lib/liens/depot.ts`**

```ts
/** Accès à la base pour les liens personnalisés et leurs visites. */
import { base } from "@/lib/base/client";
import { genererJeton } from "./jeton";
import { estNouvelleVisite, type Appareil } from "./visites";

export type AngleLien = "application" | "vitrine";
export type VisiteResume = { le: Date; appareil: Appareil; numero: number; mailEnvoye: boolean };
export type LienResume = {
  id: string;
  jeton: string;
  nom: string;
  angle: AngleLien;
  actif: boolean;
  creeLe: Date;
  visites: VisiteResume[];
};
export type VisiteEnregistree = { id: string; nom: string; numero: number; precedente: Date | null };

export async function trouverLienActif(jeton: string): Promise<{ nom: string; angle: AngleLien } | null> {
  return base().lien.findFirst({ where: { jeton, actif: true }, select: { nom: true, angle: true } });
}

export async function creerLien(nom: string, angle: AngleLien): Promise<{ jeton: string }> {
  for (let essai = 0; essai < 5; essai++) {
    const jeton = genererJeton(nom);
    try {
      await base().lien.create({ data: { jeton, nom, angle } });
      return { jeton };
    } catch (err) {
      // P2002 : jeton déjà pris (même nom, même suffixe) ; on retire au sort.
      if ((err as { code?: string }).code !== "P2002") throw err;
    }
  }
  throw new Error("Impossible de générer un jeton libre.");
}

export async function listerLiens(): Promise<LienResume[]> {
  return base().lien.findMany({
    orderBy: { creeLe: "desc" },
    select: {
      id: true,
      jeton: true,
      nom: true,
      angle: true,
      actif: true,
      creeLe: true,
      visites: {
        orderBy: { le: "desc" },
        take: 50,
        select: { le: true, appareil: true, numero: true, mailEnvoye: true },
      },
    },
  });
}

export async function changerEtat(id: string, actif: boolean): Promise<void> {
  await base().lien.update({ where: { id }, data: { actif } });
}

export async function supprimerLien(id: string): Promise<void> {
  await base().lien.delete({ where: { id } });
}

/**
 * Enregistre une visite si le lien est actif et que la précédente date d'au
 * moins 30 minutes. Un verrou par lien (pg_advisory_xact_lock) sérialise les
 * signaux simultanés : trois onglets ouverts d'un coup font une seule visite.
 */
export async function enregistrerVisite(
  jeton: string,
  appareil: Appareil,
  maintenant: Date,
): Promise<VisiteEnregistree | null> {
  return base().$transaction(async (tx) => {
    const lien = await tx.lien.findFirst({ where: { jeton, actif: true }, select: { id: true, nom: true } });
    if (!lien) return null;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lien.id}))`;
    const derniere = await tx.visite.findFirst({
      where: { lienId: lien.id },
      orderBy: { le: "desc" },
      select: { le: true, numero: true },
    });
    if (!estNouvelleVisite(derniere?.le ?? null, maintenant)) return null;
    const visite = await tx.visite.create({
      data: { lienId: lien.id, le: maintenant, appareil, numero: (derniere?.numero ?? 0) + 1 },
      select: { id: true, numero: true },
    });
    return { id: visite.id, nom: lien.nom, numero: visite.numero, precedente: derniere?.le ?? null };
  });
}

export async function marquerMailEnvoye(id: string): Promise<void> {
  await base().visite.update({ where: { id }, data: { mailEnvoye: true } });
}

export async function purgerVisites(avant: Date): Promise<number> {
  const { count } = await base().visite.deleteMany({ where: { le: { lt: avant } } });
  return count;
}
```

- [ ] **Step 10: Lancer** — la commande du step 8 → PASS (6 tests) ; `pnpm --filter web test` sans `DATABASE_URL_TEST` → le fichier est ignoré, le reste passe ; typecheck, lint.

- [ ] **Step 11: README** — section « Base de données » : `docker compose -f compose.dev.yml up -d`, copier `.env.example` en `apps/web/.env.local`, `pnpm --filter web migrer`, tests d'intégration avec `DATABASE_URL_TEST`, et une ligne « en production : ressource Postgres Coolify, `DATABASE_URL`, migrations appliquées au démarrage du conteneur ».

- [ ] **Step 12: Commit**

```bash
git add compose.dev.yml apps/web/scripts/base/init.sql apps/web/prisma apps/web/prisma.config.ts apps/web/lib/base/client.ts apps/web/lib/liens/depot.ts apps/web/lib/liens/depot.integration.test.ts apps/web/package.json pnpm-lock.yaml .gitignore apps/web/eslint.config.mjs apps/web/.env.example README.md
git commit -m "Liens personnalisés : base Postgres, schéma Prisma et dépôt des liens et visites"
```

---

### Task 4: Accueil paramétrable par angle et salutation

**Files:**
- Modify: `apps/web/data/accueil.ts`
- Create: `apps/web/data/accueil.test.ts` (ou compléter s'il existe)
- Create: `apps/web/components/accueil/Accueil.tsx`, `apps/web/components/accueil/Accueil.test.tsx`
- Modify: `apps/web/components/accueil/Accroche.tsx`, `Offre.tsx`, `Realisations.tsx`, `SectionContact.tsx`, `apps/web/components/contact/ContactForm.tsx`, `apps/web/app/page.tsx`

**Interfaces:**
- Produces:
  - `type Angle = "application" | "vitrine"`, `ANGLES: Angle[]`, `libellesAngle: Record<Angle, string>`
  - `accrochesParAngle: Record<Angle, Accroche>`, `offresPour(angle: Angle): Offre[]`, `realisationsPour(angle: Angle): Realisation[]`, `salutation(nom: string): string`
  - `type Personnalisation = { nom: string; angle: Angle; jeton: string }`
  - `<Accueil personnalisation?: Personnalisation />` — l'accueil complet (`IntroEncre`, `Accroche`, `Offre`, `Realisations`, `Methode`, `Parcours`, `SectionContact`)
  - `<Accroche angle?: Angle nom?: string />`, `<Offre angle?: Angle />`, `<Realisations angle?: Angle />`, `<SectionContact jeton?: string />`, `<ContactForm jeton?: string />` (champ caché `pour`)

- [ ] **Step 1: Tests des données** — `apps/web/data/accueil.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { accroche, accrochesParAngle, offresPour, realisationsPour, salutation } from "./accueil";

describe("angles de l'accueil", () => {
  it("garde l'accroche actuelle pour l'angle application", () => {
    expect(accrochesParAngle.application).toEqual(accroche);
  });
  it("oriente l'accroche vitrine vers le site", () => {
    const a = accrochesParAngle.vitrine;
    expect(`${a.titreAvant}${a.titreAccent}${a.titreApres}`).toBe(
      "Un site vitrine qui vous ressemble, rapide et bien référencé.",
    );
    expect(a.sousTitre).toBe("Je conçois, développe et héberge votre site, du premier échange à la mise en ligne.");
  });
  it("met l'offre de l'angle en premier et en avant", () => {
    for (const angle of ["application", "vitrine"] as const) {
      const [premiere, seconde] = offresPour(angle);
      expect(premiere).toMatchObject({ id: angle, miseEnAvant: true });
      expect(seconde.miseEnAvant).toBe(false);
    }
  });
  it("met l'étude de l'angle en premier", () => {
    expect(realisationsPour("application")[0].slug).toBe("suivi-de-marches");
    expect(realisationsPour("vitrine")[0].slug).toBe("site-artisan");
  });
  it("salue le prospect", () => {
    expect(salutation("Boulangerie Martin")).toBe("Bonjour Boulangerie Martin,");
  });
});
```

- [ ] **Step 2: Lancer** → FAIL.

- [ ] **Step 3: `apps/web/data/accueil.ts`** — ajouter après `accroche` et après `realisations` :

```ts
/** Angle d'un lien personnalisé : l'offre mise en avant pour ce prospect. */
export type Angle = "application" | "vitrine";
export const ANGLES: Angle[] = ["application", "vitrine"];
export const libellesAngle: Record<Angle, string> = {
  application: "Application métier",
  vitrine: "Site vitrine",
};

export const accrochesParAngle: Record<Angle, Accroche> = {
  application: accroche,
  vitrine: {
    ...accroche,
    titreAvant: "Un site vitrine ",
    titreAccent: "qui vous ressemble",
    titreApres: ", rapide et bien référencé.",
    sousTitre: "Je conçois, développe et héberge votre site, du premier échange à la mise en ligne.",
  },
};

/** Les offres, celle de l'angle en premier et mise en avant. */
export function offresPour(angle: Angle): Offre[] {
  return offres
    .map((offre) => ({ ...offre, miseEnAvant: offre.id === angle }))
    .sort((a, b) => Number(b.miseEnAvant) - Number(a.miseEnAvant));
}

const etudeParAngle: Record<Angle, SlugEtude> = {
  application: "suivi-de-marches",
  vitrine: "site-artisan",
};

/** Les réalisations, celle de l'angle en premier. */
export function realisationsPour(angle: Angle): Realisation[] {
  const premiere = etudeParAngle[angle];
  return [...realisations].sort((a, b) => Number(b.slug === premiere) - Number(a.slug === premiere));
}

export function salutation(nom: string): string {
  return `Bonjour ${nom},`;
}

export type Personnalisation = { nom: string; angle: Angle; jeton: string };
```

(Ces déclarations utilisent `offres` et `realisations` : les placer après leurs définitions.)

- [ ] **Step 4: Composants** —
  - `Accroche.tsx` : signature `export function Accroche({ angle = "application", nom }: { angle?: Angle; nom?: string })` ; lire `accrochesParAngle[angle]` au lieu de `accroche` ; remplacer le commentaire de l'emplacement réservé par :

    ```tsx
    {nom && (
      <p className="mb-3 font-serif text-2xl text-encre sm:text-3xl 2xl:text-4xl">{salutation(nom)}</p>
    )}
    ```

    (garder un commentaire indiquant que le compteur du sous-projet 4 se placera aussi ici).
  - `Offre.tsx` : `export function Offre({ angle = "application" }: { angle?: Angle })`, itérer sur `offresPour(angle)`.
  - `Realisations.tsx` : `export function Realisations({ angle = "application" }: { angle?: Angle })`, itérer sur `realisationsPour(angle)`.
  - `SectionContact.tsx` : `export function SectionContact({ jeton }: { jeton?: string })`, passer `jeton` à `ContactForm`.
  - `ContactForm.tsx` : `export function ContactForm({ jeton }: { jeton?: string })` ; juste après le champ honeypot, `{jeton && <input type="hidden" name="pour" value={jeton} />}`.
  - `components/accueil/Accueil.tsx` :

    ```tsx
    import { Accroche } from "./Accroche";
    import { IntroEncre } from "./IntroEncre";
    import { Methode } from "./Methode";
    import { Offre } from "./Offre";
    import { Parcours } from "./Parcours";
    import { Realisations } from "./Realisations";
    import { SectionContact } from "./SectionContact";
    import type { Personnalisation } from "@/data/accueil";

    /** L'accueil complet ; personnalisé pour un prospect quand `personnalisation` est donnée. */
    export function Accueil({ personnalisation }: { personnalisation?: Personnalisation }) {
      const angle = personnalisation?.angle ?? "application";
      return (
        <>
          <IntroEncre />
          <Accroche angle={angle} nom={personnalisation?.nom} />
          <Offre angle={angle} />
          <Realisations angle={angle} />
          <Methode />
          <Parcours />
          <SectionContact jeton={personnalisation?.jeton} />
        </>
      );
    }
    ```

  - `app/page.tsx` : garder `metadata`, rendre `<Accueil />`.

- [ ] **Step 5: Test du rendu** — `apps/web/components/accueil/Accueil.test.tsx` (reprendre les simulations de `app/page.test.tsx` pour `matchMedia` et l'intro si nécessaire)

```tsx
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Accueil } from "./Accueil";

describe("Accueil", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  });

  it("sans personnalisation : pas de salutation, offre application d'abord, pas de champ pour", () => {
    const { container } = render(<Accueil />);
    expect(screen.queryByText(/^Bonjour/)).toBeNull();
    const offres = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(offres[0]).toBe("Application métier sur mesure");
    expect(container.querySelector('input[name="pour"]')).toBeNull();
  });

  it("angle vitrine : salutation échappée, accroche, offre et étude vitrine d'abord, champ caché", () => {
    const { container } = render(
      <Accueil personnalisation={{ nom: "<b>Boulangerie</b> 🍞", angle: "vitrine", jeton: "boulangerie-k7f3" }} />,
    );
    expect(screen.getByText("Bonjour <b>Boulangerie</b> 🍞,")).toBeInTheDocument();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Un site vitrine qui vous ressemble");
    const titres = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titres.indexOf("Site vitrine")).toBeLessThan(titres.indexOf("Application métier sur mesure"));
    expect(titres.indexOf("Site vitrine d'artisan")).toBeLessThan(titres.indexOf("Suivi de marchés de travaux"));
    expect(container.querySelector('input[name="pour"]')).toHaveValue("boulangerie-k7f3");
    expect(within(container).getByText("Mon cœur de métier").closest("article")).toHaveTextContent("Site vitrine");
  });
});
```

- [ ] **Step 6: Lancer** — `pnpm --filter web test` → PASS (les tests existants de l'accueil, du formulaire et de la page aussi) ; `pnpm --filter web build` : `/` toujours marqué `○` ; typecheck, lint.

- [ ] **Step 7: Commit**

```bash
git add apps/web/data/accueil.ts apps/web/data/accueil.test.ts apps/web/components/accueil/Accueil.tsx apps/web/components/accueil/Accueil.test.tsx apps/web/components/accueil/Accroche.tsx apps/web/components/accueil/Offre.tsx apps/web/components/accueil/Realisations.tsx apps/web/components/accueil/SectionContact.tsx apps/web/components/contact/ContactForm.tsx apps/web/app/page.tsx
git commit -m "Accueil : angles application et vitrine, salutation du prospect"
```

---

### Task 5: Page personnalisée, réécriture par le proxy et signal de visite

**Files:**
- Create: `apps/web/lib/liens/affichage.ts`, `apps/web/lib/liens/affichage.test.ts`
- Create: `apps/web/app/pour/[jeton]/page.tsx`, `apps/web/app/pour/[jeton]/page.test.tsx`
- Create: `apps/web/components/accueil/SignalVisite.tsx`, `apps/web/components/accueil/SignalVisite.test.tsx`
- Create: `apps/web/proxy.ts`, `apps/web/proxy.test.ts`
- Modify: `apps/web/app/robots.ts` (+ son test s'il existe)

**Interfaces:**
- Consumes: `estJetonValide` (t1), `baseConfiguree` (t3), `trouverLienActif` (t3), `Accueil`, `Personnalisation` (t4), `NOM_COOKIE`, `verifierSession`, `secretSession` (t2).
- Produces:
  - `lienPourAffichage(jeton: string): Promise<{ nom: string; angle: Angle } | null>` — `null` si jeton invalide, base absente, lien inconnu/inactif ou erreur (journalisée)
  - `<SignalVisite jeton: string />`, `DUREE_VISIBLE_MS = 3000`
  - `proxy(request: NextRequest)` et `config.matcher`

Lire avant : `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (`matcher` avec `has`, `NextResponse.rewrite`, runtime) et la page sur `params`/`searchParams` asynchrones.

- [ ] **Step 1: Tests de `lienPourAffichage`** — `apps/web/lib/liens/affichage.test.ts`

```ts
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const trouverLienActif = vi.hoisted(() => vi.fn());
vi.mock("./depot", () => ({ trouverLienActif }));
import { lienPourAffichage } from "./affichage";

describe("lienPourAffichage", () => {
  afterEach(() => {
    trouverLienActif.mockReset();
    delete process.env.DATABASE_URL;
  });

  it("renvoie le lien actif", async () => {
    process.env.DATABASE_URL = "postgresql://x";
    trouverLienActif.mockResolvedValue({ nom: "Boulangerie Martin", angle: "vitrine" });
    expect(await lienPourAffichage("boulangerie-martin-k7f3")).toEqual({ nom: "Boulangerie Martin", angle: "vitrine" });
  });
  it("n'interroge pas la base pour un jeton mal formé", async () => {
    process.env.DATABASE_URL = "postgresql://x";
    expect(await lienPourAffichage("Boulangerie Martin")).toBeNull();
    expect(trouverLienActif).not.toHaveBeenCalled();
  });
  it("renvoie null sans base configurée", async () => {
    expect(await lienPourAffichage("boulangerie-martin-k7f3")).toBeNull();
    expect(trouverLienActif).not.toHaveBeenCalled();
  });
  it("renvoie null si la base est indisponible, sans lever", async () => {
    process.env.DATABASE_URL = "postgresql://x";
    vi.spyOn(console, "error").mockImplementation(() => {});
    trouverLienActif.mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await lienPourAffichage("boulangerie-martin-k7f3")).toBeNull();
  });
});
```

- [ ] **Step 2: `apps/web/lib/liens/affichage.ts`**

```ts
/** Lien à afficher sur la page personnalisée ; null = accueil normal, sans erreur visible. */
import { baseConfiguree } from "@/lib/base/client";
import type { Angle } from "@/data/accueil";
import { trouverLienActif } from "./depot";
import { estJetonValide } from "./jeton";

export async function lienPourAffichage(jeton: string): Promise<{ nom: string; angle: Angle } | null> {
  if (!estJetonValide(jeton) || !baseConfiguree()) return null;
  try {
    return await trouverLienActif(jeton);
  } catch (err) {
    console.error("[liens] Lecture du lien impossible :", err);
    return null;
  }
}
```

- [ ] **Step 3: Tests de `SignalVisite`** — `apps/web/components/accueil/SignalVisite.test.tsx`

```tsx
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DUREE_VISIBLE_MS, SignalVisite } from "./SignalVisite";

function definirVisibilite(etat: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => etat });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("SignalVisite", () => {
  const sendBeacon = vi.fn(() => true);
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: sendBeacon });
    definirVisibilite("visible");
  });
  afterEach(() => {
    vi.useRealTimers();
    sendBeacon.mockClear();
  });

  it("envoie le jeton une seule fois après 3 s de page visible", () => {
    render(<SignalVisite jeton="boulangerie-k7f3" />);
    act(() => vi.advanceTimersByTime(DUREE_VISIBLE_MS - 1));
    expect(sendBeacon).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(sendBeacon).toHaveBeenCalledWith("/api/visites", "boulangerie-k7f3");
    act(() => vi.advanceTimersByTime(60_000));
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it("ne compte pas le temps passé en arrière-plan", () => {
    render(<SignalVisite jeton="boulangerie-k7f3" />);
    act(() => vi.advanceTimersByTime(2000));
    act(() => definirVisibilite("hidden"));
    act(() => vi.advanceTimersByTime(60_000));
    expect(sendBeacon).not.toHaveBeenCalled();
    act(() => definirVisibilite("visible"));
    act(() => vi.advanceTimersByTime(999));
    expect(sendBeacon).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });
});
```

(`performance.now()` est simulé par les faux minuteurs de Vitest ; sinon, mesurer avec `Date.now()`.)

- [ ] **Step 4: `apps/web/components/accueil/SignalVisite.tsx`**

```tsx
"use client";

import { useEffect } from "react";

/** Temps de page visible avant de compter la visite : écarte les scanners de liens. */
export const DUREE_VISIBLE_MS = 3000;

/** Signale l'ouverture d'un lien personnalisé, une fois, après 3 s de page visible. */
export function SignalVisite({ jeton }: { jeton: string }) {
  useEffect(() => {
    let cumul = 0;
    let depuis: number | null = null;
    let minuterie: number | undefined;
    let envoye = false;

    function envoyer() {
      if (envoye) return;
      envoye = true;
      if (!navigator.sendBeacon?.("/api/visites", jeton)) {
        fetch("/api/visites", { method: "POST", body: jeton, keepalive: true }).catch(() => {});
      }
    }
    function demarrer() {
      if (envoye) return;
      depuis = Date.now();
      minuterie = window.setTimeout(envoyer, DUREE_VISIBLE_MS - cumul);
    }
    function suspendre() {
      if (depuis !== null) cumul += Date.now() - depuis;
      depuis = null;
      window.clearTimeout(minuterie);
    }
    function surVisibilite() {
      if (document.visibilityState === "visible") demarrer();
      else suspendre();
    }

    if (document.visibilityState === "visible") demarrer();
    document.addEventListener("visibilitychange", surVisibilite);
    return () => {
      window.clearTimeout(minuterie);
      document.removeEventListener("visibilitychange", surVisibilite);
    };
  }, [jeton]);

  return null;
}
```

- [ ] **Step 5: Page** — `apps/web/app/pour/[jeton]/page.tsx`

```tsx
import type { Metadata } from "next";
import { Accueil } from "@/components/accueil/Accueil";
import { SignalVisite } from "@/components/accueil/SignalVisite";
import { lienPourAffichage } from "@/lib/liens/affichage";

/** Accueil personnalisé d'un prospect (`/?pour=<jeton>`, réécrit par proxy.ts). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: "/" },
};

type Props = {
  params: Promise<{ jeton: string }>;
  searchParams: Promise<{ apercu?: string | string[] }>;
};

export default async function PagePersonnalisee({ params, searchParams }: Props) {
  const { jeton } = await params;
  const { apercu } = await searchParams;
  const lien = await lienPourAffichage(jeton);
  if (!lien) return <Accueil />;
  return (
    <>
      <Accueil personnalisation={{ ...lien, jeton }} />
      {apercu !== "1" && <SignalVisite jeton={jeton} />}
    </>
  );
}
```

`apps/web/app/pour/[jeton]/page.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const lienPourAffichage = vi.hoisted(() => vi.fn());
vi.mock("@/lib/liens/affichage", () => ({ lienPourAffichage }));
vi.mock("@/components/accueil/SignalVisite", () => ({
  SignalVisite: ({ jeton }: { jeton: string }) => <div data-testid="signal">{jeton}</div>,
}));
import PagePersonnalisee, { metadata } from "./page";

const ouvrir = (jeton: string, apercu?: string) =>
  PagePersonnalisee({ params: Promise.resolve({ jeton }), searchParams: Promise.resolve({ apercu }) });

describe("page personnalisée", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    lienPourAffichage.mockReset();
  });

  it("salue le prospect et signale la visite", async () => {
    lienPourAffichage.mockResolvedValue({ nom: "Boulangerie Martin", angle: "vitrine" });
    render(await ouvrir("boulangerie-martin-k7f3"));
    expect(screen.getByText("Bonjour Boulangerie Martin,")).toBeInTheDocument();
    expect(screen.getByTestId("signal")).toHaveTextContent("boulangerie-martin-k7f3");
  });
  it("n'envoie rien en aperçu", async () => {
    lienPourAffichage.mockResolvedValue({ nom: "Boulangerie Martin", angle: "vitrine" });
    render(await ouvrir("boulangerie-martin-k7f3", "1"));
    expect(screen.queryByTestId("signal")).toBeNull();
  });
  it("affiche l'accueil normal pour un lien inconnu", async () => {
    lienPourAffichage.mockResolvedValue(null);
    render(await ouvrir("inconnu-0000"));
    expect(screen.queryByText(/^Bonjour/)).toBeNull();
    expect(screen.queryByTestId("signal")).toBeNull();
  });
  it("n'est pas indexée et renvoie vers l'accueil", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates?.canonical).toBe("/");
  });
});
```

- [ ] **Step 6: Proxy** — `apps/web/proxy.ts`

```ts
/**
 * Deux rôles, et seulement sur ces adresses (voir `config.matcher`) :
 * - `/?pour=<jeton>` est réécrit vers la page personnalisée `/pour/<jeton>`,
 *   l'adresse affichée ne change pas ; l'accueil sans paramètre reste statique ;
 * - `/admin/*` exige une session valide, sauf la page de connexion. Chaque page
 *   et action de l'administration revérifie la session côté serveur.
 */
import { NextResponse, type NextRequest } from "next/server";
import { NOM_COOKIE, secretSession, verifierSession } from "@/lib/admin/session";
import { estJetonValide } from "@/lib/liens/jeton";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/connexion") return NextResponse.next();
    const secret = secretSession();
    if (secret && verifierSession(request.cookies.get(NOM_COOKIE)?.value, secret)) return NextResponse.next();
    return NextResponse.redirect(new URL("/admin/connexion", request.url));
  }

  const jeton = searchParams.get("pour") ?? "";
  if (!estJetonValide(jeton)) return NextResponse.next();
  const cible = request.nextUrl.clone();
  cible.pathname = `/pour/${jeton}`;
  cible.searchParams.delete("pour");
  return NextResponse.rewrite(cible);
}

export const config = {
  matcher: [{ source: "/", has: [{ type: "query", key: "pour" }] }, "/admin/:path*"],
};
```

`apps/web/proxy.test.ts` :

```ts
// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { NOM_COOKIE, signerSession } from "@/lib/admin/session";
import { proxy } from "./proxy";

const SECRET = "s".repeat(32);
const requete = (chemin: string, cookie?: string) =>
  new NextRequest(new URL(chemin, "http://localhost:3000"), {
    headers: cookie ? { cookie: `${NOM_COOKIE}=${cookie}` } : {},
  });
const reecriture = (r: Response) => r.headers.get("x-middleware-rewrite");

describe("proxy", () => {
  afterEach(() => {
    delete process.env.ADMIN_SECRET;
  });

  it("réécrit un lien valide en gardant l'aperçu", () => {
    const r = proxy(requete("/?pour=boulangerie-martin-k7f3&apercu=1"));
    expect(new URL(reecriture(r)!).pathname).toBe("/pour/boulangerie-martin-k7f3");
    expect(new URL(reecriture(r)!).searchParams.get("apercu")).toBe("1");
    expect(new URL(reecriture(r)!).searchParams.has("pour")).toBe(false);
  });
  it.each(["Boulangerie-Martin-K7F3", "a%2Fb", "a b", "x".repeat(200), ""])(
    "laisse l'accueil normal pour pour=%s",
    (jeton) => {
      expect(reecriture(proxy(requete(`/?pour=${jeton}`)))).toBeNull();
    },
  );
  it("laisse passer la page de connexion", () => {
    expect(proxy(requete("/admin/connexion")).headers.get("location")).toBeNull();
  });
  it("renvoie vers la connexion sans session, ou sans secret configuré", () => {
    expect(proxy(requete("/admin")).headers.get("location")).toBe("http://localhost:3000/admin/connexion");
    expect(proxy(requete("/admin", signerSession(Date.now() + 60_000, SECRET))).headers.get("location")).toBe(
      "http://localhost:3000/admin/connexion",
    );
  });
  it("laisse passer une session valide, refuse une session d'un autre secret", () => {
    process.env.ADMIN_SECRET = SECRET;
    expect(proxy(requete("/admin", signerSession(Date.now() + 60_000, SECRET))).headers.get("location")).toBeNull();
    expect(
      proxy(requete("/admin", signerSession(Date.now() + 60_000, "a".repeat(32)))).headers.get("location"),
    ).toBe("http://localhost:3000/admin/connexion");
  });
});
```

(Si l'en-tête de réécriture a un autre nom dans cette version, l'adapter d'après les types de `NextResponse` et le signaler.)

- [ ] **Step 7: robots** — `apps/web/app/robots.ts` : `rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/pour"] }` ; mettre à jour son test s'il existe.

- [ ] **Step 8: Lancer** — `pnpm --filter web test` → PASS ; `pnpm --filter web build` : `/` reste `○`, `/pour/[jeton]` est `ƒ` ; démarrer le standalone (port 3100) sans `DATABASE_URL` et vérifier avec `curl` que `/?pour=boulangerie-martin-k7f3` renvoie 200 avec l'accueil normal et que `/admin` redirige vers `/admin/connexion` (404 attendu tant que la tâche 7 n'existe pas) ; typecheck, lint.

- [ ] **Step 9: Commit**

```bash
git add apps/web/lib/liens/affichage.ts apps/web/lib/liens/affichage.test.ts "apps/web/app/pour/[jeton]/page.tsx" "apps/web/app/pour/[jeton]/page.test.tsx" apps/web/components/accueil/SignalVisite.tsx apps/web/components/accueil/SignalVisite.test.tsx apps/web/proxy.ts apps/web/proxy.test.ts apps/web/app/robots.ts
git commit -m "Liens personnalisés : page personnalisée réécrite par le proxy et signal de visite"
```

(Ajouter le test de `robots` au `git add` s'il a été modifié.)

---

### Task 6: Réception des visites et mail de notification

**Files:**
- Modify: `apps/web/lib/email.ts`, `apps/web/lib/email.test.ts`
- Create: `apps/web/lib/liens/traitement.ts`, `apps/web/lib/liens/traitement.test.ts`
- Create: `apps/web/app/api/visites/route.ts`, `apps/web/app/api/visites/route.test.ts`

**Interfaces:**
- Consumes: `estJetonValide` (t1), `estRobot`, `appareilDepuis`, `CONSERVATION_VISITES_MS` (t1), `contenuMailVisite` (t1), `baseConfiguree` (t3), `enregistrerVisite`, `marquerMailEnvoye`, `purgerVisites` (t3), `verifierLimite` (`lib/rate-limit.ts`), `siteUrl` (`data/site.ts`).
- Produces:
  - `type Mail = { sujet: string; texte: string; repondreA?: string }`, `envoyerMail(mail: Mail): Promise<void>` ; `sendContactEmail` inchangé pour ses appelants, plus le champ optionnel `lienPersonnalise?: string` dans `ContactEmailData`
  - `traiterVisite(jeton: string, appareil: Appareil, maintenant?: Date): Promise<void>`
  - `POST /api/visites` (corps texte = jeton) → toujours `204`

Lire avant : `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md` et le guide des Route Handlers.

- [ ] **Step 1: `lib/email.ts`** — extraire l'envoi :

```ts
export type Mail = { sujet: string; texte: string; repondreA?: string };

/** Envoie un mail à CONTACT_TO par le SMTP du site. */
export async function envoyerMail({ sujet, texte, repondreA }: Mail): Promise<void> {
  // corps actuel de sendContactEmail jusqu'à createTransport, puis :
  await transporter.sendMail({ from, to, replyTo: repondreA, subject: sujet, text: texte });
}
```

`ContactEmailData` gagne `lienPersonnalise?: string` ; `sendContactEmail` construit le texte comme aujourd'hui, avec en tête `Message envoyé depuis le lien de ${lienPersonnalise}\n\n` quand il est présent, et appelle `envoyerMail({ sujet: \`Demande de contact — ${nom}\`, texte, repondreA: email })`. Les tests existants de `email.test.ts` doivent passer sans modification ; ajouter :

```ts
it("mentionne le lien personnalisé d'origine", async () => {
  await sendContactEmail({ nom: "Jean", email: "jean@exemple.fr", message: "Bonjour", lienPersonnalise: "Boulangerie Martin" });
  expect(sendMail.mock.calls[0][0].text).toMatch(/^Message envoyé depuis le lien de Boulangerie Martin\n\n/);
});

it("envoie un mail libre sans adresse de réponse", async () => {
  await envoyerMail({ sujet: "Sujet", texte: "Corps" });
  expect(sendMail).toHaveBeenCalledWith(
    expect.objectContaining({ subject: "Sujet", text: "Corps", to: "dest@test", replyTo: undefined }),
  );
});
```

(importer `envoyerMail` en tête du fichier de test).

- [ ] **Step 2: Tests du traitement** — `apps/web/lib/liens/traitement.test.ts`

```ts
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const depot = vi.hoisted(() => ({
  enregistrerVisite: vi.fn(),
  marquerMailEnvoye: vi.fn(),
  purgerVisites: vi.fn(),
}));
const envoyerMail = vi.hoisted(() => vi.fn());
vi.mock("./depot", () => depot);
vi.mock("@/lib/email", () => ({ envoyerMail }));
import { reinitialiserLimites } from "@/lib/rate-limit";
import { traiterVisite } from "./traitement";

const le = new Date("2026-10-09T12:00:00Z");

describe("traiterVisite", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://x";
    reinitialiserLimites();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    delete process.env.DATABASE_URL;
    vi.resetAllMocks();
  });

  it("enregistre, envoie le mail, le marque et purge", async () => {
    depot.enregistrerVisite.mockResolvedValue({ id: "v1", nom: "Boulangerie Martin", numero: 1, precedente: null });
    envoyerMail.mockResolvedValue(undefined);
    await traiterVisite("boulangerie-martin-k7f3", "mobile", le);
    expect(depot.enregistrerVisite).toHaveBeenCalledWith("boulangerie-martin-k7f3", "mobile", le);
    expect(envoyerMail).toHaveBeenCalledWith(
      expect.objectContaining({ sujet: "Boulangerie Martin a ouvert son lien — 1re visite" }),
    );
    expect(depot.marquerMailEnvoye).toHaveBeenCalledWith("v1");
    expect(depot.purgerVisites).toHaveBeenCalledWith(new Date(le.getTime() - 365 * 24 * 60 * 60 * 1000));
  });

  it("n'envoie rien si la visite n'est pas nouvelle ou le lien inconnu", async () => {
    depot.enregistrerVisite.mockResolvedValue(null);
    await traiterVisite("boulangerie-martin-k7f3", "mobile", le);
    expect(envoyerMail).not.toHaveBeenCalled();
  });

  it("garde la visite non marquée si le mail échoue, et purge quand même", async () => {
    depot.enregistrerVisite.mockResolvedValue({ id: "v1", nom: "X", numero: 2, precedente: le });
    envoyerMail.mockRejectedValue(new Error("EAUTH"));
    await traiterVisite("x-0000", "ordinateur", le);
    expect(depot.marquerMailEnvoye).not.toHaveBeenCalled();
    expect(depot.purgerVisites).toHaveBeenCalled();
  });

  it("ne lève jamais, même base indisponible", async () => {
    depot.enregistrerVisite.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(traiterVisite("x-0000", "mobile", le)).resolves.toBeUndefined();
  });

  it("ne fait rien sans base configurée", async () => {
    delete process.env.DATABASE_URL;
    await traiterVisite("x-0000", "mobile", le);
    expect(depot.enregistrerVisite).not.toHaveBeenCalled();
  });

  it("limite à 10 signaux par heure et par jeton", async () => {
    depot.enregistrerVisite.mockResolvedValue(null);
    for (let i = 0; i < 12; i++) await traiterVisite("x-0000", "mobile", le);
    expect(depot.enregistrerVisite).toHaveBeenCalledTimes(10);
  });
});
```

- [ ] **Step 3: `apps/web/lib/liens/traitement.ts`**

```ts
/** Traitement d'un signal de visite, après la réponse au navigateur. Ne lève jamais. */
import { siteUrl } from "@/data/site";
import { baseConfiguree } from "@/lib/base/client";
import { envoyerMail } from "@/lib/email";
import { verifierLimite } from "@/lib/rate-limit";
import { enregistrerVisite, marquerMailEnvoye, purgerVisites } from "./depot";
import { contenuMailVisite } from "./mail-visite";
import { CONSERVATION_VISITES_MS, type Appareil } from "./visites";

const LIMITE_SIGNAUX = { max: 10, dureeMs: 60 * 60 * 1000 };

export async function traiterVisite(jeton: string, appareil: Appareil, maintenant = new Date()): Promise<void> {
  if (!baseConfiguree()) return;
  if (!verifierLimite(`visite:${jeton}`, LIMITE_SIGNAUX, maintenant.getTime()).autorise) return;

  let visite;
  try {
    visite = await enregistrerVisite(jeton, appareil, maintenant);
  } catch (err) {
    console.error("[visites] Enregistrement impossible :", err);
    return;
  }
  if (!visite) return;

  try {
    await envoyerMail(
      contenuMailVisite({
        nom: visite.nom,
        numero: visite.numero,
        appareil,
        le: maintenant,
        precedente: visite.precedente,
        urlAdmin: `${siteUrl}/admin`,
      }),
    );
    await marquerMailEnvoye(visite.id);
  } catch (err) {
    console.error("[visites] Mail de visite non envoyé :", err);
  }

  try {
    await purgerVisites(new Date(maintenant.getTime() - CONSERVATION_VISITES_MS));
  } catch (err) {
    console.error("[visites] Purge impossible :", err);
  }
}
```

(`contenuMailVisite` renvoie `{ sujet, texte }`, exactement le type `Mail` sans `repondreA`.)

- [ ] **Step 4: Tests de la route** — `apps/web/app/api/visites/route.test.ts`

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const traiterVisite = vi.hoisted(() => vi.fn());
const after = vi.hoisted(() => vi.fn((tache: () => unknown) => tache()));
vi.mock("@/lib/liens/traitement", () => ({ traiterVisite }));
vi.mock("next/server", async (original) => ({ ...(await original<typeof import("next/server")>()), after }));
import { POST } from "./route";

const NAVIGATEUR = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1";
const signal = (corps: string, enTetes: Record<string, string> = { "user-agent": NAVIGATEUR }) =>
  POST(new Request("http://localhost/api/visites", { method: "POST", body: corps, headers: enTetes }));

describe("POST /api/visites", () => {
  beforeEach(() => traiterVisite.mockReset());

  it("répond 204 et traite un signal valide en arrière-plan", async () => {
    const r = await signal("boulangerie-martin-k7f3");
    expect(r.status).toBe(204);
    expect(await r.text()).toBe("");
    expect(traiterVisite).toHaveBeenCalledWith("boulangerie-martin-k7f3", "mobile");
  });
  it.each([
    ["un jeton mal formé", "Boulangerie Martin", { "user-agent": NAVIGATEUR }],
    ["un robot", "boulangerie-martin-k7f3", { "user-agent": "WhatsApp/2.23" }],
    ["un corps trop long", "a".repeat(300), { "user-agent": NAVIGATEUR }],
  ])("répond 204 sans rien traiter pour %s", async (_cas, corps, enTetes) => {
    const r = await signal(corps, enTetes);
    expect(r.status).toBe(204);
    expect(traiterVisite).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: `apps/web/app/api/visites/route.ts`**

```ts
/**
 * Signal d'ouverture d'un lien personnalisé (components/accueil/SignalVisite).
 * Répond toujours 204, sans corps : la réponse ne dit pas si le jeton existe.
 * Le travail (base, mail) se fait après la réponse.
 */
import { after } from "next/server";
import { estJetonValide, LONGUEUR_JETON_MAX } from "@/lib/liens/jeton";
import { traiterVisite } from "@/lib/liens/traitement";
import { appareilDepuis, estRobot } from "@/lib/liens/visites";

const vide = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 256) return vide();
  const jeton = (await request.text()).trim();
  const ua = request.headers.get("user-agent");
  if (jeton.length > LONGUEUR_JETON_MAX || !estJetonValide(jeton) || estRobot(ua)) return vide();
  const appareil = appareilDepuis(request.headers.get("sec-ch-ua-mobile"), ua);
  after(() => traiterVisite(jeton, appareil));
  return vide();
}
```

- [ ] **Step 6: Lancer** — `pnpm --filter web test` → PASS ; typecheck, lint.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/email.ts apps/web/lib/email.test.ts apps/web/lib/liens/traitement.ts apps/web/lib/liens/traitement.test.ts apps/web/app/api/visites/route.ts apps/web/app/api/visites/route.test.ts
git commit -m "Liens personnalisés : réception des visites et mail de notification"
```

---

### Task 7: Connexion à l'administration

**Files:**
- Create: `apps/web/lib/admin/acces.ts`
- Create: `apps/web/app/admin/connexion/page.tsx`, `apps/web/app/admin/connexion/actions.ts`, `apps/web/app/admin/connexion/actions.test.ts`, `apps/web/app/admin/connexion/FormulaireConnexion.tsx`
- Create: `apps/web/app/admin/layout.tsx`

**Interfaces:**
- Consumes: `NOM_COOKIE`, `DUREE_SESSION_MS`, `signerSession`, `verifierSession`, `verifierMotDePasse`, `secretSession` (t2) ; `verifierLimite` (`lib/rate-limit.ts`).
- Modify: `apps/web/lib/rate-limit.ts` (+ son test) — ajouter `consulterLimite(cle: string, options: LimiteOptions, maintenant?: number): { autorise: boolean; secondesAvantReessai: number }`, qui lit la fenêtre sans compter d'envoi. Seuls les **échecs** de connexion consomment la limite ; une connexion réussie ne compte pas.
- Produces:
  - `sessionValide(): Promise<boolean>`, `exigerSession(): Promise<void>` (redirige vers `/admin/connexion`)
  - `type EtatConnexion = { erreur?: string }`, `seConnecter(etat: EtatConnexion, donnees: FormData): Promise<EtatConnexion>`, `seDeconnecter(): Promise<void>`

Lire avant : les guides `authentication.md` et `data-security.md`, et la référence de `cookies` dans `node_modules/next/dist/docs/`.

- [ ] **Step 0: `consulterLimite`** — dans `apps/web/lib/rate-limit.ts`, ajouter une fonction qui purge comme `verifierLimite`, puis renvoie `{ autorise: false, secondesAvantReessai }` si la fenêtre de `cle` a déjà `max` envois, sinon `{ autorise: true, secondesAvantReessai: 0 }`, **sans** incrémenter. Test dans `apps/web/lib/rate-limit.test.ts` (à créer, `// @vitest-environment node`, `reinitialiserLimites()` avant chaque test) : après 2 `verifierLimite` avec `max: 2`, `consulterLimite` refuse ; appeler `consulterLimite` 10 fois sur une clé neuve ne la bloque pas.

- [ ] **Step 1: `apps/web/lib/admin/acces.ts`**

```ts
/** Vérification de la session côté serveur, dans chaque page et action de /admin. */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NOM_COOKIE, secretSession, verifierSession } from "./session";

export async function sessionValide(): Promise<boolean> {
  const secret = secretSession();
  if (!secret) return false;
  return verifierSession((await cookies()).get(NOM_COOKIE)?.value, secret);
}

export async function exigerSession(): Promise<void> {
  if (!(await sessionValide())) redirect("/admin/connexion");
}
```

- [ ] **Step 2: Tests de l'action** — `apps/web/app/admin/connexion/actions.test.ts`

```ts
// @vitest-environment node
import { scryptSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => ({ set: vi.fn(), delete: vi.fn(), get: vi.fn() }));
const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
);
vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("next/navigation", () => ({ redirect }));
import { reinitialiserLimites } from "@/lib/rate-limit";
import { seConnecter, seDeconnecter } from "./actions";

const sel = Buffer.from("0123456789abcdef");
const EMPREINTE = ["scrypt", 16384, 8, 1, sel.toString("base64url"),
  scryptSync("bon-mot-de-passe", sel, 32, { N: 16384, r: 8, p: 1 }).toString("base64url")].join("$");
const formulaire = (motDePasse: string) => {
  const f = new FormData();
  f.set("motDePasse", motDePasse);
  return f;
};

describe("seConnecter", () => {
  beforeEach(() => {
    process.env.ADMIN_EMPREINTE = EMPREINTE;
    process.env.ADMIN_SECRET = "s".repeat(32);
    reinitialiserLimites();
  });
  afterEach(() => {
    delete process.env.ADMIN_EMPREINTE;
    delete process.env.ADMIN_SECRET;
    vi.clearAllMocks();
  });

  it("pose le cookie de session et redirige vers /admin", async () => {
    await expect(seConnecter({}, formulaire("bon-mot-de-passe"))).rejects.toThrow("REDIRECT /admin");
    const [nom, valeur, options] = jar.set.mock.calls[0];
    expect(nom).toBe("admin_session");
    expect(valeur).toMatch(/^\d+\.[\w-]+$/);
    expect(options).toMatchObject({ httpOnly: true, sameSite: "strict", path: "/admin" });
  });
  it("refuse un mauvais mot de passe sans cookie", async () => {
    expect(await seConnecter({}, formulaire("mauvais"))).toEqual({ erreur: "Mot de passe incorrect." });
    expect(jar.set).not.toHaveBeenCalled();
  });
  it("bloque après 5 échecs en un quart d'heure, même avec le bon mot de passe", async () => {
    for (let i = 0; i < 5; i++) await seConnecter({}, formulaire("mauvais"));
    expect(await seConnecter({}, formulaire("bon-mot-de-passe"))).toEqual({
      erreur: "Trop de tentatives. Réessayez dans un quart d'heure.",
    });
  });
  it("ne compte pas les connexions réussies", async () => {
    for (let i = 0; i < 6; i++) {
      await expect(seConnecter({}, formulaire("bon-mot-de-passe"))).rejects.toThrow("REDIRECT /admin");
    }
  });
  it("signale une administration non configurée", async () => {
    delete process.env.ADMIN_SECRET;
    expect(await seConnecter({}, formulaire("bon-mot-de-passe"))).toEqual({
      erreur: "Administration non configurée.",
    });
  });
});

describe("seDeconnecter", () => {
  it("efface le cookie et renvoie vers la connexion", async () => {
    await expect(seDeconnecter()).rejects.toThrow("REDIRECT /admin/connexion");
    expect(jar.delete).toHaveBeenCalledWith({ name: "admin_session", path: "/admin" });
  });
});
```

- [ ] **Step 3: `apps/web/app/admin/connexion/actions.ts`**

```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  DUREE_SESSION_MS,
  NOM_COOKIE,
  secretSession,
  signerSession,
  verifierMotDePasse,
} from "@/lib/admin/session";
import { consulterLimite, verifierLimite } from "@/lib/rate-limit";

export type EtatConnexion = { erreur?: string };

/** Cinq échecs par quart d'heure, tous appelants confondus : un seul compte. */
const LIMITE_ECHECS = { max: 5, dureeMs: 15 * 60 * 1000 };
const CLE_LIMITE = "admin:connexion";

export async function seConnecter(_etat: EtatConnexion, donnees: FormData): Promise<EtatConnexion> {
  const empreinte = process.env.ADMIN_EMPREINTE;
  const secret = secretSession();
  if (!empreinte || !secret) return { erreur: "Administration non configurée." };
  if (!consulterLimite(CLE_LIMITE, LIMITE_ECHECS).autorise) {
    return { erreur: "Trop de tentatives. Réessayez dans un quart d'heure." };
  }
  if (!(await verifierMotDePasse(String(donnees.get("motDePasse") ?? ""), empreinte))) {
    verifierLimite(CLE_LIMITE, LIMITE_ECHECS);
    return { erreur: "Mot de passe incorrect." };
  }
  const expireLe = Date.now() + DUREE_SESSION_MS;
  (await cookies()).set(NOM_COOKIE, signerSession(expireLe, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    expires: new Date(expireLe),
  });
  redirect("/admin");
}

export async function seDeconnecter(): Promise<void> {
  (await cookies()).delete({ name: NOM_COOKIE, path: "/admin" });
  redirect("/admin/connexion");
}
```

- [ ] **Step 4: Page et formulaire** —
  - `apps/web/app/admin/layout.tsx` : `export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } }` ; rend `<div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">{children}</div>`.
  - `apps/web/app/admin/connexion/FormulaireConnexion.tsx` (client) : `useActionState(seConnecter, {})` ; un `<label>` « Mot de passe » avec `<input type="password" name="motDePasse" autoComplete="current-password" required>` (classes de champ reprises de `ContactForm.tsx`), un bouton « Se connecter » (désactivé pendant l'envoi, libellé « Connexion… »), et l'erreur dans `<p role="alert">` reliée au champ par `aria-describedby` et `aria-invalid`.
  - `apps/web/app/admin/connexion/page.tsx` : si `await sessionValide()`, `redirect("/admin")` ; sinon titre `<h1 className="font-serif text-4xl">Administration</h1>`, puis `<FormulaireConnexion />`.

- [ ] **Step 5: Lancer** — `pnpm --filter web test` → PASS ; typecheck, lint ; `pnpm --filter web build` (route `/admin/connexion` dynamique).

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/rate-limit.ts apps/web/lib/rate-limit.test.ts apps/web/lib/admin/acces.ts apps/web/app/admin/layout.tsx apps/web/app/admin/connexion/page.tsx apps/web/app/admin/connexion/actions.ts apps/web/app/admin/connexion/actions.test.ts apps/web/app/admin/connexion/FormulaireConnexion.tsx
git commit -m "Administration : connexion par mot de passe, session et déconnexion"
```

---

### Task 8: Tableau des liens

**Files:**
- Create: `apps/web/app/admin/page.tsx`, `apps/web/app/admin/page.test.tsx`
- Create: `apps/web/app/admin/actions.ts`, `apps/web/app/admin/actions.test.ts`
- Create: `apps/web/app/admin/NouveauLien.tsx`, `apps/web/app/admin/BoutonCopier.tsx`, `apps/web/app/admin/BoutonSupprimer.tsx`

**Interfaces:**
- Consumes: `exigerSession` (t7), `seDeconnecter` (t7), `nettoyerNom` (t1), `ilYA`, `dateHeureParis` (t1), `ordinalVisite` (t1), `baseConfiguree` (t3), `creerLien`, `listerLiens`, `changerEtat`, `supprimerLien`, `type LienResume` (t3), `ANGLES`, `libellesAngle`, `type Angle` (t4), `siteUrl`.
- Produces:
  - `type EtatCreation = { lien?: { nom: string; url: string }; erreur?: string }`
  - `creerLienAction(etat: EtatCreation, donnees: FormData): Promise<EtatCreation>`
  - `changerEtatAction(donnees: FormData): Promise<void>` (champs `id`, `actif` = `"true"` | `"false"`)
  - `supprimerLienAction(donnees: FormData): Promise<void>` (champ `id`)
  - `urlDuLien(jeton: string): string` (`${siteUrl}/?pour=${jeton}`) et `apercuDuLien(jeton: string): string`, dans `apps/web/lib/liens/url.ts`

- [ ] **Step 1: `apps/web/lib/liens/url.ts`**

```ts
import { siteUrl } from "@/data/site";

/** Lien à envoyer au prospect. */
export function urlDuLien(jeton: string): string {
  return `${siteUrl}/?pour=${jeton}`;
}

/** Aperçu, relatif pour fonctionner sur tous les environnements ; ne compte pas de visite. */
export function apercuDuLien(jeton: string): string {
  return `/?pour=${jeton}&apercu=1`;
}
```

- [ ] **Step 2: Tests des actions** — `apps/web/app/admin/actions.test.ts`

```ts
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const exigerSession = vi.hoisted(() => vi.fn());
const depot = vi.hoisted(() => ({
  creerLien: vi.fn(),
  changerEtat: vi.fn(),
  supprimerLien: vi.fn(),
}));
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("@/lib/admin/acces", () => ({ exigerSession }));
vi.mock("@/lib/liens/depot", () => depot);
vi.mock("next/cache", () => ({ revalidatePath }));
import { changerEtatAction, creerLienAction, supprimerLienAction } from "./actions";

const formulaire = (champs: Record<string, string>) => {
  const f = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) f.set(cle, valeur);
  return f;
};

describe("actions de l'administration", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://x";
  });
  afterEach(() => {
    delete process.env.DATABASE_URL;
    vi.resetAllMocks();
  });

  it("exige la session avant toute chose", async () => {
    exigerSession.mockRejectedValue(new Error("REDIRECT /admin/connexion"));
    await expect(creerLienAction({}, formulaire({ nom: "X", angle: "vitrine" }))).rejects.toThrow("REDIRECT");
    await expect(changerEtatAction(formulaire({ id: "1", actif: "false" }))).rejects.toThrow("REDIRECT");
    await expect(supprimerLienAction(formulaire({ id: "1" }))).rejects.toThrow("REDIRECT");
    expect(depot.creerLien).not.toHaveBeenCalled();
    expect(depot.changerEtat).not.toHaveBeenCalled();
    expect(depot.supprimerLien).not.toHaveBeenCalled();
  });

  it("crée un lien et renvoie son adresse", async () => {
    depot.creerLien.mockResolvedValue({ jeton: "boulangerie-martin-k7f3" });
    const etat = await creerLienAction({}, formulaire({ nom: "  Boulangerie Martin ", angle: "vitrine" }));
    expect(depot.creerLien).toHaveBeenCalledWith("Boulangerie Martin", "vitrine");
    expect(etat.lien?.nom).toBe("Boulangerie Martin");
    expect(etat.lien?.url).toMatch(/\/\?pour=boulangerie-martin-k7f3$/);
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it.each([
    [{ nom: "   ", angle: "vitrine" }, "Indiquez le nom du prospect."],
    [{ nom: "a".repeat(61), angle: "vitrine" }, "Le nom ne doit pas dépasser 60 caractères."],
    [{ nom: "X", angle: "autre" }, "Choisissez un angle."],
  ])("refuse %o", async (champs, erreur) => {
    expect(await creerLienAction({}, formulaire(champs))).toEqual({ erreur });
    expect(depot.creerLien).not.toHaveBeenCalled();
  });

  it("signale une base indisponible", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    depot.creerLien.mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await creerLienAction({}, formulaire({ nom: "X", angle: "vitrine" }))).toEqual({
      erreur: "Base de données indisponible.",
    });
  });

  it("désactive, réactive et supprime", async () => {
    await changerEtatAction(formulaire({ id: "l1", actif: "false" }));
    await changerEtatAction(formulaire({ id: "l1", actif: "true" }));
    await supprimerLienAction(formulaire({ id: "l1" }));
    expect(depot.changerEtat.mock.calls).toEqual([["l1", false], ["l1", true]]);
    expect(depot.supprimerLien).toHaveBeenCalledWith("l1");
  });
});
```

- [ ] **Step 3: `apps/web/app/admin/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { ANGLES, type Angle } from "@/data/accueil";
import { exigerSession } from "@/lib/admin/acces";
import { changerEtat, creerLien, supprimerLien } from "@/lib/liens/depot";
import { nettoyerNom } from "@/lib/liens/jeton";
import { urlDuLien } from "@/lib/liens/url";

export type EtatCreation = { lien?: { nom: string; url: string }; erreur?: string };

export async function creerLienAction(_etat: EtatCreation, donnees: FormData): Promise<EtatCreation> {
  await exigerSession();
  const nom = nettoyerNom(String(donnees.get("nom") ?? ""));
  if (!nom.ok) return { erreur: nom.erreur };
  const angle = String(donnees.get("angle") ?? "") as Angle;
  if (!ANGLES.includes(angle)) return { erreur: "Choisissez un angle." };
  try {
    const { jeton } = await creerLien(nom.nom, angle);
    revalidatePath("/admin");
    return { lien: { nom: nom.nom, url: urlDuLien(jeton) } };
  } catch (err) {
    console.error("[admin] Création du lien impossible :", err);
    return { erreur: "Base de données indisponible." };
  }
}

export async function changerEtatAction(donnees: FormData): Promise<void> {
  await exigerSession();
  await changerEtat(String(donnees.get("id")), donnees.get("actif") === "true");
  revalidatePath("/admin");
}

export async function supprimerLienAction(donnees: FormData): Promise<void> {
  await exigerSession();
  await supprimerLien(String(donnees.get("id")));
  revalidatePath("/admin");
}
```

- [ ] **Step 4: Composants client**
  - `BoutonCopier.tsx` : `export function BoutonCopier({ texte, libelle = "Copier le lien" }: { texte: string; libelle?: string })` — bouton qui appelle `navigator.clipboard.writeText(texte)` puis affiche « Copié » 2 s ; `aria-live="polite"` sur le libellé ; en cas d'échec, affiche « Copie impossible ».
  - `BoutonSupprimer.tsx` : `export function BoutonSupprimer({ id, nom }: { id: string; nom: string })` — `<form action={supprimerLienAction} onSubmit={(e) => { if (!confirm(\`Supprimer le lien de ${nom} et ses visites ?\`)) e.preventDefault(); }}>` avec `<input type="hidden" name="id" value={id} />` et un bouton « Supprimer ».
  - `NouveauLien.tsx` : `useActionState(creerLienAction, {})` ; champs `nom` (label « Nom du prospect », `maxLength={60}`, requis) et `angle` (deux boutons radio, libellés de `libellesAngle`, `application` coché par défaut) ; bouton « Créer le lien » ; erreur en `role="alert"` ; succès : « Lien de {nom} : » suivi de l'URL dans un `<code>` sélectionnable et de `<BoutonCopier texte={url} />`.

- [ ] **Step 5: Page** — `apps/web/app/admin/page.tsx`

```tsx
import { BoutonCopier } from "./BoutonCopier";
import { BoutonSupprimer } from "./BoutonSupprimer";
import { NouveauLien } from "./NouveauLien";
import { changerEtatAction } from "./actions";
import { seDeconnecter } from "./connexion/actions";
import { libellesAngle } from "@/data/accueil";
import { exigerSession } from "@/lib/admin/acces";
import { baseConfiguree } from "@/lib/base/client";
import { listerLiens, type LienResume } from "@/lib/liens/depot";
import { ordinalVisite } from "@/lib/liens/mail-visite";
import { dateHeureParis, ilYA } from "@/lib/liens/temps";
import { apercuDuLien, urlDuLien } from "@/lib/liens/url";

export const dynamic = "force-dynamic";

async function chargerLiens(): Promise<LienResume[] | null> {
  if (!baseConfiguree()) return null;
  try {
    return await listerLiens();
  } catch (err) {
    console.error("[admin] Lecture des liens impossible :", err);
    return null;
  }
}

export default async function PageAdmin() {
  await exigerSession();
  const liens = await chargerLiens();
  const maintenant = new Date();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-4xl">Liens personnalisés</h1>
        <form action={seDeconnecter}>
          <button className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre">
            Se déconnecter
          </button>
        </form>
      </div>

      {liens === null ? (
        <p role="alert" className="rounded-2xl border border-brique p-4 text-brique">
          Base de données indisponible.
        </p>
      ) : (
        <>
          <NouveauLien />
          {liens.length === 0 ? (
            <p className="text-encre-douce">Aucun lien pour l&apos;instant.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {liens.map((lien) => (
                <li key={lien.id} className="flex flex-col gap-3 rounded-2xl border border-trait p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-serif text-2xl">{lien.nom}</h2>
                    <p className="text-sm text-encre-douce">
                      {libellesAngle[lien.angle]} · {lien.actif ? "actif" : "désactivé"} ·{" "}
                      {lien.visites.length === 0
                        ? "aucune visite"
                        : `${lien.visites.length} visite${lien.visites.length > 1 ? "s" : ""}, la dernière ${ilYA(lien.visites[0].le, maintenant)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <BoutonCopier texte={urlDuLien(lien.jeton)} />
                    <a href={apercuDuLien(lien.jeton)} target="_blank" rel="noopener" className="underline underline-offset-4">
                      Aperçu<span className="sr-only"> (nouvel onglet)</span>
                    </a>
                    <form action={changerEtatAction}>
                      <input type="hidden" name="id" value={lien.id} />
                      <input type="hidden" name="actif" value={String(!lien.actif)} />
                      <button className="underline underline-offset-4">{lien.actif ? "Désactiver" : "Réactiver"}</button>
                    </form>
                    <BoutonSupprimer id={lien.id} nom={lien.nom} />
                  </div>
                  {lien.visites.length > 0 && (
                    <details>
                      <summary className="cursor-pointer text-sm">Visites</summary>
                      <ul className="mt-2 flex flex-col gap-1 text-sm text-encre-douce">
                        {lien.visites.map((v) => (
                          <li key={v.numero}>
                            {ordinalVisite(v.numero)} — {dateHeureParis(v.le)}, sur {v.appareil}
                            {v.mailEnvoye ? "" : " (mail non envoyé)"}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
```

(Le compteur affiché porte sur les 50 dernières visites renvoyées par `listerLiens` ; c'est suffisant ici.)

- [ ] **Step 6: Tests de la page** — `apps/web/app/admin/page.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const exigerSession = vi.hoisted(() => vi.fn());
const listerLiens = vi.hoisted(() => vi.fn());
vi.mock("@/lib/admin/acces", () => ({ exigerSession }));
vi.mock("@/lib/liens/depot", () => ({ listerLiens }));
vi.mock("./actions", () => ({ changerEtatAction: vi.fn(), creerLienAction: vi.fn(), supprimerLienAction: vi.fn() }));
vi.mock("./connexion/actions", () => ({ seDeconnecter: vi.fn() }));
import PageAdmin from "./page";

describe("page d'administration", () => {
  afterEach(() => {
    delete process.env.DATABASE_URL;
    vi.resetAllMocks();
  });

  it("vérifie la session", async () => {
    exigerSession.mockRejectedValue(new Error("REDIRECT /admin/connexion"));
    await expect(PageAdmin()).rejects.toThrow("REDIRECT");
    expect(listerLiens).not.toHaveBeenCalled();
  });

  it("affiche le bandeau sans base", async () => {
    render(await PageAdmin());
    expect(screen.getByRole("alert")).toHaveTextContent("Base de données indisponible.");
  });

  it("liste les liens avec leurs visites et actions", async () => {
    process.env.DATABASE_URL = "postgresql://x";
    listerLiens.mockResolvedValue([
      {
        id: "l1",
        jeton: "boulangerie-martin-k7f3",
        nom: "Boulangerie Martin",
        angle: "vitrine",
        actif: true,
        creeLe: new Date(),
        visites: [{ le: new Date(), appareil: "mobile", numero: 1, mailEnvoye: false }],
      },
    ]);
    render(await PageAdmin());
    expect(screen.getByRole("heading", { level: 2, name: "Boulangerie Martin" })).toBeInTheDocument();
    expect(screen.getByText(/Site vitrine · actif · 1 visite/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Aperçu/ })).toHaveAttribute(
      "href",
      "/?pour=boulangerie-martin-k7f3&apercu=1",
    );
    expect(screen.getByRole("button", { name: "Désactiver" })).toBeInTheDocument();
    expect(screen.getByText(/mail non envoyé/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Lancer** — `pnpm --filter web test` → PASS ; typecheck, lint, build.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/liens/url.ts apps/web/app/admin/page.tsx apps/web/app/admin/page.test.tsx apps/web/app/admin/actions.ts apps/web/app/admin/actions.test.ts apps/web/app/admin/NouveauLien.tsx apps/web/app/admin/BoutonCopier.tsx apps/web/app/admin/BoutonSupprimer.tsx
git commit -m "Administration : création, copie, aperçu, désactivation et suppression des liens"
```

---

### Task 9: Formulaire de contact relié au lien, politique de confidentialité

**Files:**
- Modify: `apps/web/app/contact/actions.ts`, `apps/web/app/contact/actions.test.ts`
- Modify: `apps/web/app/politique-de-confidentialite/page.tsx`, `apps/web/app/politique-de-confidentialite/page.test.tsx`

**Interfaces:**
- Consumes: `lienPourAffichage` (t5), `sendContactEmail` avec `lienPersonnalise` (t6).

- [ ] **Step 1: Test** — dans `apps/web/app/contact/actions.test.ts`, simuler `@/lib/liens/affichage` (`lienPourAffichage = vi.fn()`) et ajouter :

```ts
it("indique le lien personnalisé d'origine", async () => {
  lienPourAffichage.mockResolvedValue({ nom: "Boulangerie Martin", angle: "vitrine" });
  const f = formulaireValide(); // helper existant du fichier, ou construire nom/email/message valides
  f.set("pour", "boulangerie-martin-k7f3");
  await submitContactForm({ status: "idle", message: "" }, f);
  expect(sendContactEmail).toHaveBeenCalledWith(expect.objectContaining({ lienPersonnalise: "Boulangerie Martin" }));
});

it("ignore un lien inconnu ou une base indisponible", async () => {
  lienPourAffichage.mockResolvedValue(null);
  const f = formulaireValide();
  f.set("pour", "inconnu-0000");
  await submitContactForm({ status: "idle", message: "" }, f);
  expect(sendContactEmail).toHaveBeenCalledWith(expect.objectContaining({ lienPersonnalise: undefined }));
});
```

(Adapter au nom réel des simulations et helpers du fichier.)

- [ ] **Step 2: Action** — dans `submitContactForm`, juste avant l'envoi :

```ts
const jeton = String(formData.get("pour") ?? "");
const lien = jeton ? await lienPourAffichage(jeton) : null;
```

puis passer `lienPersonnalise: lien?.nom` à `sendContactEmail`.

- [ ] **Step 3: Politique de confidentialité** — ajouter, après la section « Finalité du traitement », une section :

```tsx
<div className="flex flex-col gap-3">
  <h2 className="text-xl font-semibold">Liens personnalisés</h2>
  <p>
    Je peux envoyer à un prospect un lien personnalisé vers ce site, qui le salue par le nom de son
    entreprise. Quand ce lien est ouvert, j&apos;enregistre la date de la visite, le type d&apos;appareil
    (mobile ou ordinateur) et le nombre de visites, et je reçois un e-mail. Ni adresse IP, ni cookie, ni
    identifiant de navigateur ne sont enregistrés.
  </p>
  <p>
    Ce suivi sert uniquement à savoir quand reprendre contact. Sa base légale est mon intérêt légitime à
    assurer le suivi commercial d&apos;une proposition (article 6.1.f du RGPD). Les visites sont conservées
    douze mois, puis supprimées automatiquement. Vous pouvez demander à tout moment la suppression de votre
    lien et de ses visites, par le formulaire de contact ou à l&apos;adresse {mentionsLegales.email}.
  </p>
</div>
```

Si la page mentionne l'absence de cookie, ajouter que le seul cookie du site est celui de la session d'administration, réservé à `/admin`, strictement nécessaire. Test : la page affiche le titre « Liens personnalisés » et « douze mois ».

- [ ] **Step 4: Lancer** — `pnpm --filter web test` → PASS ; typecheck, lint ; `pnpm --filter web verifier-placeholders` sans nouvelle correspondance.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/contact/actions.ts apps/web/app/contact/actions.test.ts apps/web/app/politique-de-confidentialite/page.tsx apps/web/app/politique-de-confidentialite/page.test.tsx
git commit -m "Contact relié au lien personnalisé ; politique de confidentialité des liens"
```

---

### Task 10: Docker, migrations au démarrage et CI avec Postgres

**Files:**
- Modify: `Dockerfile`, `.dockerignore` (si besoin)
- Create: `docker/demarrer.sh`
- Modify: `.github/workflows/ci.yml`
- Create: `apps/web/scripts/semer-lien-exemple.mjs`, `apps/web/scripts/verifier-accueil-statique.mjs`
- Modify: `apps/web/package.json` (scripts), `apps/web/lighthouserc.json`, `README.md`

**Interfaces:**
- Consumes: schéma et migrations (t3).
- Produces: jeton d'exemple `exemple-0000` (« Exemple », angle `application`) semé en CI ; scripts `semer-lien-exemple`, `verifier-accueil-statique`.

- [ ] **Step 1: Démarrage** — `docker/demarrer.sh`

```sh
#!/bin/sh
# Démarrage du conteneur : applique les migrations Prisma si une base est
# configurée, puis lance le serveur Next. Une migration en échec arrête le
# conteneur (Coolify le signale) plutôt que de servir un schéma incohérent.
set -e
if [ -n "$DATABASE_URL" ]; then
  (cd /app/migrateur && ./node_modules/.bin/prisma migrate deploy)
fi
exec node apps/web/server.js
```

- [ ] **Step 2: Dockerfile** — dans l'étape `runner`, avant `USER nextjs` :

```dockerfile
# Migrations : la CLI Prisma (absente du standalone) dans un dossier à part,
# avec le schéma, les migrations et la configuration.
WORKDIR /app/migrateur
RUN npm init -y >/dev/null && npm install --omit=dev --no-audit --no-fund prisma@7.10.0
COPY --from=build --chown=nextjs:nodejs /app/apps/web/prisma ./prisma
COPY --from=build --chown=nextjs:nodejs /app/apps/web/prisma.config.ts ./prisma.config.ts
WORKDIR /app
COPY --chown=nextjs:nodejs docker/demarrer.sh ./demarrer.sh
RUN chmod +x ./demarrer.sh
```

et remplacer `CMD ["node", "apps/web/server.js"]` par `CMD ["./demarrer.sh"]`. Copier aussi `apps/web/prisma` et `apps/web/prisma.config.ts` sont déjà dans le contexte de build (`COPY . .`). Vérifier que le standalone embarque le client généré, `@prisma/adapter-pg` et `pg` (sinon ajouter `outputFileTracingIncludes` dans `next.config.ts` et le signaler).

- [ ] **Step 3: Vérifier l'image** —

```bash
docker compose -f compose.dev.yml up -d
docker build -t jouan-dev-test .
docker run --rm -d --name jouan-test --network host \
  -e PORT=3300 -e HOSTNAME=127.0.0.1 \
  -e DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan \
  jouan-dev-test
```

Attendre « Ready », puis : `curl -sf http://127.0.0.1:3300/` (200), créer un lien en SQL (`psql postgresql://jouan:jouan@127.0.0.1:5433/jouan -c "INSERT INTO \"Lien\" (id, jeton, nom, angle) VALUES ('test-docker', 'docker-0000', 'Essai Docker', 'vitrine')"`), `curl -s 'http://127.0.0.1:3300/?pour=docker-0000' | grep -c 'Bonjour Essai Docker'` → 1. Supprimer la ligne et arrêter le conteneur (`docker stop jouan-test`). Noter le résultat dans le rapport.

- [ ] **Step 4: Scripts** — `apps/web/scripts/semer-lien-exemple.mjs`

```js
/**
 * Crée le lien d'exemple mesuré par Lighthouse en CI (`/?pour=exemple-0000`).
 * Idempotent. Prérequis : DATABASE_URL et les migrations appliquées.
 */
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(
  `INSERT INTO "Lien" (id, jeton, nom, angle) VALUES ('lien-exemple', 'exemple-0000', 'Exemple', 'application')
   ON CONFLICT (jeton) DO UPDATE SET actif = true`,
);
await client.end();
console.log("Lien d'exemple prêt : /?pour=exemple-0000");
```

`apps/web/scripts/verifier-accueil-statique.mjs`

```js
/**
 * Vérifie, après `pnpm build`, que l'accueil `/` est toujours prérendu :
 * les liens personnalisés passent par le proxy et ne doivent pas le rendre
 * dynamique.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifeste = JSON.parse(readFileSync(join(app, ".next/prerender-manifest.json"), "utf8"));
if (!manifeste.routes?.["/"]) {
  console.error("L'accueil `/` n'est plus prérendu (statique).");
  process.exit(1);
}
console.log("Accueil `/` prérendu : OK.");
```

`package.json` : `"semer-lien-exemple": "node scripts/semer-lien-exemple.mjs"`, `"verifier-accueil-statique": "node scripts/verifier-accueil-statique.mjs"`.

- [ ] **Step 5: Lighthouse** — `apps/web/lighthouserc.json`, ajouter l'URL `"http://127.0.0.1:3000/?pour=exemple-0000"` à `collect.url` (seuils inchangés).

- [ ] **Step 6: CI** — `.github/workflows/ci.yml`, pour les jobs `verifier` et `e2e` :

```yaml
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_USER: jouan
          POSTGRES_PASSWORD: jouan
          POSTGRES_DB: jouan_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U jouan"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      DATABASE_URL: postgresql://jouan:jouan@127.0.0.1:5432/jouan_test
      DATABASE_URL_TEST: postgresql://jouan:jouan@127.0.0.1:5432/jouan_test
```

Étapes : après `pnpm install --frozen-lockfile`, `- run: pnpm --filter web migrer` (les deux jobs). Dans `e2e`, après `pnpm build` : `- run: pnpm --filter web verifier-accueil-statique` et `- run: pnpm --filter web semer-lien-exemple`. Commenter en tête du bloc `services` : « Base de test : migrations appliquées puis tests d'intégration (verifier), e2e et Lighthouse (e2e). » Le job `image` ne change pas (le build Docker n'a pas besoin de base).

- [ ] **Step 7: README** — section « Déploiement » : ressource Postgres Coolify, variables `DATABASE_URL`, `ADMIN_EMPREINTE` (`pnpm --filter web empreinte-mot-de-passe`), `ADMIN_SECRET` (`openssl rand -base64 48`), migrations appliquées au démarrage du conteneur ; commandes `semer-lien-exemple` et `verifier-accueil-statique`.

- [ ] **Step 8: Lancer** — `pnpm lint && pnpm typecheck && pnpm test` ; `pnpm build && pnpm --filter web verifier-accueil-statique`.

- [ ] **Step 9: Commit**

```bash
git add Dockerfile docker/demarrer.sh .github/workflows/ci.yml apps/web/scripts/semer-lien-exemple.mjs apps/web/scripts/verifier-accueil-statique.mjs apps/web/package.json apps/web/lighthouserc.json README.md
git commit -m "Liens personnalisés : migrations au démarrage du conteneur, Postgres en CI, lien d'exemple mesuré"
```

(Ajouter `.dockerignore` et `next.config.ts` au `git add` s'ils ont changé.)

---

### Task 11: Tests de bout en bout

**Files:**
- Modify: `apps/web/e2e/smtp-factice.ts` (enregistrer les mails reçus)
- Create: `apps/web/e2e/boite.ts`, `apps/web/e2e/admin-test.ts`, `apps/web/e2e/liens.spec.ts`, `apps/web/e2e/admin.spec.ts`
- Modify: `apps/web/playwright.config.ts`, `apps/web/package.json` (`mailparser` en devDependency), `pnpm-lock.yaml`

**Interfaces:**
- Consumes: tout ce qui précède ; mot de passe d'essai `mot-de-passe-e2e`.
- Produces: `mailsRecus(): Promise<{ sujet: string; texte: string }[]>`, `attendreMail(filtre: (m) => boolean): Promise<{ sujet; texte }>` ; `MOT_DE_PASSE_E2E`, `EMPREINTE_E2E`, `SECRET_E2E`.

- [ ] **Step 1: Boîte de réception** — `pnpm --filter web add -D mailparser @types/mailparser`. Dans `smtp-factice.ts`, exporter `FICHIER_MAILS = join(tmpdir(), "jouan-e2e-mails.jsonl")`, le vider au démarrage (`writeFileSync(FICHIER_MAILS, "")`) et, dans `onData` (sauf refus), `appendFileSync(FICHIER_MAILS, JSON.stringify(contenu) + "\n")`. `apps/web/e2e/boite.ts` :

```ts
import { readFileSync } from "node:fs";
import { simpleParser } from "mailparser";
import { FICHIER_MAILS } from "./smtp-factice";

export type MailRecu = { sujet: string; texte: string };

export async function mailsRecus(): Promise<MailRecu[]> {
  const lignes = readFileSync(FICHIER_MAILS, "utf8").split("\n").filter(Boolean);
  return Promise.all(
    lignes.map(async (ligne) => {
      const mail = await simpleParser(JSON.parse(ligne) as string);
      return { sujet: mail.subject ?? "", texte: mail.text ?? "" };
    }),
  );
}

/** Attend (5 s au plus) un mail qui satisfait `filtre` : l'envoi se fait après la réponse. */
export async function attendreMail(filtre: (m: MailRecu) => boolean): Promise<MailRecu> {
  for (let i = 0; i < 50; i++) {
    const trouve = (await mailsRecus()).find(filtre);
    if (trouve) return trouve;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Mail attendu non reçu");
}
```

- [ ] **Step 2: Identifiants d'essai** — `apps/web/e2e/admin-test.ts` : `MOT_DE_PASSE_E2E = "mot-de-passe-e2e"`, `SECRET_E2E = "secret-de-session-pour-les-tests-e2e-0123"`, `EMPREINTE_E2E` = empreinte précalculée de `mot-de-passe-e2e` au format de la tâche 2 (la calculer une fois avec `scryptSync` et un sel fixe, et l'écrire en clair : c'est un mot de passe de test). Dans `playwright.config.ts`, `webServer.env` gagne `DATABASE_URL: process.env.DATABASE_URL ?? ""`, `ADMIN_EMPREINTE: EMPREINTE_E2E`, `ADMIN_SECRET: SECRET_E2E`.

- [ ] **Step 3: `apps/web/e2e/admin.spec.ts`**

```ts
import { expect, test } from "@playwright/test";
import { MOT_DE_PASSE_E2E } from "./admin-test";
import { surveillerErreurs } from "./outils";

test.skip(!process.env.DATABASE_URL, "Base de test requise (DATABASE_URL).");
test.describe.configure({ mode: "serial" });

test("l'administration exige une connexion", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/connexion$/);
  await page.getByLabel("Mot de passe").fill("mauvais");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("alert")).toHaveText("Mot de passe incorrect.");
});

test("connexion, création, désactivation et suppression d'un lien", async ({ page }, info) => {
  const erreurs = surveillerErreurs(page);
  const nom = `Essai admin ${info.project.name} ${Date.now()}`;
  await page.goto("/admin/connexion");
  await page.getByLabel("Mot de passe").fill(MOT_DE_PASSE_E2E);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByLabel("Nom du prospect").fill(nom);
  await page.getByLabel("Site vitrine").check();
  await page.getByRole("button", { name: "Créer le lien" }).click();
  await expect(page.getByText(`Lien de ${nom} :`)).toBeVisible();

  const carte = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: nom }) });
  await carte.getByRole("button", { name: "Désactiver" }).click();
  await expect(carte.getByText(/désactivé/)).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await carte.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByRole("heading", { name: nom })).toHaveCount(0);

  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/admin\/connexion$/);
  expect(erreurs).toEqual([]);
});
```

(Le blocage après 5 essais est couvert en unitaire ; ici un seul mauvais essai par projet, sous la limite. Si les deux projets dépassent 5 essais au total, passer `admin.spec.ts` sur le seul projet `ordinateur`.)

- [ ] **Step 4: `apps/web/e2e/liens.spec.ts`** — un lien créé par l'administration de chaque test, via une fonction `creerLien(page, nom, angle)` qui se connecte et renvoie le jeton lu dans l'URL affichée :

```ts
import { expect, test, type Page } from "@playwright/test";
import { MOT_DE_PASSE_E2E } from "./admin-test";
import { attendreMail, mailsRecus } from "./boite";
import { surveillerErreurs } from "./outils";

test.skip(!process.env.DATABASE_URL, "Base de test requise (DATABASE_URL).");

async function creerLien(page: Page, nom: string, angle: "Application métier" | "Site vitrine") {
  await page.goto("/admin/connexion");
  await page.getByLabel("Mot de passe").fill(MOT_DE_PASSE_E2E);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.getByLabel("Nom du prospect").fill(nom);
  await page.getByLabel(angle).check();
  await page.getByRole("button", { name: "Créer le lien" }).click();
  const url = await page.locator("code").first().textContent();
  return new URL(url!).searchParams.get("pour")!;
}

test("un prospect voit sa page et Augustin reçoit un mail, une seule fois par demi-heure", async ({ page }, info) => {
  const nom = `Boulangerie ${info.project.name} ${Date.now()}`;
  const jeton = await creerLien(page, nom, "Site vitrine");

  // Même page : le cookie d'administration est limité à /admin, il n'est pas
  // envoyé à l'accueil. Un nouveau contexte perdrait l'agent utilisateur du
  // projet (Chromium sans interface = robot, signal ignoré).
  const prospect = page;
  const erreurs = surveillerErreurs(prospect);
  await prospect.goto(`/?pour=${jeton}`);
  await expect(prospect.getByText(`Bonjour ${nom},`)).toBeVisible();
  await expect(prospect.getByRole("heading", { level: 1 })).toContainText("Un site vitrine");
  const mail = await attendreMail((m) => m.sujet === `${nom} a ouvert son lien — 1re visite`);
  expect(mail.texte).toContain("/admin");

  await prospect.reload();
  await prospect.waitForTimeout(4000);
  expect((await mailsRecus()).filter((m) => m.sujet.startsWith(nom))).toHaveLength(1);
  expect(erreurs).toEqual([]);
});

test("l'aperçu ne compte rien", async ({ page }, info) => {
  const nom = `Apercu ${info.project.name} ${Date.now()}`;
  const jeton = await creerLien(page, nom, "Application métier");
  await page.goto(`/?pour=${jeton}&apercu=1`);
  await expect(page.getByText(`Bonjour ${nom},`)).toBeVisible();
  await page.waitForTimeout(4000);
  expect((await mailsRecus()).filter((m) => m.sujet.startsWith(nom))).toHaveLength(0);
});

test("un lien inconnu affiche l'accueil normal", async ({ page }) => {
  await page.goto("/?pour=inconnu-0000");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Des applications métier");
  await expect(page.getByText(/^Bonjour/)).toHaveCount(0);
});
```

- [ ] **Step 5: Lancer** — `docker compose -f compose.dev.yml up -d` ; `DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm --filter web migrer` ; `pnpm build` ; `DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm e2e` → tout passe (sauts volontaires seulement) ; sans `DATABASE_URL`, les nouveaux tests sont ignorés et les anciens passent. Puis `DATABASE_URL=…/jouan_test pnpm --filter web semer-lien-exemple && DATABASE_URL=…/jouan_test pnpm --filter web lighthouse` → les quatre URL passent. Libérer les ports 3000, 3100, 2525.

- [ ] **Step 6: Commit**

```bash
git add apps/web/e2e/smtp-factice.ts apps/web/e2e/boite.ts apps/web/e2e/admin-test.ts apps/web/e2e/liens.spec.ts apps/web/e2e/admin.spec.ts apps/web/playwright.config.ts apps/web/package.json pnpm-lock.yaml
git commit -m "Liens personnalisés : tests de bout en bout (administration, visite, mail, aperçu)"
```

---

### Task 12: Vérification finale

**Files:**
- Modify: `docs/superpowers/specs/2026-10-08-socle-et-accueil-design.md` (ligne du sous-projet 3 et note sur `apps/realtime` → sous-projet 4), `README.md` si besoin

- [ ] **Step 1: Feuille de route** — dans la spec du sous-projet 1, tableau §3 : la ligne 3 devient « Liens `?pour=…`, accroche adaptée au prospect, mail à l'ouverture du lien, page d'administration des liens (Postgres) » et la ligne 4 ajoute « Introduit le service `apps/realtime` » ; la phrase « `apps/realtime` (Hono, Node) sera ajouté au sous-projet 3 » devient « au sous-projet 4 ».

- [ ] **Step 2: Anonymat**

```bash
T=.superpowers/anonymat/termes-interdits.txt
git diff main..HEAD -- . ':!pnpm-lock.yaml' | grep -ciF -f <(grep -v '^#' $T | grep -v '^$')
git log main..HEAD --format=%B | grep -ciF -f <(grep -v '^#' $T | grep -v '^$')
```

Expected : `0` et `0`.

- [ ] **Step 3: Vérification complète** — avec la base de test démarrée et migrée :

```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck
DATABASE_URL_TEST=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm test
pnpm build && pnpm --filter web verifier-accueil-statique
DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm e2e
pnpm --filter web verifier-taille-encre && pnpm --filter web verifier-taille-demo
DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm --filter web semer-lien-exemple
DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm --filter web lighthouse
docker build -t jouan-dev .
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-10-08-socle-et-accueil-design.md
git commit -m "Feuille de route : apps/realtime passe au sous-projet 4"
```
