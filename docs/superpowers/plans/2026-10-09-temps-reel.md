# Temps réel — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher sur l'accueil un compteur « N personnes regardent cette page » et les curseurs des autres visiteurs, servis par un nouveau service WebSocket `apps/realtime`.

**Architecture:** Un service Hono sur Node (`apps/realtime`) tient en mémoire une salle unique (présents, couleurs, positions) et diffuse compteur et lots de positions sur `/direct`, avec origines autorisées, plafonds de connexions et limite de débit ; il a sa propre image Docker et sa propre ressource Coolify. Le site charge à part, après l'affichage de l'accueil, le code de connexion (`PresenceDirecte`, import différé), convertit la souris en repères relatifs aux sections, et dessine les curseurs reçus dans un calque ; `/` reste statique.

**Tech Stack:** Node 22, Hono 4, `@hono/node-server` 2 (WebSocket intégré sur `ws`), esbuild, tsx, Vitest ; côté site Next.js 16.4, React 19.2.4, Tailwind 4, Playwright, Lighthouse CI.

**Spec:** `docs/superpowers/specs/2026-10-09-temps-reel-design.md`

## Global Constraints

- Tout le texte visible, les commentaires, les noms de fichiers et les messages de commit sont en français.
- Anonymat : aucun nom réel de client, de projet, d'employeur, de ville, de téléphone ou d'adresse dans le dépôt ni dans les commits.
- Caractères invisibles : U+00A0 et U+202F s'écrivent uniquement en échappements `\u00a0` / `\u202f` dans le code et les tests.
- Next 16 a des ruptures : lire le guide concerné dans `apps/web/node_modules/next/dist/docs/` avant d'utiliser une API Next.
- Versions : `hono` `^4.13.13`, `@hono/node-server` `^2.1.4`, `ws` `^8.22.0`, `@types/ws` `^8.18.2`, `esbuild` `^0.28.2`, `tsx` `^4.23.15` ; outils alignés sur `apps/demo-marches` (`typescript` `^5.9.3`, `vitest` `^4.1.11`, `eslint` `^9.39.5`, `typescript-eslint` `^8.71.1`, `globals` `^17.13.0`, `@types/node` `^22.20.5`).
- `/` reste statique (`○ /` au build, `pnpm --filter web verifier-accueil-statique`).
- Budgets inchangés : performance ≥ 0,95, LCP ≤ 2 800 ms, CLS ≤ 0,05, scripts ≤ 160 Ko (163 840 octets) ; client temps réel ≤ 4 Ko compressés.
- Aucune adresse IP ni position n'est journalisée ou stockée ; l'IP ne vit qu'en mémoire le temps de la connexion.
- Protocole (spec §3) : messages `position` (`s`, `x`, `y`) et `masque` du navigateur ; `bienvenue`, `presents`, `positions`, `depart` du serveur ; messages reçus du navigateur de 128 octets UTF-8 au plus, 40 messages/s au plus par connexion ; lots et liste de `bienvenue` plafonnés à 30 curseurs ; 300 connexions au total, 5 par IP ; lots toutes les 50 ms ; ping toutes les 30 s.
- Commits ciblés (fichiers nommés un par un), jamais de `git add -A` ; ne pas toucher `apps/web/.env.example` ni `apps/web/scripts/empreinte-mot-de-passe.mjs` (modifications locales d'Augustin, non commitées). Jamais de push.

## Review Focus

1. **`upgrade-insecure-requests` et `ws://` en CI** — la CSP de production contient `upgrade-insecure-requests` ; en e2e et sous Lighthouse le site est servi en `http://127.0.0.1` et le service en `ws://127.0.0.1:3201`, que Chrome réécrirait en `wss://`. Exigence (spec §4) : la directive n'est pas émise quand `NEXT_PUBLIC_DIRECT_URL` commence par `ws://` (tâche 6, step 7) ; le test e2e « deux visiteurs se voient » (tâche 7) échoue sinon.
2. **IP derrière le proxy** — Traefik ajoute l'adresse réelle en **dernier** dans `X-Forwarded-For` ; prendre la première valeur laisserait un client contourner la limite par IP. Test dans la tâche 2 (`ipDuClient`).
3. **Tempête de reconnexions** — service arrêté : le client ne doit jamais boucler sans délai (1 s, 2 s, 4 s… plafonné à 30 s). Test dans la tâche 5.
4. **Onglet caché** — aucune connexion fantôme : fermeture après 30 s caché, pas de reconnexion tant que caché, réouverture au retour. Test dans la tâche 5.
5. **Décalage de mise en page et poids** — la ligne du compteur est réservée même sans service ; son apparition ne décale rien. Test dans la tâche 6 (ligne rendue à hauteur fixe sans `NEXT_PUBLIC_DIRECT_URL`) et Lighthouse (tâche 7). Le code de connexion, chargé après l'affichage, reste sous 4 Ko compressés (`verifier-taille-direct`, tâches 6 et 7).

---

## Structure des fichiers

**Service `apps/realtime/`**
- `package.json`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `Dockerfile`
- `src/protocole.ts` — types des messages, `lireMessage`, `encoder`, constantes de taille
- `src/couleurs.ts` — palette, `choisirCouleur`
- `src/salle.ts` — classe `Salle` (état pur : présents, positions, lots)
- `src/limites.ts` — `Gardien` (plafonds de connexions), `Debit` (messages par seconde)
- `src/origines.ts` — `lireOrigines`, `origineAutorisee`, `ipDuClient`
- `src/serveur.ts` — `demarrerServeur` (Hono, WebSocket, diffusion, ping, arrêt)
- `src/index.ts` — lecture de l'environnement, démarrage, signaux

**Site `apps/web/`**
- `lib/direct/protocole.ts` — types côté navigateur, `lireMessageServeur`
- `lib/direct/coordonnees.ts` — `versRepere`, `versPage`, `boitesDesSections`
- `lib/direct/connexion.ts` — `ConnexionDirecte` (WebSocket, envois espacés, reconnexion, onglet caché)
- `lib/direct/magasin.ts` — `MagasinDirect` (état affiché, abonnements)
- `components/direct/PresenceDirecte.tsx` — fournisseur (connexion, souris, partage)
- `components/direct/CompteurPresents.tsx` — ligne du compteur et bouton
- `components/direct/CalqueCurseurs.tsx` — curseurs des autres
- `scripts/verifier-taille-direct.mjs` — budget de 4 Ko compressés du code de connexion
- Modifiés : `components/accueil/Accueil.tsx`, `Accroche.tsx`, `Section.tsx`, `next.config.ts`, `app/politique-de-confidentialite/page.tsx`, `package.json`, `playwright.config.ts`, `e2e/direct.spec.ts` (nouveau)

**Racine** : `Dockerfile`, `.dockerignore`, `.github/workflows/ci.yml`, `package.json`, `pnpm-workspace.yaml` (si esbuild l'exige), `README.md`.

---

### Task 1: Paquet `apps/realtime`, protocole et couleurs

**Files:**
- Create: `apps/realtime/package.json`, `apps/realtime/tsconfig.json`, `apps/realtime/eslint.config.js`, `apps/realtime/vitest.config.ts`
- Create: `apps/realtime/src/protocole.ts`, `apps/realtime/src/protocole.test.ts`
- Create: `apps/realtime/src/couleurs.ts`, `apps/realtime/src/couleurs.test.ts`
- Modify: `package.json` (racine : script `dev:direct`), `pnpm-lock.yaml`

**Interfaces:**
- Produces:
  - `TAILLE_MAX_MESSAGE = 128`, `NB_SECTIONS_MAX = 20`
  - `type MessageClient = { type: "position"; s: number; x: number; y: number } | { type: "masque" }`
  - `type Curseur = [id: string, couleur: string, s: number, x: number, y: number]`
  - `type MessageServeur = { type: "bienvenue"; id: string; couleur: string; presents: number; curseurs: Curseur[] } | { type: "presents"; nombre: number } | { type: "positions"; curseurs: Curseur[] } | { type: "depart"; id: string }`
  - `lireMessage(brut: string): MessageClient | null`, `encoder(m: MessageServeur): string`
  - `PALETTE: readonly string[]` (6 teintes), `choisirCouleur(prises: string[], tirer?: () => number): string`

- [ ] **Step 1: Paquet** — `apps/realtime/package.json` :

```json
{
  "name": "realtime",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "esbuild src/index.ts --bundle --platform=node --target=node22 --format=cjs --outfile=dist/index.cjs --external:bufferutil --external:utf-8-validate",
    "start": "node dist/index.cjs",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@hono/node-server": "^2.1.4",
    "hono": "^4.13.13",
    "ws": "^8.22.0"
  },
  "devDependencies": {
    "@types/node": "^22.20.5",
    "@types/ws": "^8.18.2",
    "esbuild": "^0.28.2",
    "eslint": "^9.39.5",
    "globals": "^17.13.0",
    "tsx": "^4.23.15",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.71.1",
    "vitest": "^4.1.11"
  }
}
```

(Bundle CommonJS : `ws` fait des `require` de modules Node, qu'un bundle ESM ne sait pas résoudre ; `bufferutil` et `utf-8-validate` sont des accélérateurs optionnels de `ws`.)

`apps/realtime/tsconfig.json` :

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src", "vitest.config.ts"]
}
```

`apps/realtime/eslint.config.js` :

```js
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  ...tseslint.configs.recommended,
  { files: ["**/*.ts"], languageOptions: { globals: globals.node } },
);
```

`apps/realtime/vitest.config.ts` :

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
});
```

Racine `package.json`, dans `scripts` : `"dev:direct": "pnpm --filter realtime dev"`.

Puis `pnpm install`. Si la sortie signale « Ignored build scripts: esbuild », vérifier que `pnpm --filter realtime exec esbuild --version` fonctionne : si oui, ne rien ajouter ; sinon ajouter `esbuild` à `onlyBuiltDependencies` dans `pnpm-workspace.yaml` (et le signaler).

Les imports relatifs du service portent l'extension `.js` (`./protocole.js`) : exigence de `NodeNext`, comprise par Vitest et esbuild.

- [ ] **Step 2: Tests du protocole** — `apps/realtime/src/protocole.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { encoder, lireMessage, TAILLE_MAX_MESSAGE } from "./protocole.js";

describe("lireMessage", () => {
  it("lit une position", () => {
    expect(lireMessage('{"type":"position","s":2,"x":0.5,"y":0.25}')).toEqual({ type: "position", s: 2, x: 0.5, y: 0.25 });
  });
  it("arrondit à quatre décimales", () => {
    expect(lireMessage('{"type":"position","s":0,"x":0.123456,"y":0.99999}')).toEqual({ type: "position", s: 0, x: 0.1235, y: 1 });
  });
  it("lit un masque", () => {
    expect(lireMessage('{"type":"masque"}')).toEqual({ type: "masque" });
  });
  it.each([
    ["JSON invalide", "{"],
    ["pas un objet", "42"],
    ["null", "null"],
    ["type inconnu", '{"type":"discussion"}'],
    ["section négative", '{"type":"position","s":-1,"x":0.5,"y":0.5}'],
    ["section non entière", '{"type":"position","s":1.5,"x":0.5,"y":0.5}'],
    ["section trop grande", '{"type":"position","s":20,"x":0.5,"y":0.5}'],
    ["x hors bornes", '{"type":"position","s":0,"x":1.01,"y":0.5}'],
    ["y négatif", '{"type":"position","s":0,"x":0.5,"y":-0.1}'],
    ["x texte", '{"type":"position","s":0,"x":"0.5","y":0.5}'],
    ["champ manquant", '{"type":"position","s":0,"x":0.5}'],
  ])("refuse : %s", (_cas, brut) => {
    expect(lireMessage(brut)).toBeNull();
  });
  it("refuse un message trop long", () => {
    const brut = `{"type":"masque","bourrage":"${"a".repeat(TAILLE_MAX_MESSAGE)}"}`;
    expect(lireMessage(brut)).toBeNull();
  });
});

describe("encoder", () => {
  it("sérialise en JSON", () => {
    expect(encoder({ type: "presents", nombre: 3 })).toBe('{"type":"presents","nombre":3}');
  });
});
```

- [ ] **Step 3: Lancer** — `pnpm --filter realtime test` → FAIL (module absent).

- [ ] **Step 4: `apps/realtime/src/protocole.ts`**

```ts
/**
 * Messages échangés sur `/direct` (spec du sous-projet 4, §3). Courts et en
 * JSON : la position est relative à une section de l'accueil (`s`), `x` et `y`
 * entre 0 et 1, pour retomber au même endroit quelle que soit la largeur
 * d'écran du visiteur qui la reçoit.
 */
export const TAILLE_MAX_MESSAGE = 128;
/** Borne haute de l'indice de section : l'accueil en compte six. */
export const NB_SECTIONS_MAX = 20;

export type MessageClient = { type: "position"; s: number; x: number; y: number } | { type: "masque" };

export type Curseur = [id: string, couleur: string, s: number, x: number, y: number];

export type MessageServeur =
  | { type: "bienvenue"; id: string; couleur: string; presents: number; curseurs: Curseur[] }
  | { type: "presents"; nombre: number }
  | { type: "positions"; curseurs: Curseur[] }
  | { type: "depart"; id: string };

const entre0et1 = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

/** Quatre décimales suffisent (0,1 px sur 1 000 px) et allègent les lots. */
const arrondir = (v: number) => Math.round(v * 10_000) / 10_000;

/** Lit un message du navigateur ; `null` s'il est trop long, mal formé ou d'un type inconnu. */
export function lireMessage(brut: string): MessageClient | null {
  if (brut.length > TAILLE_MAX_MESSAGE) return null;
  let donnees: unknown;
  try {
    donnees = JSON.parse(brut);
  } catch {
    return null;
  }
  if (typeof donnees !== "object" || donnees === null) return null;
  const m = donnees as Record<string, unknown>;
  if (m.type === "masque") return { type: "masque" };
  if (
    m.type === "position" &&
    typeof m.s === "number" &&
    Number.isInteger(m.s) &&
    m.s >= 0 &&
    m.s < NB_SECTIONS_MAX &&
    entre0et1(m.x) &&
    entre0et1(m.y)
  ) {
    return { type: "position", s: m.s, x: arrondir(m.x), y: arrondir(m.y) };
  }
  return null;
}

export const encoder = (m: MessageServeur): string => JSON.stringify(m);
```

- [ ] **Step 5: Tests des couleurs** — `apps/realtime/src/couleurs.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { choisirCouleur, PALETTE } from "./couleurs.js";

/** Contraste WCAG entre deux couleurs `#rrggbb`. */
function contraste(a: string, b: string): number {
  const lum = (h: string) => {
    const [r, g, v] = [1, 3, 5].map((i) => {
      const c = parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * v!;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
}

describe("palette", () => {
  it("compte six teintes distinctes", () => {
    expect(new Set(PALETTE).size).toBe(6);
  });
  it("reste lisible sur le papier (contraste ≥ 3:1)", () => {
    for (const c of PALETTE) expect(contraste(c, "#f3efe7")).toBeGreaterThanOrEqual(3);
  });
});

describe("choisirCouleur", () => {
  it("évite une couleur déjà prise", () => {
    const prises = PALETTE.slice(0, 5);
    expect(choisirCouleur(prises, () => 0)).toBe(PALETTE[5]);
  });
  it("tire parmi les libres", () => {
    expect(choisirCouleur([], () => 0.99)).toBe(PALETTE[5]);
    expect(choisirCouleur([], () => 0)).toBe(PALETTE[0]);
  });
  it("quand tout est pris, reprend la moins utilisée", () => {
    const prises = [...PALETTE, ...PALETTE.filter((c) => c !== PALETTE[3])];
    expect(choisirCouleur(prises, () => 0)).toBe(PALETTE[3]);
  });
});
```

- [ ] **Step 6: `apps/realtime/src/couleurs.ts`**

```ts
/**
 * Teintes des curseurs, accordées à la charte « Atelier clair » et lisibles sur
 * le papier (#f3efe7, contraste ≥ 3:1) : brique, braise, terre, encre douce,
 * puis deux complémentaires (sarcelle, ardoise).
 */
export const PALETTE = ["#c84a1f", "#e0582b", "#8a5a3c", "#5b574f", "#2f6f6a", "#3b5b8c"] as const;

/** Une couleur libre au hasard ; si toutes sont prises, la moins utilisée. */
export function choisirCouleur(prises: string[], tirer: () => number = Math.random): string {
  const usages = new Map<string, number>(PALETTE.map((c) => [c, 0]));
  for (const c of prises) if (usages.has(c)) usages.set(c, usages.get(c)! + 1);
  const minimum = Math.min(...usages.values());
  const candidates = PALETTE.filter((c) => usages.get(c) === minimum);
  return candidates[Math.min(Math.floor(tirer() * candidates.length), candidates.length - 1)]!;
}
```

- [ ] **Step 7: Lancer** — `pnpm --filter realtime test && pnpm --filter realtime lint && pnpm --filter realtime typecheck` → PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/realtime/package.json apps/realtime/tsconfig.json apps/realtime/eslint.config.js apps/realtime/vitest.config.ts apps/realtime/src/protocole.ts apps/realtime/src/protocole.test.ts apps/realtime/src/couleurs.ts apps/realtime/src/couleurs.test.ts package.json pnpm-lock.yaml
git commit -m "Temps réel : paquet apps/realtime, protocole des messages et palette des curseurs"
```

(Ajouter `pnpm-workspace.yaml` s'il a changé.)

---

### Task 2: Salle, limites et origines

**Files:**
- Create: `apps/realtime/src/salle.ts`, `apps/realtime/src/salle.test.ts`
- Create: `apps/realtime/src/limites.ts`, `apps/realtime/src/limites.test.ts`
- Create: `apps/realtime/src/origines.ts`, `apps/realtime/src/origines.test.ts`

**Interfaces:**
- Consumes: `Curseur` (t1), `choisirCouleur` (t1).
- Produces:
  - `PLAFOND_CURSEURS = 30`
  - `class Salle` : `constructor(tirerId?: () => string, tirerCouleur?: () => number)`, `rejoindre(): { id: string; couleur: string }`, `quitter(id: string): boolean` (vrai si un curseur visible disparaît), `deplacer(id: string, s: number, x: number, y: number): void`, `masquer(id: string): boolean`, `get nombre(): number`, `curseurs(sauf?: string): Curseur[]` (30 au plus, les plus récemment bougés), `extraireLot(): Curseur[]` (30 au plus)
  - `CONNEXIONS_MAX = 300`, `CONNEXIONS_PAR_IP = 5`, `MESSAGES_PAR_SECONDE = 40`
  - `class Gardien` : `constructor(max?: number, parIp?: number)`, `peutAdmettre(ip: string): boolean`, `admettre(ip: string): boolean`, `liberer(ip: string): void`, `get connexions(): number`
  - `class Debit` : `constructor(max?: number)`, `accepter(maintenant: number): boolean`
  - `lireOrigines(valeur: string | undefined): string[]`, `origineAutorisee(origine: string | undefined, autorisees: string[]): boolean`, `ipDuClient(xForwardedFor: string | undefined, adresseSocket: string | undefined): string`

- [ ] **Step 1: Tests de la salle** — `apps/realtime/src/salle.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { PLAFOND_CURSEURS, Salle } from "./salle.js";

function salleDeTest() {
  let n = 0;
  return new Salle(() => `id${++n}`, () => 0);
}

describe("Salle", () => {
  it("compte les présents et donne une couleur à chacun", () => {
    const salle = salleDeTest();
    const a = salle.rejoindre();
    const b = salle.rejoindre();
    expect(salle.nombre).toBe(2);
    expect(a.id).not.toBe(b.id);
    expect(a.couleur).not.toBe(b.couleur);
  });
  it("ne réutilise pas un identifiant présent", () => {
    const ids = ["x", "x", "y"];
    const salle = new Salle(() => ids.shift()!);
    expect(salle.rejoindre().id).toBe("x");
    expect(salle.rejoindre().id).toBe("y");
  });
  it("liste les curseurs visibles, sauf celui demandé", () => {
    const salle = salleDeTest();
    const a = salle.rejoindre();
    const b = salle.rejoindre();
    salle.rejoindre();
    salle.deplacer(a.id, 1, 0.5, 0.25);
    salle.deplacer(b.id, 0, 0.1, 0.2);
    expect(salle.curseurs(a.id)).toEqual([[b.id, b.couleur, 0, 0.1, 0.2]]);
    expect(salle.curseurs()).toHaveLength(2);
  });
  it("extrait un lot des curseurs qui ont bougé, une seule fois", () => {
    const salle = salleDeTest();
    const a = salle.rejoindre();
    salle.deplacer(a.id, 0, 0.1, 0.1);
    salle.deplacer(a.id, 0, 0.2, 0.2);
    expect(salle.extraireLot()).toEqual([[a.id, a.couleur, 0, 0.2, 0.2]]);
    expect(salle.extraireLot()).toEqual([]);
  });
  it("masquer retire le curseur du lot et des visibles", () => {
    const salle = salleDeTest();
    const a = salle.rejoindre();
    salle.deplacer(a.id, 0, 0.1, 0.1);
    expect(salle.masquer(a.id)).toBe(true);
    expect(salle.masquer(a.id)).toBe(false);
    expect(salle.extraireLot()).toEqual([]);
    expect(salle.curseurs()).toEqual([]);
  });
  it("quitter dit si un curseur visible disparaît", () => {
    const salle = salleDeTest();
    const a = salle.rejoindre();
    const b = salle.rejoindre();
    salle.deplacer(a.id, 0, 0.5, 0.5);
    expect(salle.quitter(a.id)).toBe(true);
    expect(salle.quitter(b.id)).toBe(false);
    expect(salle.nombre).toBe(0);
  });
  it("ignore un identifiant inconnu", () => {
    const salle = salleDeTest();
    salle.deplacer("inconnu", 0, 0.5, 0.5);
    expect(salle.masquer("inconnu")).toBe(false);
    expect(salle.quitter("inconnu")).toBe(false);
    expect(salle.extraireLot()).toEqual([]);
  });
  it("un identifiant parti n'entre plus dans le lot en cours", () => {
    const salle = salleDeTest();
    const a = salle.rejoindre();
    const b = salle.rejoindre();
    salle.deplacer(a.id, 0, 0.1, 0.1);
    salle.deplacer(b.id, 0, 0.2, 0.2);
    salle.quitter(a.id);
    expect(salle.extraireLot().map((c) => c[0])).toEqual([b.id]);
  });
  it("plafonne lots et listes à 30 curseurs, les plus récemment bougés", () => {
    const salle = salleDeTest();
    const ids = Array.from({ length: 35 }, () => salle.rejoindre().id);
    ids.forEach((id, i) => salle.deplacer(id, 0, i / 100, 0));
    salle.deplacer(ids[0]!, 1, 0.5, 0.5);
    const lot = salle.extraireLot();
    expect(lot).toHaveLength(PLAFOND_CURSEURS);
    expect(lot.at(-1)![0]).toBe(ids[0]);
    expect(lot.map((c) => c[0])).not.toContain(ids[1]);
    const liste = salle.curseurs(ids[34]);
    expect(liste).toHaveLength(PLAFOND_CURSEURS);
    expect(liste.map((c) => c[0])).not.toContain(ids[34]);
    expect(liste.map((c) => c[0])).toContain(ids[0]);
  });
});
```

- [ ] **Step 2: Lancer** → FAIL.

- [ ] **Step 3: `apps/realtime/src/salle.ts`**

```ts
import { randomUUID } from "node:crypto";
import { choisirCouleur } from "./couleurs.js";
import type { Curseur } from "./protocole.js";

type Present = { couleur: string; position: { s: number; x: number; y: number } | null };

/** Curseurs envoyés au plus par lot et dans `bienvenue` : le fan-out reste borné. */
export const PLAFOND_CURSEURS = 30;

/**
 * L'état partagé de l'accueil : qui est là, de quelle couleur, et où est son
 * curseur. Aucune entrée-sortie ici : le serveur diffuse ce que la salle lui
 * rend. L'identifiant est opaque et ne vit que le temps de la connexion.
 *
 * `visibles` et `bouges` gardent l'ordre des mouvements (le plus récent en
 * dernier) : au-delà de 30, ce sont les curseurs les plus récents qui partent.
 */
export class Salle {
  private readonly presents = new Map<string, Present>();
  private readonly visibles = new Set<string>();
  private readonly bouges = new Set<string>();

  constructor(
    private readonly tirerId: () => string = () => randomUUID().slice(0, 8),
    private readonly tirerCouleur: () => number = Math.random,
  ) {}

  rejoindre(): { id: string; couleur: string } {
    let id = this.tirerId();
    while (this.presents.has(id)) id = this.tirerId();
    const prises = [...this.presents.values()].map((p) => p.couleur);
    const couleur = choisirCouleur(prises, this.tirerCouleur);
    this.presents.set(id, { couleur, position: null });
    return { id, couleur };
  }

  /** Vrai si le visiteur avait un curseur visible : les autres doivent recevoir `depart`. */
  quitter(id: string): boolean {
    const present = this.presents.get(id);
    this.presents.delete(id);
    this.visibles.delete(id);
    this.bouges.delete(id);
    return present?.position != null;
  }

  deplacer(id: string, s: number, x: number, y: number): void {
    const present = this.presents.get(id);
    if (!present) return;
    present.position = { s, x, y };
    // Retirer puis remettre : l'identifiant passe en dernier (le plus récent).
    this.visibles.delete(id);
    this.visibles.add(id);
    this.bouges.delete(id);
    this.bouges.add(id);
  }

  /** Vrai si un curseur visible vient d'être masqué. */
  masquer(id: string): boolean {
    const present = this.presents.get(id);
    if (!present?.position) return false;
    present.position = null;
    this.visibles.delete(id);
    this.bouges.delete(id);
    return true;
  }

  get nombre(): number {
    return this.presents.size;
  }

  /** Curseurs visibles (30 au plus, les plus récents), sauf celui de `sauf`. */
  curseurs(sauf?: string): Curseur[] {
    return this.versCurseurs([...this.visibles].filter((id) => id !== sauf));
  }

  /** Curseurs qui ont bougé depuis le dernier appel (30 au plus, les plus récents). */
  extraireLot(): Curseur[] {
    const lot = this.versCurseurs([...this.bouges]);
    this.bouges.clear();
    return lot;
  }

  private versCurseurs(ids: string[]): Curseur[] {
    const liste: Curseur[] = [];
    for (const id of ids.slice(-PLAFOND_CURSEURS)) {
      const p = this.presents.get(id);
      if (p?.position) liste.push([id, p.couleur, p.position.s, p.position.x, p.position.y]);
    }
    return liste;
  }
}
```

- [ ] **Step 4: Tests des limites et des origines** — `apps/realtime/src/limites.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { Debit, Gardien } from "./limites.js";

describe("Gardien", () => {
  it("plafonne par adresse IP", () => {
    const g = new Gardien(300, 2);
    expect(g.admettre("a")).toBe(true);
    expect(g.admettre("a")).toBe(true);
    expect(g.peutAdmettre("a")).toBe(false);
    expect(g.admettre("a")).toBe(false);
    expect(g.admettre("b")).toBe(true);
  });
  it("plafonne au total", () => {
    const g = new Gardien(2, 5);
    g.admettre("a");
    g.admettre("b");
    expect(g.admettre("c")).toBe(false);
    expect(g.connexions).toBe(2);
  });
  it("libère une place", () => {
    const g = new Gardien(300, 1);
    g.admettre("a");
    g.liberer("a");
    expect(g.connexions).toBe(0);
    expect(g.admettre("a")).toBe(true);
  });
  it("libérer une IP inconnue ne fait rien", () => {
    const g = new Gardien();
    g.liberer("inconnue");
    expect(g.connexions).toBe(0);
  });
});

describe("Debit", () => {
  it("accepte 40 messages par seconde, pas un de plus", () => {
    const d = new Debit(40);
    for (let i = 0; i < 40; i++) expect(d.accepter(1_000 + i)).toBe(true);
    expect(d.accepter(1_500)).toBe(false);
  });
  it("repart à zéro la seconde suivante", () => {
    const d = new Debit(2);
    d.accepter(0);
    d.accepter(10);
    expect(d.accepter(999)).toBe(false);
    expect(d.accepter(1_000)).toBe(true);
  });
});
```

`apps/realtime/src/origines.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { ipDuClient, lireOrigines, origineAutorisee } from "./origines.js";

describe("origines", () => {
  it("lit une liste séparée par des virgules", () => {
    expect(lireOrigines(" https://a.dev, http://localhost:3000 ,")).toEqual(["https://a.dev", "http://localhost:3000"]);
    expect(lireOrigines(undefined)).toEqual([]);
  });
  it("n'autorise que les origines listées, à l'identique", () => {
    const liste = ["https://portfolio.jouan.dev"];
    expect(origineAutorisee("https://portfolio.jouan.dev", liste)).toBe(true);
    expect(origineAutorisee("https://portfolio.jouan.dev.attaque.dev", liste)).toBe(false);
    expect(origineAutorisee(undefined, liste)).toBe(false);
    expect(origineAutorisee("https://portfolio.jouan.dev", [])).toBe(false);
  });
});

describe("ipDuClient", () => {
  it("prend la dernière adresse de X-Forwarded-For (ajoutée par le proxy)", () => {
    expect(ipDuClient("1.1.1.1, 2.2.2.2", "10.0.0.1")).toBe("2.2.2.2");
  });
  it("ignore une adresse forgée par le client en tête de liste", () => {
    expect(ipDuClient("6.6.6.6,9.9.9.9", undefined)).toBe("9.9.9.9");
  });
  it("retombe sur l'adresse de la socket", () => {
    expect(ipDuClient(undefined, "10.0.0.1")).toBe("10.0.0.1");
    expect(ipDuClient(" , ", "10.0.0.1")).toBe("10.0.0.1");
  });
  it("donne une valeur même sans rien", () => {
    expect(ipDuClient(undefined, undefined)).toBe("inconnue");
  });
});
```

- [ ] **Step 5: Lancer** → FAIL.

- [ ] **Step 6: `apps/realtime/src/limites.ts`**

```ts
/** Plafonds du service (spec du sous-projet 4, §3). */
export const CONNEXIONS_MAX = 300;
export const CONNEXIONS_PAR_IP = 5;
export const MESSAGES_PAR_SECONDE = 40;

/**
 * Compte les connexions ouvertes, au total et par adresse IP. L'adresse n'est
 * gardée qu'en mémoire, tant qu'une connexion de cette adresse est ouverte.
 */
export class Gardien {
  private readonly parIp = new Map<string, number>();
  private total = 0;

  constructor(
    private readonly max: number = CONNEXIONS_MAX,
    private readonly maxParIp: number = CONNEXIONS_PAR_IP,
  ) {}

  peutAdmettre(ip: string): boolean {
    return this.total < this.max && (this.parIp.get(ip) ?? 0) < this.maxParIp;
  }

  admettre(ip: string): boolean {
    if (!this.peutAdmettre(ip)) return false;
    this.parIp.set(ip, (this.parIp.get(ip) ?? 0) + 1);
    this.total++;
    return true;
  }

  liberer(ip: string): void {
    const n = this.parIp.get(ip);
    if (!n) return;
    if (n === 1) this.parIp.delete(ip);
    else this.parIp.set(ip, n - 1);
    this.total--;
  }

  get connexions(): number {
    return this.total;
  }
}

/** Messages acceptés par fenêtre d'une seconde, pour une connexion. */
export class Debit {
  private debut = -Infinity;
  private n = 0;

  constructor(private readonly max: number = MESSAGES_PAR_SECONDE) {}

  accepter(maintenant: number): boolean {
    if (maintenant - this.debut >= 1_000) {
      this.debut = maintenant;
      this.n = 0;
    }
    if (this.n >= this.max) return false;
    this.n++;
    return true;
  }
}
```

`apps/realtime/src/origines.ts` :

```ts
/** Liste `ORIGINES_AUTORISEES` : origines séparées par des virgules. */
export function lireOrigines(valeur: string | undefined): string[] {
  return (valeur ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Comparaison exacte : pas de préfixe, pas de joker. */
export function origineAutorisee(origine: string | undefined, autorisees: string[]): boolean {
  return origine !== undefined && autorisees.includes(origine);
}

/**
 * Adresse du visiteur. Derrière le proxy de Coolify (Traefik), l'adresse réelle
 * est la **dernière** de `X-Forwarded-For` : les précédentes viennent du client
 * et peuvent être forgées. Le service n'est joignable que par ce proxy.
 */
export function ipDuClient(xForwardedFor: string | undefined, adresseSocket: string | undefined): string {
  const derniere = xForwardedFor
    ?.split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .at(-1);
  return derniere ?? adresseSocket ?? "inconnue";
}
```

- [ ] **Step 7: Lancer** — `pnpm --filter realtime test && pnpm --filter realtime lint && pnpm --filter realtime typecheck` → PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/realtime/src/salle.ts apps/realtime/src/salle.test.ts apps/realtime/src/limites.ts apps/realtime/src/limites.test.ts apps/realtime/src/origines.ts apps/realtime/src/origines.test.ts
git commit -m "Temps réel : salle partagée, plafonds de connexions et origines autorisées"
```

---

### Task 3: Serveur WebSocket et démarrage

**Files:**
- Create: `apps/realtime/src/serveur.ts`, `apps/realtime/src/serveur.test.ts`
- Create: `apps/realtime/src/index.ts`
- Modify: `.gitignore` (si `apps/realtime/dist` n'y est pas déjà couvert)

**Interfaces:**
- Consumes: tout le reste du service (t1, t2).
- Produces:
  - `type OptionsServeur = { origines: string[]; port?: number; hote?: string; connexionsParIp?: number; intervalleLotMs?: number; intervallePingMs?: number }`
  - `demarrerServeur(options: OptionsServeur): Promise<{ port: number; fermer(): Promise<void> }>`
  - variables d'environnement : `PORT` (défaut `3001`), `HOTE` (défaut `0.0.0.0`), `ORIGINES_AUTORISEES`, `CONNEXIONS_PAR_IP` (défaut `5`)
  - `pnpm --filter realtime build` → `apps/realtime/dist/index.cjs` ; `pnpm --filter realtime start`

Lire avant : le README de `@hono/node-server` 2 (section WebSocket : `serve({ fetch, websocket: { server: wss } })`, `upgradeWebSocket`) dans `apps/realtime/node_modules/@hono/node-server/README.md`, et `@hono/node-server/conninfo` (`getConnInfo`). Un middleware qui renvoie une `Response` **avant** `upgradeWebSocket` refuse la montée avec ce statut.

- [ ] **Step 1: Tests d'intégration** — `apps/realtime/src/serveur.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import type { MessageServeur } from "./protocole.js";
import { demarrerServeur } from "./serveur.js";

const ORIGINE = "http://localhost:3000";
let serveur: Awaited<ReturnType<typeof demarrerServeur>>;

beforeEach(async () => {
  serveur = await demarrerServeur({ origines: [ORIGINE], port: 0, hote: "127.0.0.1", connexionsParIp: 5, intervalleLotMs: 10 });
});
afterEach(async () => {
  await serveur.fermer();
});

type Client = { ws: WebSocket; messages: MessageServeur[]; fermeture: Promise<number> };

function connecter({ origine = ORIGINE, ip = "10.0.0.1" } = {}): Promise<Client> {
  const ws = new WebSocket(`ws://127.0.0.1:${serveur.port}/direct`, {
    headers: { origin: origine, "x-forwarded-for": ip },
  });
  const messages: MessageServeur[] = [];
  ws.on("message", (d) => messages.push(JSON.parse(String(d)) as MessageServeur));
  const fermeture = new Promise<number>((ok) => ws.once("close", (code) => ok(code)));
  return new Promise((ok, ko) => {
    ws.once("open", () => ok({ ws, messages, fermeture }));
    ws.once("unexpected-response", (_req, res) => ko(new Error(`HTTP ${res.statusCode}`)));
    ws.once("error", ko);
  });
}

async function attendre<T>(trouver: () => T | undefined, delaiMs = 2_000): Promise<T> {
  const fin = Date.now() + delaiMs;
  for (;;) {
    const r = trouver();
    if (r !== undefined) return r;
    if (Date.now() > fin) throw new Error("Message attendu non reçu");
    await new Promise((ok) => setTimeout(ok, 10));
  }
}

const dernier = <T extends MessageServeur["type"]>(c: Client, type: T) =>
  c.messages.filter((m): m is Extract<MessageServeur, { type: T }> => m.type === type).at(-1);

describe("serveur temps réel", () => {
  it("répond sur /sante", async () => {
    const r = await fetch(`http://127.0.0.1:${serveur.port}/sante`);
    expect(r.status).toBe(200);
  });

  it("refuse une origine non autorisée", async () => {
    await expect(connecter({ origine: "https://ailleurs.dev" })).rejects.toThrow("HTTP 403");
  });

  it("refuse la 6e connexion d'une même adresse", async () => {
    for (let i = 0; i < 5; i++) await connecter({ ip: "1.2.3.4" });
    await expect(connecter({ ip: "1.2.3.4" })).rejects.toThrow("HTTP 429");
    await connecter({ ip: "5.6.7.8" });
  });

  it("une adresse forgée en tête de X-Forwarded-For ne contourne pas la limite", async () => {
    for (let i = 0; i < 5; i++) await connecter({ ip: `6.6.6.${i}, 1.2.3.4` });
    await expect(connecter({ ip: "7.7.7.7, 1.2.3.4" })).rejects.toThrow("HTTP 429");
  });

  it("accueille avec un identifiant, une couleur et le nombre de présents", async () => {
    const a = await connecter();
    const bienvenue = await attendre(() => dernier(a, "bienvenue"));
    expect(bienvenue.presents).toBe(1);
    expect(bienvenue.id).toMatch(/^[0-9a-f]{8}$/);
    expect(bienvenue.couleur).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("diffuse le compteur et les positions, sans écho à l'émetteur", async () => {
    const a = await connecter({ ip: "1.1.1.1" });
    const b = await connecter({ ip: "2.2.2.2" });
    const idA = (await attendre(() => dernier(a, "bienvenue"))).id;
    await attendre(() => (dernier(a, "presents")?.nombre === 2 ? true : undefined));

    a.ws.send(JSON.stringify({ type: "position", s: 1, x: 0.5, y: 0.25 }));
    const lot = await attendre(() => dernier(b, "positions"));
    expect(lot.curseurs).toEqual([[idA, expect.any(String), 1, 0.5, 0.25]]);
    await new Promise((ok) => setTimeout(ok, 50));
    expect(a.messages.some((m) => m.type === "positions")).toBe(false);
  });

  it("donne les curseurs déjà visibles à l'arrivée", async () => {
    const a = await connecter({ ip: "1.1.1.1" });
    const idA = (await attendre(() => dernier(a, "bienvenue"))).id;
    a.ws.send(JSON.stringify({ type: "position", s: 0, x: 0.1, y: 0.2 }));
    await new Promise((ok) => setTimeout(ok, 50));
    const b = await connecter({ ip: "2.2.2.2" });
    const bienvenue = await attendre(() => dernier(b, "bienvenue"));
    expect(bienvenue.curseurs).toEqual([[idA, expect.any(String), 0, 0.1, 0.2]]);
  });

  it("annonce le masque puis le départ", async () => {
    const a = await connecter({ ip: "1.1.1.1" });
    const b = await connecter({ ip: "2.2.2.2" });
    const idA = (await attendre(() => dernier(a, "bienvenue"))).id;
    a.ws.send(JSON.stringify({ type: "position", s: 0, x: 0.5, y: 0.5 }));
    await attendre(() => dernier(b, "positions"));
    a.ws.send(JSON.stringify({ type: "masque" }));
    expect((await attendre(() => dernier(b, "depart"))).id).toBe(idA);
    a.ws.close();
    await attendre(() => (dernier(b, "presents")?.nombre === 1 ? true : undefined));
  });

  it("ignore un message mal formé sans fermer la connexion", async () => {
    const a = await connecter({ ip: "1.1.1.1" });
    const b = await connecter({ ip: "2.2.2.2" });
    a.ws.send("pas du json");
    a.ws.send(JSON.stringify({ type: "position", s: 0, x: 3, y: 0 }));
    await new Promise((ok) => setTimeout(ok, 50));
    expect(a.ws.readyState).toBe(WebSocket.OPEN);
    expect(b.messages.some((m) => m.type === "positions")).toBe(false);
  });

  it("ferme sur un message trop long (1008)", async () => {
    const a = await connecter();
    a.ws.send("x".repeat(200));
    expect(await a.fermeture).toBe(1008);
  });

  it("ferme sur un débit excessif (1008)", async () => {
    const a = await connecter();
    for (let i = 0; i < 60; i++) a.ws.send('{"type":"masque"}');
    expect(await a.fermeture).toBe(1008);
  });

  it("libère la place à la fermeture", async () => {
    const clients = [];
    for (let i = 0; i < 5; i++) clients.push(await connecter({ ip: "3.3.3.3" }));
    clients[0]!.ws.close();
    await clients[0]!.fermeture;
    await new Promise((ok) => setTimeout(ok, 20));
    await connecter({ ip: "3.3.3.3" });
  });
});
```

- [ ] **Step 2: Lancer** → FAIL (module absent).

- [ ] **Step 3: `apps/realtime/src/serveur.ts`**

```ts
/**
 * Service temps réel de l'accueil : `/sante` pour les sondes, `/direct` pour le
 * WebSocket. Une seule salle en mémoire ; les positions sont regroupées en lots
 * toutes les `intervalleLotMs`, et seuls les curseurs qui ont bougé partent.
 * Rien n'est journalisé qui permette d'identifier un visiteur (ni IP, ni position).
 */
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { serve, upgradeWebSocket } from "@hono/node-server";
import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono, type Context } from "hono";
import type { WSContext } from "hono/ws";
import { WebSocketServer, type WebSocket } from "ws";
import { CONNEXIONS_MAX, CONNEXIONS_PAR_IP, Debit, Gardien } from "./limites.js";
import { ipDuClient, origineAutorisee } from "./origines.js";
import { encoder, lireMessage, TAILLE_MAX_MESSAGE, type MessageServeur } from "./protocole.js";
import { Salle } from "./salle.js";

export type OptionsServeur = {
  origines: string[];
  port?: number;
  hote?: string;
  connexionsParIp?: number;
  intervalleLotMs?: number;
  intervallePingMs?: number;
};

type Connecte = { ws: WSContext<WebSocket>; vivant: boolean };

export async function demarrerServeur(options: OptionsServeur): Promise<{ port: number; fermer(): Promise<void> }> {
  const salle = new Salle();
  const gardien = new Gardien(CONNEXIONS_MAX, options.connexionsParIp ?? CONNEXIONS_PAR_IP);
  const connectes = new Map<string, Connecte>();

  const diffuser = (message: MessageServeur, sauf?: string) => {
    const texte = encoder(message);
    for (const [id, c] of connectes) if (id !== sauf) c.ws.send(texte);
  };
  const ipDe = (c: Context) => ipDuClient(c.req.header("x-forwarded-for"), getConnInfo(c).remote.address);

  const app = new Hono();
  app.get("/sante", (c) => c.text("ok"));
  app.get(
    "/direct",
    async (c, next) => {
      if (!origineAutorisee(c.req.header("origin"), options.origines)) {
        console.warn("[direct] Connexion refusée : origine non autorisée.");
        return c.text("Origine refusée", 403);
      }
      if (!gardien.peutAdmettre(ipDe(c))) return c.text("Trop de connexions", 429);
      await next();
    },
    upgradeWebSocket((c) => {
      const ip = ipDe(c);
      const debit = new Debit();
      let id: string | null = null;
      return {
        onOpen(_evt, ws) {
          // Une autre connexion a pu prendre la dernière place entre le contrôle et l'ouverture.
          if (!gardien.admettre(ip)) {
            ws.close(1013, "Trop de connexions");
            return;
          }
          const arrivee = salle.rejoindre();
          id = arrivee.id;
          const connecte: Connecte = { ws: ws as WSContext<WebSocket>, vivant: true };
          connectes.set(id, connecte);
          ws.raw?.on("pong", () => {
            connecte.vivant = true;
          });
          ws.send(encoder({ type: "bienvenue", id, couleur: arrivee.couleur, presents: salle.nombre, curseurs: salle.curseurs(id) }));
          diffuser({ type: "presents", nombre: salle.nombre }, id);
        },
        onMessage(evt, ws) {
          if (id === null) return;
          if (typeof evt.data !== "string" || Buffer.byteLength(evt.data) > TAILLE_MAX_MESSAGE) {
            ws.close(1008, "Message trop long");
            return;
          }
          if (!debit.accepter(Date.now())) {
            ws.close(1008, "Trop de messages");
            return;
          }
          const message = lireMessage(evt.data);
          if (!message) return;
          if (message.type === "position") salle.deplacer(id, message.s, message.x, message.y);
          else if (salle.masquer(id)) diffuser({ type: "depart", id }, id);
        },
        onClose() {
          if (id === null) return;
          gardien.liberer(ip);
          connectes.delete(id);
          if (salle.quitter(id)) diffuser({ type: "depart", id });
          diffuser({ type: "presents", nombre: salle.nombre });
          id = null;
        },
      };
    }),
  );

  const lots = setInterval(() => {
    const lot = salle.extraireLot();
    if (lot.length === 0) return;
    for (const [id, c] of connectes) {
      const autres = lot.filter((curseur) => curseur[0] !== id);
      if (autres.length > 0) c.ws.send(encoder({ type: "positions", curseurs: autres }));
    }
  }, options.intervalleLotMs ?? 50);

  // Une connexion qui ne répond plus au ping depuis le précédent est coupée.
  const pings = setInterval(() => {
    for (const c of connectes.values()) {
      if (!c.vivant) {
        c.ws.raw?.terminate();
        continue;
      }
      c.vivant = false;
      c.ws.raw?.ping();
    }
  }, options.intervallePingMs ?? 30_000);

  const wss = new WebSocketServer({ noServer: true, maxPayload: 1_024 });
  const serveur = serve({
    fetch: app.fetch,
    port: options.port ?? 3001,
    hostname: options.hote ?? "0.0.0.0",
    websocket: { server: wss },
  });
  await once(serveur, "listening");

  return {
    port: (serveur.address() as AddressInfo).port,
    async fermer() {
      clearInterval(lots);
      clearInterval(pings);
      for (const c of connectes.values()) c.ws.close(1001, "Arrêt du service");
      await new Promise<void>((ok) => serveur.close(() => ok()));
    },
  };
}
```

(Si les types réels de `@hono/node-server` 2 diffèrent — nom du type de `ws.raw`, signature de `serve` —, adapter au plus près et le signaler. `serveur.close` attend la fin des connexions : si un test d'intégration reste bloqué à la fermeture, appeler `serveur.closeAllConnections?.()` avant.)

- [ ] **Step 4: `apps/realtime/src/index.ts`**

```ts
/** Point d'entrée : lit l'environnement, démarre le service et l'arrête proprement. */
import { lireOrigines } from "./origines.js";
import { demarrerServeur } from "./serveur.js";

async function principal() {
  const origines = lireOrigines(process.env.ORIGINES_AUTORISEES);
  if (origines.length === 0) console.warn("[direct] ORIGINES_AUTORISEES est vide : toute connexion sera refusée.");
  const serveur = await demarrerServeur({
    origines,
    port: Number(process.env.PORT ?? 3001),
    hote: process.env.HOTE ?? "0.0.0.0",
    connexionsParIp: process.env.CONNEXIONS_PAR_IP ? Number(process.env.CONNEXIONS_PAR_IP) : undefined,
  });
  console.log(`[direct] Prêt sur le port ${serveur.port}.`);
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      console.log("[direct] Arrêt demandé.");
      void serveur.fermer().then(() => process.exit(0));
    });
  }
}

principal().catch((err: unknown) => {
  console.error("[direct] Démarrage impossible :", err);
  process.exit(1);
});
```

(Pas d'`await` au premier niveau : le bundle est en CommonJS.)

`.gitignore` : vérifier que `dist` (ou `apps/realtime/dist`) est ignoré ; sinon ajouter la ligne `apps/realtime/dist`.

- [ ] **Step 5: Lancer** — `pnpm --filter realtime test` → PASS ; `pnpm --filter realtime lint && pnpm --filter realtime typecheck`.

- [ ] **Step 6: Build et essai réel** —

```bash
pnpm --filter realtime build
ORIGINES_AUTORISEES=http://localhost:3000 PORT=3201 pnpm --filter realtime start &
sleep 1; curl -s http://127.0.0.1:3201/sante; echo
kill %1
```

Attendu : `ok`, puis « Arrêt demandé » au `kill` (le processus sort). Noter la taille de `dist/index.cjs` dans le rapport.

- [ ] **Step 7: Commit**

```bash
git add apps/realtime/src/serveur.ts apps/realtime/src/serveur.test.ts apps/realtime/src/index.ts
git commit -m "Temps réel : serveur WebSocket (diffusion, plafonds, ping, arrêt propre)"
```

(Ajouter `.gitignore` s'il a changé.)

---

### Task 4: Image Docker du service et CI des images

**Files:**
- Create: `apps/realtime/Dockerfile`
- Modify: `Dockerfile` (racine : `package.json` du service copié à l'étape `deps`, argument `NEXT_PUBLIC_DIRECT_URL`), `.dockerignore`
- Modify: `.github/workflows/ci.yml` (job `image` en matrice, job `deployer`)

**Interfaces:**
- Consumes: `pnpm --filter realtime build`, `dist/index.cjs`, `/sante` (t3).
- Produces: image `ghcr.io/augustin-jouan/jouan.dev-realtime` ; argument de build du site `NEXT_PUBLIC_DIRECT_URL` (variable de dépôt `DIRECT_URL`) ; secret `COOLIFY_WEBHOOK_URL_DIRECT`.

- [ ] **Step 1: `apps/realtime/Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1
#
# Image du service temps réel (apps/realtime), en deux étapes :
#   build   installe les dépendances du service et produit un seul fichier (esbuild)
#   runner  ne garde que ce fichier : ni pnpm ni node_modules
#
# Construction locale, depuis la racine du dépôt :
#   docker build -f apps/realtime/Dockerfile -t jouan-dev-realtime .
#   docker run --rm -p 3001:3001 -e ORIGINES_AUTORISEES=http://localhost:3000 jouan-dev-realtime

ARG NODE_VERSION=22
ARG PNPM_VERSION=10.34.6

FROM node:${NODE_VERSION}-alpine AS build
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
# Tous les package.json du workspace : le lockfile les référence tous.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/demo-marches/package.json apps/demo-marches/
COPY apps/realtime/package.json apps/realtime/
RUN pnpm install --frozen-lockfile --filter realtime
COPY apps/realtime apps/realtime
RUN pnpm --filter realtime build

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOTE=0.0.0.0

# Le service tourne sans privilèges : un compte dédié, sans shell.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs direct

COPY --from=build --chown=direct:nodejs /app/apps/realtime/dist ./dist

USER direct
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3001/sante || exit 1

CMD ["node", "dist/index.cjs"]
```

- [ ] **Step 2: Image du site** — `Dockerfile` racine :
  - étape `deps`, après `COPY apps/demo-marches/package.json apps/demo-marches/` : `COPY apps/realtime/package.json apps/realtime/` (le lockfile référence le service) ;
  - étape `build`, après le bloc `UMAMI_WEBSITE_ID` :

```dockerfile
# Adresse du service temps réel (apps/realtime), figée au build comme Umami.
# Vide : l'accueil ne se connecte à rien (ni compteur ni curseurs).
ARG NEXT_PUBLIC_DIRECT_URL=
ENV NEXT_PUBLIC_DIRECT_URL=${NEXT_PUBLIC_DIRECT_URL}
```

`.dockerignore` : ajouter `apps/realtime/dist`.

- [ ] **Step 3: Vérifier les deux images** —

```bash
docker build -f apps/realtime/Dockerfile -t jouan-dev-realtime-test .
docker run --rm -d --name direct-test -p 3301:3001 -e ORIGINES_AUTORISEES=http://localhost:3000 jouan-dev-realtime-test
sleep 2; curl -s http://127.0.0.1:3301/sante; echo
docker inspect --format '{{.State.Health.Status}}' direct-test
docker stop direct-test
docker build -t jouan-dev-test .
docker rmi jouan-dev-realtime-test jouan-dev-test
```

Attendu : `ok`, état `starting` ou `healthy`, les deux builds réussis. Noter la taille de l'image du service dans le rapport.

- [ ] **Step 4: CI** — `.github/workflows/ci.yml` :
  - supprimer `IMAGE` du bloc `env` global (remplacé par la matrice) ;
  - job `image` : ajouter une matrice et l'utiliser partout :

```yaml
  image:
    name: Image Docker (${{ matrix.nom }})
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: [verifier, e2e]
    permissions:
      contents: read
      packages: write
    # Deux images : le site et le service temps réel (apps/realtime).
    # GHCR impose des noms en minuscules, d'où les noms en dur.
    strategy:
      matrix:
        include:
          - nom: site
            image: ghcr.io/augustin-jouan/jouan.dev
            dockerfile: Dockerfile
          - nom: temps-reel
            image: ghcr.io/augustin-jouan/jouan.dev-realtime
            dockerfile: apps/realtime/Dockerfile
```

    puis `images: ${{ matrix.image }}` dans `metadata-action`, et dans `build-push-action` : `file: ${{ matrix.dockerfile }}`, `cache-from: type=gha,scope=${{ matrix.nom }}`, `cache-to: type=gha,mode=max,scope=${{ matrix.nom }}`, et dans `build-args` une ligne de plus `NEXT_PUBLIC_DIRECT_URL=${{ vars.DIRECT_URL }}` (le service ignore ces arguments). Compléter le commentaire au-dessus : « `NEXT_PUBLIC_DIRECT_URL` aussi (variable de dépôt `DIRECT_URL`, par exemple `wss://direct.portfolio.jouan.dev/direct`). »
  - job `deployer` : ajouter une seconde étape après « Prévenir Coolify » :

```yaml
      - name: Prévenir Coolify (temps réel)
        env:
          WEBHOOK_URL: ${{ secrets.COOLIFY_WEBHOOK_URL_DIRECT }}
          TOKEN: ${{ secrets.COOLIFY_TOKEN }}
        run: |
          if [ -z "$WEBHOOK_URL" ] || [ -z "$TOKEN" ]; then
            echo "Secrets Coolify du service temps réel absents : déploiement non déclenché."
            exit 0
          fi
          curl --fail --silent --show-error \
            --request POST "$WEBHOOK_URL" \
            --header "Authorization: Bearer $TOKEN"
```

Relire le YAML (indentation, `strategy` au niveau du job) ; le valider avec `node -e "require('yaml')"` s'il est disponible, sinon `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))"`.

- [ ] **Step 5: Lancer** — `pnpm lint && pnpm typecheck && pnpm test` → PASS (le service est inclus par `pnpm -r`).

- [ ] **Step 6: Commit**

```bash
git add apps/realtime/Dockerfile Dockerfile .dockerignore .github/workflows/ci.yml
git commit -m "Temps réel : image Docker du service, adresse figée au build du site, CI des deux images"
```

---

### Task 5: Bibliothèque client (coordonnées, connexion, magasin)

**Files:**
- Create: `apps/web/lib/direct/protocole.ts`, `apps/web/lib/direct/protocole.test.ts`
- Create: `apps/web/lib/direct/coordonnees.ts`, `apps/web/lib/direct/coordonnees.test.ts`
- Create: `apps/web/lib/direct/connexion.ts`, `apps/web/lib/direct/connexion.test.ts`
- Create: `apps/web/lib/direct/magasin.ts`, `apps/web/lib/direct/magasin.test.ts`

**Interfaces:**
- Consumes: la forme des messages (t1) — recopiée côté navigateur (paquets séparés, pas d'import entre apps).
- Produces:
  - `lib/direct/protocole.ts` : `type Curseur`, `type MessageClient`, `type MessageServeur` (identiques à t1), `lireMessageServeur(brut: unknown): MessageServeur | null`
  - `lib/direct/coordonnees.ts` : `type Boite = { gauche: number; haut: number; largeur: number; hauteur: number }`, `type Repere = { s: number; x: number; y: number }`, `versRepere(px: number, py: number, sections: Boite[]): Repere | null`, `versPage(r: Repere, sections: Boite[]): { x: number; y: number } | null` (`null` si la section est absente ou vide ici), `REPERES = ["accroche", "offre", "realisations", "methode", "parcours", "contact"] as const` (l'indice `s` est la position dans cette table), `boitesDesSections(racine?: ParentNode): Boite[]` (une boîte par repère, dans l'ordre de la table ; boîte vide si absente)
  - `lib/direct/connexion.ts` : `DELAIS_RECONNEXION_MS`, `FERMETURE_ONGLET_CACHE_MS = 30_000`, `INTERVALLE_ENVOI_MS = 50`, `type Horloge`, `type Rappels = { surMessage(m: MessageServeur): void; surFermeture(): void }`, `MARQUEUR_DIRECT = "connexion-direct:v1"`, `class ConnexionDirecte` : `constructor(url: string, rappels: Rappels, creerSocket?: (url: string) => WebSocket, horloge?: Horloge, aleatoire?: () => number)`, `ouvrir()`, `envoyer(m: MessageClient)`, `surVisibilite(visible: boolean)`, `arreter()`
  - `lib/direct/magasin.ts` : `type CurseurAffiche = { id: string; couleur: string; s: number; x: number; y: number; vuLe: number }`, `type EtatDirect = { connecte: boolean; presents: number; curseurs: CurseurAffiche[] }` (`connecte` : vrai dès `bienvenue`, faux après `vider`), `class MagasinDirect` : `etat(): EtatDirect`, `abonner(fn: () => void): () => void`, `appliquer(m: MessageServeur, maintenant: number): void`, `vider(): void`

- [ ] **Step 1: Tests** — `apps/web/lib/direct/protocole.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { lireMessageServeur } from "./protocole";

describe("lireMessageServeur", () => {
  it("lit un message connu", () => {
    expect(lireMessageServeur('{"type":"presents","nombre":2}')).toEqual({ type: "presents", nombre: 2 });
  });
  it.each([["binaire", new ArrayBuffer(2)], ["JSON invalide", "{"], ["type inconnu", '{"type":"autre"}'], ["null", "null"]])(
    "ignore : %s",
    (_cas, brut) => {
      expect(lireMessageServeur(brut)).toBeNull();
    },
  );
});
```

`apps/web/lib/direct/coordonnees.test.ts` :

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { boitesDesSections, REPERES, versPage, versRepere, type Boite } from "./coordonnees";

const etroit: Boite[] = [
  { gauche: 20, haut: 0, largeur: 400, hauteur: 600 },
  { gauche: 20, haut: 600, largeur: 400, hauteur: 1_000 },
];
const large: Boite[] = [
  { gauche: 240, haut: 0, largeur: 1_440, hauteur: 800 },
  { gauche: 240, haut: 800, largeur: 1_440, hauteur: 500 },
];

describe("coordonnées relatives aux sections", () => {
  it("repère un point dans sa section", () => {
    expect(versRepere(220, 850, etroit)).toEqual({ s: 1, x: 0.5, y: 0.25 });
  });
  it("retombe au même endroit relatif sur un autre écran", () => {
    const r = versRepere(220, 850, etroit)!;
    expect(versPage(r, large)).toEqual({ x: 960, y: 925 });
  });
  it("aller-retour exact sur une même mise en page", () => {
    const r = versRepere(120, 300, etroit)!;
    expect(versPage(r, etroit)).toEqual({ x: 120, y: 300 });
  });
  it("hors de toute section : null", () => {
    expect(versRepere(5, 100, etroit)).toBeNull();
    expect(versRepere(100, 5_000, etroit)).toBeNull();
  });
  it("ignore une section vide", () => {
    expect(versRepere(0, 0, [{ gauche: 0, haut: 0, largeur: 0, hauteur: 0 }])).toBeNull();
  });
  it("section inconnue ou vide chez le destinataire : null", () => {
    expect(versPage({ s: 5, x: 0.5, y: 0.5 }, etroit)).toBeNull();
    expect(versPage({ s: 0, x: 0.5, y: 0.5 }, [{ gauche: 0, haut: 0, largeur: 0, hauteur: 0 }])).toBeNull();
  });
});

describe("boitesDesSections", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("suit la table des repères, pas l'ordre du document", () => {
    expect(REPERES).toEqual(["accroche", "offre", "realisations", "methode", "parcours", "contact"]);
    document.body.innerHTML = '<section data-direct-section="contact"></section><section data-direct-section="accroche"></section>';
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const haut = this.dataset.directSection === "accroche" ? 0 : 900;
      return { left: 10, top: haut, width: 800, height: 600 } as DOMRect;
    });
    const boites = boitesDesSections();
    expect(boites).toHaveLength(6);
    expect(boites[0]).toEqual({ gauche: 10, haut: 0, largeur: 800, hauteur: 600 });
    expect(boites[5]).toEqual({ gauche: 10, haut: 900, largeur: 800, hauteur: 600 });
    expect(boites[1]).toEqual({ gauche: 0, haut: 0, largeur: 0, hauteur: 0 });
  });
});
```

`apps/web/lib/direct/magasin.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import { MagasinDirect } from "./magasin";

describe("MagasinDirect", () => {
  it("part de rien, puis applique la bienvenue", () => {
    const m = new MagasinDirect();
    expect(m.etat()).toEqual({ connecte: false, presents: 0, curseurs: [] });
    m.appliquer({ type: "bienvenue", id: "moi", couleur: "#c84a1f", presents: 3, curseurs: [["a", "#2f6f6a", 1, 0.5, 0.5]] }, 100);
    expect(m.etat()).toEqual({ connecte: true, presents: 3, curseurs: [{ id: "a", couleur: "#2f6f6a", s: 1, x: 0.5, y: 0.5, vuLe: 100 }] });
  });
  it("met à jour le compteur, les positions et les départs", () => {
    const m = new MagasinDirect();
    m.appliquer({ type: "positions", curseurs: [["a", "#2f6f6a", 0, 0.1, 0.1], ["b", "#3b5b8c", 2, 0.2, 0.2]] }, 1);
    m.appliquer({ type: "positions", curseurs: [["a", "#2f6f6a", 0, 0.3, 0.3]] }, 2);
    m.appliquer({ type: "presents", nombre: 4 }, 3);
    m.appliquer({ type: "depart", id: "b" }, 4);
    expect(m.etat()).toEqual({ connecte: false, presents: 4, curseurs: [{ id: "a", couleur: "#2f6f6a", s: 0, x: 0.3, y: 0.3, vuLe: 2 }] });
  });
  it("prévient les abonnés et garde un état stable entre deux changements", () => {
    const m = new MagasinDirect();
    const abonne = vi.fn();
    const desabonner = m.abonner(abonne);
    const avant = m.etat();
    expect(m.etat()).toBe(avant);
    m.appliquer({ type: "presents", nombre: 2 }, 0);
    expect(abonne).toHaveBeenCalledTimes(1);
    desabonner();
    m.vider();
    expect(abonne).toHaveBeenCalledTimes(1);
    expect(m.etat()).toEqual({ connecte: false, presents: 0, curseurs: [] });
  });
  it("un curseur masqué qui bouge de nouveau réapparaît", () => {
    const m = new MagasinDirect();
    m.appliquer({ type: "positions", curseurs: [["a", "#2f6f6a", 0, 0.1, 0.1]] }, 1);
    m.appliquer({ type: "depart", id: "a" }, 2);
    m.appliquer({ type: "positions", curseurs: [["a", "#2f6f6a", 0, 0.2, 0.2]] }, 3);
    expect(m.etat().curseurs.map((c) => c.id)).toEqual(["a"]);
  });
});
```

`apps/web/lib/direct/connexion.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnexionDirecte, DELAIS_RECONNEXION_MS, FERMETURE_ONGLET_CACHE_MS, type Horloge } from "./connexion";

