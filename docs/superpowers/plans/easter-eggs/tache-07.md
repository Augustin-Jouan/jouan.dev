# Tâche 07 — Raccourci Cmd+K, pied de page et indices

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **medium**.
> Commandes depuis la racine du dépôt. Termine par le compte rendu de `contexte.md`.

Spec : sections 5.1 (`RaccourciCommandes.tsx`) et 6 (« Indices »).

**Files:**
- Create: `apps/web/lib/commandes/indices.ts`, `apps/web/lib/commandes/indices.test.ts`
- Create: `apps/web/components/commandes/RaccourciCommandes.tsx`, `RaccourciCommandes.test.tsx`, `RaccourciCommandes.import.test.tsx`
- Create: `apps/web/components/commandes/BoutonCommandes.tsx`, `BoutonCommandes.test.tsx`
- Create: `apps/web/components/commandes/MessageConsole.tsx`, `MessageConsole.test.tsx`
- Modify: `apps/web/components/layout/Footer.tsx`, `apps/web/components/layout/Footer.test.tsx`, `apps/web/app/layout.tsx` (fichiers entiers ci-dessous)
- Modify: `apps/web/e2e/liens.spec.ts`, `apps/web/e2e/admin.spec.ts` (une ligne chacun), `apps/web/e2e/cv.spec.ts` (un test en plus)

**Interfaces:**
- Consumes: `commandes` (tâche 05) ; `PaletteCommandes`, `ProprietesPalette` (tâche 06, import **dynamique** seulement) ; `EVENEMENT_OUVRIR_COMMANDES` (tâche 05) ; `hoteSite` (tâche 01).
- Produces: `RaccourciCommandes({ commandes })`, `BoutonCommandes()`, `MessageConsole({ hote })`, `texteIndices(hote)`.

Points d'attention :
- Ce code est **chargé d'office sur toutes les pages** : il a été réduit au minimum (environ 1 Ko compressé en tout, mesuré). N'y ajoute rien.
- `RaccourciCommandes` n'importe la palette que par `import()` (un `import type` est permis) et ne connaît la liste qu'en props : un test lit sa source pour le vérifier.
- Dans le pied de page, tout « ⌘K pour naviguer » est le bouton (nom accessible complet). La touche a une largeur fixe (`w-[6ch]`) : le passage à « Ctrl+K » après l'hydratation ne décale rien (CLS mesuré : 0).
- Le pied de page a maintenant un `<code>` (`curl -L …`) : deux e2e existants lisaient « le premier `<code>` de la page » pour trouver le lien créé dans l'administration. Ils le cherchent désormais dans `main`.

