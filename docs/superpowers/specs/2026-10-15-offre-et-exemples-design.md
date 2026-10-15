# Accueil — l'offre et ses exemples, en une section

Date : 2026-10-15 · Statut : design validé en conversation (approche A « offre + preuve », avec maquette), à relire
par Augustin.

Branche : `offre-exemples`, partie de `main`. Mêmes règles que les sous-projets précédents : français uniquement,
charte « Nuit mauve » (rôles de couleur, jamais de valeur brute), budgets Lighthouse inchangés.

## 1. Objectif

Aujourd'hui, l'accueil présente l'offre (« Ce que je fais », deux cartes), puis les réalisations (« Quelques projets
récents », deux cartes). Les deux sections disent la même chose deux fois : chaque offre finit par une phrase
« Exemple : … », qui décrit la réalisation de la section suivante.

On les fusionne. Chaque carte d'offre montre le service puis **la preuve en image** : une capture de l'exemple livré,
qui mène à son étude de cas sur `/realisations`. La section « Réalisations » de l'accueil disparaît, et la page est
plus courte. Le trait conducteur s'adapte à cette page plus courte.

Critères de réussite :

- Un prospect voit, dans la même carte, ce que je propose et un exemple réel, en image.
- Un clic sur l'exemple ouvre directement la bonne étude de cas sur `/realisations`.
- Le trait garde son comportement : boucle avant la Méthode, allumages dans le même ordre, signature, arrivée sur le
  bouton d'envoi.