class FausseSocket {
  static instances: FausseSocket[] = [];
  readyState = 0;
  envoyes: string[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    FausseSocket.instances.push(this);
  }
  send(d: string) {
    this.envoyes.push(d);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  ouvrir() {
    this.readyState = 1;
    this.onopen?.();
  }
}

function horlogeFactice() {
  let t = 0;
  let suivant = 1;
  const minuteries = new Map<number, { quand: number; fn: () => void }>();
  const horloge: Horloge = {
    maintenant: () => t,
    programmer: (fn, ms) => {
      const id = suivant++;
      minuteries.set(id, { quand: t + ms, fn });
      return id;
    },
    annuler: (id) => {
      minuteries.delete(id as number);
    },
  };
  const avancer = (ms: number) => {
    const fin = t + ms;
    for (;;) {
      const prochaine = [...minuteries.entries()].filter(([, m]) => m.quand <= fin).sort((a, b) => a[1].quand - b[1].quand)[0];
      if (!prochaine) break;
      minuteries.delete(prochaine[0]);
      t = prochaine[1].quand;
      prochaine[1].fn();
    }
    t = fin;
  };
  return { horloge, avancer, enAttente: () => minuteries.size };
}

let h: ReturnType<typeof horlogeFactice>;
const rappels = { surMessage: vi.fn(), surFermeture: vi.fn() };
// Aléa neutre (0,5 → délai exact) : les délais variés ont leur propre test.
const nouvelle = (aleatoire = () => 0.5) =>
  new ConnexionDirecte("ws://test/direct", rappels, () => new FausseSocket() as unknown as WebSocket, h.horloge, aleatoire);
const derniere = () => FausseSocket.instances.at(-1)!;

beforeEach(() => {
  FausseSocket.instances = [];
  h = horlogeFactice();
  rappels.surMessage.mockReset();
  rappels.surFermeture.mockReset();
});

describe("ConnexionDirecte", () => {
  it("transmet les messages valides du serveur", () => {
    const c = nouvelle();
    c.ouvrir();
    derniere().ouvrir();
    derniere().onmessage?.({ data: '{"type":"presents","nombre":2}' });
    derniere().onmessage?.({ data: "n'importe quoi" });
    expect(rappels.surMessage).toHaveBeenCalledTimes(1);
    expect(rappels.surMessage).toHaveBeenCalledWith({ type: "presents", nombre: 2 });
  });

  it("espace les envois de 50 ms et n'envoie que la dernière position", () => {
    const c = nouvelle();
    c.ouvrir();
    derniere().ouvrir();
    c.envoyer({ type: "position", s: 0, x: 0.1, y: 0.1 });
    c.envoyer({ type: "position", s: 0, x: 0.2, y: 0.2 });
    c.envoyer({ type: "position", s: 0, x: 0.3, y: 0.3 });
    expect(derniere().envoyes).toHaveLength(1);
    h.avancer(50);
    expect(derniere().envoyes).toEqual(['{"type":"position","s":0,"x":0.1,"y":0.1}', '{"type":"position","s":0,"x":0.3,"y":0.3}']);
  });

  it("n'envoie rien tant que la socket n'est pas ouverte", () => {
    const c = nouvelle();
    c.ouvrir();
    c.envoyer({ type: "masque" });
    expect(derniere().envoyes).toEqual([]);
  });

  it("se reconnecte avec un délai croissant plafonné à 30 s, sans boucle serrée", () => {
    const c = nouvelle();
    c.ouvrir();
    for (const delai of [...DELAIS_RECONNEXION_MS, 30_000, 30_000]) {
      derniere().close();
      const avant = FausseSocket.instances.length;
      h.avancer(delai - 1);
      expect(FausseSocket.instances.length).toBe(avant);
      h.avancer(1);
      expect(FausseSocket.instances.length).toBe(avant + 1);
    }
    expect(rappels.surFermeture).toHaveBeenCalled();
  });

  it("repart du premier délai après une connexion réussie", () => {
    const c = nouvelle();
    c.ouvrir();
    derniere().close();
    h.avancer(DELAIS_RECONNEXION_MS[0]!);
    derniere().close();
    h.avancer(DELAIS_RECONNEXION_MS[1]!);
    derniere().ouvrir();
    derniere().close();
    const avant = FausseSocket.instances.length;
    h.avancer(DELAIS_RECONNEXION_MS[0]!);
    expect(FausseSocket.instances.length).toBe(avant + 1);
  });

  it("onglet caché : masque, ferme après 30 s, ne se reconnecte pas avant le retour", () => {
    const c = nouvelle();
    c.ouvrir();
    derniere().ouvrir();
    c.surVisibilite(false);
    expect(derniere().envoyes).toEqual(['{"type":"masque"}']);
    h.avancer(FERMETURE_ONGLET_CACHE_MS);
    expect(derniere().readyState).toBe(3);
    h.avancer(120_000);
    expect(FausseSocket.instances).toHaveLength(1);
    c.surVisibilite(true);
    expect(FausseSocket.instances).toHaveLength(2);
  });

  it("onglet revenu avant 30 s : garde la même connexion", () => {
    const c = nouvelle();
    c.ouvrir();
    derniere().ouvrir();
    c.surVisibilite(false);
    h.avancer(10_000);
    c.surVisibilite(true);
    h.avancer(60_000);
    expect(FausseSocket.instances).toHaveLength(1);
    expect(derniere().readyState).toBe(1);
  });

  it("arrêter ferme tout et ne programme plus rien", () => {
    const c = nouvelle();
    c.ouvrir();
    derniere().ouvrir();
    c.arreter();
    expect(derniere().readyState).toBe(3);
    h.avancer(120_000);
    expect(FausseSocket.instances).toHaveLength(1);
    expect(h.enAttente()).toBe(0);
  });

  it("une socket impossible à créer est retentée plus tard", () => {
    let essais = 0;
    const c = new ConnexionDirecte("ws://test/direct", rappels, () => {
      essais++;
      throw new Error("refus");
    }, h.horloge, () => 0.5);
    c.ouvrir();
    expect(essais).toBe(1);
    h.avancer(DELAIS_RECONNEXION_MS[0]!);
    expect(essais).toBe(2);
  });

  it("varie chaque délai de ±20 % pour étaler les reconnexions", () => {
    for (const [alea, attendu] of [[0, 800], [1, 1_200]] as const) {
      FausseSocket.instances = [];
      const c = nouvelle(() => alea);
      c.ouvrir();
      derniere().close();
      h.avancer(attendu - 1);
      expect(FausseSocket.instances).toHaveLength(1);
      h.avancer(1);
      expect(FausseSocket.instances).toHaveLength(2);
      c.arreter();
    }
  });
});
```

- [ ] **Step 2: Lancer** — `pnpm --filter web exec vitest run lib/direct` → FAIL.

- [ ] **Step 3: `apps/web/lib/direct/protocole.ts`**

```ts
/**
 * Messages du service temps réel, côté navigateur : même forme que
 * `apps/realtime/src/protocole.ts` (les deux paquets ne s'importent pas ;
 * le test de bout en bout garde les deux côtés d'accord).
 */
export type Curseur = [id: string, couleur: string, s: number, x: number, y: number];

export type MessageClient = { type: "position"; s: number; x: number; y: number } | { type: "masque" };

export type MessageServeur =
  | { type: "bienvenue"; id: string; couleur: string; presents: number; curseurs: Curseur[] }
  | { type: "presents"; nombre: number }
  | { type: "positions"; curseurs: Curseur[] }
  | { type: "depart"; id: string };

const TYPES = new Set(["bienvenue", "presents", "positions", "depart"]);

/** Un message du serveur, ou `null` (binaire, JSON invalide, type inconnu d'une autre version). */
export function lireMessageServeur(brut: unknown): MessageServeur | null {
  if (typeof brut !== "string") return null;
  try {
    const m: unknown = JSON.parse(brut);
    if (typeof m === "object" && m !== null && TYPES.has((m as { type?: unknown }).type as string)) return m as MessageServeur;
  } catch {
    // ignoré
  }
  return null;
}
```

- [ ] **Step 4: `apps/web/lib/direct/coordonnees.ts`**

```ts
/**
 * Coordonnées partagées : la section de l'accueil sous la souris et la position
 * relative dans cette section (0 à 1). Chaque visiteur reconvertit dans sa
 * propre mise en page : un curseur retombe dans la même zone de la même section
 * (même bande de lecture), quelle que soit la largeur d'écran — pas forcément
 * sur le même mot, le texte se recomposant. Les sections portent
 * `data-direct-section="<repère>"` ; l'intro « goutte d'encre » n'en est pas une.
 */
export type Boite = { gauche: number; haut: number; largeur: number; hauteur: number };
export type Repere = { s: number; x: number; y: number };

const arrondir = (v: number) => Math.round(v * 10_000) / 10_000;

/** Point de la page (px, défilement compris) → repère ; `null` hors de toute section. */
export function versRepere(px: number, py: number, sections: Boite[]): Repere | null {
  for (let s = 0; s < sections.length; s++) {
    const b = sections[s]!;
    if (b.largeur <= 0 || b.hauteur <= 0) continue;
    if (px >= b.gauche && px <= b.gauche + b.largeur && py >= b.haut && py < b.haut + b.hauteur) {
      return { s, x: arrondir((px - b.gauche) / b.largeur), y: arrondir((py - b.haut) / b.hauteur) };
    }
  }
  return null;
}

/** Repère → point de la page ; `null` si la section est absente ou vide ici. */
export function versPage(r: Repere, sections: Boite[]): { x: number; y: number } | null {
  const b = sections[r.s];
  if (!b || b.largeur <= 0 || b.hauteur <= 0) return null;
  return { x: b.gauche + r.x * b.largeur, y: b.haut + r.y * b.hauteur };
}

/**
 * Table des repères : l'indice `s` échangé avec le service est la position dans
 * cette table, indépendante de l'ordre du document (spec du sous-projet 4, §4).
 */
export const REPERES = ["accroche", "offre", "realisations", "methode", "parcours", "contact"] as const;

const BOITE_VIDE: Boite = { gauche: 0, haut: 0, largeur: 0, hauteur: 0 };

/** Une boîte par repère, en coordonnées de page ; vide si la section manque. */
export function boitesDesSections(racine: ParentNode = document): Boite[] {
  return REPERES.map((repere) => {
    const el = racine.querySelector<HTMLElement>(`[data-direct-section="${repere}"]`);
    if (!el) return BOITE_VIDE;
    const r = el.getBoundingClientRect();
    return { gauche: r.left + window.scrollX, haut: r.top + window.scrollY, largeur: r.width, hauteur: r.height };
  });
}
```

- [ ] **Step 5: `apps/web/lib/direct/magasin.ts`**

```ts
import type { Curseur, MessageServeur } from "./protocole";

export type CurseurAffiche = { id: string; couleur: string; s: number; x: number; y: number; vuLe: number };
export type EtatDirect = { connecte: boolean; presents: number; curseurs: CurseurAffiche[] };

const VIDE: EtatDirect = { connecte: false, presents: 0, curseurs: [] };
const versAffiche = ([id, couleur, s, x, y]: Curseur, vuLe: number): CurseurAffiche => ({ id, couleur, s, x, y, vuLe });

/**
 * L'état affiché (présents, curseurs des autres), lu par `useSyncExternalStore` :
 * un nouvel objet à chaque changement, le même entre deux.
 */
export class MagasinDirect {
  private courant: EtatDirect = VIDE;
  private readonly abonnes = new Set<() => void>();

