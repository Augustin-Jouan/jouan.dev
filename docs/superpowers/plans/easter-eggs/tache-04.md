# Tâche 04 — `curl -L jouan.dev` : le proxy sert le CV

> Suite de la tâche 03, même conversation (niveau **medium**). Termine par **un** compte rendu pour les tâches 03 et 04.

Spec : section 4 (« Proxy (`proxy.ts`) »).

**Files:**
- Create: `apps/web/lib/cv/client-terminal.ts`, `apps/web/lib/cv/client-terminal.test.ts`
- Modify: `apps/web/proxy.ts`, `apps/web/proxy.test.ts` (fichiers entiers ci-dessous)
- Create: `apps/web/e2e/cv.spec.ts`

**Interfaces:**
- Produces: `MOTIF_CLIENT_TERMINAL`, `estClientTerminal(userAgent)` (`lib/cv/client-terminal.ts`) ; `config.matcher[0]` de `proxy.ts` = l'entrée User-Agent.

Lire `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, section `matcher` : les valeurs du `matcher` doivent être **littérales** (lues au build). Le motif est donc écrit deux fois (dans `matcher` et dans `client-terminal.ts`), et `proxy.test.ts` vérifie qu'ils sont identiques. Next ancre la valeur (`^…$`) et respecte la casse : `curl/8.5.0` correspond, `Mozilla/5.0 (compatible; curl)` et `Curl/8` non. Vérifié sur un build : l'accueil reste statique pour les navigateurs.

- [ ] **Step 1: Tests (échouent)**

`apps/web/lib/cv/client-terminal.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { estClientTerminal } from "./client-terminal";

describe("estClientTerminal", () => {
  it.each(["curl/8.5.0", "Wget/1.21.4", "HTTPie/3.2.2", "xh/0.22.0"])("reconnaît %s", (userAgent) => {
    expect(estClientTerminal(userAgent)).toBe(true);
  });

  it.each([
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; curl)",
    "Curl/8.5.0",
    "",
    null,
    undefined,
  ])("laisse passer %s", (userAgent) => {
    expect(estClientTerminal(userAgent)).toBe(false);
  });
});
```

Remplacer tout `apps/web/proxy.test.ts` par :

```ts
// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { NOM_COOKIE, signerSession } from "@/lib/admin/session";
import { MOTIF_CLIENT_TERMINAL } from "@/lib/cv/client-terminal";
import { config, proxy } from "./proxy";

const SECRET = "s".repeat(32);
const requete = (chemin: string, cookie?: string, userAgent?: string) =>
  new NextRequest(new URL(chemin, "http://localhost:3000"), {
    headers: { ...(cookie ? { cookie: `${NOM_COOKIE}=${cookie}` } : {}), ...(userAgent ? { "user-agent": userAgent } : {}) },
  });
