# Coulisses — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une page `/coulisses` qui montre l'architecture du site en direct (latences mesurées depuis le navigateur sur un schéma 2D, 3D à la demande) et les preuves de qualité du build en ligne (tests, Lighthouse, poids du JavaScript).

**Architecture:** Le service `apps/realtime` gagne un WebSocket d'écho `/sonde`, hors de la salle de l'accueil ; le site gagne une route `GET /api/coulisses/mesure` (chrono d'un `SELECT 1`). Côté navigateur, un « releveur » mesure toutes les 2 s l'aller-retour HTTP et l'écho WebSocket et alimente un magasin lu par React ; le schéma SVG, rendu par le serveur, affiche ces mesures, et un module Three.js chargé au clic en donne une vue 3D. La CI écrit `build-info.json` (SHA, titre, date, tests, Lighthouse) avant de construire l'image ; la page, statique, le lit au build.

**Tech Stack:** Next 16.4 (App Router, React 19.2), Tailwind 4, Vitest 4 (jsdom), Playwright, Lighthouse CI ; Hono 4 + `@hono/node-server` 2 + `ws` 8 (service) ; Three.js `^0.186.1`.

**Spec:** `docs/superpowers/specs/2026-10-09-coulisses-design.md` (lire aussi `2026-10-09-temps-reel-design.md` pour le service).

## Prérequis

Ce plan s'appuie sur le sous-projet 4 **terminé** (plan `2026-10-09-temps-reel.md`, tâches 1 à 8). Avant la tâche 1 : `git rebase sous-projet-4-temps-reel` dans la branche `sous-projet-5-coulisses` (worktree `.superpowers/worktrees/coulisses`), puis vérifier **chaque** point ci-dessous. S'il en manque un, ou si une signature diffère, s'arrêter et le signaler.

| Élément | Vérification |
|---|---|
| Service : `demarrerServeur(options: OptionsServeur): Promise<{ port; fermer() }>`, options `origines`, `port`, `hote`, `connexionsParIp`, `intervalleLotMs`, `intervallePingMs` | `grep -n "export async function demarrerServeur\|export type OptionsServeur" -A8 apps/realtime/src/serveur.ts` |
| Service : `Gardien(max, maxParIp)`, `Debit(max)`, `ipDuClient` (dernière entrée de `X-Forwarded-For`), `origineAutorisee` | `grep -n "export" apps/realtime/src/limites.ts apps/realtime/src/origines.ts` |
| Service : message `bienvenue` avec `presents` à l'ouverture de `/direct` | `grep -n '"bienvenue"' apps/realtime/src/serveur.ts` |
| Service : `CONNEXIONS_PAR_IP` lu par `index.ts` | `grep -n "CONNEXIONS_PAR_IP" apps/realtime/src/index.ts` |
| Site : `quandLibre` local à `PresenceDirecte.tsx` | `grep -n "function quandLibre" apps/web/components/direct/PresenceDirecte.tsx` |
| Site : `export type Horloge` (`maintenant`, `programmer`, `annuler`) | `grep -n "export type Horloge" -A4 apps/web/lib/direct/connexion.ts` |
| Site : origine du service dans `connect-src`, pas d'`upgrade-insecure-requests` pour `ws://` | `grep -n "origineDirect\|upgrade-insecure-requests" apps/web/next.config.ts` |
| Site : `verifier-taille-direct` | `grep -n "verifier-taille-direct" apps/web/package.json` |
| Confidentialité : section « Présence en direct » | `grep -n "Présence en direct" apps/web/app/politique-de-confidentialite/page.tsx` |
| Playwright : `serviceDirect` (port 3201) avec `CONNEXIONS_PAR_IP` dans son `env`, `webServer` du site avec un `env` | `grep -n "serviceDirect\|CONNEXIONS_PAR_IP\|env:" apps/web/playwright.config.ts` |
| CI, job `e2e` : `NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct`, service relancé pour Lighthouse, `verifier-taille-direct` | `grep -n "NEXT_PUBLIC_DIRECT_URL\|realtime\|verifier-taille" .github/workflows/ci.yml` |

## Global Constraints

- Tout le texte visible, les commentaires, les noms de fichiers et les messages de commit sont en français.
- Anonymat : aucun nom réel de client, de projet, d'employeur, de ville, de téléphone ou d'adresse dans le dépôt ni dans les commits. Les textes des nœuds ne contiennent ni l'adresse de l'administration Coolify, ni l'IP du VPS, ni l'hébergeur au-delà de « VPS en France ». Le titre du commit devient public (section « Dernier déploiement »).
- Caractères invisibles : U+00A0 et U+202F s'écrivent uniquement en échappements `\u00a0` / `\u202f` dans le code et les tests ; vérifier avec `grep -rnP "[\x{00a0}\x{202f}]"` après chaque écriture.
- Next 16 a des ruptures : lire le guide concerné dans `apps/web/node_modules/next/dist/docs/` avant d'utiliser une API Next (route handlers, métadonnées, `import()`).
- Versions : `three` `^0.186.1`, `@types/three` `^0.186.0` ; rien d'autre de nouveau.
- `/` et `/coulisses` restent statiques (`○ /` et `○ /coulisses` au build ; `pnpm --filter web verifier-accueil-statique`, qui vérifie les deux pages à partir de la tâche 8).
- Budgets (spec §7) : performance et accessibilité ≥ 0,95, LCP ≤ 2 800 ms, CLS ≤ 0,05, scripts ≤ 160 Ko (163 840 octets) sur chaque page mesurée, `/coulisses` comprise ; vue 3D ≤ 180 Ko compressés (tous ses morceaux, modules complémentaires compris), jamais chargée sans clic.
- Mesures (spec §4) : toutes les 2 s, onglet visible seulement ; 30 valeurs gardées par série ; « indisponible » après 3 échecs de suite ; essais espacés 2 s, 4 s, 8 s puis 10 s ; route limitée à 60 requêtes par minute et par IP, appels d'un autre site refusés (`Sec-Fetch-Site`) ; une sonde en cours d'ouverture n'est pas un échec ; sonde : 32 octets UTF-8 et 5 messages par seconde au plus, 100 connexions au total et 2 par IP, à part de `/direct`.
- Aucune mesure ni adresse IP n'est stockée ou journalisée ; l'IP ne vit qu'en mémoire, pour les limites (une minute pour la route, le temps de la connexion pour la sonde). Adresse du client : dernière entrée de `X-Forwarded-For`, jamais `X-Real-IP`.
- Le code des coulisses n'importe **aucune valeur** de `lib/direct/connexion.ts` (types seulement) : son morceau est mesuré à part par `verifier-taille-direct`, qui échoue si le marqueur se retrouve dans deux morceaux.
- Commits ciblés (fichiers nommés un par un), jamais de `git add -A` ; ne pas toucher `apps/web/.env.example` ni `apps/web/scripts/empreinte-mot-de-passe.mjs`. Jamais de push.

## Review Focus

1. **Marqueur du temps réel dupliqué** — importer une valeur (constante, classe) de `lib/direct/connexion.ts` dans le code des coulisses ferait entrer le marqueur `connexion-direct:v1` dans un second morceau : `verifier-taille-direct` échouerait (« ambigu »). Vérifié en tâche 8 (build avec `NEXT_PUBLIC_DIRECT_URL`, puis `verifier-taille-direct`).
2. **Requête Postgres abandonnée** — un `SELECT 1` qui échoue **après** l'abandon de 2 s ne doit pas produire de rejet non géré (qui peut faire tomber le serveur Node). Test dans la tâche 2.
3. **Onglet caché** — dès le démarrage ou pendant une mesure en vol : rien ne part, la requête en vol est annulée, son résultat ignoré, aucune minuterie ne reste programmée. Tests dans la tâche 5.
4. **Schéma illisible** — une liaison qui traverse un nœud, deux nœuds qui se chevauchent, un nom qui déborde ou un libellé de latence posé sur un nœud, dans l'une ou l'autre variante (large, étroite). Test géométrique dans la tâche 6.
5. **Tests de bout en bout en parallèle** — tous les navigateurs de test partagent `127.0.0.1` : avec 60 mesures par minute et 2 sondes par IP, les tests parallèles verraient « indisponible ». Playwright pose `MESURE_MAX_PAR_IP` (site) et `SONDE_CONNEXIONS_PAR_IP` (service) en tâche 15, lus par la route (tâche 2) et par `index.ts` (tâche 1, testé avec `sondeParIp`) ; le test e2e des mesures échoue sinon.

---

## Structure des fichiers

**Service `apps/realtime/`**
- `src/limites.ts` — constantes de la sonde (`SONDE_*`)
- `src/serveur.ts` — route `/sonde` (écho), filtre commun aux deux routes, pings et arrêt étendus
- `src/index.ts` — variable `SONDE_CONNEXIONS_PAR_IP`
- `src/sonde.test.ts` — tests d'intégration de la sonde

**Site `apps/web/`**
- `lib/ip.ts` — `ipDeRequete` (dernière entrée de `X-Forwarded-For`, jamais `X-Real-IP`)
- `lib/coulisses/mesure-serveur.ts` — `limiteMesure`, `chronometrerBase`
- `app/api/coulisses/mesure/route.ts` — `GET`
- `lib/coulisses/magasin.ts` — `MagasinMesures`, `mediane`, séries
- `lib/coulisses/sonde.ts` — `SondeTempsReel` (écho WebSocket, reconnexion)
- `lib/coulisses/http.ts` — `mesurerHttp`
- `lib/coulisses/releveur.ts` — `Releveur` (boucles de mesure, échecs, onglet caché)
- `lib/coulisses/outils-test.ts` — `FausseSocket`, `horlogeFactice` (tests seulement)
- `lib/coulisses/format.ts` — `formaterMs`, `texteSerie`, `dureeDefilement`
- `lib/quand-libre.ts` — `quandLibre`, extrait de `PresenceDirecte`
- `data/architecture.ts` — nœuds, liaisons, cadres
- `components/coulisses/Schema.tsx`, `DetailNoeud.tsx`, `PanneauEnDirect.tsx`, `Courbe.tsx`, `ArchitectureVivante.tsx`
- `lib/coulisses/infos-build.mjs` — `validerInfosBuild` (partagé par le site et la CI)
- `lib/coulisses/build-info.ts` — `lireBuildInfo`
- `lib/coulisses/dates.ts` — `dateRelative`, `formaterDateAbsolue`
- `components/coulisses/SectionDeploiement.tsx`, `DateRelative.tsx`
- `scripts/compter-tests.mjs`, `scripts/extraire-lighthouse.mjs`, `scripts/assembler-build-info.mjs`
- `lib/coulisses/geometrie3d.ts` — `position3d`, `periodePaquet`
- `lib/coulisses/webgl.ts` — `webglDisponible`
- `lib/coulisses/scene3d.ts` — `creerScene` (Three.js)
- `scripts/verifier-taille-3d.mjs`
- `app/coulisses/page.tsx`
- `e2e/coulisses.spec.ts`, `e2e/coulisses-3d.spec.ts`
- Modifiés : `components/layout/Footer.tsx`, `app/sitemap.ts`, `app/politique-de-confidentialite/page.tsx`, `components/direct/PresenceDirecte.tsx`, `scripts/verifier-accueil-statique.mjs`, `app/globals.css`, `vitest.config.ts`, `playwright.config.ts`, `lighthouserc.json`, `package.json`

**Racine** : `.github/workflows/ci.yml`, `.gitignore`, `.dockerignore`, `README.md`, `apps/demo-marches/vite.config.ts`, `apps/realtime/vitest.config.ts`.

---

### Task 1: Sonde WebSocket `/sonde` du service temps réel

**Files:**
- Modify: `apps/realtime/src/limites.ts`, `apps/realtime/src/serveur.ts`, `apps/realtime/src/index.ts`
- Create: `apps/realtime/src/sonde.test.ts`

**Interfaces:**
- Consumes (contrat du sous-projet 4, à ne pas modifier) : `Gardien(max, maxParIp)` avec `peutAdmettre(ip)`, `admettre(ip)`, `liberer(ip)` ; `Debit(max)` avec `accepter(maintenant)` ; `ipDuClient(xForwardedFor, adresseSocket)` (dernière entrée, puis adresse de la socket) ; `origineAutorisee(origine, autorisees)` ; `demarrerServeur(options: OptionsServeur): Promise<{ port: number; fermer(): Promise<void> }>` ; message `{ type: "bienvenue", id, couleur, presents, curseurs }` envoyé à l'ouverture de `/direct`.
- Produces:
  - `SONDE_CONNEXIONS_MAX = 100`, `SONDE_CONNEXIONS_PAR_IP = 2`, `SONDE_MESSAGES_PAR_SECONDE = 5`, `SONDE_TAILLE_MAX = 32` (`limites.ts`)
  - `OptionsServeur.sondeParIp?: number`
  - route WebSocket `/sonde` : renvoie chaque message texte tel quel ; 403 (origine), 429 (plafond), 1013 (course), 1003 (binaire), 1008 (trop long, trop de messages)
  - variable d'environnement `SONDE_CONNEXIONS_PAR_IP`

- [ ] **Step 1: Tests** — `apps/realtime/src/sonde.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { demarrerServeur } from "./serveur.js";

const ORIGINE = "http://localhost:3000";
let serveur: Awaited<ReturnType<typeof demarrerServeur>>;

beforeEach(async () => {
  serveur = await demarrerServeur({ origines: [ORIGINE], port: 0, hote: "127.0.0.1", connexionsParIp: 5, intervalleLotMs: 10 });
});
afterEach(async () => {
  await serveur.fermer();
});

type Client = { ws: WebSocket; recus: string[]; fermeture: Promise<number> };

function ouvrir(chemin: "/sonde" | "/direct", { origine = ORIGINE, ip = "10.0.0.1" } = {}): Promise<Client> {
  const ws = new WebSocket(`ws://127.0.0.1:${serveur.port}${chemin}`, {
    headers: { origin: origine, "x-forwarded-for": ip },
  });
  const recus: string[] = [];
  ws.on("message", (d) => recus.push(String(d)));
  const fermeture = new Promise<number>((ok) => ws.once("close", (code) => ok(code)));
  return new Promise((ok, ko) => {
    ws.once("open", () => ok({ ws, recus, fermeture }));
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

const bienvenue = (c: Client) => attendre(() => c.recus.find((m) => m.includes('"bienvenue"')));

describe("sonde des coulisses", () => {
  it("renvoie chaque message tel quel", async () => {
    const s = await ouvrir("/sonde");
    s.ws.send("1234.5");
    expect(await attendre(() => s.recus[0])).toBe("1234.5");
  });

  it("refuse une origine non autorisée", async () => {
    await expect(ouvrir("/sonde", { origine: "https://ailleurs.dev" })).rejects.toThrow("HTTP 403");
  });

  it("refuse la 3e sonde d'une même adresse, pas celle d'une autre", async () => {
    await ouvrir("/sonde", { ip: "1.2.3.4" });
    await ouvrir("/sonde", { ip: "1.2.3.4" });
    await expect(ouvrir("/sonde", { ip: "1.2.3.4" })).rejects.toThrow("HTTP 429");
    await ouvrir("/sonde", { ip: "5.6.7.8" });
  });

  it("une adresse forgée en tête de X-Forwarded-For ne contourne pas la limite", async () => {
    await ouvrir("/sonde", { ip: "6.6.6.1, 1.2.3.4" });
    await ouvrir("/sonde", { ip: "6.6.6.2, 1.2.3.4" });
    await expect(ouvrir("/sonde", { ip: "7.7.7.7, 1.2.3.4" })).rejects.toThrow("HTTP 429");
  });

  it("une sonde saturée n'empêche pas de rejoindre l'accueil", async () => {
    await ouvrir("/sonde", { ip: "1.2.3.4" });
    await ouvrir("/sonde", { ip: "1.2.3.4" });
    const d = await ouvrir("/direct", { ip: "1.2.3.4" });
    expect(await bienvenue(d)).toBeDefined();
  });

  it("ne compte pas dans les présents de l'accueil", async () => {
    const a = await ouvrir("/direct", { ip: "1.1.1.1" });
    await bienvenue(a);
    await ouvrir("/sonde", { ip: "2.2.2.2" });
    const b = await ouvrir("/direct", { ip: "3.3.3.3" });
    expect((JSON.parse(await bienvenue(b)) as { presents: number }).presents).toBe(2);
  });

  it("ferme sur un message de plus de 32 octets", async () => {
    const s = await ouvrir("/sonde");
    s.ws.send("é".repeat(17)); // 34 octets en UTF-8
    expect(await s.fermeture).toBe(1008);
  });

  it("ferme sur un message binaire", async () => {
    const s = await ouvrir("/sonde");
    s.ws.send(Buffer.from([1, 2, 3]));
    expect(await s.fermeture).toBe(1003);
  });

  it("ferme au-delà de 5 messages par seconde", async () => {
    const s = await ouvrir("/sonde");
    for (let i = 0; i < 6; i++) s.ws.send(String(i));
    expect(await s.fermeture).toBe(1008);
  });

  it("le plafond par adresse se règle (tests de bout en bout)", async () => {
    await serveur.fermer();
    serveur = await demarrerServeur({ origines: [ORIGINE], port: 0, hote: "127.0.0.1", sondeParIp: 3 });
    for (let i = 0; i < 3; i++) await ouvrir("/sonde", { ip: "1.2.3.4" });
    await expect(ouvrir("/sonde", { ip: "1.2.3.4" })).rejects.toThrow("HTTP 429");
  });

  it("refuse la 101e sonde, toutes adresses confondues", async () => {
    await serveur.fermer();
    serveur = await demarrerServeur({ origines: [ORIGINE], port: 0, hote: "127.0.0.1", sondeParIp: 1_000 });
    await Promise.all(Array.from({ length: 100 }, () => ouvrir("/sonde")));
    await expect(ouvrir("/sonde")).rejects.toThrow("HTTP 429");
  });

  it("libère sa place à la fermeture", async () => {
    const s1 = await ouvrir("/sonde", { ip: "1.2.3.4" });
    await ouvrir("/sonde", { ip: "1.2.3.4" });
    s1.ws.close();
    await s1.fermeture;
    const fin = Date.now() + 2_000;
    for (;;) {
      try {
        await ouvrir("/sonde", { ip: "1.2.3.4" });
        break;
      } catch (e) {
        if (Date.now() > fin) throw e;
        await new Promise((ok) => setTimeout(ok, 20));
      }
    }
  });
});
```

- [ ] **Step 2: Lancer** — `pnpm --filter realtime test` → FAIL (route `/sonde` absente : `HTTP 404`).

- [ ] **Step 3: Constantes** — à la fin de `apps/realtime/src/limites.ts` :

```ts
/**
 * Plafonds de la sonde des coulisses (spec du sous-projet 5, §4.2) : un
 * `Gardien` à part, pour qu'une sonde saturée ne prive jamais l'accueil de places.
 */
export const SONDE_CONNEXIONS_MAX = 100;
export const SONDE_CONNEXIONS_PAR_IP = 2;
export const SONDE_MESSAGES_PAR_SECONDE = 5;
/** Octets UTF-8 au plus par message (un horodatage en texte). */
export const SONDE_TAILLE_MAX = 32;
```

- [ ] **Step 4: Route** — `apps/realtime/src/serveur.ts` :
  - commentaire de tête : « `/sante` pour les sondes de l'hébergeur, `/direct` pour le WebSocket de l'accueil, `/sonde` pour l'écho de la page des coulisses (hors de la salle). » ;
  - imports : `type Next` depuis `hono` (à côté de `Context`) ; `SONDE_CONNEXIONS_MAX`, `SONDE_CONNEXIONS_PAR_IP`, `SONDE_MESSAGES_PAR_SECONDE`, `SONDE_TAILLE_MAX` depuis `./limites.js` ;
  - `OptionsServeur` : ajouter `sondeParIp?: number;` ;
  - après `const connectes = …` :

```ts
  const gardienSonde = new Gardien(SONDE_CONNEXIONS_MAX, options.sondeParIp ?? SONDE_CONNEXIONS_PAR_IP);
  const sondes = new Set<Connecte>();
```

  - après `const ipDe = …`, un filtre commun aux deux routes, qui remplace le middleware en ligne de `/direct` :

```ts
  // Avant la mise à niveau WebSocket : une réponse ici refuse la connexion avec ce statut.
  const filtrer = (nom: string, g: Gardien) => async (c: Context, next: Next) => {
    if (!origineAutorisee(c.req.header("origin"), options.origines)) {
      console.warn(`[${nom}] Connexion refusée : origine non autorisée.`);
      return c.text("Origine refusée", 403);
    }
    if (!g.peutAdmettre(ipDe(c))) return c.text("Trop de connexions", 429);
    await next();
  };
```

    et `app.get("/direct", filtrer("direct", gardien), upgradeWebSocket(…))` (le corps de `upgradeWebSocket` de `/direct` ne change pas) ;
  - après la route `/direct` :

```ts
  // Écho pour la page des coulisses : mesure l'aller-retour, sans rejoindre la salle.
  app.get(
    "/sonde",
    filtrer("sonde", gardienSonde),
    upgradeWebSocket((c) => {
      const ip = ipDe(c);
      const debit = new Debit(SONDE_MESSAGES_PAR_SECONDE);
      let connecte: Connecte | null = null;
      return {
        onOpen(_evt, ws) {
          if (!gardienSonde.admettre(ip)) {
            ws.close(1013, "Trop de connexions");
            return;
          }
          const nouveau: Connecte = { ws: ws as WSContext<WebSocket>, vivant: true };
          connecte = nouveau;
          sondes.add(nouveau);
          nouveau.ws.raw?.on("pong", () => {
            nouveau.vivant = true;
          });
        },
        onMessage(evt, ws) {
          if (!connecte) return;
          if (typeof evt.data !== "string") {
            ws.close(1003, "Texte seulement");
            return;
          }
          if (Buffer.byteLength(evt.data) > SONDE_TAILLE_MAX) {
            ws.close(1008, "Message trop long");
            return;
          }
          if (!debit.accepter(Date.now())) {
            ws.close(1008, "Trop de messages");
            return;
          }
          ws.send(evt.data);
        },
        onClose() {
          if (!connecte) return;
          gardienSonde.liberer(ip);
          sondes.delete(connecte);
          connecte = null;
        },
      };
    }),
  );
```

  - boucle des pings : `for (const c of [...connectes.values(), ...sondes]) {` (le reste inchangé) ;
  - `fermer()` : après la boucle des `connectes`, `for (const c of sondes) c.ws.close(1001, "Arrêt du service");`.

(Si `evt.data` d'un message binaire arrive en chaîne dans cette version de `@hono/node-server`, le test « message binaire » échoue : lire `node_modules/@hono/node-server` pour le type réel et ajuster le contrôle — le comportement attendu, 1003, ne change pas.)

- [ ] **Step 5: Environnement** — `apps/realtime/src/index.ts`, dans l'appel à `demarrerServeur`, après `connexionsParIp` :

```ts
    // Tests de bout en bout : tous les navigateurs partagent 127.0.0.1.
    sondeParIp: process.env.SONDE_CONNEXIONS_PAR_IP ? Number(process.env.SONDE_CONNEXIONS_PAR_IP) : undefined,
```

- [ ] **Step 6: Lancer** — `pnpm --filter realtime test && pnpm --filter realtime lint && pnpm --filter realtime typecheck && pnpm --filter realtime build` → PASS (les tests de `serveur.test.ts` du sous-projet 4 passent sans changement).

- [ ] **Step 7: Commit**

```bash
git add apps/realtime/src/limites.ts apps/realtime/src/serveur.ts apps/realtime/src/index.ts apps/realtime/src/sonde.test.ts
git commit -m "Coulisses : sonde WebSocket d'écho du service temps réel, hors de la salle de l'accueil"
```

---

### Task 2: Route de mesure du site

**Files:**
- Create: `apps/web/lib/ip.ts`, `apps/web/lib/ip.test.ts`
- Create: `apps/web/lib/coulisses/mesure-serveur.ts`, `apps/web/app/api/coulisses/mesure/route.ts`, `apps/web/app/api/coulisses/mesure/route.test.ts`

**Interfaces:**
- Consumes: `base()`, `baseConfiguree()` (`lib/base/client.ts`), `verifierLimite`, `reinitialiserLimites`, `type LimiteOptions` (`lib/rate-limit.ts`).
- Produces:
  - `ipDeRequete(enTetes: Pick<Headers, "get">): string` — dernière entrée de `X-Forwarded-For`, sinon `"inconnu"` (même règle que `ipDuClient` du service temps réel ; pas de `X-Real-IP`)
  - `limiteMesure(): LimiteOptions` (`{ nom: "mesure", max: 60 ou MESURE_MAX_PAR_IP, dureeMs: 60_000 }`), `DELAI_BASE_MS = 2_000`, `arrondir(ms)`, `chronometrerBase(): Promise<number | null>`
  - `GET /api/coulisses/mesure` → 200 `{ base: number | null, serveur: number }` (`Cache-Control: no-store`), 403 si `Sec-Fetch-Site` présent et différent de `same-origin`, 429 (`Retry-After`)
  - variable d'environnement `MESURE_MAX_PAR_IP` (tests de bout en bout seulement, tâche 15)

Hors périmètre : le formulaire de contact lit encore la **première** entrée de `X-Forwarded-For` (`app/contact/actions.ts`, `cleAppelant`). Ne pas y toucher ici ; c'est signalé à Augustin pour un correctif à part.

Lire avant : le guide des route handlers dans `apps/web/node_modules/next/dist/docs/` (rendu dynamique d'un `GET`, exports autorisés dans `route.ts` : n'y exporter que le handler et, si le guide l'exige, la configuration de segment).

- [ ] **Step 1: Tests** — `apps/web/lib/ip.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { ipDeRequete } from "./ip";

const avec = (enTetes: Record<string, string>) => ipDeRequete(new Headers(enTetes));

describe("ipDeRequete", () => {
  it("prend la dernière entrée de X-Forwarded-For, celle ajoutée par le proxy", () => {
    expect(avec({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" })).toBe("1.2.3.4");
  });
  it("ignore les entrées vides", () => {
    expect(avec({ "x-forwarded-for": "1.2.3.4, " })).toBe("1.2.3.4");
  });
  it("ignore X-Real-IP, que le client peut poser lui-même", () => {
    expect(avec({ "x-real-ip": "1.2.3.4" })).toBe("inconnu");
  });
  it("sans en-tête : un compteur commun, le comportement sûr", () => {
    expect(avec({})).toBe("inconnu");
  });
});
```

et `apps/web/app/api/coulisses/mesure/route.test.ts` :

```ts
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const faux = vi.hoisted(() => ({ configuree: true, requete: vi.fn() }));
vi.mock("@/lib/base/client", () => ({
  baseConfiguree: () => faux.configuree,
  base: () => ({ $queryRaw: faux.requete }),
}));

import { reinitialiserLimites } from "@/lib/rate-limit";
import { GET } from "./route";

const appel = (ip = "10.0.0.1", enTetes: Record<string, string> = { "sec-fetch-site": "same-origin" }) =>
  GET(new Request("http://localhost/api/coulisses/mesure", { headers: { "x-forwarded-for": ip, ...enTetes } }));

beforeEach(() => {
  faux.configuree = true;
  faux.requete.mockReset();
  faux.requete.mockResolvedValue([{ "?column?": 1 }]);
  reinitialiserLimites();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("GET /api/coulisses/mesure", () => {
  it("chronomètre la base et le serveur, sans cache", async () => {
    const r = await appel();
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const corps = (await r.json()) as { base: number; serveur: number };
    expect(corps).toEqual({ base: expect.any(Number), serveur: expect.any(Number) });
    expect(corps.base).toBeGreaterThanOrEqual(0);
    expect(corps.serveur).toBeGreaterThanOrEqual(corps.base);
    expect(faux.requete).toHaveBeenCalledTimes(1);
  });

  it("refuse un appel venu d'un autre site, sans toucher à la base ni au quota", async () => {
    for (const site of ["cross-site", "same-site", "none"]) {
      const r = await appel("1.2.3.4", { "sec-fetch-site": site });
      expect(r.status).toBe(403);
    }
    expect(faux.requete).not.toHaveBeenCalled();
    for (let i = 0; i < 60; i++) expect((await appel("1.2.3.4")).status).toBe(200);
  });

  it("accepte un appel sans Sec-Fetch-Site (client hors navigateur)", async () => {
    expect((await appel("10.0.0.1", {})).status).toBe(200);
  });

  it("sans base configurée : base null, aucune requête", async () => {
    faux.configuree = false;
    const corps = (await (await appel()).json()) as { base: number | null };
    expect(corps.base).toBeNull();
    expect(faux.requete).not.toHaveBeenCalled();
  });

  it("base en échec : 200, base null, aucun détail d'erreur", async () => {
    faux.requete.mockRejectedValue(new Error("connexion refusée par 10.1.2.3:5432"));
    const r = await appel();
    expect(r.status).toBe(200);
    const texte = await r.text();
    expect(texte).not.toContain("10.1.2.3");
    expect(JSON.parse(texte)).toMatchObject({ base: null });
  });

  it("base trop lente : abandon au bout de 2 s", async () => {
    vi.useFakeTimers();
    faux.requete.mockReturnValue(new Promise(() => {}));
    const reponse = appel();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(((await (await reponse).json()) as { base: number | null }).base).toBeNull();
  });

  it("une requête qui échoue après l'abandon ne laisse pas de rejet non géré", async () => {
    vi.useFakeTimers();
    let rejeter!: (e: Error) => void;
    faux.requete.mockReturnValue(new Promise((_ok, ko) => (rejeter = ko)));
    const nonGeres: unknown[] = [];
    const surRejet = (e: unknown) => nonGeres.push(e);
    process.on("unhandledRejection", surRejet);
    try {
      const reponse = appel();
      await vi.advanceTimersByTimeAsync(2_000);
      await reponse;
      vi.useRealTimers();
      rejeter(new Error("trop tard"));
      await new Promise((ok) => setTimeout(ok, 10));
      expect(nonGeres).toEqual([]);
    } finally {
      process.off("unhandledRejection", surRejet);
    }
  });

  it("au-delà de 60 requêtes par minute et par adresse : 429 avec Retry-After", async () => {
    for (let i = 0; i < 60; i++) expect((await appel("1.2.3.4")).status).toBe(200);
    const r = await appel("1.2.3.4");
    expect(r.status).toBe(429);
    expect(Number(r.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await appel("5.6.7.8")).status).toBe(200);
  });

  it("compte l'adresse ajoutée par le proxy, pas une adresse forgée en tête", async () => {
    for (let i = 0; i < 60; i++) await appel(`6.6.6.${i}, 1.2.3.4`);
    expect((await appel("7.7.7.7, 1.2.3.4")).status).toBe(429);
  });

  it("le plafond se règle par MESURE_MAX_PAR_IP (tests de bout en bout)", async () => {
    vi.stubEnv("MESURE_MAX_PAR_IP", "3");
    for (let i = 0; i < 3; i++) expect((await appel("1.2.3.4")).status).toBe(200);
    expect((await appel("1.2.3.4")).status).toBe(429);
  });
});
```

- [ ] **Step 2: Lancer** — `pnpm --filter web exec vitest run lib/ip.test.ts app/api/coulisses` → FAIL (modules absents).

- [ ] **Step 3: `apps/web/lib/ip.ts`**

```ts
/**
 * Adresse du client derrière le proxy de Coolify (Traefik), qui l'ajoute en
 * **dernier** dans `X-Forwarded-For` : les entrées précédentes, comme
 * `X-Real-IP`, peuvent venir du client et être forgées. Même règle que
 * `ipDuClient` du service temps réel. Sans en-tête exploitable, tous les
 * appels partagent le même compteur : le plafond s'applique alors
 * globalement, ce qui reste le comportement sûr.
 */
export function ipDeRequete(enTetes: Pick<Headers, "get">): string {
  const derniere = enTetes
    .get("x-forwarded-for")
    ?.split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .at(-1);
  return derniere || "inconnu";
}
```

- [ ] **Step 4: `apps/web/lib/coulisses/mesure-serveur.ts`**

```ts
/** Mesure côté serveur pour la page des coulisses (spec du sous-projet 5, §4.1). */
import { base, baseConfiguree } from "@/lib/base/client";
import type { LimiteOptions } from "@/lib/rate-limit";

/**
 * La page mesure toutes les 2 s (30 par minute) : le double laisse de la marge.
 * `MESURE_MAX_PAR_IP` ne sert qu'aux tests de bout en bout, où tous les
 * navigateurs partagent 127.0.0.1.
 */
export const limiteMesure = (): LimiteOptions => ({
  nom: "mesure",
  max: Number(process.env.MESURE_MAX_PAR_IP) || 60,
  dureeMs: 60_000,
});
export const DELAI_BASE_MS = 2_000;

export const arrondir = (ms: number) => Math.round(ms * 10) / 10;

/**
 * Durée d'un `SELECT 1`, ou `null` sans base, sur échec ou au-delà de 2 s.
 * La requête abandonnée continue : son échec éventuel est absorbé, pour ne
 * jamais laisser de rejet non géré.
 */
export async function chronometrerBase(): Promise<number | null> {
  if (!baseConfiguree()) return null;
  const debut = performance.now();
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  const abandon = new Promise<false>((ok) => {
    minuterie = setTimeout(() => ok(false), DELAI_BASE_MS);
  });
  try {
    const requete = base().$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    );
    const reussie = await Promise.race([requete, abandon]);
    return reussie ? arrondir(performance.now() - debut) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(minuterie);
  }
}
```

(`LimiteOptions` est le type exporté par `lib/rate-limit.ts` ; s'il ne l'est pas, l'exporter.)

- [ ] **Step 5: `apps/web/app/api/coulisses/mesure/route.ts`**

```ts
/**
 * Mesure des coulisses : temps d'un `SELECT 1` et temps passé dans la route.
 * Le navigateur en déduit l'aller-retour. Jamais de détail d'erreur, de version
 * ni de nom d'hôte ; rien n'est stocké.
 *
 * Un `GET` simple part sans contrôle CORS : une page d'un autre site pourrait
 * épuiser le quota d'un visiteur et charger la base. Les navigateurs envoient
 * `Sec-Fetch-Site` ; tout autre valeur que `same-origin` est refusée. Sans cet
 * en-tête (client hors navigateur), il n'y a pas de visiteur à protéger : la
 * limite par adresse suffit.
 */
import { ipDeRequete } from "@/lib/ip";
import { arrondir, chronometrerBase, limiteMesure } from "@/lib/coulisses/mesure-serveur";
import { verifierLimite } from "@/lib/rate-limit";

const SANS_CACHE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const debut = performance.now();
  const site = request.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin") return new Response(null, { status: 403, headers: SANS_CACHE });
  const limite = verifierLimite(ipDeRequete(request.headers), limiteMesure());
  if (!limite.autorise) {
    return new Response(null, {
      status: 429,
      headers: { ...SANS_CACHE, "Retry-After": String(limite.secondesAvantReessai) },
    });
  }
  const baseMs = await chronometrerBase();
  return Response.json({ base: baseMs, serveur: arrondir(performance.now() - debut) }, { headers: SANS_CACHE });
}
```

- [ ] **Step 6: Lancer** — `pnpm --filter web exec vitest run lib/ip.test.ts app/api/coulisses` → PASS ; `pnpm --filter web lint && pnpm --filter web typecheck` → PASS.

- [ ] **Step 7: Route dynamique** — `pnpm build` → la sortie liste `ƒ /api/coulisses/mesure`. Si elle est marquée `○` (figée au build), ajouter dans `route.ts` l'export de configuration de segment que prescrit le guide Next pour la rendre dynamique, relancer le build, et le signaler.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/ip.ts apps/web/lib/ip.test.ts apps/web/lib/coulisses/mesure-serveur.ts apps/web/app/api/coulisses/mesure/route.ts apps/web/app/api/coulisses/mesure/route.test.ts
git commit -m "Coulisses : route de mesure (base et serveur), limitée par adresse et réservée au site"
```

(Ajouter `apps/web/lib/rate-limit.ts` s'il a fallu exporter `LimiteOptions`.)

---

### Task 3: Magasin des mesures et doublures de test

**Files:**
- Create: `apps/web/lib/coulisses/outils-test.ts`
- Create: `apps/web/lib/coulisses/magasin.ts`, `apps/web/lib/coulisses/magasin.test.ts`

**Interfaces:**
- Consumes: `type Horloge` de `lib/direct/connexion.ts` (sous-projet 4 ; import **de type seulement**, voir Global Constraints).
- Produces:
  - `magasin.ts` : `SERIES = ["site", "base", "tempsReel"] as const`, `type Serie`, `HISTORIQUE = 30`, `ECHECS_AVANT_INDISPONIBLE = 3`, `type EtatSerie = { valeurs: number[]; mediane: number | null; disponible: boolean; echecs: number }`, `type EtatMesures = Record<Serie, EtatSerie>`, `mediane(valeurs): number | null`, `derniere(s: EtatSerie): number | null`, `class MagasinMesures { etat(); abonner(fn); ajouter(serie, ms); echec(serie); indisponible(serie) }`
  - `outils-test.ts` (tests seulement) : `class FausseSocket` (`instances`, `envoyes`, `fermee`, `accepter()`, `recevoir(d)`, `perdre()`), `horlogeFactice()` (`Horloge` plus `avancer(ms)`, `enAttente()`, `delais()`), `viderPromesses()` ; la tâche 10 y ajoute `INFOS_EXEMPLE`

- [ ] **Step 1: Outils de test** — `apps/web/lib/coulisses/outils-test.ts` :

```ts
/** Doublures partagées par les tests des coulisses (jamais importées par le site). */
import type { Horloge } from "@/lib/direct/connexion";

export class FausseSocket {
  static instances: FausseSocket[] = [];
  readyState = 0;
  envoyes: string[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  fermee = false;
  constructor(readonly url: string) {
    FausseSocket.instances.push(this);
  }
  send(d: string) {
    this.envoyes.push(d);
  }
  close() {
    this.fermee = true;
    this.readyState = 3;
  }
  /** Le serveur accepte la connexion. */
  accepter() {
    this.readyState = 1;
    this.onopen?.();
  }
  recevoir(donnees: unknown) {
    this.onmessage?.({ data: donnees });
  }
  /** La connexion tombe côté réseau. */
  perdre() {
    this.readyState = 3;
    this.onclose?.();
  }
}

export function horlogeFactice() {
  let t = 0;
  let suivant = 1;
  const taches = new Map<number, { fn: () => void; quand: number }>();
  const horloge: Horloge & { avancer(ms: number): void; enAttente(): number; delais(): number[] } = {
    maintenant: () => t,
    programmer(fn, ms) {
      const id = suivant++;
      taches.set(id, { fn, quand: t + ms });
      return id;
    },
    annuler(id) {
      taches.delete(id as number);
    },
    /** Avance le temps en exécutant, dans l'ordre, les tâches échues. */
    avancer(ms) {
      const fin = t + ms;
      for (;;) {
        const prochaine = [...taches.entries()].filter(([, x]) => x.quand <= fin).sort((a, b) => a[1].quand - b[1].quand)[0];
        if (!prochaine) break;
        taches.delete(prochaine[0]);
        t = prochaine[1].quand;
        prochaine[1].fn();
      }
      t = fin;
    },
    enAttente: () => taches.size,
    /** Délais restants des tâches programmées. */
    delais: () => [...taches.values()].map((x) => x.quand - t),
  };
  return horloge;
}

/** Laisse s'exécuter les promesses en attente. */
export const viderPromesses = () => new Promise<void>((ok) => setTimeout(ok, 0));
```

- [ ] **Step 2: Tests du magasin** — `apps/web/lib/coulisses/magasin.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import { derniere, HISTORIQUE, MagasinMesures, mediane } from "./magasin";

describe("mediane", () => {
  it("vide : null", () => expect(mediane([])).toBeNull());
  it("nombre impair de valeurs : celle du milieu", () => expect(mediane([30, 10, 20])).toBe(20));
  it("nombre pair : moyenne des deux du milieu, arrondie au dixième", () => expect(mediane([10, 11, 40, 2])).toBe(10.5));
});

describe("MagasinMesures", () => {
  it("part de séries vides et disponibles", () => {
    const m = new MagasinMesures();
    expect(m.etat().site).toEqual({ valeurs: [], mediane: null, disponible: true, echecs: 0 });
  });

  it("garde les 30 dernières valeurs et leur médiane", () => {
    const m = new MagasinMesures();
    for (let i = 1; i <= 35; i++) m.ajouter("site", i);
    const s = m.etat().site;
    expect(s.valeurs).toHaveLength(HISTORIQUE);
    expect(s.valeurs[0]).toBe(6);
    expect(derniere(s)).toBe(35);
    expect(s.mediane).toBe(20.5);
  });

  it("indisponible après 3 échecs de suite, de retour à la première réussite", () => {
    const m = new MagasinMesures();
    m.ajouter("base", 3);
    m.echec("base");
    m.echec("base");
    expect(m.etat().base.disponible).toBe(true);
    m.echec("base");
    expect(m.etat().base.disponible).toBe(false);
    m.echec("base");
    expect(m.etat().base.disponible).toBe(false);
    m.ajouter("base", 4);
    expect(m.etat().base).toMatchObject({ disponible: true, echecs: 0, valeurs: [3, 4] });
  });

  it("indisponible d'emblée quand le service manque", () => {
    const m = new MagasinMesures();
    m.indisponible("tempsReel");
    expect(m.etat().tempsReel.disponible).toBe(false);
    expect(m.etat().site.disponible).toBe(true);
  });

  it("prévient ses abonnés et change d'objet à chaque changement seulement", () => {
    const m = new MagasinMesures();
    const fn = vi.fn();
    const desabonner = m.abonner(fn);
    const avant = m.etat();
    expect(m.etat()).toBe(avant);
    m.ajouter("site", 12);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(m.etat()).not.toBe(avant);
    desabonner();
    m.ajouter("site", 13);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Lancer** — `pnpm --filter web exec vitest run lib/coulisses/magasin.test.ts` → FAIL (module absent).

- [ ] **Step 4: `apps/web/lib/coulisses/magasin.ts`**

```ts
/**
 * Mesures en direct des coulisses : les 30 dernières valeurs de chaque série,
 * lues par `useSyncExternalStore` (un nouvel objet à chaque changement, le
 * même entre deux).
 */
export const SERIES = ["site", "base", "tempsReel"] as const;
export type Serie = (typeof SERIES)[number];
export const HISTORIQUE = 30;
export const ECHECS_AVANT_INDISPONIBLE = 3;

export type EtatSerie = { valeurs: number[]; mediane: number | null; disponible: boolean; echecs: number };
export type EtatMesures = Record<Serie, EtatSerie>;

const SERIE_VIDE: EtatSerie = { valeurs: [], mediane: null, disponible: true, echecs: 0 };
const ETAT_INITIAL: EtatMesures = { site: SERIE_VIDE, base: SERIE_VIDE, tempsReel: SERIE_VIDE };

const arrondir = (ms: number) => Math.round(ms * 10) / 10;

export function mediane(valeurs: readonly number[]): number | null {
  if (valeurs.length === 0) return null;
  const triees = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(triees.length / 2);
  return arrondir(triees.length % 2 ? triees[milieu]! : (triees[milieu - 1]! + triees[milieu]!) / 2);
}

export const derniere = (s: EtatSerie): number | null => s.valeurs.at(-1) ?? null;

export class MagasinMesures {
  private courant: EtatMesures = ETAT_INITIAL;
  private readonly abonnes = new Set<() => void>();

  etat = (): EtatMesures => this.courant;

  abonner = (fn: () => void): (() => void) => {
    this.abonnes.add(fn);
    return () => {
      this.abonnes.delete(fn);
    };
  };

  ajouter(serie: Serie, ms: number): void {
    const valeurs = [...this.courant[serie].valeurs, arrondir(ms)].slice(-HISTORIQUE);
    this.publier(serie, { valeurs, mediane: mediane(valeurs), disponible: true, echecs: 0 });
  }

  /** Une série indisponible le reste jusqu'à sa prochaine réussite. */
  echec(serie: Serie): void {
    const s = this.courant[serie];
    const echecs = s.echecs + 1;
    this.publier(serie, { ...s, echecs, disponible: s.disponible && echecs < ECHECS_AVANT_INDISPONIBLE });
  }

  /** Service absent (pas d'adresse au build) : indisponible d'emblée. */
  indisponible(serie: Serie): void {
    this.publier(serie, { ...this.courant[serie], disponible: false });
  }

  private publier(serie: Serie, e: EtatSerie): void {
    this.courant = { ...this.courant, [serie]: e };
    for (const fn of this.abonnes) fn();
  }
}
```

- [ ] **Step 5: Lancer** — `pnpm --filter web exec vitest run lib/coulisses` → PASS ; `pnpm --filter web lint && pnpm --filter web typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/coulisses/outils-test.ts apps/web/lib/coulisses/magasin.ts apps/web/lib/coulisses/magasin.test.ts
git commit -m "Coulisses : magasin des mesures en direct (30 valeurs, médiane, indisponibilité)"
```

---

### Task 4: Sonde d'écho côté navigateur

**Files:**
- Create: `apps/web/lib/coulisses/sonde.ts`, `apps/web/lib/coulisses/sonde.test.ts`

**Interfaces:**
- Consumes: `type Horloge` (sous-projet 4, import de type) ; `FausseSocket`, `horlogeFactice` (t3).
- Produces: `DELAI_ECHO_MAX_MS = 5_000`, `type ResultatEcho = number | null | "attente"`, `class SondeTempsReel { constructor(url, creerSocket?, horloge?, aleatoire?, chrono?); ouvrir(); mesurer(): Promise<ResultatEcho>; surVisibilite(visible); arreter() }` — « attente » pendant l'ouverture de la connexion (ni valeur ni échec), `null` sans connexion ou sans écho en 5 s.

- [ ] **Step 1: Tests** — `apps/web/lib/coulisses/sonde.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { FausseSocket, horlogeFactice } from "./outils-test";
import { DELAI_ECHO_MAX_MS, SondeTempsReel } from "./sonde";

let horloge: ReturnType<typeof horlogeFactice>;

function nouvelle(aleatoire = () => 0.5) {
  return new SondeTempsReel(
    "wss://direct.exemple.dev/sonde",
    (u) => new FausseSocket(u) as unknown as WebSocket,
    horloge,
    aleatoire,
    () => horloge.maintenant(),
  );
}
const derniere = () => FausseSocket.instances.at(-1)!;

beforeEach(() => {
  FausseSocket.instances = [];
  horloge = horlogeFactice();
});

describe("SondeTempsReel", () => {
  it("mesure l'aller-retour d'un écho", async () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().accepter();
    horloge.avancer(100);
    const mesure = s.mesurer();
    expect(derniere().envoyes).toEqual(["100.0"]);
    horloge.avancer(12);
    derniere().recevoir("100.0");
    expect(await mesure).toBe(12);
  });

  it("ignore un écho qui ne correspond pas à la mesure en cours", async () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().accepter();
    const mesure = s.mesurer();
    derniere().recevoir("autre");
    horloge.avancer(5);
    derniere().recevoir("0.0");
    expect(await mesure).toBe(5);
  });

  it("pendant une ouverture lente (plus de 2 s) : « attente », rien envoyé", async () => {
    const s = nouvelle();
    s.ouvrir();
    horloge.avancer(2_500);
    expect(await s.mesurer()).toBe("attente");
    expect(derniere().envoyes).toEqual([]);
    derniere().accepter();
    const mesure = s.mesurer();
    horloge.avancer(9);
    derniere().recevoir("2500.0");
    expect(await mesure).toBe(9);
  });

  it("connexion refusée ou perdue, en attente de reconnexion : null", async () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().perdre();
    expect(await s.mesurer()).toBeNull();
  });

  it("sans écho en 5 s : null", async () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().accepter();
    const mesure = s.mesurer();
    horloge.avancer(DELAI_ECHO_MAX_MS);
    expect(await mesure).toBeNull();
  });

  it("une nouvelle mesure abandonne la précédente encore en vol", async () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().accepter();
    const premiere = s.mesurer();
    horloge.avancer(1);
    const seconde = s.mesurer();
    expect(await premiere).toBeNull();
    horloge.avancer(3);
    derniere().recevoir("1.0");
    expect(await seconde).toBe(3);
  });

  it("connexion perdue pendant une mesure : null, puis reconnexion après 1 s environ", async () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().accepter();
    const mesure = s.mesurer();
    derniere().perdre();
    expect(await mesure).toBeNull();
    expect(FausseSocket.instances).toHaveLength(1);
    horloge.avancer(999);
    expect(FausseSocket.instances).toHaveLength(1);
    horloge.avancer(1);
    expect(FausseSocket.instances).toHaveLength(2);
  });

  it("délais de reconnexion croissants, variés de ±20 %, plafonnés à 30 s", () => {
    const s = nouvelle(() => 0);
    s.ouvrir();
    const delais: number[] = [];
    for (let i = 0; i < 7; i++) {
      derniere().perdre();
      delais.push(horloge.delais()[0]!);
      horloge.avancer(delais.at(-1)!);
    }
    expect(delais).toEqual([800, 1_600, 3_200, 6_400, 12_800, 24_000, 24_000]);
  });

  it("onglet caché 30 s : fermée, sans reconnexion ; au retour : rouverte", () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().accepter();
    s.surVisibilite(false);
    horloge.avancer(30_000);
    expect(derniere().fermee).toBe(true);
    expect(horloge.enAttente()).toBe(0);
    s.surVisibilite(true);
    expect(FausseSocket.instances).toHaveLength(2);
  });

  it("arrêtée : fermée, plus aucune reconnexion", () => {
    const s = nouvelle();
    s.ouvrir();
    derniere().accepter();
    s.arreter();
    expect(derniere().fermee).toBe(true);
    expect(horloge.enAttente()).toBe(0);
  });
});
```

- [ ] **Step 2: Lancer** — `pnpm --filter web exec vitest run lib/coulisses/sonde.test.ts` → FAIL (module absent).

- [ ] **Step 3: `apps/web/lib/coulisses/sonde.ts`**

```ts
/**
 * Sonde des coulisses : WebSocket d'écho vers `/sonde` du service temps réel,
 * qui mesure l'aller-retour sans rejoindre la salle de l'accueil. Une mesure à
 * la fois : l'horodatage envoyé revient tel quel. Pendant l'ouverture de la
 * connexion, `mesurer()` rend « attente » (ni valeur ni échec) : une poignée de
 * main lente ne doit pas faire passer la mesure en « indisponible ».
 *
 * Délais de reconnexion et fermeture d'onglet caché : mêmes valeurs que
 * lib/direct/connexion.ts, recopiées sans importer ce module (son morceau de JS
 * est mesuré à part par verifier-taille-direct).
 */