- [ ] **Step 1: Indices (test d'abord)**

`apps/web/lib/commandes/indices.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { texteIndices } from "./indices";

describe("texteIndices", () => {
  it("donne curl, /api/me et le raccourci, alignés", () => {
    expect(texteIndices("jouan.dev")).toBe(
      [
        "Bonjour, curieux ! Ce site a quelques portes dérobées :",
        "  curl -L jouan.dev       le CV dans le terminal",
        "  jouan.dev/api/me        le CV en JSON (JSON Resume)",
        "  ⌘K ou Ctrl+K            la palette de commandes",
      ].join("\n"),
    );
  });

  it("ne contient pas « -- », qui fermerait un commentaire HTML", () => {
    expect(texteIndices("jouan.dev")).not.toContain("--");
  });
});
```

`apps/web/lib/commandes/indices.ts` :

```ts
/** Les trois indices des easter eggs : console du navigateur et source HTML. */
export function indices(hote: string): string[] {
  return [
    `${`curl -L ${hote}`.padEnd(24)}le CV dans le terminal`,
    `${`${hote}/api/me`.padEnd(24)}le CV en JSON (JSON Resume)`,
    `${"⌘K ou Ctrl+K".padEnd(24)}la palette de commandes`,
  ];
}

/** Texte complet, pour la console et le commentaire en tête de la page. */
export function texteIndices(hote: string): string {
  return ["Bonjour, curieux ! Ce site a quelques portes dérobées :", ...indices(hote).map((ligne) => `  ${ligne}`)].join("\n");
}
```

- [ ] **Step 2: Tests des composants (échouent)**

`apps/web/components/commandes/RaccourciCommandes.test.tsx` :

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { EVENEMENT_OUVRIR_COMMANDES } from "@/lib/commandes/evenements";
import type { Commande } from "@/lib/commandes/types";
import type { ProprietesPalette } from "./PaletteCommandes";

vi.mock("./PaletteCommandes", () => ({
  PaletteCommandes: ({ ouverte, fermer, commandes }: ProprietesPalette) => (
    <div data-testid="palette" data-ouverte={String(ouverte)} data-nombre={commandes.length}>
      <button onClick={fermer}>Fermer</button>
    </div>
  ),
}));

import { RaccourciCommandes } from "./RaccourciCommandes";

const commandes: Commande[] = [{ id: "accueil", libelle: "Accueil", groupe: "Navigation", motsCles: [], action: { type: "lien", href: "/" } }];
const rendre = () => render(<RaccourciCommandes commandes={commandes} />);
const touche = (init: KeyboardEventInit) => act(() => void fireEvent.keyDown(window, { key: "k", ...init }));
const palette = () => screen.findByTestId("palette");

describe("RaccourciCommandes", () => {
  it("n'importe statiquement ni la palette ni la liste des commandes", () => {
    // Sous jsdom, import.meta.url n'est pas une adresse file: ; Vitest tourne depuis apps/web.
    const source = readFileSync(join(process.cwd(), "components/commandes/RaccourciCommandes.tsx"), "utf8");
    expect(source).not.toMatch(/^import (?!type).*PaletteCommandes/m);
    expect(source).not.toMatch(/data\/commandes/);
  });

  it("rien avant le premier appel", () => {
    rendre();
    expect(screen.queryByTestId("palette")).toBeNull();
  });

  it("Ctrl+K ouvre la palette avec les commandes, un second Ctrl+K la ferme", async () => {
    rendre();
    await touche({ ctrlKey: true });
    expect(await palette()).toHaveAttribute("data-ouverte", "true");
    expect(await palette()).toHaveAttribute("data-nombre", "1");
    await touche({ ctrlKey: true });
    expect(await palette()).toHaveAttribute("data-ouverte", "false");
  });

  it("Cmd+K ouvre aussi ; K seul ou avec Maj ne fait rien", async () => {
    rendre();
    await touche({});
    await touche({ ctrlKey: true, shiftKey: true });
    expect(screen.queryByTestId("palette")).toBeNull();
    await touche({ metaKey: true });
    expect(await palette()).toHaveAttribute("data-ouverte", "true");
  });

  it("l'événement du pied de page l'ouvre ; la palette peut se fermer elle-même", async () => {
    rendre();
    await act(async () => void window.dispatchEvent(new Event(EVENEMENT_OUVRIR_COMMANDES)));
    expect(await palette()).toHaveAttribute("data-ouverte", "true");
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(await palette()).toHaveAttribute("data-ouverte", "false");
    await touche({ ctrlKey: true });
    expect(await palette()).toHaveAttribute("data-ouverte", "true");
  });
});
```

`apps/web/components/commandes/RaccourciCommandes.import.test.tsx` :

```tsx
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Morceau de JS de la palette introuvable (réseau coupé, déploiement en cours).
vi.mock("./PaletteCommandes", () => {
  throw new Error("Morceau de la palette introuvable");
});

import { RaccourciCommandes } from "./RaccourciCommandes";

afterEach(() => vi.restoreAllMocks());

describe("RaccourciCommandes, import de la palette rejeté", () => {
  it("prévient dans la console, sans rien afficher ni planter", async () => {
    const avertir = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(<RaccourciCommandes commandes={[]} />);
    await act(async () => {
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      await vi.dynamicImportSettled();
    });
    expect(avertir).toHaveBeenCalledWith(
      "Palette de commandes indisponible ; nouvel essai au prochain appel.",
      expect.any(Error),
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

`apps/web/components/commandes/BoutonCommandes.test.tsx` :

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EVENEMENT_OUVRIR_COMMANDES } from "@/lib/commandes/evenements";
import { BoutonCommandes } from "./BoutonCommandes";

afterEach(() => vi.unstubAllGlobals());

const agent = (userAgent: string) => vi.stubGlobal("navigator", { ...navigator, userAgent });

describe("BoutonCommandes", () => {
  it("ouvre la palette par son événement", () => {
    const recu = vi.fn();
    window.addEventListener(EVENEMENT_OUVRIR_COMMANDES, recu);
    render(<BoutonCommandes />);
    fireEvent.click(screen.getByRole("button", { name: /pour naviguer/ }));
    window.removeEventListener(EVENEMENT_OUVRIR_COMMANDES, recu);
    expect(recu).toHaveBeenCalledTimes(1);
  });

  it("affiche ⌘K sur un appareil Apple, Ctrl+K ailleurs", () => {
    agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)");
    const { unmount } = render(<BoutonCommandes />);
    expect(screen.getByRole("button")).toHaveTextContent("⌘K pour naviguer");
    unmount();
    agent("Mozilla/5.0 (X11; Linux x86_64)");
    render(<BoutonCommandes />);
    expect(screen.getByRole("button")).toHaveTextContent("Ctrl+K pour naviguer");
  });
});
```

`apps/web/components/commandes/MessageConsole.test.tsx` :

```tsx
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { texteIndices } from "@/lib/commandes/indices";
import { MessageConsole } from "./MessageConsole";

let informer: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  window.sessionStorage.clear();
  informer = vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("MessageConsole", () => {
  it("en production, une fois par session", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<MessageConsole hote="jouan.dev" />).unmount();
    render(<MessageConsole hote="jouan.dev" />);
    expect(informer).toHaveBeenCalledTimes(1);
    expect(informer).toHaveBeenCalledWith(texteIndices("jouan.dev"));
  });

  it("stockage refusé : le message s'affiche quand même, sans erreur", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("refusé", "SecurityError");
    });
    render(<MessageConsole hote="jouan.dev" />);
    expect(informer).toHaveBeenCalledTimes(1);
  });

  it("rien hors production", () => {
    render(<MessageConsole hote="jouan.dev" />);
    expect(informer).not.toHaveBeenCalled();
  });
});
```

Remplacer tout `apps/web/components/layout/Footer.test.tsx` par :

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Footer } from "./Footer";
import { contact } from "@/data/contact";
import { EVENEMENT_OUVRIR_COMMANDES } from "@/lib/commandes/evenements";
import { hoteSite, siteName } from "@/data/site";

describe("Footer", () => {
  it("donne l'e-mail, le GitHub et les pages légales", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: contact.email })).toHaveAttribute(
      "href",
      `mailto:${contact.email}`
    );
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", contact.github);
    expect(screen.getByRole("link", { name: "Mentions légales" })).toHaveAttribute(
      "href",
      "/mentions-legales"
    );
    expect(screen.getByRole("link", { name: "Politique de confidentialité" })).toHaveAttribute(
      "href",
      "/politique-de-confidentialite"
    );
    expect(screen.getByRole("link", { name: "Coulisses" })).toHaveAttribute("href", "/coulisses");
  });

  it("signe l'année en cours", () => {
    render(<Footer />);
    expect(screen.getByText(`© ${new Date().getFullYear()} ${siteName}`)).toBeInTheDocument();
  });

  it("indique la palette de commandes, qui s'ouvre au clic, et le CV par curl", () => {
    const recu = vi.fn();
    window.addEventListener(EVENEMENT_OUVRIR_COMMANDES, recu);
    render(<Footer />);
    fireEvent.click(screen.getByRole("button", { name: /pour naviguer/ }));
    window.removeEventListener(EVENEMENT_OUVRIR_COMMANDES, recu);
    expect(recu).toHaveBeenCalledTimes(1);
    expect(screen.getByText(`curl -L ${hoteSite}`)).toBeInTheDocument();
  });
});
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run lib/commandes/indices.test.ts components/commandes components/layout/Footer.test.tsx --reporter=dot`
Expected: FAIL — `RaccourciCommandes`, `BoutonCommandes`, `MessageConsole` introuvables ; indices : PASS.