  etat = (): EtatDirect => this.courant;

  abonner = (fn: () => void): (() => void) => {
    this.abonnes.add(fn);
    return () => {
      this.abonnes.delete(fn);
    };
  };

  appliquer(m: MessageServeur, maintenant: number): void {
    const e = this.courant;
    switch (m.type) {
      case "bienvenue":
        return this.publier({ connecte: true, presents: m.presents, curseurs: m.curseurs.map((c) => versAffiche(c, maintenant)) });
      case "presents":
        return this.publier({ ...e, presents: m.nombre });
      case "positions": {
        const parId = new Map(e.curseurs.map((c) => [c.id, c]));
        for (const c of m.curseurs) parId.set(c[0], versAffiche(c, maintenant));
        return this.publier({ ...e, curseurs: [...parId.values()] });
      }
      case "depart":
        return this.publier({ ...e, curseurs: e.curseurs.filter((c) => c.id !== m.id) });
    }
  }

  /** Connexion perdue : plus de compteur ni de curseur (pas de nombre périmé) jusqu'au prochain `bienvenue`. */
  vider(): void {
    this.publier(VIDE);
  }

  private publier(e: EtatDirect): void {
    this.courant = e;
    for (const fn of this.abonnes) fn();
  }
}
```

- [ ] **Step 6: `apps/web/lib/direct/connexion.ts`**

```ts
/**
 * Connexion au service temps réel, côté navigateur : WebSocket natif, envois
 * espacés de 50 ms (seule la dernière position part), reconnexion de plus en
 * plus espacée (jusqu'à 30 s, chaque délai varié de ±20 % pour que les
 * visiteurs ne reviennent pas tous à la même seconde après un redéploiement),
 * fermeture après 30 s d'onglet caché. Les échecs
 * sont silencieux : sans service, l'accueil reste celui d'avant.
 */
import { lireMessageServeur, type MessageClient, type MessageServeur } from "./protocole";

export const DELAIS_RECONNEXION_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];
export const FERMETURE_ONGLET_CACHE_MS = 30_000;
export const INTERVALLE_ENVOI_MS = 50;
/** Variation des délais de reconnexion : ±20 %. */
const VARIATION = 0.2;
/** Repère ce morceau de JS dans le build (scripts/verifier-taille-direct.mjs). */
export const MARQUEUR_DIRECT = "connexion-direct:v1";
const OUVERTE = 1;

