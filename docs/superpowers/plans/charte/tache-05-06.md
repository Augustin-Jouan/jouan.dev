# Tâche 05 — Socle sombre, en-tête, pied de page et accueil ; puis tâche 06

> Lis d'abord `contexte.md` (même dossier). Niveau de raisonnement conseillé : **medium**. Les deux tâches se font dans la même conversation, l'une après l'autre (un commit chacune).
> Commandes depuis la racine du dépôt. Termine par le compte rendu de `contexte.md`.

Après cette tâche, l'accueil est entièrement dans la nouvelle charte. Les autres pages gardent quelques anciennes classes jusqu'aux tâches 6 et 7 (par exemple un texte `encre-douce` peu lisible sur la nuit) : état intermédiaire attendu, la branche n'est montrée qu'une fois les tâches 5 à 8 faites.

**Files:**
- Modify: `apps/web/app/globals.css` (`html`, sélection, focus, autofill, ombre)
- Modify: `apps/web/app/layout.tsx`, `apps/web/components/layout/Header.tsx`, `Footer.tsx`, `SkipLink.tsx`, `apps/web/components/accueil/Accroche.tsx`, `Methode.tsx`, `Offre.tsx`, `Parcours.tsx`, `Realisations.tsx`, `Section.tsx`, `SectionContact.tsx`, `apps/web/components/direct/CompteurPresents.tsx`, et leurs tests si besoin

**Interfaces:**
- Consumes: classes de rôles (tâche 3).

- [ ] **Step 1: Socle sombre dans `globals.css`**

Remplacer le bloc `html { background-color: var(--color-papier); color: var(--color-encre); scroll-behavior: smooth; }` par :

```css
html {
  color-scheme: dark;
  background-color: var(--color-fond);
  color: var(--color-texte);
  scroll-behavior: smooth;
}

::selection {
  background-color: var(--color-accent);
  color: var(--color-sur-accent);
}

/* Anneau de focus pêche partout (3:1 au moins sur le fond et les cartes). */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

/* Champs pré-remplis par le navigateur : Chrome y pose un fond clair que
   `color-scheme` ne corrige pas. */
input:autofill,
textarea:autofill,
input:-webkit-autofill,
textarea:-webkit-autofill {
  -webkit-text-fill-color: var(--color-texte);
  caret-color: var(--color-texte);
  box-shadow: 0 0 0 1000px var(--color-surface) inset;
}
```

Dans `@theme`, remplacer `--shadow-fenetre: 0 30px 80px -40px rgb(27 26 23 / 0.45);` par `--shadow-fenetre: 0 30px 80px -40px rgb(0 0 0 / 0.6);`. Dans le commentaire de `body::before`, « Grain de papier : bruit SVG très léger » → « Grain : bruit SVG très léger ».

- [ ] **Step 2: Cas particuliers, à la main**

