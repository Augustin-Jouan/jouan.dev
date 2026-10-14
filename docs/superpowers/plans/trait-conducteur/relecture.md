# Relecture groupée (une conversation par groupe)

Deux relectures, plutôt que deux relecteurs après chaque tâche. Chacune lit **le diff du groupe dans un fichier**, pas l'historique des conversations.

## Préparer (toi)

`DEPART` est le commit noté avant la première conversation du groupe (voir `LISEZMOI.md`).

```bash
git log --oneline DEPART..HEAD
git diff DEPART..HEAD > /tmp/trait-groupe-N.diff
wc -l /tmp/trait-groupe-N.diff
```

## Message à donner au relecteur (niveau high, sans « fast »)

> Tu relis, sans rien modifier, le travail du groupe N du trait conducteur. Lis `docs/superpowers/plans/trait-conducteur/contexte.md`, les fiches FICHES (même dossier), puis le diff `/tmp/trait-groupe-N.diff`. Voici les comptes rendus des agents : COMPTES RENDUS.
>
> Vérifie :
> 1. Le diff reprend le code des fiches à l'identique, et rien d'autre.
> 2. Aucun test n'est affaibli (seuil relevé, assertion retirée, règle désactivée) ; les tests demandés par les fiches existent.
> 3. Les points à surveiller ci-dessous pour ce groupe.
> 4. Règles de `contexte.md` : rôles de la charte seulement (aucune couleur brute en CSS), français.
>
> Tu peux lancer des tests ciblés avec `./docs/superpowers/plans/trait-conducteur/court.sh`, mais ni `pnpm e2e` complet ni Lighthouse.

Ou donne-moi simplement les comptes rendus : je fais la relecture moi-même.

## Groupe 1 — tâches 01 à 03 (le trait et son branchement)

**Fiches :** `tache-01.md` à `tache-03.md`.

**À surveiller :**
- `lib/trait/*` n'importe rien d'autre que ses propres fichiers (ni `data/`, ni `@/…`) : sinon le morceau chargé à la demande se scinde.
- `trace.ts` : la graine `GRAINE = 20261014` et `MARGE_MIN = 56`, `ECART_LOGO = 6` sont recopiés tels quels (les tests d'égalité du tracé en dépendent).
- `trait-conducteur.ts` : aucune lecture de position (`getBoundingClientRect`) dans `mettreAJour` ; seulement dans `lireReperes`, appelé par `recalculer`.
- `TraitConducteur.tsx` : l'import dynamique ne part qu'au premier défilement (ou page déjà défilée), jamais en mouvement réduit ; l'écouteur `scroll` est retiré au démarrage et au démontage.
- `FriseMethode.tsx` : le seul changement est la garde `data-trait` au début de `allumerJusqua` (et le commentaire).
- `data-trait="logo"` est sur le **lien** (`<a>`), pas sur l'image ; `data-trait="envoi"` sur le bouton d'envoi.

## Groupe 2 — tâche 04 (apparence et e2e)

**Fiche :** `tache-04.md`.

**À surveiller :**
- **Aucun `filter`** sur `.trait-ligne` ni `.trait-halo` (le test « fluidité » le vérifie) : un flou de toute la hauteur de la page faisait tomber le défilement doux à ~16 images/s.
- Les halos des logos et la pulsation de l'envoi passent par `animation`, pas `transition` (les classes Tailwind de ces éléments ont déjà leurs transitions) ; la pulsation n'existe que dans `@media (prefers-reduced-motion: no-preference)`.
- `display: none` sur la ligne et le paquet de la frise **seulement** sous `.methode-frise[data-trait]`.
- `methode.spec.ts` : seuls changent l'ajout de `sansTrait` et les deux tests renommés « sans trait, … » qui l'appellent.
- Les e2e de la tâche ont tourné sur les deux projets (`ordinateur`, `mobile`), dont `defilement.spec.ts`.

**À regarder toi-même :** voir `verification-finale.md`, section 3.