export type Horloge = {
  maintenant(): number;
  programmer(fn: () => void, ms: number): unknown;
  annuler(id: unknown): void;
};

const horlogeNavigateur: Horloge = {
  maintenant: () => Date.now(),
  programmer: (fn, ms) => window.setTimeout(fn, ms),
  annuler: (id) => window.clearTimeout(id as number),
};

export type Rappels = { surMessage(m: MessageServeur): void; surFermeture(): void };

export class ConnexionDirecte {
  private socket: WebSocket | null = null;
  private essais = 0;
  private cache = false;
  private arretee = false;
  private reconnexion: unknown = null;
  private fermetureCache: unknown = null;
  private envoiDiffere: unknown = null;
  private enAttente: MessageClient | null = null;
  private dernierEnvoi = -Infinity;

  constructor(
    private readonly url: string,
    private readonly rappels: Rappels,
    private readonly creerSocket: (url: string) => WebSocket = (u) => new WebSocket(u),
    private readonly horloge: Horloge = horlogeNavigateur,
    private readonly aleatoire: () => number = Math.random,
  ) {}

  /** Lu par le script de taille : garde le marqueur dans le morceau. */
  readonly marqueur = MARQUEUR_DIRECT;

  ouvrir(): void {
    if (this.arretee || this.cache || this.socket) return;
    let socket: WebSocket;
    try {
      socket = this.creerSocket(this.url);
    } catch {
      this.planifierReconnexion();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      this.essais = 0;
    };
    socket.onmessage = (e) => {
      const m = lireMessageServeur(e.data);
      if (m) this.rappels.surMessage(m);
    };
    socket.onerror = () => {};
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.rappels.surFermeture();
      this.planifierReconnexion();
    };
  }

  /** La dernière position gagne : envoyée tout de suite, ou au prochain créneau de 50 ms. */
  envoyer(m: MessageClient): void {
    this.enAttente = m;
    if (this.envoiDiffere !== null) return;
    const attente = this.dernierEnvoi + INTERVALLE_ENVOI_MS - this.horloge.maintenant();
    if (attente <= 0) {
      this.vider();
      return;
    }
    this.envoiDiffere = this.horloge.programmer(() => {
      this.envoiDiffere = null;
      this.vider();
    }, attente);
  }

  surVisibilite(visible: boolean): void {
    if (visible) {
      this.cache = false;
      this.annuler("fermetureCache");
      this.ouvrir();
      return;
    }
    this.enAttente = { type: "masque" };
    this.vider();
    this.annuler("fermetureCache");
    this.fermetureCache = this.horloge.programmer(() => {
      this.fermetureCache = null;
      this.cache = true;
      this.annuler("reconnexion");
      this.fermerSocket();
    }, FERMETURE_ONGLET_CACHE_MS);
  }

  arreter(): void {
    this.arretee = true;
    this.annuler("reconnexion");
    this.annuler("fermetureCache");
    this.annuler("envoiDiffere");
    this.fermerSocket();
  }

  private vider(): void {
    const m = this.enAttente;
    this.enAttente = null;
    if (!m || this.socket?.readyState !== OUVERTE) return;
    this.socket.send(JSON.stringify(m));
    this.dernierEnvoi = this.horloge.maintenant();
  }

  private planifierReconnexion(): void {
    if (this.arretee || this.cache || this.reconnexion !== null) return;
    const base = DELAIS_RECONNEXION_MS[Math.min(this.essais, DELAIS_RECONNEXION_MS.length - 1)]!;
    const delai = Math.round(base * (1 - VARIATION + 2 * VARIATION * this.aleatoire()));
    this.essais++;
    this.reconnexion = this.horloge.programmer(() => {
      this.reconnexion = null;
      this.ouvrir();
    }, delai);
  }

  private fermerSocket(): void {
    const socket = this.socket;
    this.socket = null;
    if (!socket) return;
    socket.onclose = null;
    socket.close(1000);
    this.rappels.surFermeture();
  }

  private annuler(minuterie: "reconnexion" | "fermetureCache" | "envoiDiffere"): void {
    if (this[minuterie] === null) return;
    this.horloge.annuler(this[minuterie]);
    this[minuterie] = null;
  }
}
```

(Avec la `FausseSocket` du test, `close()` appelle `onclose` : `fermerSocket` remet `onclose` à `null` avant, pour qu'une fermeture voulue ne déclenche pas de reconnexion. Le test « arrêter… » vérifie `readyState === 3` : la `FausseSocket` le pose elle-même dans `close()`.)

- [ ] **Step 7: Lancer** — `pnpm --filter web exec vitest run lib/direct` → PASS ; `pnpm --filter web lint && pnpm --filter web typecheck`.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/direct/protocole.ts apps/web/lib/direct/protocole.test.ts apps/web/lib/direct/coordonnees.ts apps/web/lib/direct/coordonnees.test.ts apps/web/lib/direct/connexion.ts apps/web/lib/direct/connexion.test.ts apps/web/lib/direct/magasin.ts apps/web/lib/direct/magasin.test.ts
git commit -m "Temps réel : client du site (coordonnées par section, connexion, état affiché)"
```