import type { Horloge } from "@/lib/direct/connexion";

const DELAIS_RECONNEXION_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];
const FERMETURE_ONGLET_CACHE_MS = 30_000;
const VARIATION = 0.2;
const EN_OUVERTURE = 0;
const OUVERTE = 1;
export const DELAI_ECHO_MAX_MS = 5_000;

/** Aller-retour en ms ; `null` : échec ; « attente » : connexion en cours d'ouverture. */
export type ResultatEcho = number | null | "attente";

const horlogeNavigateur: Horloge = {
  maintenant: () => Date.now(),
  programmer: (fn, ms) => window.setTimeout(fn, ms),
  annuler: (id) => window.clearTimeout(id as number),
};

type MesureEnCours = { attendu: string; debut: number; minuterie: unknown; resoudre(ms: number | null): void };

export class SondeTempsReel {
  private socket: WebSocket | null = null;
  private essais = 0;
  private cache = false;
  private arretee = false;
  private reconnexion: unknown = null;
  private fermetureCache: unknown = null;
  private enCours: MesureEnCours | null = null;

  constructor(
    private readonly url: string,
    private readonly creerSocket: (url: string) => WebSocket = (u) => new WebSocket(u),
    private readonly horloge: Horloge = horlogeNavigateur,
    private readonly aleatoire: () => number = Math.random,
    private readonly chrono: () => number = () => performance.now(),
  ) {}

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
    socket.onmessage = (e) => this.surEcho(e.data);
    socket.onerror = () => {};
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.terminer(null);
      this.planifierReconnexion();
    };
  }

  /**
   * Aller-retour en ms (au dixième) ; « attente » pendant l'ouverture ; `null` :
   * pas de connexion (refusée, perdue, en attente de reconnexion), pas d'écho en 5 s.
   */
  mesurer(): Promise<ResultatEcho> {
    this.terminer(null);
    const socket = this.socket;
    if (socket?.readyState === EN_OUVERTURE) return Promise.resolve("attente");
    if (!socket || socket.readyState !== OUVERTE) return Promise.resolve(null);
    const debut = this.chrono();
    const attendu = debut.toFixed(1);
    return new Promise((resoudre) => {
      const minuterie = this.horloge.programmer(() => this.terminer(null), DELAI_ECHO_MAX_MS);
      this.enCours = { attendu, debut, minuterie, resoudre };
      socket.send(attendu);
    });
  }

  surVisibilite(visible: boolean): void {
    if (visible) {
      this.cache = false;
      this.annuler("fermetureCache");
      this.ouvrir();
      return;
    }
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
    this.fermerSocket();
  }

  private surEcho(donnees: unknown): void {
    const e = this.enCours;
    if (!e || donnees !== e.attendu) return;
    this.terminer(this.chrono() - e.debut);
  }

  private terminer(ms: number | null): void {
    const e = this.enCours;
    if (!e) return;
    this.enCours = null;
    this.horloge.annuler(e.minuterie);
    e.resoudre(ms === null ? null : Math.round(ms * 10) / 10);
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
    this.terminer(null);
    if (!socket) return;
    socket.onclose = null;
    socket.close(1000);
  }

  private annuler(minuterie: "reconnexion" | "fermetureCache"): void {
    if (this[minuterie] === null) return;
    this.horloge.annuler(this[minuterie]);
    this[minuterie] = null;
  }
}
```

- [ ] **Step 4: Lancer** — `pnpm --filter web exec vitest run lib/coulisses` → PASS ; `pnpm --filter web lint && pnpm --filter web typecheck` → PASS ; `grep -rn "@/lib/direct/connexion" apps/web/lib/coulisses` → uniquement des `import type`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/coulisses/sonde.ts apps/web/lib/coulisses/sonde.test.ts
git commit -m "Coulisses : sonde d'écho WebSocket côté navigateur (attente pendant l'ouverture, reconnexion, onglet caché)"
```