- [ ] **Step 3: Composants**

`apps/web/components/commandes/RaccourciCommandes.tsx` :

```tsx
"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { EVENEMENT_OUVRIR_COMMANDES } from "@/lib/commandes/evenements";
import type { Commande } from "@/lib/commandes/types";
import type { ProprietesPalette } from "./PaletteCommandes";

/** Posée au premier appel ; vit dans le morceau de JS de la palette, pas dans le JS initial. */
let Palette: ComponentType<ProprietesPalette> | null = null;

/**
 * Raccourci de la palette de commandes (sous-projet 7), monté dans le layout :
 * Cmd+K / Ctrl+K, ou l'événement du bouton du pied de page. Au premier appel,
 * charge la palette (son propre morceau de JS) puis l'ouvre ; un appel pendant
 * qu'elle est ouverte la ferme. N'importe statiquement ni la palette ni la liste
 * des commandes : celle-ci arrive du layout, construite côté serveur.
 */
export function RaccourciCommandes({ commandes }: { commandes: Commande[] }) {
  const [etat, setEtat] = useState({ ouverte: false, ouvertures: 0 });
  const ouverte = useRef(false);

  useEffect(() => {
    let chargement = false;
    const ouvrir = () => {
      ouverte.current = true;
      setEtat((e) => ({ ouverte: true, ouvertures: e.ouvertures + 1 }));
    };
    const basculer = () => {
      if (ouverte.current) {
        ouverte.current = false;
        setEtat((e) => ({ ...e, ouverte: false }));
      } else if (Palette) {
        ouvrir();
      } else if (!chargement) {
        chargement = true;
        import("./PaletteCommandes")
          .then((m) => {
            Palette = m.PaletteCommandes;
            ouvrir();
          })
          .catch((erreur: unknown) => {
            console.warn("Palette de commandes indisponible ; nouvel essai au prochain appel.", erreur);
          })
          .finally(() => {
            chargement = false;
          });
      }
    };
    const surTouche = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      e.preventDefault();
      basculer();
    };
    window.addEventListener("keydown", surTouche);
    window.addEventListener(EVENEMENT_OUVRIR_COMMANDES, basculer);
    return () => {
      window.removeEventListener("keydown", surTouche);
      window.removeEventListener(EVENEMENT_OUVRIR_COMMANDES, basculer);
    };
  }, []);

  const fermer = useCallback(() => {
    ouverte.current = false;
    setEtat((e) => ({ ...e, ouverte: false }));
  }, []);

  if (!Palette || etat.ouvertures === 0) return null;
  // Une clé par ouverture : la palette repart d'une saisie vide et relit la page.
  return <Palette key={etat.ouvertures} commandes={commandes} ouverte={etat.ouverte} fermer={fermer} />;
}
```