---

### Task 6: Compteur, curseurs et bouton sur l'accueil

**Files:**
- Create: `apps/web/components/direct/PresenceDirecte.tsx`, `apps/web/components/direct/PresenceDirecte.test.tsx`
- Create: `apps/web/components/direct/CompteurPresents.tsx`, `apps/web/components/direct/CalqueCurseurs.tsx`
- Create: `apps/web/scripts/verifier-taille-direct.mjs`
- Modify: `apps/web/package.json` (script `verifier-taille-direct`)
- Modify: `apps/web/components/accueil/Accueil.tsx`, `apps/web/components/accueil/Accroche.tsx`, `apps/web/components/accueil/Section.tsx`
- Modify: `apps/web/next.config.ts` (CSP), `apps/web/app/politique-de-confidentialite/page.tsx` (+ son test)

**Interfaces:**
- Consumes: `ConnexionDirecte`, `MARQUEUR_DIRECT` (chargés par `import()`), `MagasinDirect`, `EtatDirect` (avec `connecte`), `versRepere`, `versPage`, `boitesDesSections`, `REPERES` (t5).
- Produces:
  - `<PresenceDirecte>{children}</PresenceDirecte>` (fournisseur, monté dans `Accueil`), `useDirect(): { etat: EtatDirect; pointeurFin: boolean; partage: boolean; basculerPartage(): void }`
  - `<CompteurPresents />` (dans `Accroche`, avant la salutation), `<CalqueCurseurs curseurs={...} />`
  - attributs `data-direct-section="accroche"` sur la section de l'accroche, `data-direct-section={id}` sur `Section` (les `id` valent `offre`, `realisations`, `methode`, `parcours`, `contact` : les repères de la table)
  - clé `localStorage` `direct:partage` (`"non"` quand le partage est coupé)
  - `pnpm --filter web verifier-taille-direct` (après un build avec `NEXT_PUBLIC_DIRECT_URL`)