- Les budgets Lighthouse tiennent (scripts de l'accueil ≤ 168 960 octets, CLS ≤ 0,05), et l'accueil reste prérendu.

## 2. Ce qui change à l'écran

**Section « Ce que je fais »** (ancre `#offre`), même en-tête : surtitre « Ce que je fais », titre « Deux façons de
travailler ensemble ». Les deux cartes restent côte à côte sur ordinateur (`1.4fr 1fr`), l'une sous l'autre sur
téléphone, l'offre mise en avant en premier.

**Chaque carte**, de haut en bas :

1. Comme aujourd'hui : le badge « Mon cœur de métier » (offre mise en avant seulement), le titre, « pour qui », les trois
   livrables.
2. À la place de la phrase « Exemple : … », un **aperçu de l'exemple**, poussé en bas de la carte (les deux aperçus
   s'alignent quand les cartes ont des hauteurs de texte différentes) :
   - la capture de la réalisation, dans un cadre arrondi au liseré `trait`, avec une barre de fenêtre (trois points),
     comme `FenetreDemo` sur `/realisations` ;
   - sous la capture, une légende sur une ligne : le titre de la réalisation à gauche (« Suivi de marchés de travaux »,
     « Site vitrine d'artisan »), « Voir l'exemple → » à droite, en `accent` ;
   - tout l'aperçu est **un seul lien** vers l'étude : `/realisations#suivi-de-marches` ou `/realisations#site-vitrine`
     (`cheminEtude`). Au survol, le liseré passe en `accent`.

**Sous les cartes**, le lien « Toutes les réalisations → » vers `/realisations`, repris de l'ancienne section.

**La section « Réalisations »** de l'accueil (`components/accueil/Realisations.tsx`) est retirée. Le besoin, le livré,
les technologies et « Voir le site » restent sur `/realisations`, qui ne change pas.

**Pages de prospect** (`/?pour=…`) : l'ordre des cartes suit l'angle comme aujourd'hui (`offresPour`) ; chaque offre
emporte son exemple.

## 3. Données (`data/accueil.ts`)

- `Offre` perd `exemple` et gagne `etude: SlugEtude` : l'étude de cas qui sert d'exemple à cette offre
  (`application` → `suivi-de-marches`, `vitrine` → `site-artisan`).
- L'image de l'aperçu ne se recopie pas : elle vient de l'étude (`data/realisations.ts`), par une fonction
  `apercuEtude(slug): Image` :
  - média `demo` : son `apercu` (`/realisations/suivi-de-marches/apercu.webp`, 1280 × 720) ;
  - média `captures` : la première capture, celle de l'ordinateur (`/realisations/site-artisan/ordinateur.webp`,
    1440 × 900).
- La légende reprend le `titre` de la réalisation (`realisations`, inchangé : le CV de `lib/cv` s'en sert toujours).
- `ANCRES.realisations` et `sections.realisations` disparaissent. `realisationsPour` et `etudeParAngle` aussi s'ils
  n'ont plus d'utilisateur ; l'association offre → étude remplace `etudeParAngle`.

## 4. Images, accessibilité et performances

- **Simple `<img>`**, comme le portrait de l'accroche et les logos du parcours : `next/image` ajouterait du JS client à
  l'accueil, au-delà du budget. `width` et `height` réels (pas de décalage de mise en page), `loading="lazy"` (la
  section est sous le premier écran), `decoding="async"`, `object-cover` sur un cadre de rapport 16:9 (la capture du
  site d'artisan est en 16:10, 1440 × 900 : elle est cadrée par le haut, `object-top`).
- Les deux images pèsent environ 49 Ko chacune ; elles ne comptent pas dans le budget des scripts. Lighthouse ne fait pas
  défiler : chargées en différé, elles ne pèsent pas sur le LCP.
- **Lien accessible** : l'image est décorative dans le lien (`alt=""`), le nom du lien vient de la légende, complétée
  pour les lecteurs d'écran : « Voir l'exemple : Suivi de marchés de travaux ». Focus visible sur tout l'aperçu.
- Aucune violation axe (WCAG A/AA) sur l'accueil, en thème normal et en mouvement réduit.

## 5. Le trait conducteur sur une page plus courte

Le tracé se calcule déjà à partir des positions réelles (`lireReperes`) : il se raccourcit de lui-même. Un seul repère
dépendait de la section retirée.

- **La boucle** se faisait au milieu de `#realisations` (`realisationsY`). Elle passe au **milieu de `#offre`** : le
  repère est renommé `offreY` (« milieu vertical de la section de l'offre »), lu sur `#offre`.
- Elle reste entre l'accroche et la Méthode : la descente libre garde la place de faire sa boucle avant d'approcher le
  nœud 01. Les tests unitaires du tracé passent leurs repères fictifs à `offreY` ; le test « boucle à hauteur des
  Réalisations » devient « boucle à hauteur de l'offre ».
- Rien d'autre ne change : variantes, ∞ autour des logos, signature, progression, chargement à la première
  interaction.
- Les e2e du trait (`e2e/trait.spec.ts`) gardent leurs attentes : ordre des allumages, recul, page de prospect,
  arrivée sur `#contact`, écrans hauts, signature, point à la pointe du trait, téléphone, pas de débordement.

## 6. Tests

- **Données** (`data/accueil.test.ts`) : chaque offre a une étude qui existe ; `apercuEtude` renvoie une image réelle
  (fichier présent dans `public/`, dimensions) pour chaque étude ; plus de phrase « Exemple : ».
- **Composant** (`Offre`) : chaque carte a un lien « Voir l'exemple : … » vers `cheminEtude(etude)`, avec une image aux
  dimensions fixes et `loading="lazy"` ; le lien « Toutes les réalisations » mène à `/realisations`.
- **Page d'accueil** (`app/page.test.tsx`) : plus de section « Quelques projets récents » ; les offres et leurs
  exemples sont là ; l'ordre suit l'angle sur une page de prospect.
- **E2e** : `e2e/realisations.spec.ts`, « depuis l'accueil, l'exemple du site d'artisan descend à son étude sur
  /realisations » ; `trait.spec.ts` inchangé et vert ; accessibilité de l'accueil ; suite complète.
- **Budgets** : `verifier-accueil-statique`, `verifier-taille-*`, Lighthouse (scripts, CLS).

## 7. Hors périmètre

- La page `/realisations` et ses études, le CV (`lib/cv`), la navigation de l'en-tête (« Offre » vers `/#offre`,
  « Réalisations » vers `/realisations`).
- De nouvelles captures : on réutilise celles des études.