const NAVIGATEUR = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
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
  it.each(["/admin/connexion/x", "/admin/connexion/"])("protège %s (seule /admin/connexion est publique)", (chemin) => {
    expect(proxy(requete(chemin)).headers.get("location")).toBe("http://localhost:3000/admin/connexion");
  });
  it("redirige un cookie mal formé ou expiré, même avec un secret configuré", () => {
    process.env.ADMIN_SECRET = SECRET;
    const lieu = "http://localhost:3000/admin/connexion";
    expect(proxy(requete("/admin", "abc")).headers.get("location")).toBe(lieu);
    expect(proxy(requete("/admin", signerSession(Date.now() - 1000, SECRET))).headers.get("location")).toBe(lieu);
  });
  it("réécrit un jeton de 45 caractères, pas un de 46", () => {
    const jeton45 = `${"a".repeat(40)}-k7f3`;
    expect(reecriture(proxy(requete(`/?pour=${jeton45}`)))).not.toBeNull();
    expect(reecriture(proxy(requete(`/?pour=${jeton45}x`)))).toBeNull();
  });

  it("réécrit / vers le CV coloré pour curl, même avec un lien personnalisé", () => {
    expect(new URL(reecriture(proxy(requete("/", undefined, "curl/8.5.0")))!).pathname).toBe("/cv.ansi");
    const r = proxy(requete("/?pour=boulangerie-martin-k7f3", undefined, "curl/8.5.0"));
    expect(new URL(reecriture(r)!).pathname).toBe("/cv.ansi");
    expect(new URL(reecriture(r)!).search).toBe("");
  });
  it("garde la page personnalisée pour un navigateur", () => {
    const r = proxy(requete("/?pour=boulangerie-martin-k7f3", undefined, NAVIGATEUR));
    expect(new URL(reecriture(r)!).pathname).toBe("/pour/boulangerie-martin-k7f3");
  });
  it("protège toujours l'administration, même pour curl", () => {
    expect(proxy(requete("/admin", undefined, "curl/8.5.0")).headers.get("location")).toBe(
      "http://localhost:3000/admin/connexion",
    );
  });
  it("le matcher porte le même motif de User-Agent que estClientTerminal", () => {
    expect(config.matcher[0]).toEqual({
      source: "/",
      has: [{ type: "header", key: "user-agent", value: MOTIF_CLIENT_TERMINAL }],
    });
  });
});
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run lib/cv/client-terminal.test.ts proxy.test.ts --reporter=dot`
Expected: FAIL — `./client-terminal` introuvable.

- [ ] **Step 2: Implémenter**

`apps/web/lib/cv/client-terminal.ts` :

```ts
/**
 * Client en ligne de commande (`curl`, `wget`, HTTPie, `xh`) : la valeur de son
 * User-Agent commence par le nom de l'outil (`curl/8.5.0`). Même motif que le
 * `matcher` de proxy.ts, où il doit être recopié tel quel (Next n'y accepte que
 * des valeurs littérales) ; Next l'y ancre (`^…$`), sensible à la casse.
 */
export const MOTIF_CLIENT_TERMINAL = "(curl|Wget|HTTPie|xh)/.*";

const MOTIF = new RegExp(`^${MOTIF_CLIENT_TERMINAL}$`);

export function estClientTerminal(userAgent: string | null | undefined): boolean {
  return MOTIF.test(userAgent ?? "");
}
```

Remplacer tout `apps/web/proxy.ts` par :

```ts
/**
 * Trois rôles, et seulement sur ces adresses (voir `config.matcher`) :
 * - `/` demandé par un client en ligne de commande (`curl -L jouan.dev`) est
 *   réécrit vers le CV coloré `/cv.ansi`, y compris avec `?pour=` ; les
 *   navigateurs ne passent pas par ici et l'accueil reste statique ;
 * - `/?pour=<jeton>` est réécrit vers la page personnalisée `/pour/<jeton>`,
 *   l'adresse affichée ne change pas ; l'accueil sans paramètre reste statique ;
 * - `/admin/*` exige une session valide, sauf la page de connexion. Chaque page
 *   et action de l'administration revérifie la session côté serveur.
 */
import { NextResponse, type NextRequest } from "next/server";
import { NOM_COOKIE, secretSession, verifierSession } from "@/lib/admin/session";
import { estClientTerminal } from "@/lib/cv/client-terminal";
import { estJetonValide } from "@/lib/liens/jeton";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/" && estClientTerminal(request.headers.get("user-agent"))) {
    const cv = request.nextUrl.clone();
    cv.pathname = "/cv.ansi";
    cv.search = "";
    return NextResponse.rewrite(cv);
  }

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/connexion") return NextResponse.next();
    const secret = secretSession();
    if (secret && verifierSession(request.cookies.get(NOM_COOKIE)?.value, secret)) return NextResponse.next();
    // Hôte de la requête telle que Next la reconstruit (pas `request.url`, interne derrière le reverse proxy) ;
    // construit à neuf pour éviter de boucler sur un `/` final.
    return NextResponse.redirect(new URL("/admin/connexion", request.nextUrl));
  }

  const jeton = searchParams.get("pour") ?? "";
  if (!estJetonValide(jeton)) return NextResponse.next();
  const cible = request.nextUrl.clone();
  cible.pathname = `/pour/${jeton}`;
  cible.searchParams.delete("pour");
  return NextResponse.rewrite(cible);
}