Lire avant : la doc Next sur les composants client (`'use client'`), le chargement différé (`import()`) et les variables `NEXT_PUBLIC_` (inlinées au build) dans `node_modules/next/dist/docs/`. Modèle de chargement différé : `components/accueil/IntroEncre.tsx` (`import("@/lib/encre/moteur")`) et `scripts/verifier-taille-encre.mjs`.

- [ ] **Step 1: Tests** — `apps/web/components/direct/PresenceDirecte.test.tsx` :

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MessageServeur } from "@/lib/direct/protocole";

const fausse = vi.hoisted(() => ({
  rappels: null as null | { surMessage(m: MessageServeur): void; surFermeture(): void },
  envoyer: vi.fn(),
  construite: 0,
}));
vi.mock("@/lib/direct/connexion", () => ({
  MARQUEUR_DIRECT: "connexion-direct:v1",
  ConnexionDirecte: class {
    constructor(_url: string, rappels: typeof fausse.rappels) {
      fausse.rappels = rappels;
      fausse.construite++;
    }
    ouvrir() {}
    envoyer = fausse.envoyer;
    surVisibilite() {}
    arreter() {}
  },
}));

import { CompteurPresents } from "./CompteurPresents";
import { PresenceDirecte } from "./PresenceDirecte";

function pointeur(fin: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: fin && q === "(pointer: fine)",
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function rendre() {
  render(
    <PresenceDirecte>
      <section data-direct-section="accroche">
        <CompteurPresents />
        <p>Accroche</p>
      </section>
    </PresenceDirecte>,
  );
}

/** Temps libre écoulé, puis module de connexion chargé (import différé). */
async function demarrer() {
  await act(async () => {
    vi.advanceTimersByTime(1_500);
    await vi.dynamicImportSettled();
  });
}

const recevoir = (m: MessageServeur) =>
  act(() => {
    fausse.rappels!.surMessage(m);
  });

const bienvenue = (presents: number): MessageServeur => ({ type: "bienvenue", id: "moi", couleur: "#c84a1f", presents, curseurs: [] });

beforeEach(() => {
  vi.useFakeTimers();
  fausse.rappels = null;
  fausse.construite = 0;
  fausse.envoyer.mockReset();
  window.localStorage.clear();
  pointeur(true);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 800, height: 600 } as DOMRect);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PresenceDirecte", () => {
  it("sans adresse de service : aucune connexion, place du compteur réservée et vide", async () => {
    vi.stubEnv("NEXT_PUBLIC_DIRECT_URL", "");
    rendre();
    await demarrer();
    expect(fausse.construite).toBe(0);
    const ligne = screen.getByTestId("compteur-presents");
    expect(ligne).toHaveClass("h-7");
    expect(ligne).toHaveTextContent("");
  });

  describe("avec le service", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_DIRECT_URL", "ws://127.0.0.1:3201/direct");
    });

    it("ne charge la connexion qu'après le temps libre", async () => {
      rendre();
      expect(fausse.construite).toBe(0);
      await demarrer();
      expect(fausse.construite).toBe(1);
    });

    it("masque le compteur quand on est seul, l'affiche à partir de deux", async () => {
      rendre();
      await demarrer();
      recevoir(bienvenue(1));
      expect(screen.queryByText(/regardent cette page/)).toBeNull();
      recevoir({ type: "presents", nombre: 3 });
      expect(screen.getByText("3 personnes regardent cette page")).toBeInTheDocument();
    });

    it("bouton visible dès la connexion, même seul, et absent avant", async () => {
      rendre();
      await demarrer();
      expect(screen.queryByRole("button", { name: /mon curseur/ })).toBeNull();
      recevoir(bienvenue(1));
      expect(screen.getByRole("button", { name: "Masquer mon curseur" })).toBeInTheDocument();
    });

    it("le bouton coupe le partage, envoie un masque et retient le choix", async () => {
      rendre();
      await demarrer();
      recevoir(bienvenue(1));
      fireEvent.click(screen.getByRole("button", { name: "Masquer mon curseur" }));
      expect(fausse.envoyer).toHaveBeenCalledWith({ type: "masque" });
      expect(window.localStorage.getItem("direct:partage")).toBe("non");
      expect(screen.getByRole("button", { name: "Montrer mon curseur" })).toBeInTheDocument();
    });

    it("partage actif : la souris dans une section envoie une position", async () => {
      rendre();
      await demarrer();
      recevoir(bienvenue(1));
      fireEvent.mouseMove(document, { pageX: 400, pageY: 150 });
      expect(fausse.envoyer).toHaveBeenCalledWith({ type: "position", s: 0, x: 0.5, y: 0.25 });
    });

    it("partage coupé : la souris n'envoie plus de position", async () => {
      window.localStorage.setItem("direct:partage", "non");
      rendre();
      await demarrer();
      fireEvent.mouseMove(document, { pageX: 400, pageY: 150 });
      expect(fausse.envoyer).not.toHaveBeenCalledWith(expect.objectContaining({ type: "position" }));
    });

    it("sans pointeur fin : ni bouton ni envoi de position", async () => {
      pointeur(false);
      rendre();
      await demarrer();
      recevoir(bienvenue(2));
      expect(screen.getByText("2 personnes regardent cette page")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /mon curseur/ })).toBeNull();
      fireEvent.mouseMove(document, { pageX: 400, pageY: 150 });
      expect(fausse.envoyer).not.toHaveBeenCalled();
    });

    it("dessine les curseurs reçus dans un calque ignoré des lecteurs d'écran", async () => {
      rendre();
      await demarrer();
      recevoir({ type: "positions", curseurs: [["a", "#2f6f6a", 0, 0.5, 0.5]] });
      const curseur = document.body.querySelector("[data-curseur]");
      expect(curseur).not.toBeNull();
      expect(curseur!.closest("[aria-hidden='true']")).not.toBeNull();
    });

    it("connexion perdue : plus de compteur, de bouton ni de curseurs", async () => {
      rendre();
      await demarrer();
      recevoir(bienvenue(2));
      recevoir({ type: "positions", curseurs: [["a", "#2f6f6a", 0, 0.5, 0.5]] });
      act(() => fausse.rappels!.surFermeture());
      expect(screen.queryByText(/regardent cette page/)).toBeNull();
      expect(screen.queryByRole("button", { name: /mon curseur/ })).toBeNull();
      expect(document.body.querySelector("[data-curseur]")).toBeNull();
    });
  });
});
```

(`fireEvent.mouseMove` de testing-library ne remplit pas toujours `pageX` dans jsdom : si l'assertion de position échoue pour cette raison, créer l'événement avec `new MouseEvent("mousemove", { clientX: 400, clientY: 150 })` et lire `clientX + window.scrollX` dans le composant — équivalent à `pageX` — en le signalant.)

Et dans `apps/web/app/politique-de-confidentialite/page.test.tsx`, un test : la page affiche le titre « Présence en direct », « article 6.1.f » au moins une fois de plus qu'avant (ou une assertion sur la phrase « les autres visiteurs présents au même moment ») et « Masquer mon curseur ».

- [ ] **Step 2: Lancer** → FAIL.

- [ ] **Step 3: `apps/web/components/direct/PresenceDirecte.tsx`**

```tsx
"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { ConnexionDirecte } from "@/lib/direct/connexion";
import { boitesDesSections, versRepere } from "@/lib/direct/coordonnees";
import { MagasinDirect, type EtatDirect } from "@/lib/direct/magasin";
import { CalqueCurseurs } from "./CalqueCurseurs";