---

### Task 5: Aller-retour HTTP et releveur des mesures

**Files:**
- Create: `apps/web/lib/coulisses/http.ts`, `http.test.ts`
- Create: `apps/web/lib/coulisses/releveur.ts`, `releveur.test.ts`

**Interfaces:**
- Consumes: `MagasinMesures` (t3), `type ResultatEcho` (t4), `horlogeFactice`, `viderPromesses` (t3) ; route `GET /api/coulisses/mesure` (t2).
- Produces:
  - `http.ts` : `CHEMIN_MESURE = "/api/coulisses/mesure"`, `DELAI_HTTP_MAX_MS = 5_000`, `type ResultatHttp = { ok: true; ms: number; base: number | null } | { ok: false; reessaiMs?: number }`, `mesurerHttp(signal?: AbortSignal, faire?: typeof fetch, chrono?: () => number): Promise<ResultatHttp>`
  - `releveur.ts` : `INTERVALLE_MS = 2_000`, `DELAIS_ECHEC_MS = [2_000, 4_000, 8_000, 10_000]`, `type SondeMesurable`, `class Releveur { constructor(magasin, http: (signal: AbortSignal) => Promise<ResultatHttp>, sonde: SondeMesurable | null, horloge?, visible?: () => boolean); demarrer(); surVisibilite(visible); arreter() }` — `visible` lit `document.visibilityState` par défaut.

- [ ] **Step 1: Tests de la mesure HTTP** — `apps/web/lib/coulisses/http.test.ts` :

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { CHEMIN_MESURE, DELAI_HTTP_MAX_MS, mesurerHttp } from "./http";

const reponse = (corps: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(corps), init);

afterEach(() => {
  vi.useRealTimers();
});

describe("mesurerHttp", () => {
  it("mesure l'aller-retour jusqu'aux en-têtes et rapporte le temps de la base", async () => {
    let t = 100;
    const faire = vi.fn(async () => {
      t = 142.25;
      return reponse({ base: 1.2, serveur: 3 });
    });
    const r = await mesurerHttp(undefined, faire as unknown as typeof fetch, () => t);
    expect(r).toEqual({ ok: true, ms: 42.3, base: 1.2 });
    expect(faire).toHaveBeenCalledWith(CHEMIN_MESURE, expect.objectContaining({ cache: "no-store" }));
  });

  it("base absente ou invalide : base null", async () => {
    const faire = async () => reponse({ base: "?", serveur: 3 });
    expect(await mesurerHttp(undefined, faire as unknown as typeof fetch)).toMatchObject({ ok: true, base: null });
  });

  it("429 : échec avec le délai demandé par Retry-After", async () => {
    const faire = async () => new Response(null, { status: 429, headers: { "Retry-After": "30" } });
    expect(await mesurerHttp(undefined, faire as unknown as typeof fetch)).toEqual({ ok: false, reessaiMs: 30_000 });
  });

  it("erreur serveur ou réseau : échec", async () => {
    expect(await mesurerHttp(undefined, (async () => new Response(null, { status: 500 })) as unknown as typeof fetch)).toEqual({ ok: false });
    expect(await mesurerHttp(undefined, (async () => Promise.reject(new TypeError("réseau"))) as unknown as typeof fetch)).toEqual({ ok: false });
  });

  it("sans réponse en 5 s : la requête est abandonnée, échec", async () => {
    vi.useFakeTimers();
    const faire = (_url: string, init: RequestInit) =>
      new Promise<Response>((_ok, ko) => init.signal!.addEventListener("abort", () => ko(new DOMException("abandon", "AbortError"))));
    const r = mesurerHttp(undefined, faire as unknown as typeof fetch);
    await vi.advanceTimersByTimeAsync(DELAI_HTTP_MAX_MS);
    expect(await r).toEqual({ ok: false });
  });
});
```

- [ ] **Step 2: Tests du releveur** — `apps/web/lib/coulisses/releveur.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { ResultatHttp } from "./http";
import { MagasinMesures } from "./magasin";
import { horlogeFactice, viderPromesses } from "./outils-test";
import { INTERVALLE_MS, Releveur, type SondeMesurable } from "./releveur";
import type { ResultatEcho } from "./sonde";

let horloge: ReturnType<typeof horlogeFactice>;
let magasin: MagasinMesures;
let reponses: ResultatHttp[];
let http: Mock<(signal: AbortSignal) => Promise<ResultatHttp>>;

const ok = (ms: number, base: number | null = 1): ResultatHttp => ({ ok: true, ms, base });
const echec: ResultatHttp = { ok: false };

function fausseSonde(valeurs: ResultatEcho[] = []) {
  const sonde = {
    ouvrir: vi.fn(),
    mesurer: vi.fn(async (): Promise<ResultatEcho> => (valeurs.length > 0 ? valeurs.shift()! : null)),
    surVisibilite: vi.fn(),
    arreter: vi.fn(),
  };
  return sonde satisfies SondeMesurable;
}

const nouveau = (sonde: SondeMesurable | null = null, visible = () => true) =>
  new Releveur(magasin, http, sonde, horloge, visible);

/** Avance l'horloge puis laisse les mesures en vol se terminer. */
async function avancer(ms: number) {
  horloge.avancer(ms);
  await viderPromesses();
}

beforeEach(() => {
  horloge = horlogeFactice();
  magasin = new MagasinMesures();
  reponses = [];
  http = vi.fn(async () => reponses.shift() ?? echec);
});

describe("Releveur", () => {
  it("la première mesure HTTP est un rodage, non affichée ; la suivante part 2 s après", async () => {
    reponses.push(ok(80, 9), ok(20, 2));
    nouveau().demarrer();
    await viderPromesses();
    expect(magasin.etat().site.valeurs).toEqual([]);
    expect(magasin.etat().base.valeurs).toEqual([]);
    await avancer(INTERVALLE_MS);
    expect(magasin.etat().site.valeurs).toEqual([20]);
    expect(magasin.etat().base.valeurs).toEqual([2]);
  });

  it("base null : échec de la base seulement", async () => {
    reponses.push(ok(10), ok(20, null));
    nouveau().demarrer();
    await viderPromesses();
    await avancer(INTERVALLE_MS);
    expect(magasin.etat().site.valeurs).toEqual([20]);
    expect(magasin.etat().base.echecs).toBe(1);
  });

  it("sans sonde : temps réel indisponible d'emblée", () => {
    nouveau().demarrer();
    expect(magasin.etat().tempsReel.disponible).toBe(false);
  });

  it("avec la sonde : l'ouvre puis mesure toutes les 2 s", async () => {
    const sonde = fausseSonde([7, 8]);
    nouveau(sonde).demarrer();
    expect(sonde.ouvrir).toHaveBeenCalled();
    await avancer(INTERVALLE_MS);
    await avancer(INTERVALLE_MS);
    expect(magasin.etat().tempsReel.valeurs).toEqual([7, 8]);
  });

  it("sonde en cours d'ouverture : ni valeur ni échec, nouvel essai 2 s après", async () => {
    const sonde = fausseSonde(["attente", "attente", "attente", "attente", 6]);
    nouveau(sonde).demarrer();
    for (let i = 0; i < 5; i++) await avancer(INTERVALLE_MS);
    expect(magasin.etat().tempsReel).toMatchObject({ disponible: true, echecs: 0, valeurs: [6] });
  });

  it("échecs HTTP : indisponible au 3e, essais espacés de 2, 4, 8 puis 10 s", async () => {
    nouveau().demarrer();
    await viderPromesses();
    const delais: number[] = [];
    for (let i = 0; i < 5; i++) {
      delais.push(horloge.delais()[0]!);
      await avancer(delais.at(-1)!);
    }
    expect(delais).toEqual([2_000, 4_000, 8_000, 10_000, 10_000]);
    expect(magasin.etat().site.disponible).toBe(false);
    expect(magasin.etat().base.disponible).toBe(false);
  });

  it("429 : attend au moins le délai demandé", async () => {
    reponses.push({ ok: false, reessaiMs: 30_000 });
    nouveau().demarrer();
    await viderPromesses();
    expect(horloge.delais()).toEqual([30_000]);
  });

  it("onglet caché dès le démarrage : rien ne part avant le retour sur l'onglet", async () => {
    const sonde = fausseSonde();
    let visible = false;
    const r = nouveau(sonde, () => visible);
    r.demarrer();
    await avancer(10_000);
    expect(http).not.toHaveBeenCalled();
    expect(sonde.ouvrir).not.toHaveBeenCalled();
    visible = true;
    r.surVisibilite(true);
    expect(sonde.surVisibilite).toHaveBeenCalledWith(true);
    expect(http).toHaveBeenCalledTimes(1);
  });

  it("onglet caché pendant une mesure en vol : requête annulée, résultat ignoré, plus rien de programmé", async () => {
    let terminer!: (r: ResultatHttp) => void;
    let signal!: AbortSignal;
    http.mockImplementationOnce((s) => {
      signal = s;
      return new Promise((ok) => (terminer = ok));
    });
    const sonde = fausseSonde();
    const r = nouveau(sonde);
    r.demarrer();
    r.surVisibilite(false);
    expect(signal.aborted).toBe(true);
    expect(sonde.surVisibilite).toHaveBeenCalledWith(false);
    terminer(ok(50));
    await viderPromesses();
    expect(horloge.enAttente()).toBe(0);
    expect(http).toHaveBeenCalledTimes(1);
    r.surVisibilite(true);
    expect(sonde.surVisibilite).toHaveBeenCalledWith(true);
    expect(http).toHaveBeenCalledTimes(2);
    expect(http.mock.calls[1]![0].aborted).toBe(false);
  });

  it("arrêté : la sonde est arrêtée, plus rien de programmé", async () => {
    const sonde = fausseSonde();
    const r = nouveau(sonde);
    r.demarrer();
    await viderPromesses();
    r.arreter();
    expect(sonde.arreter).toHaveBeenCalled();
    expect(horloge.enAttente()).toBe(0);
  });
});
```

- [ ] **Step 3: Lancer** — `pnpm --filter web exec vitest run lib/coulisses/http.test.ts lib/coulisses/releveur.test.ts` → FAIL (modules absents).

- [ ] **Step 4: `apps/web/lib/coulisses/http.ts`**

```ts
/** Aller-retour HTTP vers la route de mesure des coulisses (spec du sous-projet 5, §4.3). */
export const CHEMIN_MESURE = "/api/coulisses/mesure";
export const DELAI_HTTP_MAX_MS = 5_000;

export type ResultatHttp = { ok: true; ms: number; base: number | null } | { ok: false; reessaiMs?: number };

/**
 * `signal` : abandon décidé par l'appelant (onglet caché) ; la requête est aussi
 * abandonnée au bout de 5 s.
 */
export async function mesurerHttp(
  signal?: AbortSignal,
  faire: typeof fetch = fetch,
  chrono: () => number = () => performance.now(),
): Promise<ResultatHttp> {
  const controle = new AbortController();
  const minuterie = setTimeout(() => controle.abort(), DELAI_HTTP_MAX_MS);
  const abandonner = () => controle.abort();
  if (signal?.aborted) controle.abort();
  signal?.addEventListener("abort", abandonner, { once: true });
  try {
    const debut = chrono();
    const r = await faire(CHEMIN_MESURE, { cache: "no-store", signal: controle.signal });
    const ms = Math.round((chrono() - debut) * 10) / 10;
    if (r.status === 429) {
      const secondes = Number(r.headers.get("retry-after"));
      return secondes > 0 ? { ok: false, reessaiMs: secondes * 1_000 } : { ok: false };
    }
    if (!r.ok) return { ok: false };
    const corps: unknown = await r.json();
    const base =
      typeof corps === "object" && corps !== null && "base" in corps && typeof corps.base === "number" ? corps.base : null;
    return { ok: true, ms, base };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(minuterie);
    signal?.removeEventListener("abort", abandonner);
  }
}
```

- [ ] **Step 5: `apps/web/lib/coulisses/releveur.ts`**

```ts
/**
 * Relève les mesures des coulisses toutes les 2 s, onglet visible seulement :
 * l'aller-retour HTTP (qui rapporte aussi la base) et l'écho de la sonde, chacun
 * dans sa boucle. Un échec espace les essais (2, 4, 8 puis 10 s, ou le
 * `Retry-After` du serveur s'il est plus long). Onglet caché, y compris dès le
 * démarrage : rien ne part, la requête en vol est abandonnée et un résultat
 * arrivé après coup est ignoré (numéro de génération).
 */
import type { Horloge } from "@/lib/direct/connexion";
import type { ResultatHttp } from "./http";
import type { MagasinMesures } from "./magasin";
import type { ResultatEcho } from "./sonde";

export const INTERVALLE_MS = 2_000;
export const DELAIS_ECHEC_MS = [2_000, 4_000, 8_000, 10_000];

export type SondeMesurable = {
  ouvrir(): void;
  mesurer(): Promise<ResultatEcho>;
  surVisibilite(visible: boolean): void;
  arreter(): void;
};

type Boucle = "http" | "sonde";

const horlogeNavigateur: Horloge = {
  maintenant: () => Date.now(),
  programmer: (fn, ms) => window.setTimeout(fn, ms),
  annuler: (id) => window.clearTimeout(id as number),
};

const ongletVisible = () => document.visibilityState === "visible";
const delaiApresEchecs = (echecs: number) => DELAIS_ECHEC_MS[Math.min(echecs - 1, DELAIS_ECHEC_MS.length - 1)]!;

export class Releveur {
  private actif = false;
  private generation = 0;
  private abandon: AbortController | null = null;
  private rodage = true;
  private echecs: Record<Boucle, number> = { http: 0, sonde: 0 };
  private minuteries: Record<Boucle, unknown> = { http: null, sonde: null };

  constructor(
    private readonly magasin: MagasinMesures,
    private readonly http: (signal: AbortSignal) => Promise<ResultatHttp>,
    private readonly sonde: SondeMesurable | null,
    private readonly horloge: Horloge = horlogeNavigateur,
    private readonly visible: () => boolean = ongletVisible,
  ) {}

  /** Onglet caché au démarrage : rien ne part avant `surVisibilite(true)`. */
  demarrer(): void {
    if (!this.sonde) this.magasin.indisponible("tempsReel");
    if (!this.visible()) return;
    this.sonde?.ouvrir();
    this.reprendre();
  }

  surVisibilite(visible: boolean): void {
    this.sonde?.surVisibilite(visible);
    if (visible) this.reprendre();
    else this.suspendre();
  }

  arreter(): void {
    this.suspendre();
    this.sonde?.arreter();
  }

  private reprendre(): void {
    if (this.actif) return;
    this.actif = true;
    this.abandon = new AbortController();
    void this.tourHttp(this.generation);
    if (this.sonde) this.planifier("sonde", INTERVALLE_MS);
  }

  private suspendre(): void {
    this.actif = false;
    this.generation++;
    // La requête en vol est annulée : elle ne compte pas deux fois dans la limite du serveur.
    this.abandon?.abort();
    this.abandon = null;
    for (const boucle of ["http", "sonde"] as const) {
      if (this.minuteries[boucle] !== null) this.horloge.annuler(this.minuteries[boucle]);
      this.minuteries[boucle] = null;
    }
  }

  private async tourHttp(generation: number): Promise<void> {
    const r = await this.http(this.abandon!.signal);
    if (generation !== this.generation) return;
    if (r.ok) {
      this.echecs.http = 0;
      if (this.rodage) {
        // Première réponse : ouverture de la connexion comprise, non représentative.
        this.rodage = false;
      } else {
        this.magasin.ajouter("site", r.ms);
        if (r.base === null) this.magasin.echec("base");
        else this.magasin.ajouter("base", r.base);
      }
      this.planifier("http", INTERVALLE_MS);
      return;
    }
    this.echecs.http++;
    this.magasin.echec("site");
    this.magasin.echec("base");
    this.planifier("http", Math.max(delaiApresEchecs(this.echecs.http), r.reessaiMs ?? 0));
  }

  private async tourSonde(generation: number): Promise<void> {
    const r = await this.sonde!.mesurer();
    if (generation !== this.generation) return;
    if (r === "attente") {
      // Connexion en cours d'ouverture : ni valeur ni échec.
      this.planifier("sonde", INTERVALLE_MS);
      return;
    }
    if (r === null) {
      this.echecs.sonde++;
      this.magasin.echec("tempsReel");
      this.planifier("sonde", delaiApresEchecs(this.echecs.sonde));
      return;
    }
    this.echecs.sonde = 0;
    this.magasin.ajouter("tempsReel", r);
    this.planifier("sonde", INTERVALLE_MS);
  }

  private planifier(boucle: Boucle, ms: number): void {
    const generation = this.generation;
    this.minuteries[boucle] = this.horloge.programmer(() => {
      this.minuteries[boucle] = null;
      void (boucle === "http" ? this.tourHttp(generation) : this.tourSonde(generation));
    }, ms);
  }
}
```

- [ ] **Step 6: Lancer** — `pnpm --filter web exec vitest run lib/coulisses` → PASS ; `pnpm --filter web lint && pnpm --filter web typecheck` → PASS ; `grep -rn "@/lib/direct/connexion" apps/web/lib/coulisses` → uniquement des `import type`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/coulisses/http.ts apps/web/lib/coulisses/http.test.ts apps/web/lib/coulisses/releveur.ts apps/web/lib/coulisses/releveur.test.ts
git commit -m "Coulisses : aller-retour HTTP et releveur (2 s, échecs espacés, onglet caché, requête annulée)"
```

---

### Task 6: Données de l'architecture et format des mesures

**Files:**
- Create: `apps/web/data/architecture.ts`, `apps/web/data/architecture.test.ts`
- Create: `apps/web/lib/coulisses/format.ts`, `apps/web/lib/coulisses/format.test.ts`

**Interfaces:**
- Consumes: `Serie`, `EtatSerie`, `derniere` (t3).
- Produces:
  - `data/architecture.ts` : `type IdNoeud`, `type Point = { x: number; y: number }`, `type Variante = "large" | "etroite"`, `type Noeud = { id; nom; role; techno; pourquoi; groupe: "requete" | "deploiement"; mesure?: Serie; positions: Record<Variante, Point> }`, `type Liaison = { de: IdNoeud; vers: IdNoeud; mesure?: Serie }`, `NOEUDS`, `LIAISONS`, `NOEUD_PAR_DEFAUT: IdNoeud = "navigateur"`, `CADRES: Record<Variante, { largeur; hauteur; noeud: { largeur; hauteur } }>`, `noeudDe(id): Noeud`
  - `format.ts` : `formaterMs(ms: number | null): string`, `texteSerie(s: EtatSerie): string`, `dureeDefilement(ms: number | null): number`

Les textes des nœuds sont une **première version, à valider par Augustin** (spec §11) : les reprendre tels quels, ne pas en inventer d'autres.

- [ ] **Step 1: Tests des données** — `apps/web/data/architecture.test.ts` (cohérence, textes, et géométrie des deux variantes : cadre, chevauchements, liaisons, noms, libellés) :