1. `apps/web/components/accueil/Offre.tsx` — remplacer le corps de `CarteOffre` (de `const sombre = offre.miseEnAvant;` jusqu'à la fin de la fonction) par :

```tsx
  const enAvant = offre.miseEnAvant;

  return (
    <article
      className={`flex flex-col gap-6 rounded-3xl p-8 sm:p-10 ${
        enAvant ? "bg-surface ring-1 ring-accent" : "border border-trait"
      }`}
    >
      <div>
        {enAvant && (
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-accent">
            Mon cœur de métier
          </p>
        )}
        <h3 className="font-serif text-3xl sm:text-4xl">{offre.titre}</h3>
        <p className="mt-3 text-texte-doux">{offre.pourQui}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {offre.livrables.map((livrable) => (
          <li key={livrable} className="flex gap-3">
            <span aria-hidden="true" className="text-accent">
              —
            </span>
            {livrable}
          </li>
        ))}
      </ul>
      <p className="mt-auto text-sm text-texte-doux">{offre.exemple}</p>
    </article>
  );
}
```

2. `apps/web/components/accueil/Accroche.tsx`, bouton secondaire : `rounded-full border border-trait px-6 py-3 text-sm font-medium transition-colors hover:border-encre` → `rounded-full border border-trait-fort px-6 py-3 text-sm font-medium transition-colors hover:border-texte`.

3. `apps/web/components/layout/SkipLink.tsx` : `focus:bg-papier` → `focus:bg-surface focus:text-texte` ; dans le commentaire, « affiché en pastille papier » → « affiché en pastille sombre ».

- [ ] **Step 3: Remplacements généraux**

```bash
bash <<'EOF'
set -euo pipefail
cd apps/web
fichiers=(
  "app/layout.tsx"
  "components/layout/Header.tsx"
  "components/layout/Footer.tsx"
  "components/layout/SkipLink.tsx"
  "components/accueil/Accroche.tsx"
  "components/accueil/Methode.tsx"
  "components/accueil/Offre.tsx"
  "components/accueil/Parcours.tsx"
  "components/accueil/Realisations.tsx"
  "components/accueil/Section.tsx"
  "components/accueil/SectionContact.tsx"
  "components/direct/CompteurPresents.tsx"
)
sed -i -E \
  -e 's/text-encre-douce/text-texte-doux/g' \
  -e 's/hover:text-encre\b/hover:text-texte/g' \
  -e 's/hover:decoration-encre\b/hover:decoration-accent/g' \
  -e 's/decoration-trait\b/decoration-trait-fort/g' \
  -e 's/text-terre\b/text-texte-doux/g' \
  -e 's/text-brique\b/text-accent/g' \
  -e 's/bg-encre\b/bg-accent/g' \
  -e 's/text-papier\b/text-sur-accent/g' \
  -e 's/text-encre\b/text-texte/g' \
  -e 's/bg-emerald-600/bg-vivant/g' \
  "${fichiers[@]}"
EOF
```

(À ne lancer qu'une fois : `decoration-trait\b` reprendrait un `decoration-trait-fort` déjà remplacé.) Résultat attendu : `body` en `text-texte` ; boutons principaux `bg-accent … text-sur-accent` ; surtitres `text-texte-doux` ; mot en couleur, numéros d'étapes et flèches `text-accent` ; lien e-mail du contact souligné en `trait-fort`, puis `accent` au survol ; point du compteur `bg-vivant` ; liens du pied de page (Coulisses compris) `hover:text-texte`. `Parcours` n'emploie que `border-trait`, inchangé.

- [ ] **Step 4: Vérifier ces fichiers**

```bash
bash <<'EOF'
cd apps/web
grep -n -E "(bg|text|border|ring|ring-offset|decoration|divide)-(papier|encre|encre-douce|brique|braise|braise-claire|terre|white|emerald-[0-9]+)\b|(bg|text|border|ring|decoration)-[a-z-]+/[0-9]+\b" \
  app/layout.tsx components/layout/*.tsx components/accueil/*.tsx components/direct/CompteurPresents.tsx | grep -v "\.test\."
EOF
```

Expected: aucune ligne. Puis `./docs/superpowers/plans/charte/court.sh bash -c 'pnpm lint && pnpm typecheck && pnpm test'` : PASS. Si un test de composant cherchait une ancienne classe (par exemple `bg-encre` pour la carte mise en avant), le mettre à jour vers la classe de rôle correspondante, sans changer ce qu'il vérifie.

- [ ] **Step 5: Contrôle visuel** — rien à faire ici : Augustin regarde l'accueil à la relecture du groupe 2.

- [ ] **Step 6: Commiter**

```bash
bash <<'EOF'
set -e
for f in apps/web/app/globals.css apps/web/app/layout.tsx apps/web/components/layout/Header.tsx apps/web/components/layout/Footer.tsx apps/web/components/layout/SkipLink.tsx apps/web/components/accueil/Accroche.tsx apps/web/components/accueil/Methode.tsx apps/web/components/accueil/Offre.tsx apps/web/components/accueil/Realisations.tsx apps/web/components/accueil/Section.tsx apps/web/components/accueil/SectionContact.tsx apps/web/components/direct/CompteurPresents.tsx; do git add "$f"; done
EOF
# puis, un par un, les tests mis à jour (voir git status --short)
git commit -m "Charte : socle sombre, en-tête, pied de page et accueil aux rôles"
```

---

# Tâche 06 — Études de cas, contact et administration

**Files:**
- Modify: `apps/web/app/realisations/[slug]/page.tsx`, `apps/web/components/realisations/Captures.tsx`, `apps/web/components/realisations/FenetreDemo.tsx` (couleurs seulement : l'adresse et l'apparition de l'iframe sont en tâche 10), `apps/web/components/contact/ContactForm.tsx`, `apps/web/app/admin/page.tsx`, `apps/web/app/admin/BoutonSupprimer.tsx`, `apps/web/app/admin/NouveauLien.tsx`, `apps/web/app/admin/connexion/FormulaireConnexion.tsx`, et leurs tests si besoin

**Interfaces:**
- Consumes: classes de rôles (tâche 3).

- [ ] **Step 1: Cas particuliers, à la main (avant les remplacements généraux)**

1. Erreurs de l'administration : `apps/web/app/admin/page.tsx` : `border border-brique p-4 text-brique` → `border border-alerte p-4 text-alerte` ; `apps/web/app/admin/BoutonSupprimer.tsx` : `text-brique underline` → `text-alerte underline`.
2. `apps/web/components/realisations/Captures.tsx`, cadre du téléphone : `border-8 border-encre bg-encre` → `border-8 border-trait bg-trait`.
3. `apps/web/components/contact/ContactForm.tsx`, lignes 14-15 du commentaire des classes, remplacer :

```ts
// Classes aux couleurs de l'Atelier clair. Bordure au repos encre-douce/80 :
// ≈ 4:1 sur le papier (WCAG 1.4.11 demande 3:1 pour la limite d'un champ).
```

par :

```ts
// Classes de la charte « Nuit mauve ». Bordure au repos trait-fort : 3,6:1 sur
// le fond (WCAG 1.4.11 demande 3:1 pour la limite d'un champ).
```

- [ ] **Step 2: Remplacements généraux**

```bash
bash <<'EOF'
set -euo pipefail
cd apps/web
fichiers=(
  "app/realisations/[slug]/page.tsx"
  "components/realisations/Captures.tsx"
  "components/realisations/FenetreDemo.tsx"
  "components/contact/ContactForm.tsx"
  "app/admin/page.tsx"
  "app/admin/BoutonSupprimer.tsx"
  "app/admin/NouveauLien.tsx"
  "app/admin/connexion/FormulaireConnexion.tsx"
)
sed -i -E \
  -e 's#border-encre-douce/80#border-trait-fort#g' \
  -e 's/text-encre-douce/text-texte-doux/g' \
  -e 's/hover:text-encre\b/hover:text-texte/g' \
  -e 's/focus:border-encre\b/focus:border-accent/g' \
  -e 's/ring-offset-papier\b/ring-offset-fond/g' \
  -e 's/ring-encre\b/ring-accent/g' \
  -e 's/text-terre\b/text-texte-doux/g' \
  -e 's/text-brique\b/text-accent/g' \
  -e 's/border-brique\b/border-alerte/g' \
  -e 's/bg-encre\b/bg-accent/g' \
  -e 's/text-papier\b/text-sur-accent/g' \
  -e 's/text-encre\b/text-texte/g' \
  -e 's/bg-papier\b/bg-surface/g' \
  -e 's#bg-trait/40#bg-surface#g' \
  -e 's/bg-white\b/bg-surface/g' \
  "${fichiers[@]}"
EOF
```

Résultat attendu : champs `bg-surface`, bordure `border-trait-fort` (`border-alerte` en erreur), focus `border-accent` + `ring-accent` décalé sur `ring-offset-fond` ; boutons principaux `bg-accent … text-sur-accent` ; fenêtres de la démo et des captures `bg-surface` ; lien d'administration en `<code>` sur `bg-surface`.

- [ ] **Step 3: Vérifier ces fichiers**

```bash
bash <<'EOF'
cd apps/web
grep -n -E "(bg|text|border|ring|ring-offset|decoration|divide)-(papier|encre|encre-douce|brique|braise|braise-claire|terre|white|emerald-[0-9]+)\b|(bg|text|border|ring|decoration)-[a-z-]+/[0-9]+\b" \
  "app/realisations/[slug]/page.tsx" components/realisations/*.tsx components/contact/ContactForm.tsx app/admin/*.tsx app/admin/connexion/*.tsx | grep -v "\.test\."
EOF
```

Expected: aucune ligne. Puis `./docs/superpowers/plans/charte/court.sh bash -c 'pnpm lint && pnpm typecheck && pnpm test'` : PASS (tests de composants éventuellement mis à jour vers les classes de rôles, sans changer ce qu'ils vérifient).

- [ ] **Step 4: Commiter**

```bash
bash <<'EOF'
set -e
for f in "apps/web/app/realisations/[slug]/page.tsx" apps/web/components/realisations/Captures.tsx apps/web/components/realisations/FenetreDemo.tsx apps/web/components/contact/ContactForm.tsx apps/web/app/admin/page.tsx apps/web/app/admin/BoutonSupprimer.tsx apps/web/app/admin/NouveauLien.tsx apps/web/app/admin/connexion/FormulaireConnexion.tsx; do git add "$f"; done
EOF
# puis, un par un, les tests mis à jour (voir git status --short)
git commit -m "Charte : études de cas, contact et administration aux rôles"
```