const CLE_PARTAGE = "direct:partage";

type ValeurDirect = { etat: EtatDirect; pointeurFin: boolean; partage: boolean; basculerPartage(): void };

const ContexteDirect = createContext<ValeurDirect>({
  etat: { connecte: false, presents: 0, curseurs: [] },
  pointeurFin: false,
  partage: true,
  basculerPartage: () => {},
});

export const useDirect = () => useContext(ContexteDirect);

function lirePartage(): boolean {
  try {
    return window.localStorage.getItem(CLE_PARTAGE) !== "non";
  } catch {
    return true;
  }
}

function ecrirePartage(partage: boolean): void {
  try {
    if (partage) window.localStorage.removeItem(CLE_PARTAGE);
    else window.localStorage.setItem(CLE_PARTAGE, "non");
  } catch {
    // Stockage indisponible : le choix vaut pour cette page seulement.
  }
}

const REQUETE_POINTEUR = "(pointer: fine)";
const abonnerPointeur = (fn: () => void) => {
  const mq = window.matchMedia(REQUETE_POINTEUR);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
};
const lirePointeur = () => window.matchMedia(REQUETE_POINTEUR).matches;

/** Lance `fn` une fois la page chargée, dans un temps libre du navigateur. */
function quandLibre(fn: () => void): () => void {
  let id: number | undefined;
  const lancer = () => {
    id = "requestIdleCallback" in window ? window.requestIdleCallback(fn, { timeout: 3_000 }) : window.setTimeout(fn, 1_000);
  };
  if (document.readyState === "complete") lancer();
  else window.addEventListener("load", lancer, { once: true });
  return () => {
    window.removeEventListener("load", lancer);
    if (id === undefined) return;
    if ("cancelIdleCallback" in window) window.cancelIdleCallback(id);
    window.clearTimeout(id);
  };
}

/**
 * Présence en direct sur l'accueil (sous-projet 4) : compteur des personnes
 * présentes et curseurs des autres visiteurs. Le code de connexion est un
 * morceau à part, chargé après l'affichage (comme le moteur de l'intro). Sans
 * `NEXT_PUBLIC_DIRECT_URL` (figée au build), rien n'est chargé ni connecté et
 * l'accueil reste celui d'avant.
 */