`apps/web/components/commandes/BoutonCommandes.tsx` :

```tsx
"use client";

import { useSyncExternalStore } from "react";
import { EVENEMENT_OUVRIR_COMMANDES } from "@/lib/commandes/evenements";

const jamais = () => () => {};
const surMac = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

/**
 * « ⌘K pour naviguer », dans le pied de page : ouvre la palette de commandes,
 * seul moyen sur mobile. « Ctrl+K » hors des appareils Apple, après
 * l'hydratation : la touche a une largeur fixe, le changement ne décale rien.
 */
export function BoutonCommandes() {
  const mac = useSyncExternalStore(jamais, surMac, () => true);
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(EVENEMENT_OUVRIR_COMMANDES))}
      className="hover:text-texte"
    >
      <kbd className="inline-block w-[6ch] text-right font-mono">{mac ? "⌘K" : "Ctrl+K"}</kbd> pour naviguer
    </button>
  );
}
```

`apps/web/components/commandes/MessageConsole.tsx` :

```tsx
"use client";

import { useEffect } from "react";
import { texteIndices } from "@/lib/commandes/indices";

const CLE = "jouan.dev:message-console";

/** Message pour qui ouvre la console : en production, une fois par session. */
export function MessageConsole({ hote }: { hote: string }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    try {
      if (window.sessionStorage.getItem(CLE)) return;
      window.sessionStorage.setItem(CLE, "1");
    } catch {
      // Stockage refusé : le message revient à chaque page, sans erreur.
    }
    console.info(texteIndices(hote));
  }, [hote]);
  return null;
}
```

