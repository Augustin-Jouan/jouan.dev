# La maquette complète comme démo — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la démo réduite de l'étude de cas « Suivi de marchés » par la maquette fonctionnelle complète de l'application, anonymisée (entreprise « Maisons Exemple », artisans et chantiers fictifs), servie en fichier statique.

**Architecture:** Un générateur Python local, jamais commité (`.superpowers/anonymat/generer-demo.py`), lit la maquette d'origine, remplace les blocs de données par des données fictives, applique les remplacements de texte libre d'un fichier de correspondances local, puis les retouches propres au portfolio (thème, connexion d'office, stockage de session, téléchargement). Il écrit `apps/web/public/demo/suivi-de-marches/index.html`, commité avec ses polices. L'ancienne application `apps/demo-marches` est supprimée ; un test Vitest commité vérifie la démo sans connaître aucune valeur réelle.

**Tech Stack:** Python 3 (générateur local), HTML/CSS/JS sans framework (la maquette), Next.js 16.4 (site), Vitest, Playwright, `@axe-core/playwright`.

**Spec:** `docs/superpowers/specs/2026-10-10-demo-maquette-design.md`

**Où exécuter :** dossier principal du dépôt, branche `sous-projet-8-demo-maquette`. La maquette d'origine est dans le dépôt du projet client, **en lecture seule** : son chemin est passé en argument au générateur et n'est écrit nulle part dans ce dépôt.

## Global Constraints

- Site en **français uniquement** ; commentaires et messages de commit en français.
- **Aucun nom de client, de projet client (y compris le nom du produit) ou d'employeur** dans le dépôt, ni dans ce plan, ni dans un commit. Vérifier chaque fichier écrit contre `.superpowers/anonymat/termes-interdits.txt` (sans jamais citer la liste).
- Aucune donnée réelle de la maquette (artisans, chantiers, maîtres d'ouvrage, personnes, adresses, téléphones, e-mails, identifiants légaux, montants) dans un fichier commité. Les valeurs réelles ne vivent que dans `.superpowers/anonymat/` (ignoré par Git).
- Entreprise fictive : **Maisons Exemple**. Compte fictif : **Camille Martin**, `camille.martin@maisons-exemple.example`, « Maître d'œuvre ». E-mails : domaine `.example` uniquement.
- Téléphones fictifs : tranches ARCEP réservées à la fiction `01 99 00`, `02 61 91`, `03 53 01`, `04 65 71`, `05 36 49`, `06 39 98`.
- Communes fictives, codes postaux en `00xxx` (visiblement fictifs, comme `RCS 000 000 000`).
- Clé de stockage : `suivi-de-marches-demo-v1`, dans `sessionStorage`.
- Budget : `index.html` de la démo ≤ **110 Ko** compressés (gzip) ; polices hors budget.
- Les polices sont référencées en **URL absolues** (`/demo/suivi-de-marches/polices/…`) : la démo est aussi servie à `/demo/suivi-de-marches` sans barre finale, où une URL relative pointerait sur `/demo/polices/`.
- Espaces insécables : jamais en caractère littéral dans le code ; vérifier avec `grep -cP "[\x{00a0}\x{202f}]"`.
- Ne jamais modifier `apps/web/.env.example` ni `apps/web/scripts/empreinte-mot-de-passe.mjs`. Ne jamais afficher un `.env.local`.
- Git : commits ciblés (`git add` fichier par fichier), aucun push, aucune PR, aucune fusion sans l'accord d'Augustin ; jamais de `--force`, `reset --hard` ni `git stash` nu.
- Ports : ne pas toucher au `next dev` d'Augustin sur le port 3000 ; e2e sur 3100 / 3201 (configuration Playwright existante).

## Review Focus

1. **Donnée réelle restée hors des blocs connus** (commentaire, en-tête d'un document imprimable, nom d'un fichier exporté) : le générateur vérifie l'absence de chaque valeur réelle remplacée et des termes interdits ; la tâche 5 ajoute une relecture à l'œil de chaque document généré (avenant, certificat, compte rendu, procès-verbal, planning imprimable, CSV).
2. **Stockage bloqué** (navigation privée, réglages stricts) : la démo doit démarrer sur le jeu de démonstration sans erreur — e2e de la tâche 4 avec `sessionStorage` qui lève une exception.
3. **Adresse courte sans barre finale** : polices et démo doivent se charger aussi à `/demo/suivi-de-marches` — e2e de la tâche 4 (polices chargées, aucune réponse 404).
4. **Plein écran sur téléphone** : la maquette, pensée pour ordinateur, doit au moins s'ouvrir sans erreur — e2e mobile de la tâche 4.
5. **Ressource externe oubliée** (police, image) : aucune requête hors du site pendant les parcours — e2e de la tâche 4, en plus du garde-fou statique de la tâche 2.

---

## Fichiers

| Fichier | Rôle | Tâche |
|---|---|---|
| `apps/demo-marches/` | Supprimé (ses polices déménagent) | 1 |
| `package.json`, `pnpm-lock.yaml`, `Dockerfile`, `apps/realtime/Dockerfile`, `.github/workflows/ci.yml`, `.gitignore` | Plus de build ni de dépendances de l'ancienne démo | 1 |
| `apps/web/public/demo/suivi-de-marches/polices/*.woff2`, `OFL.txt` | Polices de la maquette et leur licence | 1 |
| `apps/web/lib/demo-anonymat.test.ts` | Garde-fou d'anonymat (commité) | 2 |
| `.superpowers/anonymat/generer-demo.py` | Générateur (local, jamais commité) | 2, 3 |
| `.superpowers/anonymat/correspondances-demo.json` | Remplacements de texte libre, valeurs réelles (local, jamais commité) | 2 |
| `apps/web/public/demo/suivi-de-marches/index.html` | La démo générée (commitée) | 2, 3 |
| `apps/web/scripts/verifier-taille-demo.mjs` | Budget sur le fichier HTML | 3 |
| `apps/web/components/realisations/FenetreDemo.tsx` (+ test) | Nouvelle légende | 3 |
| `apps/web/app/politique-de-confidentialite/page.tsx` (+ test) | Stockage de session de la démo | 3 |
| `apps/web/e2e/demo.spec.ts` | Réécrit sur la maquette | 4 |
| `apps/web/scripts/capturer-apercu-demo.mjs`, `apps/web/public/realisations/suivi-de-marches/apercu.webp` | Aperçu recapturé | 4 |
| `README.md`, `apps/web/next.config.ts`, `apps/web/eslint.config.mjs` | Documentation et commentaires | 1, 5 |

---

### Task 1: Retirer l'ancienne démo, garder ses polices

**Files:**
- Delete: `apps/demo-marches/` (sauf les polices, déplacées)
- Create: `apps/web/public/demo/suivi-de-marches/polices/OFL.txt`
- Move: `apps/demo-marches/src/polices/*.woff2` → `apps/web/public/demo/suivi-de-marches/polices/`
- Modify: `package.json`, `pnpm-lock.yaml`, `Dockerfile`, `apps/realtime/Dockerfile`, `.github/workflows/ci.yml`, `.gitignore`, `apps/web/next.config.ts`, `apps/web/eslint.config.mjs`

**Interfaces:**
- Produces: les polices à `/demo/suivi-de-marches/polices/{figtree-400,figtree-500,figtree-600,outfit-500,outfit-600,outfit-700,spline-sans-mono-400,spline-sans-mono-500,spline-sans-mono-600}.woff2` (tâche 2).

Écart à la spec : Spline Sans Mono s'arrête à 600 (fichiers déjà dans le dépôt) au lieu de 700. Les rares textes en chasse fixe et en gras de la maquette sont épaissis par le navigateur ; à regarder sur les captures (tâche 4). Si le rendu déplaît, ajouter `spline-sans-mono-700.woff2` dans un second temps.

- [ ] **Step 1: Vider la sortie de l'ancien build et déplacer les polices**

```bash
rm -rf apps/web/public/demo/suivi-de-marches        # sortie de build non suivie par Git
mkdir -p apps/web/public/demo/suivi-de-marches/polices
git mv apps/demo-marches/src/polices/*.woff2 apps/web/public/demo/suivi-de-marches/polices/
git rm -r -q apps/demo-marches
rm -rf apps/demo-marches                            # node_modules et .mesures non suivis
```

- [ ] **Step 2: Licence des polices** — `apps/web/public/demo/suivi-de-marches/polices/OFL.txt` : les trois lignes de copyright puis le texte intégral de la SIL Open Font License 1.1.

```text
Figtree : Copyright 2022 The Figtree Project Authors (https://github.com/erikdkennedy/figtree)
Outfit : Copyright 2021 The Outfit Project Authors (https://github.com/Outfitio/Outfit-Fonts)
Spline Sans Mono : Copyright 2022 The Spline Sans Mono Project Authors (https://github.com/SorkinType/SplineSansMono)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
(texte intégral de la licence, tel que publié sur https://openfontlicense.org)
```

Le fichier contient le texte intégral de l'OFL 1.1 (préambule, définitions, conditions 1 à 5, résiliation, avertissement), pas la ligne d'attente ci-dessus.

- [ ] **Step 3: Racine et Docker**

`package.json` :
```json
    "build": "pnpm --filter web build",
```
et supprimer la ligne `"dev:demo": "pnpm --filter demo-marches dev",`.

`Dockerfile` : supprimer `COPY apps/demo-marches/package.json apps/demo-marches/` (étage `deps`) et `COPY --from=deps /app/apps/demo-marches/node_modules ./apps/demo-marches/node_modules` (étage `build`) ; remplacer le commentaire `# La démo (apps/demo-marches) puis le site ; la sortie de la démo tombe dans apps/web/public.` par `# Le site (la démo de l'étude de cas est un fichier statique de apps/web/public).`

`apps/realtime/Dockerfile` : supprimer `COPY apps/demo-marches/package.json apps/demo-marches/`.

- [ ] **Step 4: CI, Git, commentaires**

`.github/workflows/ci.yml`, étape « Mesures des tests » :
```yaml
          node apps/web/scripts/compter-tests.mjs vitest
          apps/web/.mesures/vitest.json apps/realtime/.mesures/vitest.json
          > mesures-verifier.json
```

`.gitignore` : supprimer les deux lignes `# Sortie du build de la démo (apps/demo-marches)` et `apps/web/public/demo/`.

`apps/web/eslint.config.mjs` : le commentaire au-dessus de `"public/demo/**",` devient `// Démo statique de l'étude de cas (maquette anonymisée, générée hors du dépôt).`

`apps/web/next.config.ts` : `// La démo (public/demo, construite depuis apps/demo-marches) s'affiche dans` devient `// La démo (public/demo, fichier statique commité) s'affiche dans`.

- [ ] **Step 5: Lockfile et vérification**

```bash
pnpm install
grep -c demo-marches pnpm-lock.yaml        # attendu : 0
git grep -n "demo-marches" -- ':!docs'     # attendu : README.md seulement (tâche 5)
pnpm lint && pnpm typecheck && pnpm test
```
Expected: code de sortie 0 ; `apps/web` compte un fichier de test de moins, aucun échec.

- [ ] **Step 6: Commit**

```bash
git add package.json
git add pnpm-lock.yaml
git add Dockerfile
git add apps/realtime/Dockerfile
git add .github/workflows/ci.yml
git add .gitignore
git add apps/web/eslint.config.mjs
git add apps/web/next.config.ts
git add apps/web/public/demo/suivi-de-marches/polices/OFL.txt
git commit -m "Démo : l'application réduite apps/demo-marches est retirée, ses polices passent dans public/demo"
```
(Les suppressions et déplacements faits par `git rm` / `git mv` sont déjà indexés.)

---

### Task 2: Garde-fou d'anonymat et générateur

**Files:**
- Create: `apps/web/lib/demo-anonymat.test.ts`
- Create (local, jamais commité): `.superpowers/anonymat/generer-demo.py`, `.superpowers/anonymat/correspondances-demo.json`
- Create: `apps/web/public/demo/suivi-de-marches/index.html` (généré)

**Interfaces:**
- Consumes: polices de la tâche 1.
- Produces: `generer-demo.py <maquette.html>` écrit `index.html` et s'arrête en erreur (`ÉCHEC : …`) si une valeur réelle subsiste ; chantier fictif de référence « LEFÈVRE — Rivebourg » (tâche 4) ; compte fictif Camille Martin.

- [ ] **Step 1: Le garde-fou (test qui échoue)** — `apps/web/lib/demo-anonymat.test.ts`

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Garde-fou de la démo « Suivi de marchés » (sous-projet 8) : la maquette publiée ne doit
// porter aucune donnée réelle. Elle est générée hors du dépôt par un script d'anonymisation ;
// ce test vérifie ce qui se vérifie sans connaître les vraies valeurs.
const html = readFileSync(join(process.cwd(), "public/demo/suivi-de-marches/index.html"), "utf8");

/** Tranches de numéros que l'ARCEP réserve à la fiction (6 premiers chiffres). */
const TRANCHES_FICTION = ["019900", "026191", "035301", "046571", "053649", "063998"];

describe("démo « Suivi de marchés » : anonymat", () => {
  it("toute adresse e-mail est en .example (domaine réservé)", () => {
    const adresses = html.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [];
    expect(adresses.length).toBeGreaterThan(0);
    expect(adresses.filter((a) => !a.endsWith(".example"))).toEqual([]);
  });

  it("tout numéro de téléphone est dans une tranche réservée à la fiction", () => {
    const numeros = (html.match(/\b0[1-9](?:[ .-]?\d{2}){4}\b/g) ?? []).map((n) => n.replace(/\D/g, ""));
    expect(numeros.length).toBeGreaterThan(0);
    expect(numeros.filter((n) => !TRANCHES_FICTION.includes(n.slice(0, 6)))).toEqual([]);
  });

  it("n'intègre aucune image matricielle (le logo est un monogramme SVG)", () => {
    expect(html).not.toMatch(/data:image\/(?:jpeg|png|gif|webp)/);
  });

  it("ne charge aucune ressource externe, polices comprises", () => {
    expect(html).not.toMatch(/(?:src|href)\s*=\s*["']?\s*https?:/i);
    expect(html).not.toMatch(/url\(\s*["']?https?:/i);
    expect(html).not.toMatch(/@import/i);
  });

  it("les polices sont servies par le site, en adresses absolues", () => {
    expect(html).toContain("/demo/suivi-de-marches/polices/figtree-400.woff2");
  });

  it("garde ses données le temps de l'onglet seulement", () => {
    expect(html).toContain("sessionStorage.getItem(CLE)");
    expect(html).not.toMatch(/localStorage\.(?:getItem|setItem)/);
  });
});
```

Run: `pnpm --filter web exec vitest run lib/demo-anonymat.test.ts --reporter=dot`
Expected: FAIL (ENOENT : `index.html` n'existe pas encore).

- [ ] **Step 2: Les correspondances de texte libre (local)** — `.superpowers/anonymat/correspondances-demo.json`

Format : `{ "remplacements": [["valeur réelle", "valeur fictive"], …] }`, appliqués dans l'ordre, sensibles à la casse. Y mettre, en relisant les occurrences dans la maquette d'origine (jamais dans ce plan ni dans un commit) :
- le nom du produit, sous toutes ses casses → `Suivi de marchés` / `SUIVI DE MARCHÉS` ;
- le nom du client, sous toutes ses casses et formes (« S.A.S … », raison sociale développée) → `Maisons Exemple` / `MAISONS EXEMPLE`, `Maîtrise d'œuvre de maisons individuelles` ;
- adresses, téléphones, site web et identifiants légaux du client → `12 rue de l'Exemple – 00110 RIVEBOURG`, `02 61 91 00 00` (même format que l'original : points, tirets ou espaces), `maisons-exemple.example`, `RCS 000 000 000 – APE 0000Z`, `FR00000000000` ;
- la ville et le département du client, et toute autre commune réelle hors des blocs de données → communes fictives de la liste `COMMUNES` ;
- les noms de collègues cités en commentaire → noms fictifs.

Les e-mails sont traités par le générateur (step 3), pas ici.

- [ ] **Step 3: Le générateur (local)** — `.superpowers/anonymat/generer-demo.py`

```python
#!/usr/bin/env python3
"""Démo « Suivi de marchés » du portfolio, tirée de la maquette d'origine.

Usage : python3 .superpowers/anonymat/generer-demo.py <maquette.html>
Écrit apps/web/public/demo/suivi-de-marches/index.html.
Local, jamais commité : il lit des données réelles et correspondances-demo.json.
"""
import json
import os
import random
import re
import sys
import urllib.parse
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
ANONYMAT = RACINE / ".superpowers/anonymat"
SORTIE = RACINE / "apps/web/public/demo/suivi-de-marches/index.html"
hasard = random.Random(2026)


def echec(message):
    sys.exit(f"ÉCHEC : {message}")


def bornes(texte, debut, fin):
    """Début et fin (exclue) du bloc qui commence par `debut` et finit au premier `fin` suivant."""
    if texte.count(debut) != 1:
        echec(f"repère introuvable ou ambigu : {debut!r}")
    i = texte.index(debut)
    return i, texte.index(fin, i) + len(fin)


def remplacer_une_fois(texte, ancien, nouveau):
    if texte.count(ancien) != 1:
        echec(f"{texte.count(ancien)} occurrence(s) au lieu d'une : {ancien[:60]!r}")
    return texte.replace(ancien, nouveau)


def js(valeur):
    return json.dumps(valeur, ensure_ascii=False)


# ---------- données fictives ----------

COMPTE = {"mail": "camille.martin@maisons-exemple.example", "nom": "Camille Martin", "role": "Maître d'œuvre"}
CONTACT = "contact@maisons-exemple.example"

COMMUNES = [("00110", "RIVEBOURG"), ("00120", "VAL-DE-BRUME"), ("00130", "SAINT-ERNEL"), ("00140", "BRÉHAUT"),
            ("00150", "LES HAUTES-NOUES"), ("00160", "MOULIN-NEUF"), ("00170", "LA CROIX-VERTE"),
            ("00180", "PONTLIEU-SUR-ERVE")]
RUES = ["rue des Artisans", "zone de la Lande", "rue du Moulin", "impasse des Forges", "route de la Gare",
        "rue de la Fontaine", "parc d'activités du Grand Pré", "chemin des Vignes"]
TRANCHES = ["01-99-00", "02-61-91", "03-53-01", "04-65-71", "05-36-49", "06-39-98"]

# Corps de métier → (raison sociale, interlocuteur). Clés : motifs des désignations de lots.
ARTISANS = {
    r"TERRASS|V\.?R\.?D": [("TERRASSEMENTS DU GRAND PRÉ", "Julien FAURE"), ("LANDE TP", "Sophie GIRAUD"),
                           ("VRD MOULIN-NEUF", "Thomas PERROT"), ("ERVE TERRASSEMENT", "Nicolas BRUN")],
    r"GROS": [("BÂTIR RIVEBOURG", "Antoine LEROUX"), ("MAÇONNERIE DES NOUES", "Pierre CHEVALIER"),
              ("CONSTRUCTIONS VAL-DE-BRUME", "Hugo MERCIER"), ("GROS ŒUVRE DE L'ERNEL", "Laurent BESNARD"),
              ("MAÇONS DE BRÉHAUT", "Yannick ROCHE")],
    r"CHARPENT": [("CHARPENTES DU BOCAGE", "Romain GAUTHIER"), ("BOIS ET CHARPENTE PONTLIEU", "Éric MASSON"),
                  ("ATELIER DES FERMES", "Olivier DUPUIS"), ("CHARPENTE CROIX-VERTE", "Damien RENAUD")],
    r"COUVERT|ZINGU": [("COUVERTURE DES ARDOISES", "Sylvain BARBIER"), ("TOITS DE RIVEBOURG", "Mathieu HUET"),
                       ("ZINGUERIE DU MOULIN", "Cédric COLIN"), ("COUVREURS DE L'ERVE", "Franck VIDAL")],
    r"MENUISERIES? EXT": [("FERMETURES DU GRAND PRÉ", "Aurélie LEMAIRE"), ("BAIES ET VOLETS NOUES", "Kevin ARNAUD"),
                          ("MENUISERIE ALU BRÉHAUT", "Stéphane GILLET"), ("OUVERTURES VAL-DE-BRUME", "Marion CARON")],
    r"PLÂTR|PLATR|ISOL|CLOISON": [("PLÂTRERIE DE LA LANDE", "Bastien PICARD"), ("ISOLATION RIVEBOURG", "Sébastien LUCAS"),
                                  ("CLOISONS ET PLAFONDS ERNEL", "Fabien TESSIER"), ("PLAQUISTES DU MOULIN", "Alexis GUERIN"),
                                  ("PLÂTRE ET ISOLATION PONTLIEU", "Benoît AUBERT")],
    r"MENUISERIES? INT": [("AGENCEMENT DES NOUES", "Gaëtan FLEURY"), ("MENUISERIE BOIS CROIX-VERTE", "Guillaume SCHMITT"),
                          ("PORTES ET PLACARDS BRÉHAUT", "Adrien MEYER"), ("ATELIER BOIS RIVEBOURG", "Quentin ROY")],
    r"ÉLECTR|ELECTR": [("ÉLEC SERVICES VAL-DE-BRUME", "Rémi DUVAL"), ("ÉLECTRICITÉ DU GRAND PRÉ", "Florian NOËL"),
                       ("COURANT ERNEL", "Arnaud BOYER"), ("ÉLECTRICIENS DE L'ERVE", "Jonathan HENRY"),
                       ("LUMIÈRE ET RÉSEAUX MOULIN-NEUF", "David FABRE")],
    r"PLOMB|CHAUFF|V\.M\.C": [("PLOMBERIE CHAUFFAGE RIVEBOURG", "Christophe ANDRÉ"), ("THERMIQUE DES NOUES", "Patrick LECLERC"),
                              ("SANITAIRES PONTLIEU", "Ludovic BERTIN"), ("CLIMAT ET EAU BRÉHAUT", "Grégory DENIS"),
                              ("CHAUFFAGISTES DU BOCAGE", "Thierry COLLET")],
    r"CARREL|FAÏENCE|FAIENCE": [("CARRELAGES DE LA LANDE", "Émilie BAILLY"), ("FAÏENCE ET SOLS ERNEL", "Mickaël RIVIÈRE"),
                                ("CÉRAMIQUE VAL-DE-BRUME", "Anthony GARCIA"), ("CARRELEURS DU MOULIN", "Bruno PERRIN")],
    r"PEINT": [("PEINTURES DU GRAND PRÉ", "Céline MARCHAND"), ("DÉCOR ET FINITIONS NOUES", "Frédéric LACROIX"),
               ("PEINTRES DE RIVEBOURG", "Pascal JOLY"), ("COULEURS CROIX-VERTE", "Nathalie BRETON")],
    r"ESCALIER": [("ESCALIERS DE L'ERVE", "Gilles MAILLARD"), ("ATELIER ESCALIERS BRÉHAUT", "Jean-Marc CORDIER"),
                  ("MARCHES ET LIMONS PONTLIEU", "Serge LEGRAND")],
    r"ENDUIT|FAÇADE|FACADE|RAVAL": [("FAÇADES DU BOCAGE", "Dominique POIRIER"), ("ENDUITS RIVEBOURG", "Alain ROBIN"),
                                    ("RAVALEMENT DES NOUES", "Hervé PRÉVOST"), ("FAÇADIERS DE LA LANDE", "Philippe CARPENTIER")],
}

CHANTIERS = [
    {"ref": "LEFÈVRE — Rivebourg", "mo": "M. et Mme LEFÈVRE", "dem": "8 rue des Tilleuls, 00110 RIVEBOURG",
     "ca": "Camille Martin", "adr": "Lotissement des Prés-Hauts, lot 7", "cp": "00110", "com": "RIVEBOURG"},
    {"ref": "GARNIER — Val-de-Brume", "mo": "M. GARNIER", "dem": "3 chemin du Moulin, 00120 VAL-DE-BRUME",
     "ca": "Camille Martin", "adr": "La Haute-Lande", "cp": "00120", "com": "VAL-DE-BRUME"},
    {"ref": "SCI DES NOUES — Saint-Ernel", "mo": "SCI DES NOUES", "dem": "15 avenue des Chênes, 00130 SAINT-ERNEL",
     "ca": "Camille Martin", "adr": "2 place de l'Église", "cp": "00130", "com": "SAINT-ERNEL"},
    {"ref": "VASSEUR — Bréhaut", "mo": "M. et Mme VASSEUR", "dem": "21 rue de la Fontaine, 00140 BRÉHAUT",
     "ca": "Camille Martin", "adr": "Le Clos Fleuri", "cp": "00140", "com": "BRÉHAUT"},
]

POLICES = [("Figtree", "figtree", (400, 500, 600)), ("Outfit", "outfit", (500, 600, 700)),
           ("Spline Sans Mono", "spline-sans-mono", (400, 500, 600))]

LOGO = "data:image/svg+xml;charset=utf-8," + urllib.parse.quote(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 197">'
    '<rect width="180" height="197" rx="18" fill="#1f3a4d"/>'
    '<text x="90" y="122" font-family="Outfit, sans-serif" font-size="76" font-weight="700" '
    'fill="#ffffff" text-anchor="middle">ME</text></svg>', safe="")


def artisans_fictifs():
    lignes = []
    for k, entreprises in enumerate(ARTISANS.values()):
        for m, (nom, contact) in enumerate(entreprises):
            cp, commune = COMMUNES[(k + m) % len(COMMUNES)]
            rue = RUES[(k * 3 + m) % len(RUES)]
            tel = f"{TRANCHES[(k + m) % len(TRANCHES)]}-{(k * 7 + m * 13) % 100:02d}-{(k * 11 + m * 5) % 100:02d}"
            lignes.append([nom, f"{(k * 5 + m * 3) % 40 + 1} {rue}", cp, commune, contact, tel])
    return lignes


def motif_metier(designation):
    for motif in ARTISANS:
        if re.search(motif, designation.upper()):
            return motif
    return r"GROS"


# ---------- étapes ----------

def anonymiser_artisans(texte, reels):
    i, j = bornes(texte, "const ARTISANS_SEED = [", "\n];")
    for ligne in texte[i:j].splitlines()[1:-1]:
        if ligne.strip().startswith("["):
            reels.update(v for v in json.loads(ligne.strip().rstrip(",")) if v)
    nouveau = "const ARTISANS_SEED = [\n" + ",\n".join(js(l) for l in artisans_fictifs()) + "\n];"
    return texte[:i] + nouveau + texte[j:]


def anonymiser_comptes(texte, reels):
    i, j = bornes(texte, "const COMPTES = {", "\n};")
    for mail, nom in re.findall(r"'([^']+@[^']+)': \{ nom: '([^']+)'", texte[i:j]):
        reels.update((mail, nom))
    nouveau = (f"const COMPTES = {{\n\t{js(COMPTE['mail'])}: {{ nom: {js(COMPTE['nom'])}, "
               f"role: {js(COMPTE['role'])} }}\n}};")
    texte = texte[:i] + nouveau + texte[j:]
    i, j = bornes(texte, "/** Comptes de démonstration.", "*/")
    return texte[:i] + "/** Compte de démonstration : la démo du portfolio s'ouvre connectée dessus. */" + texte[j:]


def anonymiser_seed(texte, reels, paires):
    i, j = bornes(texte, "function seed() {", "\n}\n")
    morceaux = texte[i:j].split("newChantier({")
    if len(morceaux) - 1 != len(CHANTIERS):
        echec(f"{len(morceaux) - 1} chantiers de démonstration au lieu de {len(CHANTIERS)}")
    for k in range(1, len(morceaux)):
        ident = CHANTIERS[k - 1]

        def champ(m, ident=ident):
            reel = m.group(2).replace("\\'", "'")
            if not reel:
                return m.group(0)
            reels.add(reel)
            fictif = ident[m.group(1)]
            paires.append((reel, fictif))
            # morceaux cités seuls ailleurs (commentaires, noms de fichiers) : « NOM — Commune », nom de famille
            if m.group(1) == "ref" and " — " in reel:
                paires.extend(zip(reel.split(" — "), fictif.split(" — ")))
                reels.update(reel.split(" — "))
            if m.group(1) == "mo":
                paires.append((reel.split()[-1], fictif.split()[-1]))
                reels.add(reel.split()[-1])
            return f"{m.group(1)}: {js(fictif)}"

        morceaux[k] = re.sub(r"\b(ref|mo|dem|ca|adr|cp|com): '((?:[^'\\]|\\.)*)'", champ, morceaux[k])
    s = "newChantier({".join(morceaux)

    def signataire(m):
        reels.add(m.group(1))
        paires.append((m.group(1), "C. Martin"))
        return "par: 'C. Martin'"

    s = re.sub(r"\bpar: '((?:[^'\\]|\\.)*)'", signataire, s)

    attribuees, compteurs = {}, {}

    def lot(m):
        designation, cite, ht = m.group(2), m.group(3), int(m.group(4))
        reel = cite[1:-1].replace("\\'", "'")
        fictive = ""
        if reel:
            reels.add(reel)
            if reel not in attribuees:
                motif = motif_metier(designation)
                rang = compteurs.get(motif, 0)
                compteurs[motif] = rang + 1
                attribuees[reel] = ARTISANS[motif][rang % len(ARTISANS[motif])][0]
            fictive = attribuees[reel]
        return f"L('{m.group(1)}', '{designation}', {js(fictive)}, {montant(ht)}"

    s = re.sub(r"L\('([^']*)', '([^']*)', ('(?:[^'\\]|\\.)*'|\"[^\"]*\"), (-?\d+)", lot, s)
    s = re.sub(r"\bht: (-?\d+)", lambda m: f"ht: {montant(int(m.group(1)))}", s)
    paires.extend(attribuees.items())
    return texte[:i] + s + texte[j:]


def montant(ht):
    """Montant réel → montant fictif (±20 %, à la dizaine) ; 0 reste 0."""
    return 0 if ht == 0 else int(round(ht * hasard.uniform(0.8, 1.2) / 10) * 10)


def remplacer_emails(texte, reels):
    def courriel(m):
        adresse = m.group(0)
        if adresse.endswith(".example"):
            return adresse
        reels.add(adresse)
        if adresse.startswith("contact@"):
            return CONTACT if not adresse.endswith("@entreprise.fr") else "contact@entreprise.example"
        return COMPTE["mail"]

    return re.sub(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", courriel, texte)


def remplacer_logo(texte):
    texte, n = re.subn(r"const LOGO_[A-Z_]+ = 'data:image/jpeg;base64,[^']*';", f"const LOGO_DEMO = '{LOGO}';", texte)
    if n != 1:
        echec("logo intégré introuvable")
    return re.sub(r"\bLOGO_[A-Z_]+\b", "LOGO_DEMO", texte)


def polices_locales(texte):
    texte, n = re.subn(r'<link rel="(?:preconnect|stylesheet)" href="https://fonts\.(?:googleapis|gstatic)\.com[^>]*>\n?', "", texte)
    if n != 3:
        echec(f"{n} liens Google Fonts au lieu de 3")
    regles = "".join(
        f"@font-face{{font-family:'{famille}';font-weight:{g};font-display:swap;"
        f"src:url('/demo/suivi-de-marches/polices/{fichier}-{g}.woff2') format('woff2')}}\n"
        for famille, fichier, graisses in POLICES for g in graisses)
    # contrôles natifs (calendrier, barres de défilement) au thème sombre ; l'enveloppe d'origine impose « light »
    regles += ("\n:root[data-theme='dark']{color-scheme:dark}\n"
               "@media (prefers-color-scheme: dark){:root:not([data-theme='light']){color-scheme:dark}}\n")
    return remplacer_une_fois(texte, "</title>\n", "</title>\n<style>\n" + regles + "</style>\n")


def retouches(texte):
    """Retouches propres au portfolio (spec, section 5.2)."""
    texte = remplacer_une_fois(texte, "<html><head>", '<html lang="fr"><head>'
        "<script>try{if(new URLSearchParams(location.search).get('theme')==='sombre')"
        "document.documentElement.setAttribute('data-theme','dark')}catch(e){}</script>")
    texte = re.sub(r"<title>.*?</title>", "<title>Suivi de marchés — démo</title>", texte, count=1)
    texte, n = re.subn(r"const CLE = '[^']*';", "const CLE = 'suivi-de-marches-demo-v1';", texte)
    if n != 1:
        echec("clé de stockage introuvable")
    texte = remplacer_une_fois(texte, "localStorage.getItem(CLE)", "sessionStorage.getItem(CLE)")
    texte = remplacer_une_fois(texte, "localStorage.setItem(CLE,", "sessionStorage.setItem(CLE,")
    texte = remplacer_une_fois(texte, "load();\nrenderAll();\n",
        "load();\nrenderAll();\n/* Démo du portfolio : connectée d'office sur le compte fictif. */\nenter();\n")
    texte = remplacer_une_fois(texte,
        "\t\tif (!dl) {\n\t\t\tbouton.disabled = false;\n"
        "\t\t\ttoast('Téléchargement indisponible ici — utilisez <b>Imprimer</b>.');\n\t\t\treturn;\n\t\t}",
        "\t\tif (!dl) {\n\t\t\t/* hors visualiseur d'artefacts (démo du portfolio) : le navigateur télécharge lui-même */\n"
        "\t\t\ttelechargerDansLeNavigateur(nomFichierRecap(c, 'csv'), csv);\n"
        "\t\t\tfinaliserExport(c, 'csv');\n\t\t\treturn;\n\t\t}")
    # Accessibilité : la carte d'un chantier n'est plus un bouton qui contient des boutons
    # (« Terminer », « Supprimer ») ; sa référence devient le bouton, au même dessin.
    texte = remplacer_une_fois(texte,
        "<div class=\"chantier${c.termine ? ' is-done' : ''}\" role=\"button\" tabindex=\"0\"\n"
        "\t\t\tonclick=\"openChantier('${c.id}')\" onkeydown=\"if(event.key==='Enter'||event.key===' ')"
        "{event.preventDefault();openChantier('${c.id}')}\">",
        "<div class=\"chantier${c.termine ? ' is-done' : ''}\"\n\t\t\tonclick=\"openChantier('${c.id}')\">")
    texte = remplacer_une_fois(texte,
        "<span class=\"chantier-ref\">${esc(c.ref || c.mo || 'Chantier sans nom')}</span>",
        "<button type=\"button\" class=\"chantier-ref\">${esc(c.ref || c.mo || 'Chantier sans nom')}</button>")
    texte = remplacer_une_fois(texte,
        ".chantier-ref { font-family: 'Outfit', sans-serif; font-size: 1.0625rem; font-weight: 600; }\n",
        ".chantier-ref { font-family: 'Outfit', sans-serif; font-size: 1.0625rem; font-weight: 600; }\n"
        "button.chantier-ref { background: none; border: 0; padding: 0; margin: 0; color: inherit; "
        "line-height: inherit; letter-spacing: inherit; text-align: left; cursor: pointer; }\n")
    return remplacer_une_fois(texte, "function downloadRecap() {",
        "/** Hors artefact : le navigateur télécharge le fichier lui-même (une marque BOM en tête, pour les tableurs). */\n"
        "function telechargerDansLeNavigateur(nom, texte) {\n"
        "\tconst bom = String.fromCharCode(0xfeff);\n"
        "\tconst url = URL.createObjectURL(new Blob([texte.startsWith(bom) ? texte : bom + texte], "
        "{ type: 'text/csv;charset=utf-8' }));\n"
        "\tconst a = document.createElement('a');\n\ta.href = url;\n\ta.download = nom;\n"
        "\tdocument.body.appendChild(a);\n\ta.click();\n\ta.remove();\n"
        "\tsetTimeout(() => URL.revokeObjectURL(url), 1000);\n}\n\nfunction downloadRecap() {")


def verifier(sortie, reels):
    interdits = [l.strip() for l in (ANONYMAT / "termes-interdits.txt").read_text().splitlines()
                 if l.strip() and not l.startswith("#")]
    restes = [t for t in interdits if t.lower() in sortie.lower()]
    restes += [v for v in reels if len(v) >= 4 and not v.isdigit() and v in sortie]
    # valeurs faites de chiffres : les codes postaux (5 chiffres), cherchés comme nombres entiers
    restes += [v for v in reels if v.isdigit() and len(v) == 5 and re.search(rf"(?<!\d){v}(?!\d)", sortie)]
    if restes and os.environ.get("AFFICHER_RESTES"):   # terminal local seulement
        for r in restes:
            for m in re.finditer(re.escape(r), sortie, re.I):
                print(repr(r), "→", repr(sortie[max(0, m.start() - 50):m.end() + 50]))
    if restes:
        echec(f"{len(restes)} valeur(s) réelle(s) encore présente(s) (non affichées) — voir verifier()")
    for motif in ("fonts.googleapis", "data:image/jpeg", "localStorage.getItem", "localStorage.setItem"):
        if motif in sortie:
            echec(f"reste : {motif}")


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    texte = Path(sys.argv[1]).read_text(encoding="utf-8")
    reels, paires = set(), []
    fictifs = [v for l in artisans_fictifs() for v in l] + [v for c in CHANTIERS for v in c.values()] + list(COMPTE.values())
    i, j = bornes(texte, "<!--\n=", "\n-->\n")          # notes de développement en tête du fichier
    texte = texte[:i] + texte[j:]
    texte = anonymiser_artisans(texte, reels)
    texte = anonymiser_comptes(texte, reels)
    texte = anonymiser_seed(texte, reels, paires)
    texte = remplacer_emails(texte, reels)
    texte = remplacer_logo(texte)
    texte = polices_locales(texte)
    for reel, fictif in json.loads((ANONYMAT / "correspondances-demo.json").read_text())["remplacements"]:
        reels.add(reel)
        texte = texte.replace(reel, fictif)
    for reel, fictif in sorted(paires, key=lambda p: -len(p[0])):   # commentaires, noms de documents
        if len(reel) >= 4 and not reel.isdigit():
            texte = texte.replace(reel, fictif)
    texte = retouches(texte)
    # une donnée fictive ne doit contenir aucune valeur réelle : le remplacement global la défigurerait
    collisions = [r for r in reels if len(r) >= 4 and not r.isdigit() and any(r in f for f in fictifs)]
    if collisions:
        echec(f"{len(collisions)} donnée(s) fictive(s) contiennent une valeur réelle : changer ces noms fictifs")
    verifier(texte, reels)
    SORTIE.write_text(texte, encoding="utf-8")
    print(f"Démo écrite : {SORTIE.relative_to(RACINE)} ({len(texte.encode()) // 1024} Ko)")


main()
```

En cas d'`ÉCHEC : … valeur(s) réelle(s) encore présente(s)` : retrouver les valeurs en local (ajouter temporairement un `print` dans `verifier`, jamais dans un fichier commité), puis compléter `correspondances-demo.json` ou les paires dérivées — jamais affaiblir `verifier`.

- [ ] **Step 4: Générer et vérifier**

```bash
python3 .superpowers/anonymat/generer-demo.py <chemin de la maquette d'origine>
pnpm --filter web exec vitest run lib/demo-anonymat.test.ts --reporter=dot
grep -cP "[\x{00a0}\x{202f}]" apps/web/lib/demo-anonymat.test.ts      # attendu : 0
git check-ignore -q .superpowers/anonymat/generer-demo.py && echo "générateur ignoré par Git"
```
Expected: « Démo écrite … », 6 tests passés, `0`, « générateur ignoré par Git ».

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/demo-anonymat.test.ts
git add apps/web/public/demo/suivi-de-marches/index.html
git commit -m "Démo : la maquette complète, anonymisée (Maisons Exemple, artisans et chantiers fictifs), garde-fou d'anonymat"
```

---

### Task 3: Le site autour de la démo

**Files:**
- Modify: `apps/web/scripts/verifier-taille-demo.mjs` (fichier entier)
- Modify: `apps/web/components/realisations/FenetreDemo.tsx`, `apps/web/components/realisations/FenetreDemo.test.tsx`
- Modify: `apps/web/app/politique-de-confidentialite/page.tsx`, `apps/web/app/politique-de-confidentialite/page.test.tsx`

**Interfaces:**
- Consumes: `index.html` de la tâche 2.

- [ ] **Step 1: Tests (échouent)**

`FenetreDemo.test.tsx`, dans le `describe("FenetreDemo", …)` :
```tsx
  it("annonce des données fictives, oubliées à la fermeture de l'onglet", () => {
    simulerEcran(true);
    render(<FenetreDemo apercu={apercu} />);
    expect(
      screen.getByText("Chantiers, entreprises et montants fictifs. Vos modifications sont oubliées à la fermeture de l'onglet."),
    ).toBeInTheDocument();
  });
```

`page.test.tsx` (politique), à côté du test qui vérifie « le temps de la connexion » :
```tsx
  it("dit que la démo de l'étude de cas ne garde rien au-delà de l'onglet", () => {
    render(<Page />);
    expect(screen.getByText(/modifications faites dans la démo/)).toHaveTextContent(/stockage de session/);
  });
```
(Reprendre le nom du composant importé en tête du fichier de test s'il diffère de `Page`.)

Run: `pnpm --filter web exec vitest run components/realisations app/politique-de-confidentialite --reporter=dot`
Expected: FAIL (2 tests).

- [ ] **Step 2: Légende** — `FenetreDemo.tsx`

```tsx
        <span>Chantiers, entreprises et montants fictifs. Vos modifications sont oubliées à la fermeture de l&apos;onglet.</span>
```

- [ ] **Step 3: Politique de confidentialité** — `page.tsx`, la phrase qui commence par « Vous pouvez vous y opposer » :

```tsx
          Vous pouvez vous y opposer à tout moment avec le bouton « Masquer mon curseur ». Ce choix est gardé
          dans le stockage local de votre navigateur ; le repère de l&apos;introduction déjà vue et les
          modifications faites dans la démo de l&apos;étude de cas « Suivi de marchés », eux, ne durent que le
          temps de l&apos;onglet (stockage de session). Aucun cookie supplémentaire n&apos;est déposé.
```

- [ ] **Step 4: Budget sur le fichier HTML** — `apps/web/scripts/verifier-taille-demo.mjs` (fichier entier)

```js
/**
 * Budget de la démo « Suivi de marchés » : son fichier (HTML, CSS et JavaScript
 * intégrés), compressé, doit tenir sous 110 Kio. Les polices n'y comptent pas.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const LIMITE = 110 * 1024;
const fichier = join(dirname(fileURLToPath(import.meta.url)), "..", "public/demo/suivi-de-marches/index.html");

if (!existsSync(fichier)) {
  console.error("Démo introuvable : public/demo/suivi-de-marches/index.html.");
  process.exit(1);
}

const taille = gzipSync(readFileSync(fichier)).length;
const ko = (o) => (o / 1024).toFixed(1);
console.log(`Démo : ${ko(taille)} Ko compressés, limite ${ko(LIMITE)} Ko.`);
if (taille > LIMITE) process.exit(1);
```

- [ ] **Step 5: Vérifier**

```bash
pnpm --filter web exec vitest run components/realisations app/politique-de-confidentialite --reporter=dot
pnpm --filter web verifier-taille-demo
pnpm lint && pnpm typecheck
```
Expected: PASS ; « Démo : … Ko compressés, limite 110.0 Ko. » (attendu sous 107) ; code de sortie 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/scripts/verifier-taille-demo.mjs
git add apps/web/components/realisations/FenetreDemo.tsx
git add apps/web/components/realisations/FenetreDemo.test.tsx
git add apps/web/app/politique-de-confidentialite/page.tsx
git add apps/web/app/politique-de-confidentialite/page.test.tsx
git commit -m "Démo : légende et politique de confidentialité (stockage de session), budget sur le fichier HTML"
```

---

### Task 4: e2e de la démo, accessibilité, aperçu

**Files:**
- Modify: `apps/web/e2e/demo.spec.ts` (fichier entier)
- Modify (si violations) : `.superpowers/anonymat/generer-demo.py` (fonction `retouches`) puis regénérer `index.html`
- Modify: `apps/web/scripts/capturer-apercu-demo.mjs`, `apps/web/public/realisations/suivi-de-marches/apercu.webp`

**Interfaces:**
- Consumes: chantier fictif « LEFÈVRE — Rivebourg », lot « GROS ŒUVRE », boutons et champs de la maquette : `Ajouter` (avenant), `Montant HT de l'avenant`, `#t-ht` (total marchés HT), `#r-dl` (télécharger le tableur), `#cp-sub` (titre du certificat de paiement), écran « Mes chantiers ».

Les sélecteurs ci-dessous viennent du code de la maquette. Si l'un d'eux ne correspond pas au DOM réel (vérifier avec `page.pause()` ou une capture), corriger **le sélecteur**, jamais l'assertion.

- [ ] **Step 1: e2e** — `apps/web/e2e/demo.spec.ts` (fichier entier)

```ts
import { expect, test, type Page } from "@playwright/test";
import { surveillerErreurs } from "./outils";

const ETUDE = "/realisations/suivi-de-marches";
const DEMO = "/demo/suivi-de-marches/index.html";
const CHANTIER = "LEFÈVRE — Rivebourg";

/** Requêtes vers une autre origine que le site (police externe oubliée, etc.). */
function surveillerExternes(page: Page, baseURL: string | undefined) {
  const site = new URL(baseURL!).origin;
  const externes: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.protocol.startsWith("http") && url.origin !== site) externes.push(r.url());
  });
  return externes;
}

/** « 482 310,00 € » → 482310. */
const enNombre = (texte: string | null) => Number(texte!.replace(/[^\d,-]/g, "").replace(",", "."));

async function ouvrirChantier(page: Page) {
  await page.getByText(CHANTIER).first().click();
  await expect(page.locator("#t-ht")).not.toHaveText("—");
}

/** Ajoute un avenant de 1 000 € HT au lot GROS ŒUVRE ; rend le total HT d'avant. */
async function ajouterAvenant(page: Page) {
  const avant = enNombre(await page.locator("#t-ht").textContent());
  await page.getByText("GROS ŒUVRE", { exact: true }).first().click();
  await page.getByRole("button", { name: "Ajouter" }).click();
  const champ = page.getByLabel("Montant HT de l'avenant").last();
  await champ.fill("1000");
  await champ.press("Tab");
  await expect.poll(async () => enNombre(await page.locator("#t-ht").textContent())).toBe(avant + 1000);
  return avant;
}

test.describe("ordinateur", () => {
  test.skip(({ isMobile }) => isMobile, "La démo s'ouvre en plein écran sur mobile.");

  test("la démo n'est chargée qu'à l'approche de sa fenêtre", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    const requetes: string[] = [];
    page.on("request", (r) => r.url().includes("/demo/") && requetes.push(r.url()));
    await page.goto(ETUDE);
    await page.waitForLoadState("networkidle");
    // La fenêtre doit commencer hors de l'écran, marge d'approche (200 px) comprise.
    const apercu = page.getByRole("img", { name: /Écran des marchés de la démo/ });
    expect((await apercu.boundingBox())!.y).toBeGreaterThan(600 + 200);
    await expect(page.locator("iframe")).toHaveCount(0);
    expect(requetes).toEqual([]);
    await apercu.scrollIntoViewIfNeeded();
    await expect(page.frameLocator('iframe[title^="Démo interactive"]').getByRole("heading", { name: "Mes chantiers" })).toBeVisible();
  });

  test("dans l'iframe : thème sombre, connectée d'office, rien hors du site", async ({ page, baseURL }) => {
    const erreurs = surveillerErreurs(page);
    const externes = surveillerExternes(page, baseURL);
    await page.goto(ETUDE);
    await page.getByRole("img", { name: /Écran des marchés de la démo/ }).scrollIntoViewIfNeeded();
    await expect(page.frameLocator('iframe[title^="Démo interactive"]').getByRole("heading", { name: "Mes chantiers" })).toBeVisible();
    const cadre = page.frames().find((f) => f.url().includes("/demo/suivi-de-marches/"))!;
    expect(await cadre.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
    // Fond réellement sombre (luminance relative faible), pas seulement l'attribut.
    const luminance = await cadre.evaluate(() => {
      const [r, g, b] = getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    });
    expect(luminance).toBeLessThan(0.25);
    expect(externes).toEqual([]);
    expect(erreurs).toEqual([]);
  });
});

test("parcours de référence : avenant, total, certificat de paiement", async ({ page, isMobile }) => {
  test.skip(isMobile, "Parcours sur écran d'ordinateur.");
  const erreurs = surveillerErreurs(page);
  await page.goto(DEMO);
  await ouvrirChantier(page);
  await ajouterAvenant(page);
  await page.getByRole("button", { name: /Certificat de paiement/ }).first().click();
  await expect(page.locator("#cp-sub")).toContainText("GROS ŒUVRE");
  expect(erreurs).toEqual([]);
});

test("les modifications durent le temps de l'onglet, pas plus", async ({ page, isMobile }) => {
  test.skip(isMobile, "Parcours sur écran d'ordinateur.");
  await page.goto(DEMO);
  await ouvrirChantier(page);
  const avant = await ajouterAvenant(page);
  await page.reload();
  await ouvrirChantier(page);
  expect(enNombre(await page.locator("#t-ht").textContent())).toBe(avant + 1000);
  const autre = await page.context().newPage();
  await autre.goto(DEMO);
  await ouvrirChantier(autre);
  expect(enNombre(await autre.locator("#t-ht").textContent())).toBe(avant);
});

test("stockage bloqué : la démo démarre sur le jeu de démonstration", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", { get() { throw new Error("stockage bloqué"); } });
  });
  const erreurs = surveillerErreurs(page);
  await page.goto(DEMO);
  await expect(page.getByRole("heading", { name: "Mes chantiers" })).toBeVisible();
  await expect(page.getByText(CHANTIER).first()).toBeVisible();
  expect(erreurs).toEqual([]);
});

test("« Télécharger le tableur » télécharge le récapitulatif en CSV", async ({ page, isMobile }) => {
  test.skip(isMobile, "Parcours sur écran d'ordinateur.");
  await page.goto(DEMO);
  await ouvrirChantier(page);
  await page.getByRole("button", { name: /Récap/ }).first().click();
  const [fichier] = await Promise.all([page.waitForEvent("download"), page.locator("#r-dl").click()]);
  expect(fichier.suggestedFilename()).toMatch(/\.csv$/);
});

test("sur mobile, la page propose d'ouvrir la démo au lieu d'une iframe", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Comportement propre aux petits écrans.");
  await page.goto(ETUDE);
  await page.locator("figure").first().scrollIntoViewIfNeeded();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Ouvrir la démo en plein écran/ })).toBeVisible();
});