export function PresenceDirecte({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_DIRECT_URL;
  const [magasin] = useState(() => new MagasinDirect());
  const etat = useSyncExternalStore(magasin.abonner, magasin.etat, magasin.etat);
  const pointeurFin = useSyncExternalStore(abonnerPointeur, lirePointeur, () => false);
  const [partage, setPartage] = useState(() => (typeof window === "undefined" ? true : lirePartage()));
  const [connexion, setConnexion] = useState<ConnexionDirecte | null>(null);

  useEffect(() => {
    if (!url) return;
    let annule = false;
    let courante: ConnexionDirecte | null = null;
    const surVisibilite = () => courante?.surVisibilite(document.visibilityState === "visible");
    const annulerDemarrage = quandLibre(() => {
      import("@/lib/direct/connexion")
        .then(({ ConnexionDirecte }) => {
          if (annule) return;
          courante = new ConnexionDirecte(url, {
            surMessage: (m) => magasin.appliquer(m, Date.now()),
            surFermeture: () => magasin.vider(),
          });
          courante.ouvrir();
          document.addEventListener("visibilitychange", surVisibilite);
          setConnexion(courante);
        })
        .catch(() => {
          // Morceau introuvable (déploiement en cours) : l'accueil reste sans présence.
        });
    });
    return () => {
      annule = true;
      annulerDemarrage();
      document.removeEventListener("visibilitychange", surVisibilite);
      courante?.arreter();
      magasin.vider();
    };
  }, [url, magasin]);

  useEffect(() => {
    if (!connexion || !pointeurFin) return;
    if (!partage) {
      connexion.envoyer({ type: "masque" });
      return;
    }
    const surMouvement = (e: MouseEvent) => {
      const repere = versRepere(e.pageX, e.pageY, boitesDesSections());
      connexion.envoyer(repere ? { type: "position", ...repere } : { type: "masque" });
    };
    const surSortie = () => connexion.envoyer({ type: "masque" });
    document.addEventListener("mousemove", surMouvement, { passive: true });
    document.documentElement.addEventListener("mouseleave", surSortie);
    return () => {
      document.removeEventListener("mousemove", surMouvement);
      document.documentElement.removeEventListener("mouseleave", surSortie);
    };
  }, [connexion, pointeurFin, partage]);

  const basculerPartage = () => {
    const suivant = !partage;
    ecrirePartage(suivant);
    setPartage(suivant);
  };

  return (
    <ContexteDirect.Provider value={{ etat, pointeurFin, partage, basculerPartage }}>
      {children}
      <CalqueCurseurs curseurs={etat.curseurs} />
    </ContexteDirect.Provider>
  );
}
```

(`import type` en tête : seul le type est importé statiquement, le code de connexion reste dans son morceau. Si la règle `react-hooks` du lint signale l'initialisation de `partage` depuis `localStorage`, garder la lecture paresseuse dans `useState` — le rendu serveur et le premier rendu client restent identiques, le bouton n'apparaissant qu'après connexion — et le signaler.)

- [ ] **Step 4: `apps/web/components/direct/CompteurPresents.tsx`**

```tsx
"use client";

import { useDirect } from "./PresenceDirecte";

/**
 * Ligne du compteur, en tête de l'accroche (avant la salutation) : une place à
 * hauteur fixe rendue par le serveur, vide sans service ou quand on est seul,
 * pour que son apparition ne décale rien. Le bouton apparaît dès la connexion,
 * sur pointeur fin seulement : on peut refuser avant que quiconque arrive.
 */
export function CompteurPresents() {
  const { etat, pointeurFin, partage, basculerPartage } = useDirect();
  const plusieurs = etat.presents >= 2;
  return (
    <div data-testid="compteur-presents" className="mb-3 flex h-7 items-center gap-4 text-sm text-encre-douce">
      <p aria-live="polite" className="flex items-center gap-2">
        {plusieurs && (
          <>
            <span aria-hidden="true" className="size-2 rounded-full bg-emerald-600 motion-safe:animate-pulse" />
            {`${etat.presents} personnes regardent cette page`}
          </>
        )}
      </p>
      {etat.connecte && pointeurFin && (
        <button
          type="button"
          onClick={basculerPartage}
          className="underline decoration-trait underline-offset-4 transition-colors hover:text-encre"
        >
          {partage ? "Masquer mon curseur" : "Montrer mon curseur"}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: `apps/web/components/direct/CalqueCurseurs.tsx`**

```tsx
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { boitesDesSections, versPage } from "@/lib/direct/coordonnees";
import type { CurseurAffiche } from "@/lib/direct/magasin";

/** Un curseur immobile depuis 10 s s'estompe (affichage seulement). */
const ESTOMPE_APRES_MS = 10_000;

const jamais = () => () => {};
const abonnerRedimensionnement = (fn: () => void) => {
  window.addEventListener("resize", fn);
  return () => window.removeEventListener("resize", fn);
};
const largeurFenetre = () => window.innerWidth;

/**
 * Curseurs des autres visiteurs, dans `body`, en coordonnées de document : le
 * calque défile avec la page, sans écouteur de défilement ; les positions sont
 * recalculées à chaque lot et au redimensionnement. Transparent aux clics et
 * ignoré des lecteurs d'écran.
 */
export function CalqueCurseurs({ curseurs }: { curseurs: CurseurAffiche[] }) {
  const monte = useSyncExternalStore(jamais, () => true, () => false);
  useSyncExternalStore(abonnerRedimensionnement, largeurFenetre, () => 0);
  const [maintenant, setMaintenant] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setMaintenant(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  if (!monte || curseurs.length === 0) return null;
  const boites = boitesDesSections();

  return createPortal(
    <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-40">
      {curseurs.map((c) => {
        const point = versPage(c, boites);
        if (!point) return null;
        const estompe = maintenant > 0 && maintenant - c.vuLe > ESTOMPE_APRES_MS;
        return (
          <svg
            key={c.id}
            data-curseur=""
            width="18"
            height="22"
            viewBox="0 0 18 22"
            className="absolute left-0 top-0 transition-[transform,opacity] duration-150 ease-linear motion-reduce:transition-opacity"
            style={{ transform: `translate(${point.x}px, ${point.y}px)`, opacity: estompe ? 0 : 1 }}
          >
            <path
              d="M1 1 L1 18 L6 13.5 L9.5 21 L12.5 19.6 L9 12.3 L16 12.3 Z"
              fill={c.couleur}
              stroke="#f3efe7"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </div>,
    document.body,
  );
}
```

(Le calque est en `position: absolute` dans `body` : vérifier dans `app/layout.tsx` que `body` n'est pas positionné (`relative`…) ; s'il l'est, le calque reste juste car `body` commence en haut à gauche du document — le noter dans le rapport.)

- [ ] **Step 6: Câblage** —
  - `apps/web/components/accueil/Accueil.tsx` : envelopper tout le fragment dans `<PresenceDirecte>…</PresenceDirecte>` (import `@/components/direct/PresenceDirecte`) et compléter le commentaire : « avec la présence en direct (sous-projet 4) ».
  - `apps/web/components/accueil/Accroche.tsx` : ajouter `data-direct-section="accroche"` sur la `<section>` ; remplacer le commentaire `{/* Le compteur de visiteurs (sous-projet 4) se placera aussi au-dessus du surtitre. */}` par `<CompteurPresents />` (import `@/components/direct/CompteurPresents`), **avant** la salutation. Ordre figé : compteur → salutation → surtitre → titre.
  - `apps/web/components/accueil/Section.tsx` : ajouter `data-direct-section={id}` sur la `<section>`, avec le commentaire « Repère des curseurs en direct (table REPERES de lib/direct/coordonnees.ts). »
  - Test dans `apps/web/components/accueil/Accueil.test.tsx` : l'accueil rendu contient les six repères `accroche`, `offre`, `realisations`, `methode`, `parcours`, `contact` (sélecteur `[data-direct-section]`), et la ligne `compteur-presents` précède la salutation sur une page personnalisée.

- [ ] **Step 7: CSP** — `apps/web/next.config.ts`, après `umamiApi` :

```ts
// Service temps réel (apps/realtime) : son adresse est figée au build ; seule
// son origine (`wss://…` en production) est ajoutée à `connect-src`.
const urlDirect = process.env.NEXT_PUBLIC_DIRECT_URL;
const origineDirect = urlDirect ? new URL(urlDirect).origin : "";
// En e2e et sous Lighthouse, le service est en `ws://` (site servi en http) :
// `upgrade-insecure-requests` réécrirait la connexion en `wss://`.
const serviceNonChiffre = urlDirect?.startsWith("ws://") ?? false;
```

la ligne `connect-src` devient :

```ts
  `connect-src 'self' ${umamiApi}${origineDirect ? ` ${origineDirect}` : ""}${enDeveloppement ? " ws: wss:" : ""}`,
```

et la dernière ligne de la CSP :

```ts
  ...(enDeveloppement || serviceNonChiffre ? [] : ["upgrade-insecure-requests"]),
```

Compléter le commentaire de tête de la CSP : « et le service temps réel, autorisé dans `connect-src` quand `NEXT_PUBLIC_DIRECT_URL` est définie ».

- [ ] **Step 8: Politique de confidentialité** — `apps/web/app/politique-de-confidentialite/page.tsx`, après la section « Liens personnalisés », sur le même modèle :

```tsx
<div className="flex flex-col gap-3">
  <h2 className="text-xl font-semibold">Présence en direct</h2>
  <p>
    Sur la page d&apos;accueil, la position de votre souris, relative à la section affichée, est
    partagée en direct sous la forme d&apos;une flèche colorée anonyme, et un compteur indique combien
    de personnes regardent la page. Rien n&apos;est enregistré.
  </p>
  <p>
    Ce partage sert à animer la page d&apos;accueil et à montrer un savoir-faire technique. Sa base
    légale est mon intérêt légitime (article 6.1.f du RGPD). Ses destinataires sont les autres
    visiteurs présents au même moment, qui ne voient que la flèche, et l&apos;hébergeur du service, qui
    achemine la connexion. Il dure le temps de votre visite : votre adresse IP sert uniquement, en
    mémoire et le temps de la connexion, à limiter le nombre de connexions ; les journaux techniques de
    l&apos;hébergeur relèvent de la mention ci-dessus.
  </p>
  <p>
    Vous pouvez vous y opposer à tout moment avec le bouton « Masquer mon curseur ». Ce choix est gardé
    dans le stockage local de votre navigateur, comme le repère de l&apos;introduction déjà vue ; aucun
    cookie supplémentaire n&apos;est déposé.
  </p>
</div>
```

(Vérifier que « la mention ci-dessus » renvoie bien à la phrase existante sur les journaux techniques de l'hébergeur ; sinon, reformuler en « relèvent de la section sur l'hébergement ».)

- [ ] **Step 9: Contrôle de taille** — `apps/web/scripts/verifier-taille-direct.mjs`, sur le modèle exact de `scripts/verifier-taille-encre.mjs` : `LIMITE = 4 * 1024`, `MARQUEUR = "connexion-direct:v1"`, en-tête « Vérifie que le code de connexion temps réel, chargé après l'affichage, reste sous 4 Ko compressés. Son morceau de JS est repéré par `MARQUEUR_DIRECT` de lib/direct/connexion.ts. Usage : pnpm --filter web verifier-taille-direct (après un build avec NEXT_PUBLIC_DIRECT_URL) », messages « Code de connexion temps réel (…) : X Ko compressés, limite 4 Ko. ». `apps/web/package.json` : `"verifier-taille-direct": "node scripts/verifier-taille-direct.mjs"`.

- [ ] **Step 10: Lancer** —
  - `pnpm --filter web exec vitest run components/direct components/accueil lib/direct app/politique-de-confidentialite` → PASS ;
  - `pnpm lint && pnpm typecheck && pnpm test` → PASS (les tests existants de l'accueil passent sans être affaiblis) ;
  - `pnpm build` (sans `NEXT_PUBLIC_DIRECT_URL`) → `○ /`, puis `pnpm --filter web verifier-accueil-statique` → OK ; `pnpm --filter web verifier-taille-direct` échoue (« introuvable ») : normal, aucun morceau de connexion sans adresse — à confirmer dans le rapport ;
  - `NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct pnpm build` → `○ /`, puis `pnpm --filter web verifier-taille-direct` → sous 4 Ko ;
  - `grep -rnP "[\x{00a0}\x{202f}]" apps/web/components/direct apps/web/lib/direct apps/web/scripts/verifier-taille-direct.mjs` → vide.

- [ ] **Step 11: Commit**

```bash
git add apps/web/components/direct/PresenceDirecte.tsx apps/web/components/direct/PresenceDirecte.test.tsx apps/web/components/direct/CompteurPresents.tsx apps/web/components/direct/CalqueCurseurs.tsx apps/web/scripts/verifier-taille-direct.mjs apps/web/package.json apps/web/components/accueil/Accueil.tsx apps/web/components/accueil/Accueil.test.tsx apps/web/components/accueil/Accroche.tsx apps/web/components/accueil/Section.tsx apps/web/next.config.ts apps/web/app/politique-de-confidentialite/page.tsx apps/web/app/politique-de-confidentialite/page.test.tsx
git commit -m "Temps réel : compteur des présents, curseurs des autres visiteurs, CSP et politique de confidentialité"
```

---

### Task 7: Bout en bout, Lighthouse et documentation

**Files:**
- Create: `apps/web/e2e/direct.spec.ts`
- Modify: `apps/web/playwright.config.ts`, `.github/workflows/ci.yml` (job `e2e`), `README.md`

**Interfaces:**
- Consumes: service (t3), composants (t6).
- Produces: projet Playwright `direct` ; service lancé par Playwright sur le port `3201` quand `NEXT_PUBLIC_DIRECT_URL` est définie ; en CI, `NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct` pour le build et l'e2e.

- [ ] **Step 1: Configuration Playwright** — `apps/web/playwright.config.ts` :
  - projets `ordinateur` et `mobile` : ajouter `testIgnore: "direct.spec.ts"` ;
  - nouveau projet, après eux (il tourne une fois les autres finis, pour que les présences des autres tests ne faussent pas le compteur) :

```ts
    // Présence en direct : seul sur l'accueil, après les autres projets.
    {
      name: "direct",
      testMatch: "direct.spec.ts",
      dependencies: ["ordinateur", "mobile"],
      use: { ...devices["Desktop Chrome"], launchOptions: lancement },
    },
```

  - `webServer` devient un tableau : le serveur actuel, puis, seulement si `process.env.NEXT_PUBLIC_DIRECT_URL` est définie :

```ts
const PORT_DIRECT = 3201;
// Service temps réel : lancé seulement si le site a été construit avec son adresse
// (`NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct pnpm build`).
const serviceDirect = process.env.NEXT_PUBLIC_DIRECT_URL
  ? [
      {
        command: "pnpm --filter realtime start",
        url: `http://127.0.0.1:${PORT_DIRECT}/sante`,
        reuseExistingServer: !process.env.CI,
        env: {
          PORT: String(PORT_DIRECT),
          HOTE: "127.0.0.1",
          ORIGINES_AUTORISEES: `http://127.0.0.1:${PORT}`,
          // Tous les navigateurs de test partagent 127.0.0.1.
          CONNEXIONS_PAR_IP: "1000",
        },
      },
    ]
  : [];
```

    et `webServer: [{ …serveur actuel… }, ...serviceDirect]`.

- [ ] **Step 2: `apps/web/e2e/direct.spec.ts`**

```ts
import { devices, expect, test } from "@playwright/test";
import { surveillerErreurs } from "./outils";

test.skip(!process.env.NEXT_PUBLIC_DIRECT_URL, "Service temps réel requis (NEXT_PUBLIC_DIRECT_URL au build).");
test.describe.configure({ mode: "serial" });

test("deux visiteurs se voient : compteur et curseur", async ({ browser }) => {
  const a = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const b = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const pageA = await a.newPage();
  const pageB = await b.newPage();
  const erreurs = [...[pageA, pageB].map(surveillerErreurs)];
  await pageA.goto("/");
  await pageB.goto("/");

  await expect(pageA.getByText("2 personnes regardent cette page")).toBeVisible({ timeout: 10_000 });
  await expect(pageB.getByText("2 personnes regardent cette page")).toBeVisible({ timeout: 10_000 });

  const titre = await pageA.getByRole("heading", { level: 1 }).boundingBox();
  for (let i = 0; i < 5; i++) await pageA.mouse.move(titre!.x + 40 + i * 20, titre!.y + 20);
  await expect(pageB.locator("[data-curseur]")).toHaveCount(1);

  await pageA.getByRole("button", { name: "Masquer mon curseur" }).click();
  await expect(pageB.locator("[data-curseur]")).toHaveCount(0);

  await a.close();
  await expect(pageB.getByText(/regardent cette page/)).toHaveCount(0);
  await b.close();
  expect(erreurs.flat()).toEqual([]);
});

test("sur mobile : compteur seul, ni bouton ni curseur envoyé", async ({ browser }) => {
  const ordinateur = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const mobile = await browser.newContext({ ...devices["Pixel 7"] });
  const pageO = await ordinateur.newPage();
  const pageM = await mobile.newPage();
  await pageO.goto("/");
  await pageM.goto("/");
  await expect(pageM.getByText("2 personnes regardent cette page")).toBeVisible({ timeout: 10_000 });
  await expect(pageM.getByRole("button", { name: /mon curseur/ })).toHaveCount(0);
  await pageM.mouse.move(100, 300);
  await pageM.mouse.move(150, 320);
  await pageO.waitForTimeout(500);
  await expect(pageO.locator("[data-curseur]")).toHaveCount(0);
  await ordinateur.close();
  await mobile.close();
});

test("la page personnalisée rejoint la même salle", async ({ browser }) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const pageA = await a.newPage();
  const pageB = await b.newPage();
  await pageA.goto("/");
  await pageB.goto("/?pour=inconnu-0000");
  await expect(pageA.getByText("2 personnes regardent cette page")).toBeVisible({ timeout: 10_000 });
  await a.close();
  await b.close();
});
```

(Si le compteur n'apparaît jamais, vérifier d'abord la console du navigateur : une erreur de connexion vers `wss://127.0.0.1:3201` signale que la règle CSP de la tâche 6 (step 7, pas d'`upgrade-insecure-requests` pour un service en `ws://`) ne s'applique pas ; la corriger dans `next.config.ts` et le signaler.)

- [ ] **Step 3: Lancer en local** —

```bash
pnpm --filter realtime build
NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct pnpm build
NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm e2e
```

Attendu : tout passe (sauts volontaires seulement), y compris le projet `direct`. Puis sans la variable : `pnpm build && pnpm e2e` → le projet `direct` est ignoré, les autres passent. Libérer les ports 3100, 3201, 2525 (`fuser -k`).

- [ ] **Step 4: Lighthouse avec le service** —

```bash
NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct pnpm build
ORIGINES_AUTORISEES=http://127.0.0.1:3000 PORT=3201 HOTE=127.0.0.1 pnpm --filter realtime start &
DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm --filter web semer-lien-exemple
DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm --filter web lighthouse
fuser -k 3201/tcp 3000/tcp
```

Attendu : les quatre URL passent, seuils inchangés.

- [ ] **Step 5: CI** — `.github/workflows/ci.yml`, job `e2e` :
  - dans son bloc `env`, ajouter : `NEXT_PUBLIC_DIRECT_URL: ws://127.0.0.1:3201/direct` (commentaire : « Service temps réel lancé par Playwright puis pour Lighthouse ; l'adresse est figée au build. ») ;
  - après `- run: pnpm build` : `- run: pnpm --filter realtime build` ;
  - après `- run: pnpm --filter web verifier-taille-encre` : `- run: pnpm --filter web verifier-taille-direct` (le build de ce job a `NEXT_PUBLIC_DIRECT_URL`, donc le morceau de connexion existe) ;
  - avant `- run: pnpm --filter web lighthouse` :

```yaml
      # Playwright a arrêté son service temps réel : Lighthouse mesure l'accueil
      # avec un service démarré, comme en production.
      - name: Service temps réel pour Lighthouse
        run: |
          ORIGINES_AUTORISEES=http://127.0.0.1:3000 PORT=3201 HOTE=127.0.0.1 nohup pnpm --filter realtime start > /tmp/direct.log 2>&1 &
          for i in $(seq 1 20); do curl -sf http://127.0.0.1:3201/sante && exit 0; sleep 0.5; done
          cat /tmp/direct.log; exit 1
```

- [ ] **Step 6: README** — après la section des liens personnalisés, une section :

```markdown
Temps réel (compteur et curseurs de l'accueil) : service `apps/realtime` (Hono, WebSocket).

- En local : `pnpm dev:direct` (port 3001, `ORIGINES_AUTORISEES=http://localhost:3000` à définir), puis le site construit ou lancé avec `NEXT_PUBLIC_DIRECT_URL=ws://localhost:3001/direct`. Sans cette variable, l'accueil ne charge ni ne connecte rien.
- Image : `ghcr.io/augustin-jouan/jouan.dev-realtime`, construite par la CI comme celle du site.
- Origines autorisées (`ORIGINES_AUTORISEES`, séparées par des virgules) :
  - prévisualisation : `https://portfolio.jouan.dev` ;
  - production, à la bascule sur le domaine nu : ajouter `https://jouan.dev` ;
  - local : `http://localhost:3000` ; e2e et Lighthouse : posées par la CI.

  Toute origine HTTPS servant le site doit figurer dans la liste de la ressource Coolify.
- Exposition : uniquement par le proxy de Coolify, en HTTPS ; le port 3001 n'est pas publié sur l'hôte (sinon la dernière entrée de `X-Forwarded-For` ne serait plus fiable). Une seule réplique : un redéploiement déconnecte les visiteurs quelques secondes.
- Mise en service, dans cet ordre :
  1. entrée DNS `direct.portfolio.jouan.dev` vers le VPS ;
  2. ressource Coolify depuis l'image du service, port 3001, domaine `https://direct.portfolio.jouan.dev`, variable `ORIGINES_AUTORISEES` ; attendre qu'elle soit en ligne et saine (`/sante`) ;
  3. variable de dépôt GitHub `DIRECT_URL=wss://direct.portfolio.jouan.dev/direct` (figée au build du site : tant qu'elle est vide, le site ne tente aucune connexion) ;
  4. secret GitHub `COOLIFY_WEBHOOK_URL_DIRECT` (webhook de la ressource du service).
- Limites : 300 connexions au total, 5 par adresse IP (`CONNEXIONS_PAR_IP`), messages de 128 octets et 40 par seconde au plus. Aucune IP ni position n'est journalisée.
```

- [ ] **Step 7: Lancer** — `pnpm lint && pnpm typecheck && pnpm test` → PASS ; YAML relu et validé comme en tâche 4.

- [ ] **Step 8: Commit**

```bash
git add apps/web/e2e/direct.spec.ts apps/web/playwright.config.ts .github/workflows/ci.yml README.md
git commit -m "Temps réel : tests de bout en bout à deux visiteurs, Lighthouse avec le service, documentation"
```

(Ajouter `apps/web/next.config.ts` si la règle CSP a dû être corrigée.)

---

### Task 8: Vérification finale

**Files:**
- Modify: aucun fichier de code ; corrections éventuelles seulement.

- [ ] **Step 1: Anonymat**

```bash
T=.superpowers/anonymat/termes-interdits.txt
git diff main..HEAD -- . ':!pnpm-lock.yaml' | grep -ciF -f <(grep -v '^#' $T | grep -v '^$')
git log main..HEAD --format=%B | grep -ciF -f <(grep -v '^#' $T | grep -v '^$')
```

Expected : `0` et `0`.

- [ ] **Step 2: Vérification complète** — avec la base de test démarrée et migrée :

```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck
DATABASE_URL_TEST=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm test
pnpm --filter realtime build
NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct pnpm build && pnpm --filter web verifier-accueil-statique
NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm e2e
pnpm --filter web verifier-taille-encre && pnpm --filter web verifier-taille-demo && pnpm --filter web verifier-taille-direct
```

puis le Step 4 de la tâche 7 (Lighthouse avec le service), puis :

```bash
docker build -t jouan-dev .
docker build -f apps/realtime/Dockerfile -t jouan-dev-realtime .
```

Tout doit passer. Libérer les ports 3000, 3100, 3201, 2525.

- [ ] **Step 3: Commit** — seulement si une correction a été nécessaire, avec ses fichiers nommés un par un et un message en français décrivant la correction.