Remplacer tout `apps/web/components/layout/Footer.tsx` par :

```tsx
import Link from "next/link";
import { BoutonCommandes } from "@/components/commandes/BoutonCommandes";
import { contact } from "@/data/contact";
import { hoteSite, siteName } from "@/data/site";

/**
 * Pied de page : signature, e-mail, GitHub, coulisses et pages légales, puis
 * les indices des easter eggs (palette de commandes, CV dans le terminal).
 */
export function Footer() {
  return (
    <footer className="border-t border-trait">
      <div className="mx-auto flex max-w-6xl 2xl:max-w-page flex-col gap-4 px-5 pb-4 pt-8 text-sm text-texte-doux sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          © {new Date().getFullYear()} {siteName}
        </p>
        <nav aria-label="Pied de page">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <a href={`mailto:${contact.email}`} className="hover:text-texte">
                {contact.email}
              </a>
            </li>
            <li>
              <a href={contact.github} rel="me" className="hover:text-texte">
                GitHub
              </a>
            </li>
            <li>
              <Link href="/coulisses" className="hover:text-texte">
                Coulisses
              </Link>
            </li>
            <li>
              <Link href="/mentions-legales" className="hover:text-texte">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/politique-de-confidentialite" className="hover:text-texte">
                Politique de confidentialité
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-5 pb-8 text-sm text-texte-doux sm:px-8 2xl:max-w-page">
        <BoutonCommandes />
        {" · "}
        <code className="font-mono">curl -L {hoteSite}</code>
      </p>
    </footer>
  );
}
```

Remplacer tout `apps/web/app/layout.tsx` par :

```tsx
import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SkipLink, CONTENU_ID } from "@/components/layout/SkipLink";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MessageConsole } from "@/components/commandes/MessageConsole";
import { RaccourciCommandes } from "@/components/commandes/RaccourciCommandes";
import { PersonJsonLd } from "@/components/shared/PersonJsonLd";
import { Umami } from "@/components/shared/Umami";
import { commandes } from "@/data/commandes";
import { hoteSite, siteUrl, siteName, siteDescription } from "@/data/site";
import { couleur } from "@/lib/charte";
import { texteIndices } from "@/lib/commandes/indices";

// next/font sert les fichiers depuis le domaine : la CSP n'a pas besoin de
// Google Fonts.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
});

// Pas de `alternates` ici : les champs de metadata sont hérités par les
// segments enfants, et une canonical posée à la racine ferait déclarer à
// chaque page qu'elle est un doublon de l'accueil. Chaque page pose la sienne.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s — ${siteName}`,
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName,
    title: siteName,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
  },
};

/** Indices des easter eggs pour qui lit la source de la page (sous-projet 7). */
const COMMENTAIRE_SOURCE = `<!--\n${texteIndices(hoteSite)}\n-->`;