```ts
import { describe, expect, it } from "vitest";
import { CADRES, LIAISONS, NOEUD_PAR_DEFAUT, NOEUDS, type Point, type Variante } from "./architecture";

type Boite = { x0: number; y0: number; x1: number; y1: number };
const MARGE = 4;
/** Estimations prudentes, en unités SVG : nom en 15 px gras, libellé de latence en 13 px (« indisponible »). */
const LARGEUR_CARACTERE_NOM = 9;
const LARGEUR_LIBELLE = 80;
/** Demi-épaisseur du trait le plus épais (nœud choisi ou focus). */
const DEMI_TRAIT = 2;

const disjointes = (A: Boite, B: Boite) => A.x1 <= B.x0 || B.x1 <= A.x0 || A.y1 <= B.y0 || B.y1 <= A.y0;

const boite = (p: Point, v: Variante, marge = 0): Boite => {
  const { largeur, hauteur } = CADRES[v].noeud;
  return { x0: p.x - largeur / 2 - marge, y0: p.y - hauteur / 2 - marge, x1: p.x + largeur / 2 + marge, y1: p.y + hauteur / 2 + marge };
};

/** Le segment [a, b] traverse-t-il la boîte ? (Liang–Barsky) */
function traverse(a: Point, b: Point, r: Boite): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const bords: [number, number][] = [
    [-dx, a.x - r.x0],
    [dx, r.x1 - a.x],
    [-dy, a.y - r.y0],
    [dy, r.y1 - a.y],
  ];
  for (const [p, q] of bords) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      t0 = Math.max(t0, t);
    } else {
      if (t < t0) return false;
      t1 = Math.min(t1, t);
    }
  }
  return t0 <= t1;
}

const ids = NOEUDS.map((n) => n.id);

describe("architecture", () => {
  it("des identifiants uniques et un nœud par défaut qui existe", () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(NOEUD_PAR_DEFAUT);
  });

  it("chaque liaison relie deux nœuds existants, sans doublon", () => {
    for (const l of LIAISONS) {
      expect(ids).toContain(l.de);
      expect(ids).toContain(l.vers);
    }
    const cles = LIAISONS.map((l) => `${l.de}>${l.vers}`);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("chaque mesure figure sur une liaison et sur un nœud, une seule fois", () => {
    for (const serie of ["site", "base", "tempsReel"] as const) {
      expect(LIAISONS.filter((l) => l.mesure === serie)).toHaveLength(1);
      expect(NOEUDS.filter((n) => n.mesure === serie)).toHaveLength(1);
    }
  });

  it("des textes complets, sans adresse ni hébergeur nommé", () => {
    for (const n of NOEUDS) {
      for (const texte of [n.nom, n.role, n.techno, n.pourquoi]) expect(texte.trim().length).toBeGreaterThan(0);
      expect(`${n.role} ${n.techno} ${n.pourquoi}`).not.toMatch(/\d+\.\d+\.\d+\.\d+|https?:\/\/|ovh/i);
    }
  });

  describe.each(["large", "etroite"] as const)("variante %s", (v) => {
    const cadre = CADRES[v];

    it("chaque nœud tient dans le cadre, trait compris", () => {
      for (const n of NOEUDS) {
        const b = boite(n.positions[v], v, DEMI_TRAIT);
        expect(b.x0).toBeGreaterThanOrEqual(0);
        expect(b.y0).toBeGreaterThanOrEqual(0);
        expect(b.x1).toBeLessThanOrEqual(cadre.largeur);
        expect(b.y1).toBeLessThanOrEqual(cadre.hauteur);
      }
    });

    it("aucun nœud n'en chevauche un autre", () => {
      for (const a of NOEUDS)
        for (const b of NOEUDS) {
          if (a.id >= b.id) continue;
          const A = boite(a.positions[v], v, MARGE);
          const B = boite(b.positions[v], v, MARGE);
          expect(disjointes(A, B), `${a.id} / ${b.id}`).toBe(true);
        }
    });

    it("aucune liaison ne traverse un nœud qui n'est pas l'une de ses extrémités", () => {
      const position = (id: string) => NOEUDS.find((n) => n.id === id)!.positions[v];
      for (const l of LIAISONS)
        for (const n of NOEUDS) {
          if (n.id === l.de || n.id === l.vers) continue;
          expect(traverse(position(l.de), position(l.vers), boite(n.positions[v], v, MARGE)), `${l.de}>${l.vers} traverse ${n.id}`).toBe(false);
        }
    });

    it("chaque nom tient dans son nœud", () => {
      for (const n of NOEUDS) expect(n.nom.length * LARGEUR_CARACTERE_NOM + 16, n.id).toBeLessThanOrEqual(cadre.noeud.largeur);
    });

    it("aucun libellé de latence ne recouvre un nœud", () => {
      const position = (id: string) => NOEUDS.find((n) => n.id === id)!.positions[v];
      for (const l of LIAISONS) {
        if (!l.mesure) continue;
        const a = position(l.de);
        const b = position(l.vers);
        // Même placement que Schema.tsx : au milieu de la liaison, ligne de base 8 unités au-dessus.
        const x = (a.x + b.x) / 2;
        const y = (a.y + b.y) / 2 - 8;
        const libelle = { x0: x - LARGEUR_LIBELLE / 2, x1: x + LARGEUR_LIBELLE / 2, y0: y - 12, y1: y + 4 };
        for (const n of NOEUDS) expect(disjointes(libelle, boite(n.positions[v], v, MARGE)), `${l.de}>${l.vers} / ${n.id}`).toBe(true);
      }
    });
  });
});
```

- [ ] **Step 2: Tests du format** — `apps/web/lib/coulisses/format.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { dureeDefilement, formaterMs, texteSerie } from "./format";

describe("formaterMs", () => {
  it("en attente : points de suspension", () => expect(formaterMs(null)).toBe("…"));
  it("sous 10 ms : un décimal, virgule française", () => expect(formaterMs(4.25)).toBe("4,3\u00a0ms"));
  it("au-delà : entier", () => expect(formaterMs(42.6)).toBe("43\u00a0ms"));
});

describe("texteSerie", () => {
  it("indisponible l'emporte sur les valeurs anciennes", () =>
    expect(texteSerie({ valeurs: [12], mediane: 12, disponible: false, echecs: 3 })).toBe("indisponible"));
  it("dernière valeur sinon", () => expect(texteSerie({ valeurs: [12, 30], mediane: 21, disponible: true, echecs: 0 })).toBe("30\u00a0ms"));
});

describe("dureeDefilement", () => {
  it("plus la latence est basse, plus les pointillés vont vite, dans des bornes", () => {
    expect(dureeDefilement(null)).toBe(1.5);
    expect(dureeDefilement(1)).toBe(0.4);
    expect(dureeDefilement(50)).toBe(2);
    expect(dureeDefilement(1_000)).toBe(4);
  });
});
```

- [ ] **Step 3: Lancer** — `pnpm --filter web exec vitest run data/architecture.test.ts lib/coulisses/format.test.ts` → FAIL (modules absents).

- [ ] **Step 4: `apps/web/data/architecture.ts`**

```ts
/**
 * Architecture du site pour la page des coulisses : une seule source pour le
 * schéma 2D (deux variantes, large et étroite) et la vue 3D. Textes : première
 * version, à valider par Augustin (spec du sous-projet 5, §11). Anonymes : ni
 * adresse d'administration, ni IP, ni hébergeur au-delà de « VPS en France ».
 */
import type { Serie } from "@/lib/coulisses/magasin";

export type IdNoeud =
  | "navigateur"
  | "proxy"
  | "site"
  | "base"
  | "tempsReel"
  | "statistiques"
  | "mails"
  | "integration"
  | "registre"
  | "deploiement";
export type Point = { x: number; y: number };
export type Variante = "large" | "etroite";

export type Noeud = {
  id: IdNoeud;
  nom: string;
  role: string;
  techno: string;
  pourquoi: string;
  groupe: "requete" | "deploiement";
  mesure?: Serie;
  positions: Record<Variante, Point>;
};
export type Liaison = { de: IdNoeud; vers: IdNoeud; mesure?: Serie };

/** Cadres des deux variantes (viewBox) et taille des nœuds, en unités SVG. */
export const CADRES = {
  large: { largeur: 960, hauteur: 420, noeud: { largeur: 150, hauteur: 56 } },
  etroite: { largeur: 360, hauteur: 820, noeud: { largeur: 140, hauteur: 56 } },
} as const satisfies Record<Variante, { largeur: number; hauteur: number; noeud: { largeur: number; hauteur: number } }>;

export const NOEUDS: readonly Noeud[] = [
  {
    id: "navigateur",
    nom: "Navigateur",
    role: "Affiche les pages et mesure, depuis chez vous, les temps de réponse de cette page.",
    techno: "React 19, pages rendues par le serveur puis rendues interactives",
    pourquoi: "Les pages arrivent déjà rendues : le contenu s'affiche avant le JavaScript, qui n'ajoute que l'interactivité.",
    groupe: "requete",
    positions: { large: { x: 95, y: 90 }, etroite: { x: 180, y: 50 } },
  },
  {
    id: "proxy",
    nom: "Proxy",
    role: "Reçoit chaque requête en HTTPS et l'oriente vers le bon service.",
    techno: "Traefik, géré par Coolify, sur un VPS en France",
    pourquoi: "Un seul point d'entrée chiffré pour le site et le temps réel ; les certificats se renouvellent seuls.",
    groupe: "requete",
    positions: { large: { x: 335, y: 90 }, etroite: { x: 100, y: 160 } },
  },
  {
    id: "site",
    nom: "Site",
    role: "Rend les pages, traite le formulaire de contact et les liens personnalisés.",
    techno: "Next.js 16 sur Node 22, dans une image Docker",
    pourquoi: "La plupart des pages sont générées au build : servies telles quelles, elles restent rapides même sous charge.",
    groupe: "requete",
    mesure: "site",
    positions: { large: { x: 575, y: 90 }, etroite: { x: 100, y: 290 } },
  },
  {
    id: "base",
    nom: "Base",
    role: "Garde les liens personnalisés et leurs visites.",
    techno: "PostgreSQL 17, client Prisma",
    pourquoi: "Des données relationnelles simples : une base éprouvée et un client typé évitent les surprises.",
    groupe: "requete",
    mesure: "base",
    positions: { large: { x: 830, y: 50 }, etroite: { x: 80, y: 420 } },
  },
  {
    id: "tempsReel",
    nom: "Temps réel",
    role: "Partage les curseurs et le compteur de l'accueil, et renvoie l'écho de cette page.",
    techno: "Hono et WebSocket, sur Node 22",
    pourquoi: "Séparé du site : il garde ses connexions ouvertes sans ralentir le rendu des pages, et se déploie à part.",
    groupe: "requete",
    mesure: "tempsReel",
    positions: { large: { x: 335, y: 220 }, etroite: { x: 270, y: 290 } },
  },
  {
    id: "statistiques",
    nom: "Statistiques",
    role: "Compte les visites, sans cookie.",
    techno: "Umami Cloud",
    pourquoi: "Une mesure d'audience sans donnée personnelle : pas de bandeau de consentement à imposer.",
    groupe: "requete",
    positions: { large: { x: 95, y: 220 }, etroite: { x: 270, y: 160 } },
  },
  {
    id: "mails",
    nom: "Mails",
    role: "Achemine les messages du formulaire de contact.",
    techno: "SMTP chez un fournisseur de messagerie",
    pourquoi: "Confier l'envoi à un fournisseur établi garantit que les messages arrivent, plutôt qu'en indésirables.",
    groupe: "requete",
    positions: { large: { x: 830, y: 150 }, etroite: { x: 290, y: 420 } },
  },
  {
    id: "integration",
    nom: "CI",
    role: "À chaque modification : lint, types, tests, tests de bout en bout et Lighthouse.",
    techno: "GitHub Actions",
    pourquoi: "Rien n'est mis en ligne sans avoir passé toutes les vérifications ; les chiffres de cette page en viennent.",
    groupe: "deploiement",
    positions: { large: { x: 335, y: 360 }, etroite: { x: 270, y: 780 } },
  },
  {
    id: "registre",
    nom: "Registre",
    role: "Stocke les images Docker du site et du service temps réel.",
    techno: "GitHub Container Registry",
    pourquoi: "Le serveur ne compile rien : il tire une image déjà construite et vérifiée.",
    groupe: "deploiement",
    positions: { large: { x: 575, y: 360 }, etroite: { x: 270, y: 670 } },
  },
  {
    id: "deploiement",
    nom: "Déploiement",
    role: "Tire les nouvelles images et relance le site et le service temps réel.",
    techno: "Coolify, sur le même VPS",
    pourquoi: "Un déploiement déclenché par la CI, sans intervention manuelle sur le serveur.",
    groupe: "deploiement",
    positions: { large: { x: 830, y: 360 }, etroite: { x: 270, y: 560 } },
  },
];

export const LIAISONS: readonly Liaison[] = [
  { de: "navigateur", vers: "proxy", mesure: "site" },
  { de: "navigateur", vers: "statistiques" },
  { de: "proxy", vers: "site" },
  { de: "proxy", vers: "tempsReel", mesure: "tempsReel" },
  { de: "site", vers: "base", mesure: "base" },
  { de: "site", vers: "mails" },
  { de: "integration", vers: "registre" },
  { de: "registre", vers: "deploiement" },
  { de: "deploiement", vers: "site" },
];

export const NOEUD_PAR_DEFAUT: IdNoeud = "navigateur";

export function noeudDe(id: IdNoeud): Noeud {
  const noeud = NOEUDS.find((n) => n.id === id);
  if (!noeud) throw new Error(`Nœud inconnu : ${id}`);
  return noeud;
}
```

(Si le test géométrique échoue, ajuster les positions — pas les marges, les estimations ni le test — et le signaler.)

- [ ] **Step 5: `apps/web/lib/coulisses/format.ts`**

```ts
import { derniere, type EtatSerie } from "./magasin";

const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** « 4,3 ms » sous 10 ms, « 43 ms » au-delà ; « … » en attente de mesure. */
export function formaterMs(ms: number | null): string {
  if (ms === null) return "…";
  return `${nombre.format(ms < 10 ? ms : Math.round(ms))}\u00a0ms`;
}

export function texteSerie(s: EtatSerie): string {
  return s.disponible ? formaterMs(derniere(s)) : "indisponible";
}

/** Durée d'un cycle des pointillés, en secondes : plus la latence est basse, plus ils vont vite. */
export function dureeDefilement(ms: number | null): number {
  if (ms === null) return 1.5;
  return Math.round(Math.min(4, Math.max(0.4, ms / 25)) * 10) / 10;
}
```

- [ ] **Step 6: Lancer** — `pnpm --filter web exec vitest run data lib/coulisses` → PASS ; `pnpm --filter web lint && pnpm --filter web typecheck` → PASS ; `grep -rnP "[\x{00a0}\x{202f}]" apps/web/lib/coulisses apps/web/data/architecture.ts` → vide.

- [ ] **Step 7: Commit**

```bash
git add apps/web/data/architecture.ts apps/web/data/architecture.test.ts apps/web/lib/coulisses/format.ts apps/web/lib/coulisses/format.test.ts
git commit -m "Coulisses : données de l'architecture (nœuds, liaisons, disposition vérifiée) et format des mesures"
```

---

### Task 7: Schéma 2D accessible et détail d'un nœud

**Files:**
- Create: `apps/web/components/coulisses/Schema.tsx`, `Schema.test.tsx`, `DetailNoeud.tsx`, `DetailNoeud.test.tsx`
- Modify: `apps/web/app/globals.css` (pointillés animés)

**Interfaces:**
- Consumes: `EtatMesures`, `derniere`, `MagasinMesures` (t3) ; `NOEUDS`, `LIAISONS`, `CADRES`, `noeudDe`, `type IdNoeud`, `type Variante`, `type Noeud` (t6) ; `texteSerie`, `dureeDefilement` (t6).
- Produces:
  - `<Schema choisi choisir mesures />` : deux SVG (`role="group"`, `aria-label="Schéma de l'architecture"`), nœuds `role="button"` avec `aria-pressed`
  - `<DetailNoeud noeud mesures />` : titre `h3` = `noeud.nom`

- [ ] **Step 1: Tests** — `apps/web/components/coulisses/Schema.test.tsx` :

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MagasinMesures } from "@/lib/coulisses/magasin";
import { Schema } from "./Schema";

function rendre(choisi: "navigateur" | "proxy" = "navigateur") {
  const magasin = new MagasinMesures();
  magasin.ajouter("site", 42);
  magasin.indisponible("tempsReel");
  const choisir = vi.fn();
  render(<Schema choisi={choisi} choisir={choisir} mesures={magasin.etat()} />);
  // jsdom n'applique pas les media queries : les deux variantes sont présentes, la première est la large.
  const [large] = screen.getAllByRole("group", { name: "Schéma de l'architecture" });
  return { choisir, large: within(large!) };
}