test("en plein écran, sur tout écran : la démo s'ouvre sans erreur", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto(DEMO);
  await expect(page.getByRole("heading", { name: "Mes chantiers" })).toBeVisible();
  expect(erreurs).toEqual([]);
});

test("l'adresse courte de la démo (avec ou sans barre finale) sert la démo et ses polices", async ({ page }) => {
  for (const chemin of ["/demo/suivi-de-marches", "/demo/suivi-de-marches/"]) {
    const echecs: string[] = [];
    page.on("response", (r) => r.url().includes("/polices/") && r.status() !== 200 && echecs.push(r.url()));
    const reponse = await page.goto(chemin);
    expect(reponse!.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Mes chantiers" })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check("600 16px Outfit"))).toBe(true);
    expect(echecs).toEqual([]);
  }
});
```

- [ ] **Step 2: Lancer les e2e de la démo et l'audit d'accessibilité**

```bash
pnpm build
pnpm --filter web exec playwright test e2e/demo.spec.ts e2e/accessibilite.spec.ts e2e/realisations.spec.ts --reporter=line
```
Expected: code de sortie 0. Si `accessibilite.spec.ts` signale des violations sur la démo :
- violation corrigible **sans changement visible** (attribut `lang`, nom accessible d'un bouton icône, `label` manquant, rôle ARIA) → ajouter la correction dans `retouches()` du générateur, regénérer (tâche 2, step 4), relancer ;
- violation dont la correction **change l'apparence** (contraste d'une couleur de la maquette) → ne rien changer, noter la règle et l'élément, et la signaler à Augustin avant toute décision.

- [ ] **Step 3: Aperçu** — `apps/web/scripts/capturer-apercu-demo.mjs`, remplacer :

```js
    await page.locator("table").first().waitFor();
```
par :
```js
    // L'aperçu montre l'écran des marchés du chantier fictif de référence.
    await page.getByText("LEFÈVRE — Rivebourg").first().click();
    await page.locator("table").first().waitFor();
```

```bash
pnpm --filter web capturer-apercu-demo
```
Expected: « Aperçu enregistré : … apercu.webp ». Ouvrir l'image : écran des marchés, thème sombre, données fictives.

- [ ] **Step 4: Commit**

```bash
git add apps/web/e2e/demo.spec.ts
git add apps/web/scripts/capturer-apercu-demo.mjs
git add apps/web/public/realisations/suivi-de-marches/apercu.webp
git add apps/web/public/demo/suivi-de-marches/index.html     # si regénéré au step 2
git commit -m "Démo : e2e sur la maquette (onglet, stockage bloqué, CSV, polices), aperçu recapturé"
```

---

### Task 5: Documentation et vérification complète

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README**

Remplacer le paragraphe qui commence par ``- `apps/demo-marches` — la démo`` par :

```markdown
- `apps/web/public/demo/suivi-de-marches/` — la démo « Suivi de marchés » des études de cas :
  la maquette fonctionnelle de l'application, anonymisée (entreprise, artisans, chantiers et
  montants fictifs), en un seul fichier HTML statique avec ses polices. Elle est générée hors du
  dépôt par un script local d'anonymisation, qui applique aussi les retouches propres au portfolio
  (thème sombre par `?theme=sombre`, connexion d'office, stockage de session, téléchargement du
  CSV) : pour la mettre à jour, relancer ce script puis commiter le fichier. Le test
  `apps/web/lib/demo-anonymat.test.ts` vérifie à chaque CI qu'elle ne porte ni e-mail, ni
  téléphone, ni image, ni ressource externe réels.