/** Barre du navigateur mobile et contrôles natifs aux couleurs de la nuit. */
export const viewport: Viewport = {
  themeColor: couleur("fond"),
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${instrument.variable}`}>
      {/* `relative` : le fond de l'accueil se positionne par rapport au corps. */}
      <body className="relative flex min-h-screen flex-col font-sans text-texte">
        <div hidden dangerouslySetInnerHTML={{ __html: COMMENTAIRE_SOURCE }} />
        <PersonJsonLd />
        <Umami />
        <SkipLink />
        <Header />
        {/* tabIndex -1 : sans lui, Safari et Firefox défilent jusqu'au
            contenu mais laissent le focus sur le lien d'évitement. */}
        <main id={CONTENU_ID} tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <Footer />
        <RaccourciCommandes commandes={commandes} />
        <MessageConsole hote={hoteSite} />
      </body>
    </html>
  );
}
```

Run: `./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec vitest run lib/commandes components/commandes components/layout --reporter=dot`
Expected: PASS.

- [ ] **Step 4: e2e existants et indice dans la source**

Dans `apps/web/e2e/liens.spec.ts`, remplacer :

```ts
  const url = await page.locator("code").first().textContent();
```

par :

```ts
  // Dans la page seulement : le pied de page a aussi un `<code>` (curl -L …).
  const url = await page.getByRole("main").locator("code").first().textContent();
```

Dans `apps/web/e2e/admin.spec.ts`, remplacer `page.locator("code").first()` par `page.getByRole("main").locator("code").first()` (une seule occurrence).

À la fin de `apps/web/e2e/cv.spec.ts`, ajouter :

```ts
test("la source de la page cache les indices dans un commentaire", async ({ request }) => {
  const html = await (await request.get("/", { headers: { "User-Agent": NAVIGATEUR } })).text();
  expect(html).toMatch(/<!--\nBonjour, curieux ![\s\S]*curl -L [\s\S]*\/api\/me[\s\S]*⌘K ou Ctrl\+K[\s\S]*-->/);
});
```

- [ ] **Step 5: Vérifier**

```bash
./docs/superpowers/plans/easter-eggs/court.sh bash -c 'pnpm lint && pnpm typecheck && pnpm --filter web exec vitest run lib/charte-classes.test.ts --reporter=dot'
./docs/superpowers/plans/easter-eggs/court.sh bash -c 'pnpm build && pnpm --filter web verifier-accueil-statique && pnpm --filter web semer-lien-exemple'
./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web exec playwright test e2e/cv.spec.ts e2e/liens.spec.ts e2e/admin.spec.ts e2e/accessibilite.spec.ts --reporter=line
```

Expected: codes de sortie 0 (l'e2e d'accessibilité passe le clavier sur le nouveau bouton du pied de page).

- [ ] **Step 6: Commiter**

```bash
git add apps/web/lib/commandes/indices.ts
git add apps/web/lib/commandes/indices.test.ts
git add apps/web/components/commandes/RaccourciCommandes.tsx
git add apps/web/components/commandes/RaccourciCommandes.test.tsx
git add apps/web/components/commandes/RaccourciCommandes.import.test.tsx
git add apps/web/components/commandes/BoutonCommandes.tsx
git add apps/web/components/commandes/BoutonCommandes.test.tsx
git add apps/web/components/commandes/MessageConsole.tsx
git add apps/web/components/commandes/MessageConsole.test.tsx
git add apps/web/components/layout/Footer.tsx
git add apps/web/components/layout/Footer.test.tsx
git add apps/web/app/layout.tsx
git add apps/web/e2e/liens.spec.ts
git add apps/web/e2e/admin.spec.ts
git add apps/web/e2e/cv.spec.ts
git commit -m "Palette : raccourci Cmd+K, bouton du pied de page, indices en console et dans la source"
```