describe("Schema", () => {
  it("rend deux variantes (large et étroite) des mêmes nœuds", () => {
    rendre();
    expect(screen.getAllByRole("group", { name: "Schéma de l'architecture" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^Proxy/ })).toHaveLength(2);
  });

  it("indique le nœud choisi par aria-pressed", () => {
    const { large } = rendre("proxy");
    expect(large.getByRole("button", { name: /^Proxy/ })).toHaveAttribute("aria-pressed", "true");
    expect(large.getByRole("button", { name: /^Navigateur/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("choisit un nœud au clic, à Entrée et à Espace", () => {
    const { choisir, large } = rendre();
    const base = large.getByRole("button", { name: /^Base/ });
    fireEvent.click(base);
    fireEvent.keyDown(base, { key: "Enter" });
    fireEvent.keyDown(base, { key: " " });
    expect(choisir.mock.calls).toEqual([["base"], ["base"], ["base"]]);
  });

  it("chaque nœud est atteignable au clavier", () => {
    const { large } = rendre();
    for (const b of large.getAllByRole("button")) expect(b).toHaveAttribute("tabindex", "0");
  });

  it("affiche les mesures sur les liaisons", () => {
    const { large } = rendre();
    expect(large.getByText("42\u00a0ms")).toBeInTheDocument();
    expect(large.getByText("indisponible")).toBeInTheDocument();
  });
});
```

et `apps/web/components/coulisses/DetailNoeud.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { noeudDe } from "@/data/architecture";
import { MagasinMesures } from "@/lib/coulisses/magasin";
import { DetailNoeud } from "./DetailNoeud";

describe("DetailNoeud", () => {
  it("donne le rôle, la technologie et le pourquoi, annoncés aux lecteurs d'écran", () => {
    render(<DetailNoeud noeud={noeudDe("proxy")} mesures={new MagasinMesures().etat()} />);
    const titre = screen.getByRole("heading", { level: 3, name: "Proxy" });
    expect(titre.closest("[aria-live='polite']")).not.toBeNull();
    expect(screen.getByText(noeudDe("proxy").pourquoi)).toBeInTheDocument();
    expect(screen.queryByText("Mesure en direct")).toBeNull();
  });

  it("montre la mesure du nœud hors de la zone annoncée (pas d'annonce toutes les 2 s)", () => {
    const magasin = new MagasinMesures();
    magasin.ajouter("base", 1.2);
    render(<DetailNoeud noeud={noeudDe("base")} mesures={magasin.etat()} />);
    const mesure = screen.getByText("1,2\u00a0ms");
    expect(mesure.closest("[aria-live]")).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer** — `pnpm --filter web exec vitest run components/coulisses` → FAIL.

- [ ] **Step 3: `apps/web/app/globals.css`** — à la fin :

```css
/* Coulisses : pointillés qui défilent le long des liaisons mesurées (durée : --duree). */
@keyframes defiler-liaison {
  to {
    stroke-dashoffset: -24;
  }
}
.liaison-mesuree {
  stroke-dasharray: 6 6;
  animation: defiler-liaison var(--duree, 1.5s) linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .liaison-mesuree {
    animation: none;
  }
}
```

- [ ] **Step 4: `apps/web/components/coulisses/Schema.tsx`**

```tsx
"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { CADRES, LIAISONS, NOEUDS, noeudDe, type IdNoeud, type Variante } from "@/data/architecture";
import { dureeDefilement, texteSerie } from "@/lib/coulisses/format";
import { derniere, type EtatMesures } from "@/lib/coulisses/magasin";

type Props = { choisi: IdNoeud; choisir(id: IdNoeud): void; mesures: EtatMesures };

/**
 * Schéma 2D de l'architecture, rendu par le serveur. Deux variantes : large
 * (à partir de `sm`) et étroite (mobile) ; celle qui est masquée l'est en
 * `display: none`, donc hors de l'arbre d'accessibilité.
 */
export function Schema(props: Props) {
  return (
    <>
      <VarianteSchema {...props} variante="large" className="hidden sm:block" />
      <VarianteSchema {...props} variante="etroite" className="sm:hidden" />
    </>
  );
}

function VarianteSchema({ variante, className, choisi, choisir, mesures }: Props & { variante: Variante; className: string }) {
  const cadre = CADRES[variante];
  const { largeur: l, hauteur: h } = cadre.noeud;
  const surTouche = (e: KeyboardEvent, id: IdNoeud) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    choisir(id);
  };

  return (
    <svg
      viewBox={`0 0 ${cadre.largeur} ${cadre.hauteur}`}
      role="group"
      aria-label="Schéma de l'architecture"
      className={`h-full w-full ${className}`}
    >
      {LIAISONS.map((liaison) => {
        const a = noeudDe(liaison.de).positions[variante];
        const b = noeudDe(liaison.vers).positions[variante];
        const serie = liaison.mesure ? mesures[liaison.mesure] : null;
        const style = serie ? ({ "--duree": `${dureeDefilement(derniere(serie))}s` } as CSSProperties) : undefined;
        return (
          <g key={`${liaison.de}-${liaison.vers}`}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeWidth={2}
              strokeDasharray={!serie && noeudDe(liaison.de).groupe === "deploiement" ? "2 6" : undefined}
              className={serie ? "liaison-mesuree stroke-brique" : "stroke-trait"}
              style={style}
            />
            {serie && (
              <text
                x={(a.x + b.x) / 2}
                y={(a.y + b.y) / 2 - 8}
                textAnchor="middle"
                paintOrder="stroke"
                stroke="var(--color-papier)"
                strokeWidth={5}
                className="fill-encre text-[13px] tabular-nums"
              >
                {texteSerie(serie)}
              </text>
            )}
          </g>
        );
      })}
      {NOEUDS.map((n) => {
        const p = n.positions[variante];
        const actif = n.id === choisi;
        return (
          <g
            key={n.id}
            role="button"
            tabIndex={0}
            aria-label={`${n.nom} : ${n.role}`}
            aria-pressed={actif}
            onClick={() => choisir(n.id)}
            onKeyDown={(e) => surTouche(e, n.id)}
            className="group cursor-pointer outline-none"
          >
            <rect
              x={p.x - l / 2}
              y={p.y - h / 2}
              width={l}
              height={h}
              rx={10}
              strokeWidth={actif ? 2.5 : 1.5}
              className={`${actif ? "fill-brique/10 stroke-brique" : "fill-papier stroke-encre-douce"} group-focus-visible:stroke-brique group-focus-visible:[stroke-width:3]`}
            />
            <text x={p.x} y={p.y + 5} textAnchor="middle" className="fill-encre text-[15px] font-semibold">
              {n.nom}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 5: `apps/web/components/coulisses/DetailNoeud.tsx`**

```tsx
import type { Noeud } from "@/data/architecture";
import { texteSerie } from "@/lib/coulisses/format";
import type { EtatMesures } from "@/lib/coulisses/magasin";

/**
 * Détail du nœud choisi. Seul le texte du nœud est annoncé (aria-live) ; sa
 * mesure, qui change toutes les 2 s, reste hors de la zone annoncée.
 */
export function DetailNoeud({ noeud, mesures }: { noeud: Noeud; mesures: EtatMesures }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-trait p-5">
      <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-3">
        <h3 className="font-serif text-2xl">{noeud.nom}</h3>
        <dl className="flex flex-col gap-2 text-sm">
          <div>
            <dt className="font-semibold">Rôle</dt>
            <dd>{noeud.role}</dd>
          </div>
          <div>
            <dt className="font-semibold">Technologie</dt>
            <dd>{noeud.techno}</dd>
          </div>
          <div>
            <dt className="font-semibold">Pourquoi</dt>
            <dd>{noeud.pourquoi}</dd>
          </div>
        </dl>
      </div>
      {noeud.mesure && (
        <dl className="text-sm">
          <dt className="font-semibold">Mesure en direct</dt>
          <dd className="tabular-nums">{texteSerie(mesures[noeud.mesure])}</dd>
        </dl>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Lancer** — `pnpm --filter web exec vitest run components/coulisses` → PASS ; `pnpm --filter web lint && pnpm --filter web typecheck` → PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/coulisses/Schema.tsx apps/web/components/coulisses/Schema.test.tsx apps/web/components/coulisses/DetailNoeud.tsx apps/web/components/coulisses/DetailNoeud.test.tsx apps/web/app/globals.css
git commit -m "Coulisses : schéma 2D accessible au clavier et détail des nœuds"
```

---

### Task 8: Page `/coulisses` avec les mesures en direct

**Files:**
- Create: `apps/web/lib/quand-libre.ts`, `apps/web/lib/quand-libre.test.ts`
- Modify: `apps/web/components/direct/PresenceDirecte.tsx` (importe `quandLibre`)
- Create: `apps/web/components/coulisses/Courbe.tsx`, `PanneauEnDirect.tsx`, `PanneauEnDirect.test.tsx`, `ArchitectureVivante.tsx`, `ArchitectureVivante.test.tsx`
- Create: `apps/web/app/coulisses/page.tsx`, `apps/web/app/coulisses/page.test.tsx`
- Modify: `apps/web/scripts/verifier-accueil-statique.mjs` (vérifie aussi `/coulisses`), `apps/web/lighthouserc.json` (URL `/coulisses`)

**Interfaces:**
- Consumes: t3 (`MagasinMesures`, `SERIES`, `HISTORIQUE`), t4 (`SondeTempsReel`), t5 (`mesurerHttp`, `Releveur`), t6 (`NOEUD_PAR_DEFAUT`, `noeudDe`, `formaterMs`, `texteSerie`), t7 (`Schema`, `DetailNoeud`).
- Produces:
  - `quandLibre(fn: () => void): () => void` (`lib/quand-libre.ts`)
  - `adresseSonde(url: string): string` et `<ArchitectureVivante />` (`components/coulisses/ArchitectureVivante.tsx`) ; la tâche 14 y ajoute la 3D
  - `<PanneauEnDirect mesures />` (lignes `data-testid="mesure-site" | "mesure-base" | "mesure-tempsReel"`)
  - page `/coulisses` (`○` au build, vérifiée par `verifier-accueil-statique`) ; la tâche 10 y ajoute la section « Dernier déploiement »

Lire avant : la doc Next des métadonnées (`metadata`, `alternates.canonical`) dans `node_modules/next/dist/docs/`.

- [ ] **Step 1: Tests** — `apps/web/lib/quand-libre.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { quandLibre } from "./quand-libre";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("quandLibre", () => {
  it("page déjà chargée : lance la fonction dans un temps libre", () => {
    const fn = vi.fn();
    quandLibre(fn);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("page en cours de chargement : attend l'événement load", () => {
    vi.spyOn(Document.prototype, "readyState", "get").mockReturnValue("loading");
    const fn = vi.fn();
    quandLibre(fn);
    vi.advanceTimersByTime(5_000);
    expect(fn).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("load"));
    vi.advanceTimersByTime(1_000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("annulée avant le temps libre : la fonction ne part jamais", () => {
    const fn = vi.fn();
    const annuler = quandLibre(fn);
    annuler();
    vi.advanceTimersByTime(5_000);
    expect(fn).not.toHaveBeenCalled();
  });
});
```

`apps/web/components/coulisses/PanneauEnDirect.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MagasinMesures } from "@/lib/coulisses/magasin";
import { PanneauEnDirect } from "./PanneauEnDirect";

describe("PanneauEnDirect", () => {
  it("donne la dernière valeur et la médiane de chaque série, ou son indisponibilité", () => {
    const m = new MagasinMesures();
    for (const v of [10, 30, 20]) m.ajouter("site", v);
    m.indisponible("tempsReel");
    render(<PanneauEnDirect mesures={m.etat()} />);
    expect(screen.getByTestId("mesure-site")).toHaveTextContent("Vous → site");
    expect(screen.getByTestId("mesure-site")).toHaveTextContent("20\u00a0ms");
    expect(screen.getByTestId("mesure-site")).toHaveTextContent("médiane 20\u00a0ms");
    expect(screen.getByTestId("mesure-base")).toHaveTextContent("…");
    expect(screen.getByTestId("mesure-tempsReel")).toHaveTextContent("indisponible");
  });

  it("n'annonce pas les valeurs qui changent toutes les 2 s", () => {
    render(<PanneauEnDirect mesures={new MagasinMesures().etat()} />);
    expect(screen.getByTestId("mesure-site").closest("[aria-live]")).toBeNull();
  });
});
```

`apps/web/components/coulisses/ArchitectureVivante.test.tsx` :

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adresseSonde, ArchitectureVivante } from "./ArchitectureVivante";

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom ne se dit pas toujours « visible » : le releveur ne mesurerait rien.
  vi.spyOn(Document.prototype, "visibilityState", "get").mockReturnValue("visible");
  vi.stubEnv("NEXT_PUBLIC_DIRECT_URL", "");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ base: 1, serveur: 2 })));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ArchitectureVivante", () => {
  it("montre d'abord le navigateur, puis le nœud choisi", () => {
    render(<ArchitectureVivante />);
    expect(screen.getByRole("heading", { level: 3, name: "Navigateur" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /^Proxy/ })[0]!);
    expect(screen.getByRole("heading", { level: 3, name: "Proxy" })).toBeInTheDocument();
  });

  it("ne mesure qu'après le chargement ; sans service, le temps réel est indisponible", async () => {
    render(<ArchitectureVivante />);
    expect(fetch).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1_500);
    });
    expect(fetch).toHaveBeenCalledWith("/api/coulisses/mesure", expect.anything());
    expect(screen.getByTestId("mesure-tempsReel")).toHaveTextContent("indisponible");
  });

  it("déduit l'adresse de la sonde de celle du service", () => {
    expect(adresseSonde("wss://direct.exemple.dev/direct")).toBe("wss://direct.exemple.dev/sonde");
    expect(adresseSonde("ws://127.0.0.1:3201/direct")).toBe("ws://127.0.0.1:3201/sonde");
  });
});
```

`apps/web/app/coulisses/page.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CoulissesPage, { metadata } from "./page";

describe("page /coulisses", () => {
  it("a son titre, sa phrase d'introduction et son adresse canonique", () => {
    render(<CoulissesPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Coulisses" })).toBeInTheDocument();
    expect(screen.getByText(/construit, hébergé et mesuré/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Architecture vivante" })).toBeInTheDocument();
    expect(metadata.alternates?.canonical).toBe("/coulisses");
  });
});
```

- [ ] **Step 2: Lancer** — `pnpm --filter web exec vitest run lib/quand-libre.test.ts components/coulisses app/coulisses` → FAIL.

- [ ] **Step 3: `apps/web/lib/quand-libre.ts`** — déplacer ici la fonction `quandLibre` de `components/direct/PresenceDirecte.tsx`, exportée ; version du sous-projet 4 au moment de l'écriture du plan :

```ts
/** Lance `fn` une fois la page chargée, dans un temps libre du navigateur. Renvoie l'annulation. */
export function quandLibre(fn: () => void): () => void {
  let id: number | undefined;
  const lancer = () => {
    id =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(fn, { timeout: 3_000 })
        : window.setTimeout(fn, 1_000);
  };
  if (document.readyState === "complete") lancer();
  else window.addEventListener("load", lancer, { once: true });
  return () => {
    window.removeEventListener("load", lancer);
    if (id === undefined) return;
    if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(id);
    window.clearTimeout(id);
  };
}
```

(Si la version de `PresenceDirecte.tsx` diffère, garder la sienne et adapter le test.) Dans `PresenceDirecte.tsx`, supprimer la fonction locale et ajouter `import { quandLibre } from "@/lib/quand-libre";`. Les tests de `components/direct` doivent passer sans changement.

- [ ] **Step 4: `apps/web/components/coulisses/Courbe.tsx`**

```tsx
import { HISTORIQUE } from "@/lib/coulisses/magasin";

const LARGEUR = 120;
const HAUTEUR = 28;

/** Courbe des dernières valeurs ; hauteur fixe, même vide (aucun décalage). */
export function Courbe({ valeurs }: { valeurs: readonly number[] }) {
  const min = Math.min(...valeurs);
  const ecart = Math.max(...valeurs) - min || 1;
  const points = valeurs
    .map((v, i) => `${((i * LARGEUR) / (HISTORIQUE - 1)).toFixed(1)},${(HAUTEUR - 2 - ((v - min) / ecart) * (HAUTEUR - 4)).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} preserveAspectRatio="none" aria-hidden="true" className="h-7 w-full">
      {valeurs.length >= 2 && (
        <polyline points={points} fill="none" strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="stroke-brique" />
      )}
    </svg>
  );
}
```

- [ ] **Step 5: `apps/web/components/coulisses/PanneauEnDirect.tsx`**

```tsx
import { formaterMs, texteSerie } from "@/lib/coulisses/format";
import { SERIES, type EtatMesures, type Serie } from "@/lib/coulisses/magasin";
import { Courbe } from "./Courbe";

const LIBELLES: Record<Serie, string> = {
  site: "Vous → site",
  base: "Site → base",
  tempsReel: "Vous → temps réel",
};

/** Les trois mesures en direct ; pas d'aria-live : elles changent toutes les 2 s. */
export function PanneauEnDirect({ mesures }: { mesures: EtatMesures }) {
  return (
    <section aria-labelledby="titre-en-direct" className="flex flex-col gap-4 rounded-xl border border-trait p-5">
      <h3 id="titre-en-direct" className="flex items-center gap-2 font-semibold">
        <span aria-hidden="true" className="size-2 rounded-full bg-emerald-600 motion-safe:animate-pulse" />
        En direct
      </h3>
      <dl className="flex flex-col gap-4">
        {SERIES.map((serie) => {
          const s = mesures[serie];
          return (
            <div key={serie} data-testid={`mesure-${serie}`} className="flex flex-col gap-1">
              <dt className="text-sm text-encre-douce">{LIBELLES[serie]}</dt>
              <dd className="flex items-baseline justify-between gap-3">
                <span className="font-serif text-2xl tabular-nums">{texteSerie(s)}</span>
                {s.disponible && s.mediane !== null && (
                  <span className="text-xs text-encre-douce tabular-nums">médiane {formaterMs(s.mediane)}</span>
                )}
              </dd>
              <dd>
                <Courbe valeurs={s.disponible ? s.valeurs : []} />
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
```

- [ ] **Step 6: `apps/web/components/coulisses/ArchitectureVivante.tsx`**

```tsx
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { NOEUD_PAR_DEFAUT, noeudDe, type IdNoeud } from "@/data/architecture";
import { mesurerHttp } from "@/lib/coulisses/http";
import { MagasinMesures } from "@/lib/coulisses/magasin";
import { Releveur } from "@/lib/coulisses/releveur";
import { SondeTempsReel } from "@/lib/coulisses/sonde";
import { quandLibre } from "@/lib/quand-libre";
import { DetailNoeud } from "./DetailNoeud";
import { PanneauEnDirect } from "./PanneauEnDirect";
import { Schema } from "./Schema";

/** Sonde : même origine que le service temps réel, chemin `/sonde`. */
export const adresseSonde = (url: string) => new URL("/sonde", url).href;

/**
 * Schéma de l'architecture, détail du nœud choisi et mesures en direct. Les
 * mesures démarrent une fois la page chargée, dans un temps libre, et
 * s'arrêtent quand l'onglet est caché. Sans `NEXT_PUBLIC_DIRECT_URL` (figée au
 * build), la mesure du temps réel est « indisponible ».
 */
export function ArchitectureVivante() {
  const [magasin] = useState(() => new MagasinMesures());
  const mesures = useSyncExternalStore(magasin.abonner, magasin.etat, magasin.etat);
  const [choisi, setChoisi] = useState<IdNoeud>(NOEUD_PAR_DEFAUT);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_DIRECT_URL;
    const sonde = url ? new SondeTempsReel(adresseSonde(url)) : null;
    const releveur = new Releveur(magasin, (signal) => mesurerHttp(signal), sonde);
    const surVisibilite = () => releveur.surVisibilite(document.visibilityState === "visible");
    const annuler = quandLibre(() => {
      releveur.demarrer();
      document.addEventListener("visibilitychange", surVisibilite);
    });
    return () => {
      annuler();
      document.removeEventListener("visibilitychange", surVisibilite);
      releveur.arreter();
    };
  }, [magasin]);

  return (
    <section aria-labelledby="titre-architecture" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="titre-architecture" className="font-serif text-3xl">
          Architecture vivante
        </h2>
        {/* Bouton « Voir en 3D » : tâche 14. */}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-6">
          <figure className="flex flex-col gap-2">
            <div className="relative aspect-[360/820] w-full sm:aspect-[960/420]">
              <Schema choisi={choisi} choisir={setChoisi} mesures={mesures} />
            </div>
            <figcaption className="text-sm text-encre-douce">
              Choisissez un élément pour voir son rôle. Les temps sont mesurés depuis votre navigateur.
            </figcaption>
          </figure>
          <DetailNoeud noeud={noeudDe(choisi)} mesures={mesures} />
        </div>
        <PanneauEnDirect mesures={mesures} />
      </div>
    </section>
  );
}
```

(Retirer le commentaire `{/* Bouton … tâche 14. */}` si le lint le refuse ; la tâche 14 sait où placer le bouton.)

- [ ] **Step 7: `apps/web/app/coulisses/page.tsx`**

```tsx
import type { Metadata } from "next";
import { ArchitectureVivante } from "@/components/coulisses/ArchitectureVivante";

const PHRASE = "Comment ce site est construit, hébergé et mesuré, en direct depuis votre navigateur.";

export const metadata: Metadata = {
  title: "Coulisses",
  description: PHRASE,
  alternates: { canonical: "/coulisses" },
};

/** Coulisses techniques (sous-projet 5) : pour les recruteurs et les développeurs, depuis le pied de page. */
export default function CoulissesPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-5 py-16 sm:px-8 2xl:max-w-page">
      <header className="flex flex-col gap-4">
        <h1 className="font-serif text-5xl">Coulisses</h1>
        <p className="max-w-2xl text-lg text-encre-douce">{PHRASE}</p>
      </header>
      <ArchitectureVivante />
    </div>
  );
}
```

- [ ] **Step 8: Pages statiques et Lighthouse** — `apps/web/scripts/verifier-accueil-statique.mjs` devient :

```js
/**
 * Vérifie, après `pnpm build`, que les pages qui doivent rester statiques sont
 * toujours prérendues : l'accueil `/` (les liens personnalisés passent par le
 * proxy) et les coulisses `/coulisses` (build-info.json est lu au build).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PAGES = ["/", "/coulisses"];
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifeste = JSON.parse(readFileSync(join(app, ".next/prerender-manifest.json"), "utf8"));
const dynamiques = PAGES.filter((page) => !manifeste.routes?.[page]);
if (dynamiques.length > 0) {
  console.error(`Pages qui ne sont plus prérendues (statiques) : ${dynamiques.join(", ")}.`);
  process.exit(1);
}
console.log(`Pages prérendues : ${PAGES.join(", ")} : OK.`);
```

et `apps/web/lighthouserc.json` : ajouter `"http://127.0.0.1:3000/coulisses"` à `ci.collect.url` (après les études de cas). Les seuils ne changent pas : `/coulisses` doit tenir les mêmes budgets que les autres pages, dont 163 840 octets de scripts.

- [ ] **Step 9: Lancer** —
  - `pnpm --filter web exec vitest run lib components app data` → PASS ; `pnpm lint && pnpm typecheck && pnpm test` → PASS ;
  - `NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct pnpm build` → `○ /`, `○ /coulisses`, `ƒ /api/coulisses/mesure` ; puis `pnpm --filter web verifier-accueil-statique` (les deux pages), `pnpm --filter web verifier-taille-direct` (Review Focus n° 1 : un seul morceau avec le marqueur) → OK ;
  - **budget JS de `/coulisses`, avant d'aller plus loin** (base de test démarrée et migrée) : `DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm --filter web semer-lien-exemple && DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm --filter web lighthouse` → les cinq URL passent. Si `/coulisses` dépasse un seuil (scripts, performance, CLS), **ne pas relever la limite** : lire le poids par morceau dans le rapport (`.lighthouseci`), alléger, et le signaler ; libérer le port 3000 ;
  - `grep -rnP "[\x{00a0}\x{202f}]" apps/web/components/coulisses apps/web/lib apps/web/app/coulisses` → vide.

- [ ] **Step 10: Commit**

```bash
git add apps/web/lib/quand-libre.ts apps/web/lib/quand-libre.test.ts apps/web/components/direct/PresenceDirecte.tsx apps/web/components/coulisses/Courbe.tsx apps/web/components/coulisses/PanneauEnDirect.tsx apps/web/components/coulisses/PanneauEnDirect.test.tsx apps/web/components/coulisses/ArchitectureVivante.tsx apps/web/components/coulisses/ArchitectureVivante.test.tsx apps/web/app/coulisses/page.tsx apps/web/app/coulisses/page.test.tsx apps/web/scripts/verifier-accueil-statique.mjs apps/web/lighthouserc.json
git commit -m "Coulisses : page /coulisses avec le schéma et les mesures en direct, statique et mesurée par Lighthouse"
```

---

### Task 9: Lien du pied de page, plan du site et confidentialité

**Files:**
- Modify: `apps/web/components/layout/Footer.tsx`, `Footer.test.tsx`
- Modify: `apps/web/app/sitemap.ts`, `sitemap.test.ts`
- Modify: `apps/web/app/politique-de-confidentialite/page.tsx`, `page.test.tsx`

**Interfaces:**
- Consumes: page `/coulisses` (t8) ; section « Présence en direct » de la politique de confidentialité (sous-projet 4).
- Produces: lien « Coulisses » du pied de page ; `/coulisses` dans le plan du site (priorité 0,5) ; section « Coulisses » de la politique de confidentialité.

- [ ] **Step 1: Tests** — ajouter aux tests existants :
  - `components/layout/Footer.test.tsx` : `expect(screen.getByRole("link", { name: "Coulisses" })).toHaveAttribute("href", "/coulisses");`
  - `app/sitemap.test.ts` : `expect(urls).toContain(\`${siteUrl}/coulisses\`);` et un test « les coulisses ont la priorité 0,5 » (`sitemap().find((e) => e.url === \`${siteUrl}/coulisses\`)?.priority` vaut `0.5`) ;
  - `app/politique-de-confidentialite/page.test.tsx` : un test « décrit les mesures des coulisses » : `getByRole("heading", { name: "Coulisses" })`, `getByText(/ne sont ni enregistrées ni transmises/)` et `getByText(/le temps de la connexion/)`.

- [ ] **Step 2: Lancer** — `pnpm --filter web exec vitest run components/layout app/sitemap.test.ts app/politique-de-confidentialite` → FAIL.

- [ ] **Step 3: Pied de page** — `components/layout/Footer.tsx` : un `<li>` « Coulisses » (`<Link href="/coulisses" className="hover:text-encre">`) avant « Mentions légales » ; commentaire du composant : « Pied de page : signature, e-mail, GitHub, coulisses et pages légales. »

- [ ] **Step 4: Plan du site** — `app/sitemap.ts` : ajouter `"/coulisses"` à `pages` (après les études de cas) ; la priorité devient :

```ts
const priorite = (chemin: string) =>
  chemin === "" ? 1 : chemin === "/coulisses" ? 0.5 : chemin.startsWith("/mentions") || chemin.startsWith("/politique") ? 0.3 : 0.8;
```

    et `priority: priorite(chemin)`.

- [ ] **Step 5: Confidentialité** — `app/politique-de-confidentialite/page.tsx` : après la section « Présence en direct » (sous-projet 4), sur le même modèle :

```tsx
<div className="flex flex-col gap-3">
  <h2 className="text-xl font-semibold">Coulisses</h2>
  <p>
    La page Coulisses mesure, depuis votre navigateur, les temps de réponse du site, de sa base de
    données et du service temps réel. Ces mesures ne sont ni enregistrées ni transmises à des tiers.
  </p>
  <p>
    Votre adresse IP sert uniquement, en mémoire, à limiter le nombre de mesures : une minute pour
    l&apos;aller-retour vers le site, le temps de la connexion pour l&apos;écho du service temps réel
    (elle est oubliée à la fermeture de la page). Elle n&apos;est jamais enregistrée ni journalisée.
    La base légale est mon intérêt légitime à protéger le site contre les abus (article 6.1.f du
    RGPD). Aucun cookie ni stockage local n&apos;est utilisé pour ces mesures.
  </p>
</div>
```

- [ ] **Step 6: Lancer** — `pnpm --filter web exec vitest run components/layout app` → PASS ; `pnpm --filter web lint && pnpm --filter web typecheck` → PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/layout/Footer.tsx apps/web/components/layout/Footer.test.tsx apps/web/app/sitemap.ts apps/web/app/sitemap.test.ts apps/web/app/politique-de-confidentialite/page.tsx apps/web/app/politique-de-confidentialite/page.test.tsx
git commit -m "Coulisses : lien du pied de page, plan du site et section de la politique de confidentialité"
```

---

### Task 10: Section « Dernier déploiement »

**Files:**
- Create: `apps/web/lib/coulisses/infos-build.mjs`, `infos-build.test.ts`
- Create: `apps/web/lib/coulisses/build-info.ts`, `build-info.test.ts`
- Create: `apps/web/lib/coulisses/dates.ts`, `dates.test.ts`
- Create: `apps/web/components/coulisses/DateRelative.tsx`, `SectionDeploiement.tsx`, `SectionDeploiement.test.tsx`
- Modify: `apps/web/app/coulisses/page.tsx`, `apps/web/app/coulisses/page.test.tsx`, `apps/web/lib/coulisses/outils-test.ts` (`INFOS_EXEMPLE`), `.gitignore`

**Interfaces:**
- Consumes: page `/coulisses` (t8), `verifier-accueil-statique` (t8, vérifie `/coulisses`).
- Produces:
  - `infos-build.mjs` : `TITRE_MAX = 100`, `@typedef InfosBuild = { sha; titre; date; tests: { unitaires; boutEnBout }; lighthouse: { performance; accessibilite; bonnesPratiques; referencement; pages }; poidsJsAccueil }`, `validerInfosBuild(brut: unknown): InfosBuild | null` (utilisée aussi par la CI, tâche 11)
  - `build-info.ts` : `type InfosBuild`, `FICHIER_BUILD_INFO = "build-info.json"`, `lireBuildInfo(dossier?: string): InfosBuild | null`
  - `dates.ts` : `formaterDateAbsolue(iso): string`, `dateRelative(iso, maintenant: number): string`
  - `<SectionDeploiement infos={InfosBuild | null} />`, `<DateRelative iso />`

- [ ] **Step 1: Tests** — `apps/web/lib/coulisses/infos-build.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { validerInfosBuild } from "./infos-build.mjs";
import { INFOS_EXEMPLE } from "./outils-test";

describe("validerInfosBuild", () => {
  it("accepte des infos complètes", () => {
    expect(validerInfosBuild(INFOS_EXEMPLE)).toEqual(INFOS_EXEMPLE);
  });

  it("ne garde que les champs connus", () => {
    expect(validerInfosBuild({ ...INFOS_EXEMPLE, secret: "x" })).not.toHaveProperty("secret");
  });

  it.each([
    ["un SHA court", { sha: "0123456" }],
    ["un titre vide", { titre: "" }],
    ["un titre de plus de 100 caractères", { titre: "a".repeat(101) }],
    ["une date illisible", { date: "hier" }],
    ["un nombre de tests négatif", { tests: { unitaires: -1, boutEnBout: 68 } }],
    ["un nombre de tests décimal", { tests: { unitaires: 1.5, boutEnBout: 68 } }],
    ["une note au-delà de 1", { lighthouse: { ...INFOS_EXEMPLE.lighthouse, performance: 1.2 } }],
    ["une note absente", { lighthouse: { ...INFOS_EXEMPLE.lighthouse, referencement: null } }],
    ["aucune page mesurée", { lighthouse: { ...INFOS_EXEMPLE.lighthouse, pages: 0 } }],
    ["un poids absent", { poidsJsAccueil: undefined }],
  ])("refuse %s", (_cas, changement) => {
    expect(validerInfosBuild({ ...INFOS_EXEMPLE, ...changement })).toBeNull();
  });

  it("refuse ce qui n'est pas un objet", () => {
    expect(validerInfosBuild(null)).toBeNull();
    expect(validerInfosBuild("{}")).toBeNull();
  });
});
```

`apps/web/lib/coulisses/build-info.test.ts` :

```ts
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { FICHIER_BUILD_INFO, lireBuildInfo } from "./build-info";
import { INFOS_EXEMPLE } from "./outils-test";

const dossier = (contenu?: string) => {
  const d = mkdtempSync(join(tmpdir(), "build-info-"));
  if (contenu !== undefined) writeFileSync(join(d, FICHIER_BUILD_INFO), contenu);
  return d;
};

describe("lireBuildInfo", () => {
  it("fichier absent (build local) : null", () => {
    expect(lireBuildInfo(dossier())).toBeNull();
  });
  it("fichier valide : ses infos", () => {
    expect(lireBuildInfo(dossier(JSON.stringify(INFOS_EXEMPLE)))).toEqual(INFOS_EXEMPLE);
  });
  it("fichier invalide ou illisible : null, avec un avertissement au build", () => {
    const avertir = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(lireBuildInfo(dossier("{ pas du json"))).toBeNull();
    expect(lireBuildInfo(dossier(JSON.stringify({ ...INFOS_EXEMPLE, sha: "court" })))).toBeNull();
    expect(avertir).toHaveBeenCalledTimes(2);
    avertir.mockRestore();
  });
});
```

(`INFOS_EXEMPLE` vit dans `lib/coulisses/outils-test.ts` — importer un fichier `.test.ts` depuis un autre y rejouerait ses tests. L'ajouter à la fin de ce fichier :

```ts
/** Infos de build complètes et valides, pour les tests des coulisses. */
export const INFOS_EXEMPLE = {
  sha: "0123456789abcdef0123456789abcdef01234567",
  titre: "Coulisses : page /coulisses",
  date: "2026-10-09T14:00:00.000Z",
  tests: { unitaires: 412, boutEnBout: 68 },
  lighthouse: { performance: 0.97, accessibilite: 1, bonnesPratiques: 1, referencement: 1, pages: 5 },
  poidsJsAccueil: 158_436,
};
```
)

`apps/web/lib/coulisses/dates.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { dateRelative, formaterDateAbsolue } from "./dates";

const ISO = "2026-10-09T14:00:00.000Z";
const t = Date.parse(ISO);

describe("dates", () => {
  it("date absolue, en français, heure de Paris", () => {
    // ICU peut écrire « 16:00 » ou « 16 h 00 » selon sa version.
    expect(formaterDateAbsolue(ISO)).toMatch(/9 octobre 2026/);
    expect(formaterDateAbsolue(ISO)).toMatch(/16\s?(:|h)\s?00/);
  });
  it.each([
    [30 * 1_000, "à l'instant"],
    [5 * 60_000, "il y a 5 minutes"],
    [3 * 3_600_000, "il y a 3 heures"],
    [24 * 3_600_000, "hier"],
    [10 * 24 * 3_600_000, "il y a 10 jours"],
  ])("%d ms après : « %s »", (ecart, attendu) => {
    expect(dateRelative(ISO, t + ecart)).toBe(attendu);
  });
});
```

`apps/web/components/coulisses/SectionDeploiement.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { INFOS_EXEMPLE } from "@/lib/coulisses/outils-test";
import { SectionDeploiement } from "./SectionDeploiement";

describe("SectionDeploiement", () => {
  it("donne le commit, sa date et les preuves de qualité mesurées par la CI", () => {
    render(<SectionDeploiement infos={INFOS_EXEMPLE} />);
    expect(screen.getByRole("heading", { level: 2, name: "Dernier déploiement" })).toBeInTheDocument();
    expect(screen.getByText("0123456")).toBeInTheDocument();
    expect(screen.getByText(INFOS_EXEMPLE.titre)).toBeInTheDocument();
    expect(screen.getByText(/412 tests unitaires et d'intégration/)).toBeInTheDocument();
    expect(screen.getByText(/68 de bout en bout/)).toBeInTheDocument();
    expect(screen.getByText(/Performance 97/)).toBeInTheDocument();
    expect(screen.getByText(/155\u00a0Ko/)).toBeInTheDocument();
    expect(screen.getByText(/Mesurés par la CI sur ce commit/)).toBeInTheDocument();
    expect(screen.getByText(/la plus basse des 5 pages mesurées/)).toBeInTheDocument();
    const date = document.querySelector("time")!;
    expect(date).toHaveAttribute("dateTime", INFOS_EXEMPLE.date);
  });

  it("sans infos (build local) : le dit simplement", () => {
    render(<SectionDeploiement infos={null} />);
    expect(screen.getByText("Build local : pas de mesures CI.")).toBeInTheDocument();
  });
});
```

Dans `apps/web/app/coulisses/page.test.tsx`, en tête (avant l'import de la page) :

```tsx
import { vi } from "vitest";
// Un build-info.json local (ignoré par Git) ne doit pas changer le test.
vi.mock("@/lib/coulisses/build-info", () => ({ lireBuildInfo: () => null }));
```

et dans le test : `expect(screen.getByText("Build local : pas de mesures CI.")).toBeInTheDocument();`.

- [ ] **Step 2: Lancer** — `pnpm --filter web exec vitest run lib/coulisses components/coulisses app/coulisses` → FAIL.

- [ ] **Step 3: `apps/web/lib/coulisses/infos-build.mjs`**

```js
/**
 * Infos du build affichées dans les coulisses (spec du sous-projet 5, §6),
 * validées ici par la CI (scripts/assembler-build-info.mjs) comme par le site
 * (lib/coulisses/build-info.ts) : une seule règle pour les deux.
 *
 * @typedef {{ performance: number, accessibilite: number, bonnesPratiques: number, referencement: number, pages: number }} NotesLighthouse
 * @typedef {{ unitaires: number, boutEnBout: number }} NombresTests
 * @typedef {{ sha: string, titre: string, date: string, tests: NombresTests, lighthouse: NotesLighthouse, poidsJsAccueil: number }} InfosBuild
 */

export const TITRE_MAX = 100;

/** @param {unknown} v @returns {Record<string, unknown>} */
const objet = (v) => (typeof v === "object" && v !== null ? /** @type {Record<string, unknown>} */ (v) : {});
/** @param {unknown} v */
const entier = (v) => typeof v === "number" && Number.isInteger(v) && v >= 0;
/** @param {unknown} v */
const note = (v) => typeof v === "number" && v >= 0 && v <= 1;

/**
 * @param {unknown} brut
 * @returns {InfosBuild | null}
 */
export function validerInfosBuild(brut) {
  if (typeof brut !== "object" || brut === null) return null;
  const b = objet(brut);
  const t = objet(b.tests);
  const l = objet(b.lighthouse);
  const valide =
    typeof b.sha === "string" &&
    /^[0-9a-f]{40}$/.test(b.sha) &&
    typeof b.titre === "string" &&
    b.titre.length > 0 &&
    b.titre.length <= TITRE_MAX &&
    typeof b.date === "string" &&
    !Number.isNaN(Date.parse(b.date)) &&
    entier(t.unitaires) &&
    entier(t.boutEnBout) &&
    note(l.performance) &&
    note(l.accessibilite) &&
    note(l.bonnesPratiques) &&
    note(l.referencement) &&
    entier(l.pages) &&
    /** @type {number} */ (l.pages) > 0 &&
    entier(b.poidsJsAccueil);
  if (!valide) return null;
  return /** @type {InfosBuild} */ ({
    sha: b.sha,
    titre: b.titre,
    date: b.date,
    tests: { unitaires: t.unitaires, boutEnBout: t.boutEnBout },
    lighthouse: {
      performance: l.performance,
      accessibilite: l.accessibilite,
      bonnesPratiques: l.bonnesPratiques,
      referencement: l.referencement,
      pages: l.pages,
    },
    poidsJsAccueil: b.poidsJsAccueil,
  });
}
```

- [ ] **Step 4: `apps/web/lib/coulisses/build-info.ts`**

```ts
/**
 * `build-info.json` : écrit par la CI avant le build de l'image (tâche CI
 * « image »), ignoré par Git, lu ici au build — la page des coulisses reste
 * statique. Absent (build local) ou invalide : `null`, et la section
 * « Dernier déploiement » le dit.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validerInfosBuild, type InfosBuild } from "./infos-build.mjs";

export type { InfosBuild };
export const FICHIER_BUILD_INFO = "build-info.json";

/** Le build du site s'exécute dans `apps/web` (`pnpm --filter web build`, en CI comme dans l'image). */
export function lireBuildInfo(dossier: string = process.cwd()): InfosBuild | null {
  let brut: string;
  try {
    brut = readFileSync(join(dossier, FICHIER_BUILD_INFO), "utf8");
  } catch {
    return null;
  }
  let infos: InfosBuild | null = null;
  try {
    infos = validerInfosBuild(JSON.parse(brut));
  } catch {
    infos = null;
  }
  if (!infos) console.warn(`[coulisses] ${FICHIER_BUILD_INFO} invalide : section « Dernier déploiement » en repli.`);
  return infos;
}
```

(Si `typecheck` ne voit pas le type `InfosBuild` exporté par le `@typedef` du `.mjs`, déclarer le type en TypeScript ici, identique, et garder `validerInfosBuild` du `.mjs` ; le signaler.)

- [ ] **Step 5: `apps/web/lib/coulisses/dates.ts`**

```ts
const relatif = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
const absolu = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });

export const formaterDateAbsolue = (iso: string) => absolu.format(new Date(iso));

const UNITES: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** « il y a 3 heures », « hier »… ; moins d'une minute : « à l'instant ». */
export function dateRelative(iso: string, maintenant: number): string {
  const secondes = Math.round((Date.parse(iso) - maintenant) / 1_000);
  for (const [unite, duree] of UNITES) {
    if (Math.abs(secondes) >= duree) return relatif.format(Math.round(secondes / duree), unite);
  }
  return "à l'instant";
}
```

- [ ] **Step 6: `apps/web/components/coulisses/DateRelative.tsx`**

```tsx
"use client";

import { useSyncExternalStore } from "react";
import { dateRelative, formaterDateAbsolue } from "@/lib/coulisses/dates";

const MINUTE = 60_000;
const abonnerMinute = (fn: () => void) => {
  const id = window.setInterval(fn, MINUTE);
  return () => window.clearInterval(id);
};
const minuteCourante = () => Math.floor(Date.now() / MINUTE);

/**
 * Date du build : absolue au rendu serveur (la page reste statique), relative
 * dans le navigateur (« il y a 3 heures »), sur une seule ligne dans les deux cas.
 */
export function DateRelative({ iso }: { iso: string }) {
  const minute = useSyncExternalStore(abonnerMinute, minuteCourante, () => null);
  const absolue = formaterDateAbsolue(iso);
  return (
    <time dateTime={iso} title={absolue} className="whitespace-nowrap text-sm text-encre-douce">
      {minute === null ? absolue : dateRelative(iso, minute * MINUTE)}
    </time>
  );
}
```

- [ ] **Step 7: `apps/web/components/coulisses/SectionDeploiement.tsx`**

```tsx
import type { InfosBuild } from "@/lib/coulisses/build-info";
import { DateRelative } from "./DateRelative";

const note = (v: number) => Math.round(v * 100);
const ko = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Identité du build en ligne et preuves de qualité mesurées par la CI sur ce commit. */
export function SectionDeploiement({ infos }: { infos: InfosBuild | null }) {
  return (
    <section aria-labelledby="titre-deploiement" className="flex flex-col gap-6">
      <h2 id="titre-deploiement" className="font-serif text-3xl">
        Dernier déploiement
      </h2>
      {infos ? (
        <>
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <code className="rounded bg-encre/5 px-1.5 py-0.5 text-sm">{infos.sha.slice(0, 7)}</code>
            <span>{infos.titre}</span>
            <DateRelative iso={infos.date} />
          </p>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-xl border border-trait p-5">
              <dt className="text-sm text-encre-douce">Tests</dt>
              <dd>
                {infos.tests.unitaires} tests unitaires et d&apos;intégration, {infos.tests.boutEnBout} de bout en bout
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-trait p-5">
              <dt className="text-sm text-encre-douce">Lighthouse (sur 100)</dt>
              <dd>
                Performance {note(infos.lighthouse.performance)} · Accessibilité {note(infos.lighthouse.accessibilite)} ·
                Bonnes pratiques {note(infos.lighthouse.bonnesPratiques)} · Référencement{" "}
                {note(infos.lighthouse.referencement)}
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-trait p-5">
              <dt className="text-sm text-encre-douce">JavaScript de l&apos;accueil</dt>
              <dd>{`${ko.format(infos.poidsJsAccueil / 1_024)}\u00a0Ko transférés`}</dd>
            </div>
          </dl>
          <p className="text-sm text-encre-douce">
            Mesurés par la CI sur ce commit. Notes Lighthouse : la plus basse des {infos.lighthouse.pages} pages
            mesurées.
          </p>
        </>
      ) : (
        <p className="text-encre-douce">Build local : pas de mesures CI.</p>
      )}
    </section>
  );
}
```

- [ ] **Step 8: Page et `.gitignore`** —
  - `app/coulisses/page.tsx` : après `<ArchitectureVivante />`, `<SectionDeploiement infos={lireBuildInfo()} />` (imports `@/components/coulisses/SectionDeploiement`, `@/lib/coulisses/build-info`) ;
  - `.gitignore` (racine), près de `.lighthouseci/` :

```
# Coulisses : écrit par la CI avant le build de l'image (jamais commité).
apps/web/build-info.json
```

- [ ] **Step 9: Lancer** —
  - `pnpm --filter web exec vitest run lib/coulisses components/coulisses app/coulisses` → PASS ; `pnpm --filter web lint && pnpm --filter web typecheck` → PASS ;
  - la preuve se lit dans le **HTML prérendu**, pas dans le JavaScript (qui contient les deux textes) : `H=apps/web/.next/server/app/coulisses.html` (si ce chemin n'existe pas dans cette version de Next, le trouver avec `grep -rl "Dernier déploiement" apps/web/.next/server --include=*.html` et le noter) ;
  - repli local : `pnpm build` → la sortie liste `○ /coulisses` ; `pnpm --filter web verifier-accueil-statique` → OK ; `grep -c "Build local" $H` → `1` ;
  - avec données : écrire `apps/web/build-info.json` à partir de `INFOS_EXEMPLE` (avec `JSON.stringify`), `pnpm build` → `○ /coulisses` et `verifier-accueil-statique` OK ; `grep -c "0123456" $H` → `1` **et** `grep -c "Build local" $H` → `0` ; puis **supprimer** `apps/web/build-info.json`.
  Si `/coulisses` passe en `ƒ`, la lecture du fichier rend la page dynamique : s'arrêter et le signaler (le fichier ne serait alors pas dans l'image de production, qui afficherait « Build local »).

- [ ] **Step 10: Commit**

```bash
git add apps/web/lib/coulisses/infos-build.mjs apps/web/lib/coulisses/infos-build.test.ts apps/web/lib/coulisses/build-info.ts apps/web/lib/coulisses/build-info.test.ts apps/web/lib/coulisses/dates.ts apps/web/lib/coulisses/dates.test.ts apps/web/components/coulisses/DateRelative.tsx apps/web/components/coulisses/SectionDeploiement.tsx apps/web/components/coulisses/SectionDeploiement.test.tsx apps/web/app/coulisses/page.tsx apps/web/app/coulisses/page.test.tsx apps/web/lib/coulisses/outils-test.ts .gitignore
git commit -m "Coulisses : section « Dernier déploiement » lue au build depuis build-info.json"
```

---

### Task 11: Scripts de mesure de la CI

**Files:**
- Create: `apps/web/scripts/compter-tests.mjs`, `apps/web/scripts/extraire-lighthouse.mjs`, `apps/web/scripts/assembler-build-info.mjs`, `apps/web/scripts/mesures-ci.test.ts`
- Modify: `apps/web/vitest.config.ts`, `apps/demo-marches/vite.config.ts`, `apps/realtime/vitest.config.ts`, `apps/web/playwright.config.ts` (rapporteurs JSON en CI seulement), `.gitignore`, `.dockerignore`

**Interfaces:**
- Consumes: `validerInfosBuild`, `TITRE_MAX` (t10) ; `INFOS_EXEMPLE` (`lib/coulisses/outils-test.ts`, t10).
- Produces:
  - rapports JSON, en CI seulement : `apps/*/.mesures/vitest.json`, `apps/web/.mesures/playwright.json`
  - `testsVitest(rapport): number`, `testsPlaywright(rapport): number` (`compter-tests.mjs`) ; CLI `node compter-tests.mjs vitest <f>…` → `{"unitaires":N}`, `node compter-tests.mjs playwright <f>` → `{"boutEnBout":N}`
  - `extraireLighthouse(manifeste, lireRapport): { lighthouse, poidsJsAccueil }` ; CLI `node extraire-lighthouse.mjs <manifest.json>` (chemins des rapports résolus depuis le dossier du manifeste)
  - `assembler({ unitaires, boutEnBout, lighthouse, poidsJsAccueil, sha, titre, date }): InfosBuild` (refuse un titre avec une adresse e-mail ou IP) ; CLI `node assembler-build-info.mjs --verifier <f> --tests-e2e <f> --lighthouse <f>` → JSON sur la sortie standard

- [ ] **Step 1: Formats réels, avant tout code** — produire un rapport réel de chaque outil, dans un dossier temporaire, et vérifier les champs que les scripts vont lire :

```bash
D=$(mktemp -d)
pnpm --filter realtime exec vitest run --reporter=json --outputFile="$D/vitest.json"
node -e 'const r=require(process.argv[1]); console.log(r.numPassedTests, r.numFailedTests)' "$D/vitest.json"
pnpm build
pnpm --filter web exec playwright test e2e/replis.spec.ts --project=ordinateur --reporter=json > "$D/playwright.json"
node -e 'const r=require(process.argv[1]); console.log(r.stats)' "$D/playwright.json"
```

  et, pour Lighthouse, le dernier `apps/web/.lighthouseci/manifest.json` (tâche 8) : entrées `{ url, isRepresentativeRun, jsonPath, summary: { performance, accessibility, "best-practices", seo } }`, et dans chaque rapport `jsonPath`, `audits["resource-summary"].details.items[]` avec `{ resourceType: "script", transferSize }`.
  Attendu : `numPassedTests` / `numFailedTests` (Vitest), `stats.expected` / `stats.unexpected` / `stats.flaky` (Playwright), et les champs Lighthouse ci-dessus. Si un champ diffère, adapter les fonctions **et** les fichiers d'exemple des tests de l'étape 2, et le signaler.

- [ ] **Step 2: Tests** — `apps/web/scripts/mesures-ci.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { INFOS_EXEMPLE } from "@/lib/coulisses/outils-test";
import { assembler } from "./assembler-build-info.mjs";
import { testsPlaywright, testsVitest } from "./compter-tests.mjs";
import { extraireLighthouse } from "./extraire-lighthouse.mjs";

describe("testsVitest", () => {
  it("compte les tests passés", () => expect(testsVitest({ numPassedTests: 293, numFailedTests: 0 })).toBe(293));
  it("refuse un rapport en échec ou illisible", () => {
    expect(() => testsVitest({ numPassedTests: 293, numFailedTests: 1 })).toThrow();
    expect(() => testsVitest({})).toThrow();
  });
});

describe("testsPlaywright", () => {
  it("compte les tests passés, y compris au second essai", () =>
    expect(testsPlaywright({ stats: { expected: 60, flaky: 2, unexpected: 0, skipped: 3 } })).toBe(62));
  it("refuse un rapport en échec", () =>
    expect(() => testsPlaywright({ stats: { expected: 60, flaky: 0, unexpected: 1 } })).toThrow());
});

describe("extraireLighthouse", () => {
  const passage = (chemin: string, perf: number, jsonPath = "autre.json") => ({
    url: `http://127.0.0.1:3000${chemin}`,
    isRepresentativeRun: false,
    jsonPath,
    summary: { performance: perf, accessibility: 1, "best-practices": 0.96, seo: 1 },
  });
  const manifeste = [
    passage("/", 0.5, "a1.json"),
    passage("/", 0.98, "a2.json"),
    passage("/", 0.97, "a3.json"),
    passage("/coulisses", 0.96),
    passage("/coulisses", 0.99),
    passage("/coulisses", 0.95),
    passage("/?pour=exemple-0000", 0.99),
  ];
  const scripts = (octets: number) => ({
    audits: {
      "resource-summary": {
        details: { items: [{ resourceType: "total", transferSize: 400_000 }, { resourceType: "script", transferSize: octets }] },
      },
    },
  });
  const rapports: Record<string, unknown> = { "a1.json": scripts(150_000), "a2.json": scripts(158_436), "a3.json": scripts(160_000) };
  const lire = (chemin: string) => rapports[chemin];

  it("médiane des passages de chaque page, puis la note la plus basse des pages", () => {
    expect(extraireLighthouse(manifeste, lire)).toEqual({
      lighthouse: { performance: 0.96, accessibilite: 1, bonnesPratiques: 0.96, referencement: 1, pages: 3 },
      poidsJsAccueil: 158_436,
    });
  });

  it("refuse un manifeste sans l'accueil", () => {
    expect(() => extraireLighthouse([passage("/coulisses", 1)], lire)).toThrow("Accueil");
  });

  it("refuse une note absente plutôt que d'afficher 0", () => {
    const sansSeo = { ...passage("/", 1, "a2.json"), summary: { performance: 1, accessibility: 1, "best-practices": 1 } };
    expect(() => extraireLighthouse([sansSeo], lire)).toThrow("seo");
  });

  it("refuse un rapport de l'accueil sans poids de scripts", () => {
    expect(() => extraireLighthouse([passage("/", 1, "absent.json")], lire)).toThrow("JavaScript");
  });
});

describe("assembler", () => {
  const { tests, lighthouse, poidsJsAccueil, sha, date } = INFOS_EXEMPLE;
  const base = { ...tests, lighthouse, poidsJsAccueil, sha, date };

  it("coupe le titre à 100 caractères et valide l'ensemble", () => {
    const infos = assembler({ ...base, titre: `  ${"a".repeat(150)}  ` });
    expect(infos.titre).toHaveLength(100);
  });

  it("échoue si une donnée manque", () => {
    expect(() => assembler({ ...base, titre: "ok", boutEnBout: undefined })).toThrow("Infos de build invalides");
  });

  it.each(["Contact : réponse à quelqu'un@exemple.fr", "Proxy : 10.1.2.3 en dur"])(
    "refuse un titre qui deviendrait public avec une adresse : %s",
    (titre) => {
      expect(() => assembler({ ...base, titre })).toThrow("Titre de commit refusé");
    },
  );
});
```

- [ ] **Step 3: Lancer** — `pnpm --filter web exec vitest run scripts/mesures-ci.test.ts` → FAIL (modules absents).

- [ ] **Step 4: `apps/web/scripts/compter-tests.mjs`**

```js
/**
 * Compte les tests passés à partir des rapports JSON de Vitest ou de
 * Playwright, pour la section « Dernier déploiement » des coulisses.
 *
 * Usage (CI) :
 *   node apps/web/scripts/compter-tests.mjs vitest <rapport.json>...  → {"unitaires":N}
 *   node apps/web/scripts/compter-tests.mjs playwright <rapport.json> → {"boutEnBout":N}
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Rapport Vitest (format compatible Jest) : tests passés ; refuse un rapport en échec. */
export function testsVitest(rapport) {
  const n = rapport?.numPassedTests;
  if (!Number.isInteger(n) || rapport.numFailedTests !== 0) throw new Error("Rapport Vitest illisible ou en échec.");
  return n;
}

/** Rapport Playwright : tests passés, y compris ceux réussis au second essai. */
export function testsPlaywright(rapport) {
  const s = rapport?.stats;
  if (!s || !Number.isInteger(s.expected) || !Number.isInteger(s.flaky) || s.unexpected !== 0) {
    throw new Error("Rapport Playwright illisible ou en échec.");
  }
  return s.expected + s.flaky;
}

const lanceDirectement = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (lanceDirectement) {
  const [type, ...fichiers] = process.argv.slice(2);
  const rapports = fichiers.map((f) => JSON.parse(readFileSync(f, "utf8")));
  if (type === "vitest" && rapports.length > 0) {
    console.log(JSON.stringify({ unitaires: rapports.reduce((total, r) => total + testsVitest(r), 0) }));
  } else if (type === "playwright" && rapports.length === 1) {
    console.log(JSON.stringify({ boutEnBout: testsPlaywright(rapports[0]) }));
  } else {
    console.error("Usage : compter-tests.mjs vitest <rapport.json>... | playwright <rapport.json>");
    process.exit(1);
  }
}
```

- [ ] **Step 5: `apps/web/scripts/extraire-lighthouse.mjs`**

```js
/**
 * Notes Lighthouse pour les coulisses, depuis `.lighthouseci/manifest.json` :
 * les passages sont regroupés par page ; chaque page est prise à sa médiane
 * (5 passages en CI), puis on garde, par catégorie, la note la plus basse des
 * pages. Le poids du JavaScript de l'accueil est lui aussi la médiane de ses
 * passages. Une note ou un poids absent fait échouer le script : jamais de 0
 * affiché comme une mesure.
 *
 * Usage (CI) : node apps/web/scripts/extraire-lighthouse.mjs apps/web/.lighthouseci/manifest.json
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CATEGORIES = {
  performance: "performance",
  accessibilite: "accessibility",
  bonnesPratiques: "best-practices",
  referencement: "seo",
};

function mediane(valeurs) {
  const triees = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(triees.length / 2);
  return triees.length % 2 ? triees[milieu] : (triees[milieu - 1] + triees[milieu]) / 2;
}

export function extraireLighthouse(manifeste, lireRapport) {
  const parPage = new Map();
  for (const passage of manifeste) {
    const url = new URL(passage.url);
    const page = url.pathname + url.search;
    if (!parPage.has(page)) parPage.set(page, []);
    parPage.get(page).push(passage);
  }
  const accueil = parPage.get("/");
  if (!accueil) throw new Error("Accueil absent du manifeste Lighthouse.");

  const note = (passage, cle) => {
    const v = passage.summary?.[cle];
    if (typeof v !== "number") throw new Error(`Note « ${cle} » absente pour ${passage.url}.`);
    return v;
  };
  const lighthouse = {};
  for (const [nom, cle] of Object.entries(CATEGORIES)) {
    lighthouse[nom] = Math.min(...[...parPage.values()].map((passages) => mediane(passages.map((p) => note(p, cle)))));
  }
  lighthouse.pages = parPage.size;

  const poids = accueil.map((p) => {
    const scripts = lireRapport(p.jsonPath)?.audits?.["resource-summary"]?.details?.items?.find(
      (i) => i.resourceType === "script",
    );
    if (!Number.isInteger(scripts?.transferSize)) throw new Error("Poids du JavaScript de l'accueil introuvable.");
    return scripts.transferSize;
  });
  return { lighthouse, poidsJsAccueil: Math.round(mediane(poids)) };
}

const lanceDirectement = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (lanceDirectement) {
  const chemin = process.argv[2];
  if (!chemin) {
    console.error("Usage : extraire-lighthouse.mjs <manifest.json>");
    process.exit(1);
  }
  const manifeste = JSON.parse(readFileSync(chemin, "utf8"));
  // Les chemins des rapports peuvent être relatifs au dossier du manifeste.
  const lire = (f) => JSON.parse(readFileSync(resolve(dirname(chemin), f), "utf8"));
  console.log(JSON.stringify(extraireLighthouse(manifeste, lire)));
}
```

- [ ] **Step 6: `apps/web/scripts/assembler-build-info.mjs`**

```js
/**
 * Assemble `build-info.json` pour les coulisses, dans le job « image » de la CI,
 * avant le build Docker : mesures des jobs précédents (artefacts), commit et
 * date. Une donnée manquante ou invalide fait échouer le job.
 *
 * Le titre du commit devient public : un titre qui contient une adresse e-mail
 * ou IP fait échouer le job (le corriger par un nouveau commit).
 *
 * Usage (CI) :
 *   node apps/web/scripts/assembler-build-info.mjs --verifier mesures-verifier.json \
 *     --tests-e2e mesures-e2e-tests.json --lighthouse mesures-lighthouse.json > apps/web/build-info.json
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { TITRE_MAX, validerInfosBuild } from "../lib/coulisses/infos-build.mjs";

const SENSIBLE = /@|\b\d{1,3}(\.\d{1,3}){3}\b/;

export function assembler({ unitaires, boutEnBout, lighthouse, poidsJsAccueil, sha, titre, date }) {
  const propre = titre.trim().slice(0, TITRE_MAX);
  if (SENSIBLE.test(propre)) throw new Error("Titre de commit refusé : il contient une adresse e-mail ou IP.");
  const infos = validerInfosBuild({
    sha,
    titre: propre,
    date,
    tests: { unitaires, boutEnBout },
    lighthouse,
    poidsJsAccueil,
  });
  if (!infos) throw new Error("Infos de build invalides ou incomplètes.");
  return infos;
}

const lanceDirectement = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (lanceDirectement) {
  const { values } = parseArgs({
    options: { verifier: { type: "string" }, "tests-e2e": { type: "string" }, lighthouse: { type: "string" } },
  });
  const lire = (f) => JSON.parse(readFileSync(f, "utf8"));
  const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
  const { unitaires } = lire(values.verifier);
  const { boutEnBout } = lire(values["tests-e2e"]);
  const { lighthouse, poidsJsAccueil } = lire(values.lighthouse);
  const infos = assembler({
    unitaires,
    boutEnBout,
    lighthouse,
    poidsJsAccueil,
    sha: process.env.GITHUB_SHA ?? git("rev-parse", "HEAD"),
    titre: git("log", "-1", "--format=%s"),
    date: new Date().toISOString(),
  });
  console.log(JSON.stringify(infos, null, 2));
}
```

- [ ] **Step 7: Rapporteurs JSON, en CI seulement**
  - `apps/web/vitest.config.ts`, dans `test` (rien ne change hors CI : pas de dossier `.mesures` à créer en local) :

```ts
    // En CI, un rapport JSON en plus : le nombre de tests passés est affiché dans les coulisses.
    ...(process.env.CI ? { reporters: ["default", "json"], outputFile: { json: ".mesures/vitest.json" } } : {}),
```

  - la même ligne (et son commentaire) dans le bloc `test` de `apps/demo-marches/vite.config.ts` et de `apps/realtime/vitest.config.ts` ;
  - `apps/web/playwright.config.ts` : `reporter: process.env.CI ? [["github"], ["html", { open: "never" }], ["json", { outputFile: ".mesures/playwright.json" }]] : "list",` ;
  - `.gitignore` : `.mesures/` (commentaire : « Rapports JSON des tests en CI (coulisses). ») ; `.dockerignore` : `**/.mesures`.

- [ ] **Step 8: Lancer** —
  - `pnpm --filter web exec vitest run scripts/mesures-ci.test.ts` → PASS ; `pnpm lint && pnpm typecheck && pnpm test` → PASS, et aucun dossier `.mesures` créé ;
  - essai réel : `CI=1 pnpm test` puis `node apps/web/scripts/compter-tests.mjs vitest apps/web/.mesures/vitest.json apps/demo-marches/.mesures/vitest.json apps/realtime/.mesures/vitest.json` → la somme des trois « Tests … passed » ; `node apps/web/scripts/extraire-lighthouse.mjs apps/web/.lighthouseci/manifest.json` sur le manifeste de la tâche 8 → notes plausibles, `pages` = 5 ; supprimer ensuite les dossiers `.mesures`.

- [ ] **Step 9: Commit**

```bash
git add apps/web/scripts/compter-tests.mjs apps/web/scripts/extraire-lighthouse.mjs apps/web/scripts/assembler-build-info.mjs apps/web/scripts/mesures-ci.test.ts apps/web/vitest.config.ts apps/demo-marches/vite.config.ts apps/realtime/vitest.config.ts apps/web/playwright.config.ts .gitignore .dockerignore
git commit -m "Coulisses : scripts de mesure (tests, Lighthouse) et assemblage de build-info.json"
```

---

### Task 12: CI — mesures et `build-info.json` dans l'image

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: rapports `.mesures/*.json` et les trois scripts (t11) ; `apps/web/.lighthouseci/manifest.json` (job `e2e`).
- Produces: artefacts `mesures-verifier` (`mesures-verifier.json`) et `mesures-e2e` (`mesures-e2e-tests.json`, `mesures-lighthouse.json`) ; `apps/web/build-info.json` écrit dans le job `image` (variante `site`) avant le build Docker.

- [ ] **Step 1: Modifier `.github/workflows/ci.yml`** :
  - job `verifier`, après `- run: pnpm test` :

```yaml
      # Coulisses : nombre de tests passés, repris dans l'image (build-info.json).
      - name: Mesures des tests
        run: >-
          node apps/web/scripts/compter-tests.mjs vitest
          apps/web/.mesures/vitest.json apps/demo-marches/.mesures/vitest.json apps/realtime/.mesures/vitest.json
          > mesures-verifier.json

      - uses: actions/upload-artifact@v4
        with:
          name: mesures-verifier
          path: mesures-verifier.json
          retention-days: 7
```

  - job `e2e`, après `- run: pnpm e2e` :

```yaml
      - name: Mesures des tests de bout en bout
        run: node apps/web/scripts/compter-tests.mjs playwright apps/web/.mesures/playwright.json > mesures-e2e-tests.json
```

    et après `- run: pnpm --filter web lighthouse` :

```yaml
      - name: Mesures Lighthouse
        run: node apps/web/scripts/extraire-lighthouse.mjs apps/web/.lighthouseci/manifest.json > mesures-lighthouse.json

      - uses: actions/upload-artifact@v4
        with:
          name: mesures-e2e
          path: |
            mesures-e2e-tests.json
            mesures-lighthouse.json
          retention-days: 7
```

  - job `image`, après `- uses: actions/checkout@v7`, avant `docker/setup-buildx-action` :

```yaml
      # Coulisses : build-info.json (commit, date, tests, Lighthouse) avant le build
      # de l'image du site ; il entre dans le contexte Docker (non ignoré).
      - uses: actions/download-artifact@v4
        if: matrix.nom == 'site'
        with:
          pattern: mesures-*
          merge-multiple: true

      - uses: actions/setup-node@v7
        if: matrix.nom == 'site'
        with:
          node-version: 22

      - name: Infos du build pour les coulisses
        if: matrix.nom == 'site'
        run: >-
          node apps/web/scripts/assembler-build-info.mjs
          --verifier mesures-verifier.json --tests-e2e mesures-e2e-tests.json --lighthouse mesures-lighthouse.json
          > apps/web/build-info.json
```

  Vérifier que `.dockerignore` n'exclut ni `apps/web/build-info.json` ni `apps/web/scripts` (le build Docker n'en a pas besoin, mais le fichier JSON doit entrer dans le contexte).

- [ ] **Step 2: Vérifier** —
  - YAML : `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` → sans erreur ; relire les `if: matrix.nom == 'site'` (trois étapes) ;
  - enchaînement réel, en local, comme la CI : à partir des rapports produits en tâche 11 (`CI=1 pnpm test`, puis `CI=1 pnpm e2e` après un build, et le manifeste Lighthouse), lancer les trois commandes des étapes ci-dessus avec les mêmes chemins, puis `node apps/web/scripts/assembler-build-info.mjs --verifier mesures-verifier.json --tests-e2e mesures-e2e-tests.json --lighthouse mesures-lighthouse.json` → un JSON valide ; supprimer ensuite les fichiers `mesures-*.json` et les dossiers `.mesures`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "Coulisses : la CI publie ses mesures et écrit build-info.json avant l'image du site"
```

---

### Task 13: Scène 3D (Three.js)

**Files:**
- Modify: `apps/web/package.json` (dépendances `three`, `@types/three`), `pnpm-lock.yaml`
- Create: `apps/web/lib/coulisses/geometrie3d.ts`, `geometrie3d.test.ts`
- Create: `apps/web/lib/coulisses/webgl.ts`
- Create: `apps/web/lib/coulisses/scene3d.ts`

**Interfaces:**
- Consumes: `NOEUDS`, `CADRES`, `type Noeud`, `type Liaison`, `type IdNoeud` (t6) ; `type Serie` (t3).
- Produces:
  - `position3d(n: Noeud): [number, number, number]`, `periodePaquet(ms: number | null): number`
  - `webglDisponible(): boolean`, `oublierWebgl(): void` (tests)
  - `MARQUEUR_3D = "scene-3d:v1"`, `type OptionsScene = { conteneur; noeuds; liaisons; latences(); mouvementReduit; surChoix(id); surPerte() }`, `type Scene3D = { readonly marqueur: string; choisir(id: IdNoeud): void; arreter(): void }`, `creerScene(o: OptionsScene): Scene3D` (lève une erreur si WebGL échoue ; appelle `surPerte` sur `webglcontextlost`)

La scène n'est pas testable dans jsdom (pas de WebGL) : cette tâche la compile et la vérifie par le lint et les types ; son essai réel (canevas, clic, retour en 2D) est le test de bout en bout de la tâche 14.

Lire avant : dans `node_modules/three`, les chemins exportés de `OrbitControls` et `CSS2DRenderer` (`three/addons/...`) et la signature de `OrbitControls.update`.

- [ ] **Step 1: Dépendances** — `pnpm --filter web add three@^0.186.1 && pnpm --filter web add -D @types/three@^0.186.0`.

- [ ] **Step 2: Tests** — `apps/web/lib/coulisses/geometrie3d.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { NOEUDS, noeudDe } from "@/data/architecture";
import { periodePaquet, position3d } from "./geometrie3d";

describe("geometrie3d", () => {
  it("reprend la disposition large, centrée, le déploiement en retrait", () => {
    expect(position3d(noeudDe("site"))[2]).toBe(0);
    expect(position3d(noeudDe("registre"))[2]).toBeLessThan(0);
    const xs = NOEUDS.map((n) => position3d(n)[0]);
    expect(Math.min(...xs)).toBeLessThan(0);
    expect(Math.max(...xs)).toBeGreaterThan(0);
  });

  it("deux nœuds distincts n'ont jamais la même position", () => {
    const cles = NOEUDS.map((n) => position3d(n).join(","));
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("paquets plus rapides quand la latence est basse, dans des bornes", () => {
    expect(periodePaquet(null)).toBe(1.5);
    expect(periodePaquet(5)).toBe(0.6);
    expect(periodePaquet(100)).toBe(2);
    expect(periodePaquet(10_000)).toBe(4);
  });
});
```

- [ ] **Step 3: Lancer** — `pnpm --filter web exec vitest run lib/coulisses/geometrie3d.test.ts` → FAIL.

- [ ] **Step 4: `apps/web/lib/coulisses/geometrie3d.ts`**

```ts
/** Calculs de la vue 3D, sans Three.js (testables) : la scène reprend la disposition large du schéma 2D. */
import { CADRES, type Noeud } from "@/data/architecture";

const ECHELLE = 1 / 60;

/** Position 3D : le plan du schéma large, centré, le chemin de déploiement en retrait. */
export function position3d(n: Noeud): [number, number, number] {
  const p = n.positions.large;
  return [
    (p.x - CADRES.large.largeur / 2) * ECHELLE,
    -(p.y - CADRES.large.hauteur / 2) * ECHELLE,
    n.groupe === "deploiement" ? -3 : 0,
  ];
}

/** Durée, en secondes, du trajet d'un paquet sur une liaison : plus court quand la latence est basse. */
export function periodePaquet(ms: number | null): number {
  if (ms === null) return 1.5;
  return Math.round(Math.min(4, Math.max(0.6, ms / 50)) * 10) / 10;
}
```

- [ ] **Step 5: `apps/web/lib/coulisses/webgl.ts`**

```ts
/** WebGL est-il disponible ? Calculé une fois (création d'un canvas), puis gardé. */
let disponible: boolean | null = null;

export function webglDisponible(): boolean {
  if (disponible !== null) return disponible;
  try {
    const canvas = document.createElement("canvas");
    disponible = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    disponible = false;
  }
  return disponible;
}

/** Réservé aux tests. */
export function oublierWebgl(): void {
  disponible = null;
}
```

- [ ] **Step 6: `apps/web/lib/coulisses/scene3d.ts`**

```ts
/**
 * Vue 3D des coulisses, chargée par `import()` au clic sur « Voir en 3D » :
 * ce module et Three.js forment des morceaux à part (verifier-taille-3d), jamais
 * chargé sans clic. Blocs = nœuds, étiquettes HTML nettes (CSS2DRenderer),
 * paquets lumineux au rythme des latences mesurées ; orbite à la souris ou au
 * doigt, zoom borné. Rendu en pause quand l'onglet est caché ou la scène hors
 * de l'écran ; tout est libéré par `arreter()`.
 */
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import type { IdNoeud, Liaison, Noeud } from "@/data/architecture";
import { periodePaquet, position3d } from "./geometrie3d";
import type { Serie } from "./magasin";

/** Repère ce morceau de JS dans le build (scripts/verifier-taille-3d.mjs). */
export const MARQUEUR_3D = "scene-3d:v1";

const COULEURS = { papier: 0xf3efe7, brique: 0xc84a1f, trait: 0xc9c1b2 };

export type OptionsScene = {
  conteneur: HTMLElement;
  noeuds: readonly Noeud[];
  liaisons: readonly Liaison[];
  /** Dernières latences, lues à chaque image. */
  latences(): Record<Serie, number | null>;
  mouvementReduit: boolean;
  surChoix(id: IdNoeud): void;
  /** Contexte WebGL perdu une fois la scène montée : l'appelant revient en 2D. */
  surPerte(): void;
};

export type Scene3D = { readonly marqueur: string; choisir(id: IdNoeud): void; arreter(): void };

type Paquet = { mesh: Mesh; de: Vector3; vers: Vector3; serie?: Serie; phase: number };

export function creerScene(o: OptionsScene): Scene3D {
  const { conteneur } = o;
  const largeur = () => Math.max(1, conteneur.clientWidth);
  const hauteur = () => Math.max(1, conteneur.clientHeight);

  // Lève une erreur si WebGL est indisponible : l'appelant revient en 2D.
  const rendu = new WebGLRenderer({ antialias: true, alpha: true });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  rendu.setSize(largeur(), hauteur());
  conteneur.appendChild(rendu.domElement);

  const etiquettes = new CSS2DRenderer();
  etiquettes.setSize(largeur(), hauteur());
  Object.assign(etiquettes.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
  conteneur.appendChild(etiquettes.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, largeur() / hauteur(), 0.1, 100);
  camera.position.set(0, 2, 14);
  scene.add(new AmbientLight(0xffffff, 1.6));
  const soleil = new DirectionalLight(0xffffff, 1.2);
  soleil.position.set(4, 8, 6);
  scene.add(soleil);

  const controles = new OrbitControls(camera, rendu.domElement);
  controles.enableDamping = true;
  controles.enablePan = false;
  controles.minDistance = 6;
  controles.maxDistance = 24;
  controles.autoRotate = !o.mouvementReduit;
  controles.autoRotateSpeed = 0.6;

  const geometrieBloc = new BoxGeometry(2.4, 0.9, 0.9);
  const blocs = new Map<IdNoeud, Mesh<BoxGeometry, MeshStandardMaterial>>();
  for (const n of o.noeuds) {
    const bloc = new Mesh(geometrieBloc, new MeshStandardMaterial({ color: COULEURS.papier }));
    bloc.position.set(...position3d(n));
    bloc.userData.id = n.id;
    const etiquette = document.createElement("span");
    etiquette.textContent = n.nom;
    etiquette.className = "rounded bg-papier/90 px-1.5 py-0.5 text-xs font-semibold text-encre";
    bloc.add(new CSS2DObject(etiquette));
    scene.add(bloc);
    blocs.set(n.id, bloc);
  }

  const materielLigne = new LineBasicMaterial({ color: COULEURS.trait });
  const geometriePaquet = new SphereGeometry(0.09, 12, 12);
  const materielPaquet = new MeshBasicMaterial({ color: COULEURS.brique });
  const lignes: BufferGeometry[] = [];
  const paquets: Paquet[] = [];
  for (const l of o.liaisons) {
    const de = blocs.get(l.de)!.position.clone();
    const vers = blocs.get(l.vers)!.position.clone();
    const geometrie = new BufferGeometry().setFromPoints([de, vers]);
    lignes.push(geometrie);
    scene.add(new Line(geometrie, materielLigne));
    if (o.mouvementReduit) continue;
    const mesh = new Mesh(geometriePaquet, materielPaquet);
    scene.add(mesh);
    paquets.push({ mesh, de, vers, serie: l.mesure, phase: Math.random() });
  }

  const choisir = (id: IdNoeud) => {
    for (const [cle, bloc] of blocs) bloc.material.color.set(cle === id ? COULEURS.brique : COULEURS.papier);
  };

  // Un clic sans glisser sur un bloc le choisit (le glisser fait tourner la scène).
  const rayon = new Raycaster();
  const pointeur = new Vector2();
  let depart: { x: number; y: number } | null = null;
  const surBas = (e: PointerEvent) => {
    depart = { x: e.clientX, y: e.clientY };
  };
  const surHaut = (e: PointerEvent) => {
    if (!depart || Math.hypot(e.clientX - depart.x, e.clientY - depart.y) > 5) return;
    const r = rendu.domElement.getBoundingClientRect();
    pointeur.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayon.setFromCamera(pointeur, camera);
    const touche = rayon.intersectObjects([...blocs.values()], false)[0];
    if (touche) o.surChoix(touche.object.userData.id as IdNoeud);
  };
  rendu.domElement.addEventListener("pointerdown", surBas);
  rendu.domElement.addEventListener("pointerup", surHaut);
  // Contexte perdu (pilote, mise en veille, trop de contextes ouverts) : le canevas se figerait.
  const surPerteContexte = () => o.surPerte();
  rendu.domElement.addEventListener("webglcontextlost", surPerteContexte);

  const redimensionner = () => {
    camera.aspect = largeur() / hauteur();
    camera.updateProjectionMatrix();
    rendu.setSize(largeur(), hauteur());
    etiquettes.setSize(largeur(), hauteur());
  };
  const observateurTaille = new ResizeObserver(redimensionner);
  observateurTaille.observe(conteneur);

  let precedent = performance.now();
  const image = (t: number) => {
    const dt = Math.min(0.1, (t - precedent) / 1_000);
    precedent = t;
    const latences = o.latences();
    for (const p of paquets) {
      p.phase = (p.phase + dt / periodePaquet(p.serie ? latences[p.serie] : null)) % 1;
      p.mesh.position.lerpVectors(p.de, p.vers, p.phase);
    }
    controles.update(dt);
    rendu.render(scene, camera);
    etiquettes.render(scene, camera);
  };

  let ongletVisible = document.visibilityState === "visible";
  let aLEcran = true;
  const boucle = () => {
    precedent = performance.now();
    rendu.setAnimationLoop(ongletVisible && aLEcran ? image : null);
  };
  const surVisibilite = () => {
    ongletVisible = document.visibilityState === "visible";
    boucle();
  };
  document.addEventListener("visibilitychange", surVisibilite);
  const observateurEcran = new IntersectionObserver(([e]) => {
    aLEcran = e?.isIntersecting ?? true;
    boucle();
  });
  observateurEcran.observe(conteneur);
  boucle();

  return {
    marqueur: MARQUEUR_3D,
    choisir,
    arreter() {
      rendu.setAnimationLoop(null);
      document.removeEventListener("visibilitychange", surVisibilite);
      observateurEcran.disconnect();
      observateurTaille.disconnect();
      rendu.domElement.removeEventListener("pointerdown", surBas);
      rendu.domElement.removeEventListener("pointerup", surHaut);
      rendu.domElement.removeEventListener("webglcontextlost", surPerteContexte);
      controles.dispose();
      geometrieBloc.dispose();
      geometriePaquet.dispose();
      materielPaquet.dispose();
      materielLigne.dispose();
      for (const g of lignes) g.dispose();
      for (const b of blocs.values()) b.material.dispose();
      rendu.dispose();
      rendu.domElement.remove();
      etiquettes.domElement.remove();
    },
  };
}
```

(Si `controles.update` n'accepte pas de durée dans cette version, appeler `controles.update()` ; si les chemins `three/addons/...` ne résolvent pas, utiliser `three/examples/jsm/...` ; le signaler.)

- [ ] **Step 7: Lancer** — `pnpm --filter web exec vitest run lib/coulisses` → PASS ; `pnpm --filter web lint && pnpm --filter web typecheck` → PASS ; `pnpm build` → `○ /coulisses` (rien n'importe encore la scène).

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/lib/coulisses/geometrie3d.ts apps/web/lib/coulisses/geometrie3d.test.ts apps/web/lib/coulisses/webgl.ts apps/web/lib/coulisses/scene3d.ts
git commit -m "Coulisses : scène 3D (Three.js) des nœuds et des liaisons, libérée à l'arrêt et à la perte du contexte"
```

---

### Task 14: Vue 3D à la demande dans la page

**Files:**
- Modify: `apps/web/components/coulisses/ArchitectureVivante.tsx`, `ArchitectureVivante.test.tsx`
- Create: `apps/web/components/coulisses/ArchitectureVivante3d.test.tsx`, `ArchitectureVivante3d.import.test.tsx`
- Create: `apps/web/scripts/verifier-taille-3d.mjs`, `apps/web/e2e/coulisses-3d.spec.ts`
- Modify: `apps/web/package.json` (script `verifier-taille-3d`), `.github/workflows/ci.yml` (job `e2e`)

**Interfaces:**
- Consumes: `creerScene`, `type Scene3D`, `webglDisponible`, `oublierWebgl` (t13) ; `NOEUDS`, `LIAISONS` (t6) ; `derniere`, `type EtatMesures` (t3) ; `ArchitectureVivante` (t8).
- Produces:
  - bouton « Voir en 3D » / « Chargement… » / « Revenir en 2D », toujours rendu (invisible sans WebGL) ; cadre `data-testid="scene-3d"` ; rangée `role="group"` `aria-label="Nœuds"` ; message « 3D indisponible sur cet appareil. »
  - `SIGNATURES_3D`, `contientVue3d(code): boolean` et la commande `pnpm --filter web verifier-taille-3d`

Lire avant : la doc Next sur `import()` dans un composant client (`node_modules/next/dist/docs/`).

- [ ] **Step 1: Tests du composant** — `apps/web/components/coulisses/ArchitectureVivante3d.test.tsx` :

```tsx
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { oublierWebgl } from "@/lib/coulisses/webgl";

const scene = vi.hoisted(() => ({
  creerScene: vi.fn(),
  choisir: vi.fn(),
  arreter: vi.fn(),
}));
vi.mock("@/lib/coulisses/scene3d", () => ({ MARQUEUR_3D: "scene-3d:v1", creerScene: scene.creerScene }));

import { ArchitectureVivante } from "./ArchitectureVivante";

function webgl(present: boolean) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue((present ? {} : null) as never);
}

beforeEach(() => {
  oublierWebgl();
  vi.spyOn(Document.prototype, "visibilityState", "get").mockReturnValue("visible");
  vi.stubEnv("NEXT_PUBLIC_DIRECT_URL", "");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ base: 1, serveur: 2 })));
  scene.creerScene.mockReset();
  scene.creerScene.mockImplementation(() => ({ marqueur: "scene-3d:v1", choisir: scene.choisir, arreter: scene.arreter }));
  scene.choisir.mockReset();
  scene.arreter.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ArchitectureVivante, vue 3D", () => {
  it("sans WebGL : bouton 3D invisible et hors de l'arbre d'accessibilité, sa place gardée", () => {
    webgl(false);
    render(<ArchitectureVivante />);
    expect(screen.queryByRole("button", { name: "Voir en 3D" })).toBeNull();
    const cache = screen.getByText("Voir en 3D");
    expect(cache).toHaveClass("invisible");
    expect(cache).toHaveAttribute("tabindex", "-1");
  });

  it("charge la scène au clic, dans le même cadre, puis revient en 2D", async () => {
    webgl(true);
    render(<ArchitectureVivante />);
    expect(scene.creerScene).not.toHaveBeenCalled();
    const bouton = screen.getByRole("button", { name: "Voir en 3D" });
    bouton.focus();
    fireEvent.click(bouton);
    expect(screen.getByRole("button", { name: "Chargement…" })).toHaveAttribute("aria-disabled", "true");
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalledTimes(1));
    // Le même bouton, devenu « Revenir en 2D », garde le focus.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Revenir en 2D" }));
    const options = scene.creerScene.mock.calls[0]![0] as { conteneur: HTMLElement; mouvementReduit: boolean };
    expect(options.conteneur).toBe(screen.getByTestId("scene-3d"));
    expect(options.conteneur).toHaveAttribute("aria-hidden", "true");
    expect(options.mouvementReduit).toBe(false);
    expect(screen.queryByRole("group", { name: "Schéma de l'architecture" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Revenir en 2D" }));
    expect(scene.arreter).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("group", { name: "Schéma de l'architecture" })).toHaveLength(2);
  });

  it("en 3D, la rangée « Nœuds » garde le choix au clavier et le transmet à la scène", async () => {
    webgl(true);
    render(<ArchitectureVivante />);
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalled());
    const rangee = screen.getByRole("group", { name: "Nœuds" });
    fireEvent.click(within(rangee).getByRole("button", { name: "Base" }));
    expect(within(rangee).getByRole("button", { name: "Base" })).toHaveAttribute("aria-pressed", "true");
    expect(scene.choisir).toHaveBeenLastCalledWith("base");
    expect(screen.getByRole("heading", { level: 3, name: "Base" })).toBeInTheDocument();
  });

  it("un clic sur un bloc de la scène choisit le nœud", async () => {
    webgl(true);
    render(<ArchitectureVivante />);
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalled());
    const { surChoix } = scene.creerScene.mock.calls[0]![0] as { surChoix(id: string): void };
    act(() => surChoix("proxy"));
    expect(screen.getByRole("heading", { level: 3, name: "Proxy" })).toBeInTheDocument();
  });

  it("WebGL qui échoue à la création : retour en 2D avec un message", async () => {
    webgl(true);
    scene.creerScene.mockImplementation(() => {
      throw new Error("contexte WebGL perdu");
    });
    render(<ArchitectureVivante />);
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    expect(await screen.findByText("3D indisponible sur cet appareil.")).toBeInTheDocument();
    expect(screen.getAllByRole("group", { name: "Schéma de l'architecture" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Voir en 3D" })).toBeEnabled();
  });

  it("contexte WebGL perdu une fois la scène montée : retour en 2D avec un message", async () => {
    webgl(true);
    render(<ArchitectureVivante />);
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalled());
    const { surPerte } = scene.creerScene.mock.calls[0]![0] as { surPerte(): void };
    act(() => surPerte());
    expect(screen.getByText("3D indisponible sur cet appareil.")).toBeInTheDocument();
    expect(scene.arreter).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("group", { name: "Schéma de l'architecture" })).toHaveLength(2);
  });

  it("mouvement réduit : transmis à la scène", async () => {
    webgl(true);
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q === "(prefers-reduced-motion: reduce)",
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(<ArchitectureVivante />);
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    await waitFor(() => expect(scene.creerScene).toHaveBeenCalled());
    expect((scene.creerScene.mock.calls[0]![0] as { mouvementReduit: boolean }).mouvementReduit).toBe(true);
  });
});
```

`apps/web/components/coulisses/ArchitectureVivante3d.import.test.tsx` (sur le modèle de `IntroEncre.import.test.tsx`) :

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { oublierWebgl } from "@/lib/coulisses/webgl";

// Morceau 3D introuvable (réseau coupé, déploiement en cours) : l'import dynamique est rejeté.
vi.mock("@/lib/coulisses/scene3d", () => {
  throw new Error("Morceau 3D introuvable");
});

import { ArchitectureVivante } from "./ArchitectureVivante";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ArchitectureVivante, morceau 3D introuvable", () => {
  it("reste en 2D et le dit", async () => {
    oublierWebgl();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as never);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ base: 1, serveur: 2 })));
    render(<ArchitectureVivante />);
    fireEvent.click(screen.getByRole("button", { name: "Voir en 3D" }));
    expect(await screen.findByText("3D indisponible sur cet appareil.")).toBeInTheDocument();
    expect(screen.getAllByRole("group", { name: "Schéma de l'architecture" })).toHaveLength(2);
  });
});
```

et, dans `ArchitectureVivante.test.tsx` (tâche 8), importer `oublierWebgl` (`@/lib/coulisses/webgl`) et ajouter au `beforeEach` `vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);` et `oublierWebgl();` (jsdom n'implémente pas `getContext` et l'écrit dans la console).

- [ ] **Step 2: Lancer** — `pnpm --filter web exec vitest run components/coulisses` → FAIL.

- [ ] **Step 3: Bascule 2D / 3D** — `apps/web/components/coulisses/ArchitectureVivante.tsx` :
  - imports : `useCallback`, `useRef` (React) ; `LIAISONS`, `NOEUDS` (`@/data/architecture`) ; `derniere`, `type EtatMesures` (`@/lib/coulisses/magasin`) ; `type Scene3D` (import **de type**, `@/lib/coulisses/scene3d`) ; `webglDisponible` (`@/lib/coulisses/webgl`) ;
  - au niveau du module :

```tsx
type Vue = "2d" | "chargement" | "3d";
type Module3D = typeof import("@/lib/coulisses/scene3d");

const jamais = () => () => {};
const REQUETE_MOUVEMENT = "(prefers-reduced-motion: reduce)";
const abonnerMouvement = (fn: () => void) => {
  const mq = window.matchMedia(REQUETE_MOUVEMENT);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
};
const lireMouvement = () => window.matchMedia(REQUETE_MOUVEMENT).matches;
const dernieres = (m: EtatMesures) => ({ site: derniere(m.site), base: derniere(m.base), tempsReel: derniere(m.tempsReel) });
```

  - dans le composant, après `choisi` :

```tsx
  const webgl = useSyncExternalStore(jamais, webglDisponible, () => false);
  const mouvementReduit = useSyncExternalStore(abonnerMouvement, lireMouvement, () => false);
  const [vue, setVue] = useState<Vue>("2d");
  const [module3d, setModule3d] = useState<Module3D | null>(null);
  const [echec3d, setEchec3d] = useState(false);
  const mesuresRef = useRef(mesures);
  const sceneRef = useRef<Scene3D | null>(null);

  useEffect(() => {
    mesuresRef.current = mesures;
  });
  useEffect(() => {
    sceneRef.current?.choisir(choisi);
  }, [choisi, vue]);

  const passerEn2d = useCallback((echec: boolean) => {
    setVue("2d");
    setEchec3d(echec);
  }, []);

  const basculer3d = () => {
    if (vue === "chargement") return;
    if (vue === "3d") {
      setVue("2d");
      return;
    }
    setEchec3d(false);
    setVue("chargement");
    import("@/lib/coulisses/scene3d")
      .then((m) => {
        setModule3d(m);
        setVue("3d");
      })
      .catch(() => passerEn2d(true));
  };

  // Ref de rappel avec nettoyage (React 19) : la scène vit tant que son cadre est monté.
  const monterScene = useCallback(
    (cadre: HTMLDivElement | null) => {
      if (!cadre || !module3d) return;
      let scene: Scene3D;
      try {
        scene = module3d.creerScene({
          conteneur: cadre,
          noeuds: NOEUDS,
          liaisons: LIAISONS,
          latences: () => dernieres(mesuresRef.current),
          mouvementReduit,
          surChoix: setChoisi,
          surPerte: () => passerEn2d(true),
        });
      } catch {
        passerEn2d(true);
        return;
      }
      sceneRef.current = scene;
      return () => {
        scene.arreter();
        sceneRef.current = null;
      };
    },
    [module3d, mouvementReduit, passerEn2d],
  );
```

  - à la place du commentaire de la tâche 8, à côté du titre (bouton toujours rendu, place réservée dès le rendu serveur) :

```tsx
        {/*
          Toujours rendu, pour que son apparition ne décale rien (CLS) : sans WebGL
          (et au rendu serveur), il reste invisible et hors de l'arbre d'accessibilité.
          Pendant le chargement, aria-disabled plutôt que disabled : le focus reste dessus.
        */}
        <button
          type="button"
          onClick={basculer3d}
          aria-disabled={vue === "chargement" || undefined}
          aria-hidden={!webgl || undefined}
          tabIndex={webgl ? undefined : -1}
          className={`rounded-full border border-encre px-4 py-2 text-sm font-semibold transition-colors hover:bg-encre hover:text-papier aria-disabled:opacity-60 ${webgl ? "" : "invisible"}`}
        >
          {vue === "3d" ? "Revenir en 2D" : vue === "chargement" ? "Chargement…" : "Voir en 3D"}
        </button>
```

  - le cadre du schéma devient :

```tsx
            <div className="relative aspect-[360/820] w-full sm:aspect-[960/420]">
              {vue === "3d" ? (
                <div ref={monterScene} aria-hidden="true" data-testid="scene-3d" className="absolute inset-0 overflow-hidden rounded-xl" />
              ) : (
                <Schema choisi={choisi} choisir={setChoisi} mesures={mesures} />
              )}
            </div>
            {vue === "3d" && (
              <div role="group" aria-label="Nœuds" className="flex flex-wrap gap-2">
                {NOEUDS.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    aria-pressed={n.id === choisi}
                    onClick={() => setChoisi(n.id)}
                    className="rounded-full border border-trait px-3 py-1 text-sm aria-pressed:border-brique aria-pressed:text-brique"
                  >
                    {n.nom}
                  </button>
                ))}
              </div>
            )}
            {echec3d && <p role="status" className="text-sm text-encre-douce">3D indisponible sur cet appareil.</p>}
```

(Le `figcaption` reste sous ces éléments.) Si la règle `react-hooks` du lint refuse l'appel de `passerEn2d` dans la ref de rappel, le différer avec `queueMicrotask(() => passerEn2d(true))` et le signaler.

- [ ] **Step 4: `apps/web/scripts/verifier-taille-3d.mjs`**

```js
/**
 * Vérifie que la vue 3D des coulisses (module scene3d, Three.js et ses
 * modules complémentaires), chargée au clic sur « Voir en 3D », reste sous
 * 180 Ko compressés. Les morceaux comptés sont repérés par des signatures qui
 * survivent à la minification : le marqueur de scene3d.ts, la clé `__THREE__`
 * posée par Three.js, et des noms de propriétés de CSS2DRenderer et
 * d'OrbitControls. Le test de bout en bout de la 3D vérifie que chaque morceau
 * chargé au clic porte bien l'une d'elles : le graphe réel est donc compté.
 *
 * Usage : pnpm --filter web verifier-taille-3d   (après `pnpm build`)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const LIMITE = 180 * 1024;
const MARQUEUR = "scene-3d:v1";
export const SIGNATURES_3D = [MARQUEUR, "__THREE__", "isCSS2DObject", "autoRotateSpeed"];

/** Ce code fait-il partie de la vue 3D ? */
export const contientVue3d = (code) => SIGNATURES_3D.some((s) => code.includes(s));

function* fichiersJs(chemin) {
  for (const nom of readdirSync(chemin)) {
    const complet = join(chemin, nom);
    if (statSync(complet).isDirectory()) yield* fichiersJs(complet);
    else if (nom.endsWith(".js")) yield complet;
  }
}

const lanceDirectement = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (lanceDirectement) {
  const app = join(dirname(fileURLToPath(import.meta.url)), "..");
  const dossier = join(app, ".next/static/chunks");
  if (!existsSync(dossier)) {
    console.error("Build introuvable (.next/static/chunks) : lancer pnpm build.");
    process.exit(1);
  }
  const morceaux = [...fichiersJs(dossier)].filter((f) => contientVue3d(readFileSync(f, "utf8")));
  if (!morceaux.some((f) => readFileSync(f, "utf8").includes(MARQUEUR))) {
    console.error("Morceau de la vue 3D introuvable : lancer pnpm build.");
    process.exit(1);
  }
  let total = 0;
  for (const f of morceaux) {
    const taille = gzipSync(readFileSync(f)).length;
    total += taille;
    console.log(`  ${relative(app, f)} : ${(taille / 1024).toFixed(1)} Ko compressés`);
  }
  console.log(`Vue 3D des coulisses : ${(total / 1024).toFixed(1)} Ko compressés, limite ${LIMITE / 1024} Ko.`);
  if (total > LIMITE) process.exit(1);
}
```

  `apps/web/package.json` : `"verifier-taille-3d": "node scripts/verifier-taille-3d.mjs"` ; `.github/workflows/ci.yml`, job `e2e`, après `- run: pnpm --filter web verifier-taille-demo` : `- run: pnpm --filter web verifier-taille-3d`.

- [ ] **Step 5: Test de bout en bout de la 3D** — `apps/web/e2e/coulisses-3d.spec.ts` :

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { contientVue3d } from "../scripts/verifier-taille-3d.mjs";
import { surveillerErreurs } from "./outils";

test("la 3D se charge au clic seulement, puis revient en 2D", async ({ page }) => {
  await page.goto("/coulisses");
  const webgl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  });
  test.skip(!webgl, "WebGL indisponible dans ce navigateur de test.");
  const erreurs = surveillerErreurs(page);
  expect(await page.evaluate(() => "__THREE__" in window)).toBe(false);

  const charges: string[] = [];
  page.on("response", (r) => {
    if (r.request().resourceType() === "script") charges.push(decodeURIComponent(new URL(r.url()).pathname));
  });
  await page.getByRole("button", { name: "Voir en 3D" }).click();
  await expect(page.getByTestId("scene-3d").locator("canvas")).toBeVisible();
  expect(await page.evaluate(() => "__THREE__" in window)).toBe(true);

  // Chaque morceau chargé par le clic est compté par verifier-taille-3d (budget de 180 Ko compressés).
  expect(charges.length).toBeGreaterThan(0);
  for (const chemin of charges) {
    const fichier = join(process.cwd(), ".next", chemin.replace(/^\/_next\//, ""));
    expect(contientVue3d(readFileSync(fichier, "utf8")), `${chemin} n'est pas compté par verifier-taille-3d`).toBe(true);
  }

  await page.getByRole("group", { name: "Nœuds" }).getByRole("button", { name: "Base" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Base" })).toBeVisible();
  await page.getByRole("button", { name: "Revenir en 2D" }).click();
  await expect(page.getByRole("group", { name: "Schéma de l'architecture" })).toBeVisible();
  await expect(page.getByTestId("scene-3d")).toHaveCount(0);
  expect(erreurs).toEqual([]);
});
```

(Si Playwright refuse d'importer le `.mjs` depuis un test TypeScript, recopier `SIGNATURES_3D` et `contientVue3d` dans le test avec un commentaire qui renvoie au script, et le signaler.)

- [ ] **Step 6: Lancer** —
  - `pnpm --filter web exec vitest run lib/coulisses components/coulisses` → PASS ; `pnpm lint && pnpm typecheck && pnpm test` → PASS ;
  - `pnpm build` → `○ /coulisses` ; `pnpm --filter web verifier-taille-3d` → sous 180 Ko. **Si la limite est dépassée, ne pas la relever** : lister les morceaux affichés, vérifier que seules les classes importées de `three` sont présentes, et le signaler ;
  - `pnpm --filter web exec playwright test e2e/coulisses-3d.spec.ts` → PASS dans les projets `ordinateur` et `mobile` (ou sauté sans WebGL) ; si un morceau chargé au clic n'est pas reconnu, ajouter sa signature (un nom de propriété qui lui est propre) à `SIGNATURES_3D` et relancer les deux vérifications ;
  - Lighthouse comme en tâche 8, step 9 : `/coulisses` tient toujours ses budgets (le bouton ne décale rien : CLS ≤ 0,05).

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/coulisses/ArchitectureVivante.tsx apps/web/components/coulisses/ArchitectureVivante.test.tsx apps/web/components/coulisses/ArchitectureVivante3d.test.tsx apps/web/components/coulisses/ArchitectureVivante3d.import.test.tsx apps/web/scripts/verifier-taille-3d.mjs apps/web/e2e/coulisses-3d.spec.ts apps/web/package.json .github/workflows/ci.yml
git commit -m "Coulisses : vue 3D chargée au clic, retour en 2D, budget de 180 Ko vérifié"
```

---

### Task 15: Bout en bout et documentation

**Files:**
- Create: `apps/web/e2e/coulisses.spec.ts`
- Modify: `apps/web/playwright.config.ts` (plafonds des tests), `README.md`

**Interfaces:**
- Consumes: tout ce qui précède ; `serviceDirect` et le `webServer` du site dans `playwright.config.ts` (sous-projet 4) ; `SONDE_CONNEXIONS_PAR_IP` (t1) ; `MESURE_MAX_PAR_IP` (t2).
- Produces: tests de bout en bout des coulisses ; section « Coulisses » du README.

- [ ] **Step 1: Configuration** — `apps/web/playwright.config.ts` : tous les navigateurs de test partagent `127.0.0.1` et les projets tournent en parallèle ; sans plafonds relevés, les mesures passeraient en « indisponible » (Review Focus n° 5) :
  - dans l'`env` du `webServer` du site : `MESURE_MAX_PAR_IP: "100000",` ;
  - dans l'`env` du service temps réel (`serviceDirect`), après `CONNEXIONS_PAR_IP` : `SONDE_CONNEXIONS_PAR_IP: "1000",` ;
  - un commentaire au-dessus de chacun : « Tous les navigateurs de test partagent 127.0.0.1. »

- [ ] **Step 2: `apps/web/e2e/coulisses.spec.ts`**

```ts
import { expect, test } from "@playwright/test";
import { surveillerErreurs } from "./outils";

const MESURE = /\d\sms/;

test("le pied de page mène aux coulisses", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Coulisses" }).click();
  await expect(page).toHaveURL(/\/coulisses$/);
  await expect(page.getByRole("heading", { level: 1, name: "Coulisses" })).toBeVisible();
});

test("les mesures arrivent en direct", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/coulisses");
  await expect(page.getByTestId("mesure-site")).toContainText(MESURE, { timeout: 15_000 });
  if (process.env.DATABASE_URL) {
    await expect(page.getByTestId("mesure-base")).toContainText(MESURE, { timeout: 15_000 });
  }
  if (process.env.NEXT_PUBLIC_DIRECT_URL) {
    await expect(page.getByTestId("mesure-tempsReel")).toContainText(MESURE, { timeout: 15_000 });
  } else {
    await expect(page.getByTestId("mesure-tempsReel")).toContainText("indisponible");
  }
  expect(erreurs).toEqual([]);
});

test("le schéma se parcourt au clavier", async ({ page }) => {
  await page.goto("/coulisses");
  // La variante masquée (display: none) est hors de l'arbre d'accessibilité.
  const schema = page.getByRole("group", { name: "Schéma de l'architecture" });
  await expect(schema).toHaveCount(1);
  const proxy = schema.getByRole("button", { name: /^Proxy/ });
  await proxy.focus();
  await page.keyboard.press("Enter");
  await expect(proxy).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 3, name: "Proxy" })).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press(" ");
  await expect(page.getByRole("heading", { level: 3, name: "Proxy" })).toHaveCount(0);
});
```

- [ ] **Step 3: README** — après la section « Temps réel » (sous-projet 4) :

```markdown
Coulisses (`/coulisses`) : architecture du site mesurée en direct, vue 3D à la demande, preuves de qualité du build.

- Mesures : `GET /api/coulisses/mesure` (temps d'un `SELECT 1`, 60 requêtes par minute et par IP, appels d'un autre site refusés) et WebSocket d'écho `/sonde` du service temps réel (hors de la salle de l'accueil, 2 connexions par IP). Rien n'est stocké. Pour les tests de bout en bout seulement : `MESURE_MAX_PAR_IP` (site) et `SONDE_CONNEXIONS_PAR_IP` (service).
- Dernier déploiement : la CI écrit `apps/web/build-info.json` (commit, date, nombre de tests, notes Lighthouse, poids JS de l'accueil) dans le job `image`, avant le build Docker. En local, sans ce fichier, la section affiche « Build local : pas de mesures CI ». La page reste statique (`pnpm --filter web verifier-accueil-statique`).
- Le titre du commit déployé devient public : la règle d'anonymat des messages de commit s'applique pleinement, et la CI refuse un titre qui contient une adresse e-mail ou IP.
- Budgets : `/coulisses` est mesurée par Lighthouse comme les autres pages ; la vue 3D (Three.js, chargée au clic) reste sous 180 Ko compressés (`pnpm --filter web verifier-taille-3d`).
- Rien de nouveau à configurer dans Coolify.
```

- [ ] **Step 4: Lancer en local** — base de test démarrée et migrée :

```bash
pnpm --filter realtime build
NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct pnpm build
NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm e2e
```

  Attendu : tout passe, `coulisses.spec.ts` et `coulisses-3d.spec.ts` compris, dans les projets `ordinateur` et `mobile` (le test 3D peut être sauté sans WebGL), sans « indisponible » dû aux limites (Review Focus n° 5). Puis Lighthouse avec le service, comme au sous-projet 4 (tâche 7, step 4) : les cinq URL passent, `/coulisses` comprise. Libérer les ports 3000, 3100, 3201, 2525 (`fuser -k`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/coulisses.spec.ts apps/web/playwright.config.ts README.md
git commit -m "Coulisses : tests de bout en bout des mesures et du schéma, documentation"
```

---

### Task 16: Vérification finale

**Files:**
- Modify: aucun fichier de code ; corrections éventuelles seulement.

- [ ] **Step 1: Anonymat**

```bash
T=.superpowers/anonymat/termes-interdits.txt
git diff sous-projet-4-temps-reel..HEAD -- . ':!pnpm-lock.yaml' | grep -ciF -f <(grep -v '^#' $T | grep -v '^$')
git log sous-projet-4-temps-reel..HEAD --format=%B | grep -ciF -f <(grep -v '^#' $T | grep -v '^$')
grep -rnP "[\x{00a0}\x{202f}]" apps/web/lib apps/web/components apps/web/app apps/web/data apps/realtime/src
```

Expected : `0`, `0`, rien. (Le fichier des termes interdits est dans le dépôt principal : depuis le worktree, utiliser son chemin absolu.)

- [ ] **Step 2: Vérification complète** — avec la base de test démarrée et migrée :

```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck
DATABASE_URL_TEST=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm test
pnpm --filter realtime build
NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct pnpm build && pnpm --filter web verifier-accueil-statique
NEXT_PUBLIC_DIRECT_URL=ws://127.0.0.1:3201/direct DATABASE_URL=postgresql://jouan:jouan@127.0.0.1:5433/jouan_test pnpm e2e
pnpm --filter web verifier-taille-encre && pnpm --filter web verifier-taille-demo && pnpm --filter web verifier-taille-direct && pnpm --filter web verifier-taille-3d
```

puis Lighthouse avec le service (tâche 15, step 4), puis :

```bash
docker build -t jouan-dev .
docker build -f apps/realtime/Dockerfile -t jouan-dev-realtime .
```

Tout doit passer. Au build : `○ /`, `○ /coulisses`, `ƒ /api/coulisses/mesure`. Libérer les ports 3000, 3100, 3201, 2525.

- [ ] **Step 3: Essai de `build-info.json` dans l'image** — à partir des rapports locaux (`CI=1 pnpm test`, `CI=1 pnpm e2e`, Lighthouse), enchaîner les trois scripts de la tâche 11 comme la CI (tâche 12) pour écrire `apps/web/build-info.json`, puis :
  - `docker build -t jouan-dev .` → la sortie du build Next liste `○ /coulisses` ;
  - dans l'image, le **HTML prérendu** porte le commit et pas le repli : `docker run --rm jouan-dev sh -c 'H=$(find /app -name coulisses.html | head -1); echo "$H"; grep -c "Mesurés par la CI" "$H"; grep -c "Build local" "$H"'` → un chemin, `1`, `0` (ne pas chercher dans le JavaScript, qui contient les deux textes) ;
  - supprimer ensuite `apps/web/build-info.json`, les fichiers `mesures-*.json` et les dossiers `.mesures`.

- [ ] **Step 4: Commit** — seulement si une correction a été nécessaire, avec ses fichiers nommés un par un et un message en français décrivant la correction.