```

Remplacer la ligne qui commence par « Pour voir la démo dans la page des études de cas avec `pnpm dev` » par :

```markdown
La démo est un fichier statique : `pnpm dev` la sert telle quelle.
```

- [ ] **Step 2: Vérification complète**

```bash
git grep -n "demo-marches" -- ':!docs'     # attendu : rien
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm --filter realtime build \
  && pnpm --filter web verifier-accueil-statique && pnpm --filter web semer-lien-exemple \
  && pnpm e2e && pnpm --filter web verifier-taille-demo
```
Expected: code de sortie 0.

- [ ] **Step 3: Relecture à l'œil des documents générés** (Review Focus 1)

Dans la démo en plein écran, sur le chantier « LEFÈVRE — Rivebourg », ouvrir chaque document et lire en-tête, pied et corps : lettre d'avenant, certificat de paiement, compte rendu de chantier, procès-verbal de réception, planning imprimable, feuille de visa, récapitulatif (et son CSV téléchargé). Aucun nom, adresse, téléphone, identifiant légal ou logo réel ; « Maisons Exemple » partout où était le client.

- [ ] **Step 4: Anonymat du dépôt**

Vérifier tous les fichiers de la branche contre la liste d'anonymat (sans l'afficher) :

```bash
bash -c 'mapfile -t F < <(git diff --name-only --diff-filter=AM main..HEAD -- . ":!*.woff2" ":!*.webp"); n=0;
  while IFS= read -r t; do [ -z "$t" ] && continue; case "$t" in \#*) continue;; esac;
    grep -qiF -- "$t" "${F[@]}" && n=$((n+1)); done < .superpowers/anonymat/termes-interdits.txt;
  echo "${#F[@]} fichiers, termes trouvés : $n"'
```
Expected: `termes trouvés : 0`.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "README : la démo est la maquette anonymisée, en fichier statique généré hors du dépôt"
```

Ne pas pousser : Augustin vérifie la démo à la main (voir la section « À essayer » du compte rendu), puis donne son accord pour la PR.