export const config = {
  // Valeurs littérales seulement (lues au build) : le motif du User-Agent est
  // celui de MOTIF_CLIENT_TERMINAL (lib/cv/client-terminal.ts), vérifié par proxy.test.ts.
  matcher: [
    { source: "/", has: [{ type: "header", key: "user-agent", value: "(curl|Wget|HTTPie|xh)/.*" }] },
    { source: "/", has: [{ type: "query", key: "pour" }] },
    "/admin/:path*",
  ],
};
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run lib/cv/client-terminal.test.ts proxy.test.ts --reporter=dot`
Expected: PASS (2 fichiers, 28 tests).

- [ ] **Step 3: e2e**

`apps/web/e2e/cv.spec.ts` :

```ts
import { expect, test } from "@playwright/test";

const NAVIGATEUR = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// Requêtes HTTP seules : un projet suffit.
test.skip(({ isMobile }) => isMobile, "Requêtes HTTP sans navigateur : ordinateur seulement.");

test("curl sur / reçoit le CV coloré, qui varie selon le User-Agent", async ({ request }) => {
  const reponse = await request.get("/", { headers: { "User-Agent": "curl/8.5.0" } });
  expect(reponse.status()).toBe(200);
  expect(reponse.headers()["content-type"]).toBe("text/plain; charset=utf-8");
  expect(reponse.headers()["vary"]).toMatch(/User-Agent/i);
  const texte = await reponse.text();
  expect(texte).toContain("Augustin Jouan");
  expect(texte).toContain("\x1b[38;5;180m");
});

test("curl sur un lien personnalisé reçoit aussi le CV", async ({ request }) => {
  const reponse = await request.get("/?pour=exemple-0000", { headers: { "User-Agent": "Wget/1.21.4" } });
  expect(reponse.headers()["content-type"]).toBe("text/plain; charset=utf-8");
});

test("un navigateur, un robot ou un User-Agent qui cite curl reçoivent la page", async ({ request }) => {
  for (const userAgent of [NAVIGATEUR, "Mozilla/5.0 (compatible; Googlebot/2.1)", "Mozilla/5.0 (compatible; curl)"]) {
    const reponse = await request.get("/", { headers: { "User-Agent": userAgent } });
    expect(reponse.headers()["content-type"], userAgent).toContain("text/html");
  }
});

test("/cv.txt : le même CV, sans aucune séquence de couleur", async ({ request }) => {
  const reponse = await request.get("/cv.txt");
  expect(reponse.headers()["content-type"]).toBe("text/plain; charset=utf-8");
  const texte = await reponse.text();
  expect(texte).toContain("Augustin Jouan");
  expect(texte).not.toContain("\x1b");
});

test("/api/me : JSON Resume valide, lisible depuis d'autres sites", async ({ request }) => {
  const reponse = await request.get("/api/me");
  expect(reponse.headers()["content-type"]).toBe("application/json; charset=utf-8");
  expect(reponse.headers()["access-control-allow-origin"]).toBe("*");
  const cv = await reponse.json();
  expect(cv.basics.name).toBe("Augustin Jouan");
  expect(cv.meta.canonical).toMatch(/\/api\/me$/);
});
```

```bash
./docs/superpowers/plans/easter-eggs/court.sh bash -c 'pnpm build && pnpm --filter web verifier-accueil-statique && pnpm --filter web semer-lien-exemple'
./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec playwright test e2e/cv.spec.ts --reporter=line
```

Expected: accueil prérendu ; e2e : 5 passés, 5 ignorés (projet mobile : requêtes HTTP sans navigateur).

- [ ] **Step 4: Lint, types**

`./docs/superpowers/plans/easter-eggs/court.sh bash -c 'pnpm lint && pnpm typecheck'` — Expected: code de sortie 0.

- [ ] **Step 5: Commiter**

```bash
git add apps/web/lib/cv/client-terminal.ts
git add apps/web/lib/cv/client-terminal.test.ts
git add apps/web/proxy.ts
git add apps/web/proxy.test.ts
git add apps/web/e2e/cv.spec.ts
git commit -m "CV : curl -L sur l'accueil reçoit le CV coloré (proxy), e2e du CV"
```
