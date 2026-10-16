# Front mobile : mise en page et trait conducteur sur téléphone

Date : 2026-10-16 · Statut : design validé en conversation (captures mobiles, essai de la signature), une seule PR.

Branche : `front-mobile`, partie de `main`. Seul le mode mobile change : sur ordinateur, rien ne bouge. Mêmes
règles que les sous-projets précédents : français, charte « Nuit mauve », budgets Lighthouse inchangés.

« Téléphone » : sous 40 rem (640 px), sauf mention contraire.

## Lot 1 — mise en page

1. **E-mail de contact centré** (`SectionContact`) : le bloc « Vous préférez l'e-mail ? Écrivez-moi
   directement : augustin@jouan.dev » est centré sur téléphone. Espace insécable avant le deux-points : il ne
   passe plus seul à la ligne.
2. **Pied de page** : une colonne centrée sur téléphone.
   - Me joindre : l'e-mail, puis GitHub ↗ et LinkedIn ↗ sur une même ligne.
   - Site : Réalisations, Coulisses, Contact sur une même ligne.
   - Légal : Mentions légales · Politique de confidentialité.
   - Un filet, puis les trois indices centrés : `curl -L jouan.dev`, Ctrl+K pour naviguer, © 2026 Augustin Jouan.
   - Sur ordinateur, les trois colonnes et leurs indices alignés restent tels quels.
3. **Onglets des offres** (« Deux façons de travailler ensemble ») : deux onglets, « Application métier » (par
   défaut) et « Site vitrine », qui ne montrent qu'une carte à la fois, tant que les cartes sont empilées (sous
   64 rem). Au-delà, les cartes restent côte à côte, sans onglets. Sans JavaScript, les deux cartes se suivent.
   Changer d'onglet ne touche pas à l'adresse.
4. **Note sous les démos** (`/realisations`) : « * Pour tester la démo, mieux vaut visiter le site sur un
   ordinateur. », là où la démo n'est pas manipulable dans la page (sous 768 px, `FenetreDemo` garde l'aperçu).
5. **« Un projet similaire ? Parlons-en »** (`/realisations`) : centré sur téléphone.

Déjà livrés par la PR #41 : les chiffres clés supprimés, la démo en tête de chaque étude.

## Lot 2 — le trait conducteur sur téléphone

Variante « bord » quand la ligne de la Méthode est verticale (sous 64 rem). Aujourd'hui, le trait longe le bord
gauche jusqu'au bouton d'envoi. Nouveau parcours :

1. Tour de la photo, descente à gauche, entrée dans la ligne de la Méthode et les cinq étapes : inchangés.
2. Après l'étape 05, le trait passe sur le **bord droit**.
3. Il fait le **∞ autour des logos** SCR et Epitech, comme la variante « marges » (anneau de droite par le haut,
   tangentes intérieures, anneau de gauche par le bas, fin en bas de l'anneau de droite). Les logos s'allument
   au passage. S'il n'y a pas exactement deux logos, le trait descend tout droit le long du bord droit.
4. Il redescend le long du bord droit et **écrit la signature à droite du bouton « Envoyer »**, puis rejoint le
   bord droit du bouton.
   - Zone : du bord droit du bouton (+ 10 px) vers le bord de l'écran (− 6 px), ligne de base 4 px au-dessus du
     milieu du bouton. Sur un téléphone de 390 px, l'échelle vaut environ 0,62 ; sur 412 px, 0,68.
   - Échelle : la plus grande qui tient en largeur, entre **0,6** et **0,8**. Au-delà de 0,8 (tablette), elle
     monterait sur le champ Message ; sous 0,6, pas de signature : arrivée directe sur le bord droit du bouton.
   - Sous 64 rem, 3,5 rem de marge au-dessus du bouton, pour que la signature ne touche pas le champ Message.
5. Progression : les logos s'allument quand la ligne de lecture les atteint. La signature s'écrit pendant que la
   ligne de lecture la traverse, comme sur ordinateur.

Portable à marge étroite (Méthode horizontale, variante « bord ») : inchangé.

## Tests

- Unitaires (`lib/trait/trace.test.ts`) : en variante bord verticale, le trait passe à droite après le dernier
  nœud, entoure les deux logos (les deux s'allument), signe à droite du bouton quand l'échelle le permet, et n'a
  pas de signature sur un écran trop étroit.
- Composants : onglets des offres, note sous la démo, pied de page (structure inchangée, classes mobiles).
- e2e : onglets des offres sur téléphone ; note de la démo sur téléphone ; trait (logos allumés, envoi) sur
  téléphone ; e2e existants verts.
- Captures téléphone avant de pousser.
