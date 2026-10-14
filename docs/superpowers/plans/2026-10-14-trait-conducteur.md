# Trait conducteur — plan d'implémentation

> **Découpé en fiches** : exécuter le plan à partir de `trait-conducteur/LISEZMOI.md` (une conversation par ligne du tableau, sorties courtes, relectures groupées). Le code est dans les fiches `trait-conducteur/tache-XX.md`, pas ici : ce fichier donne le but, les décisions et les révisions de la spec.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un trait pêche accompagne le visiteur tout le long de l'accueil au fil du défilement : tracé libre à gauche, fil de la Méthode qu'il allume, ∞ autour des logos de SCR Informatique et d'Epitech, arrivée sur le bouton d'envoi du Contact ; un trait fin le long du bord sur téléphone.

**Architecture:** Deux modules purs (`lib/trait/trace.ts`, `lib/trait/progression.ts`) transforment des repères mesurés dans la page en un chemin de courbes de Bézier, mesuré sans DOM, avec ses jalons de progression et d'allumage. Un module DOM (`lib/trait/trait-conducteur.ts`), chargé à part au premier défilement par `TraitConducteur.tsx`, pose un calque SVG par-dessus la page, allonge le trait au défilement (deux écritures de `stroke-dashoffset` et une de `transform` par image), recalcule le tracé quand la mise en page change et pose `data-allumee` sur les étapes, les logos et le bouton. La frise de la Méthode (`FriseMethode`) reste le repli quand le trait n'a pas pris la main.

**Tech Stack:** Next.js 16.4, React 19.2, TypeScript, SVG, Tailwind CSS 4.3 (charte « Nuit mauve »), Vitest (jsdom), Playwright, Lighthouse CI.

**Spec:** `docs/superpowers/specs/2026-10-14-trait-conducteur-design.md` (section 11 : révisions faites pendant la préparation du plan).

**Où exécuter :** dossier principal du dépôt, branche `trait-conducteur`, partie de `main` après la fusion de la PR #29 (Méthode à allumage déclenché).

**Déjà vérifié :** tout le code des fiches a tourné dans une copie jetable de la branche avant l'écriture du plan :
- 722 tests unitaires du site, lint et types ;
- build, avec l'accueil prérendu ;
- e2e complets : 185 passés, 37 ignorés (ceux propres au téléphone ou à l'ordinateur) ;
- Lighthouse : scripts de l'accueil à 165 731 octets, CLS 0, accessibilité 1, performance de 0,96 à 0,98 ;
- morceau du trait : 4,0 Ko compressés ;
- captures sur ordinateur (1440 px) et téléphone (390 px) validées visuellement.

## Global Constraints

Les règles détaillées sont dans `trait-conducteur/contexte.md`, lu par chaque fiche. L'essentiel :

- Site en **français uniquement** ; commentaires et messages de commit en français.
- Charte « Nuit mauve » : en CSS, seulement `var(--color-…)` et `color-mix(…)`, aucune couleur brute.
- `lib/trait/*` n'importe que ses propres fichiers : c'est le morceau chargé à la demande.
- **Aucun filtre** (`filter`, `drop-shadow`) sur les tracés du trait.
- Budgets :
  - morceau du trait : 6 Ko compressés au plus (`verifier-taille-defilement`) ;
  - scripts de l'accueil (Lighthouse) : 168 960 octets ;
  - CLS : 0,05 au plus ;
  - l'accueil reste prérendu.
- Ne jamais modifier `apps/web/.env.example` ni `apps/web/scripts/empreinte-mot-de-passe.mjs`. Ne jamais afficher un `.env.local`.
- Git : commits ciblés fichier par fichier ; rien de poussé, ni PR ni fusion pendant les fiches ; jamais de `--force`, `reset --hard`, `rebase` ni `git stash` nu.

## Review Focus

Les cas que la spec implique et qu'aucun test automatique n'exerce, à regarder en relecture et à la main (`verification-finale.md`, section 3) :

1. **Intro rejouée** (palette, Ctrl+K) : le calque doit disparaître pendant l'intro et revenir après (observateur sur `data-intro`).
2. **Redimensionnement ou rotation** en cours de visite : le tracé se recalcule (ResizeObserver sur `document.body`, `resize`) et repasse par les nœuds, les logos et le bouton.
3. **Écrans de 1024 à 1199 px** : variante « bord » avec la ligne horizontale, fin le long du bord droit ; testée en unitaire seulement.
4. **Polices chargées tard** : recalcul à `document.fonts.ready` ; sans lui, le trait raterait les nœuds de quelques pixels.
5. **Glissé de Lenis vers une ancre** (menu) : le trait suit, sans à-coup ; le test de fluidité ne couvre que la molette.

## Tâches

| Fiche | Contenu | Tests |
|---|---|---|
| `tache-01.md` | `lib/trait/progression.ts`, `lib/trait/trace.ts` : tracé, ∞ par tangentes intérieures, variantes, progression | 22 unitaires |
| `tache-02.md` | `lib/trait/trait-conducteur.ts` (calque, défilement, allumages, recalculs, intro, arrêt) ; script de taille étendu | 5 unitaires |
| `tache-03.md` | `TraitConducteur.tsx` (chargement au premier défilement) ; branchement dans l'accueil ; `data-trait` sur les logos et l'envoi ; `FriseMethode` en repli | 4 + 1 unitaires |
| `tache-04.md` | CSS du trait ; `e2e/trait.spec.ts` ; `methode.spec.ts` : la Méthode sans trait | 4 unitaires (CSS), e2e ciblés |

## Révisions de la spec

Décidées pendant la vérification du code, reportées dans la spec (section 11) :

- **∞ :** les brins suivent les tangentes intérieures communes aux deux anneaux. Les diagonales d'origine passaient sur le bord des photos.
  - Coût si c'est faux : un ∞ un peu plus serré qu'imaginé.
- **Halo :** un second tracé translucide remplace le `drop-shadow`, qui faisait tomber le défilement doux à environ 16 images/s.
  - Coût si c'est faux : un halo un peu moins diffus.
- **Chargement au premier défilement :** chargé dès l'affichage, le trait dépassait de 1 882 octets le budget Lighthouse des scripts.
  - Coût si c'est faux : le trait peut apparaître une fraction de seconde après le tout premier défilement, sous l'accroche, là où il ne dessine encore rien.
- **Variante « bord » de 1024 à 1199 px :** la ligne de la Méthode y est horizontale, donc le trait finit le long du bord droit.
- **Téléphone :** pas d'étalement de la traversée, puisque la ligne verticale se parcourt déjà en défilant.
