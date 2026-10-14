# Vérification finale (pour Augustin)

À lancer une fois la tâche 04 terminée, depuis la racine du dépôt. C'est ici que se font les vérifications lourdes retirées des fiches : `pnpm e2e` complet, Lighthouse et les essais à la main.

Prérequis : le conteneur Postgres local tourne (`docker ps | grep postgres`). `court.sh` charge l'environnement des tests et n'affiche que la fin de chaque sortie.

## 1. Vérification complète

```bash
./docs/superpowers/plans/trait-conducteur/court.sh bash -c 'pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm --filter realtime build \
  && pnpm --filter web verifier-accueil-statique && pnpm --filter web semer-lien-exemple \
  && pnpm e2e \
  && pnpm --filter web verifier-taille-encre && pnpm --filter web verifier-taille-direct \
  && pnpm --filter web verifier-taille-defilement && pnpm --filter web verifier-taille-demo \
  && pnpm --filter web verifier-taille-3d && pnpm --filter web verifier-taille-commandes'
```

Attendu : `→ code de sortie 0` (e2e : 185 passés, 37 ignorés pendant la préparation du plan). Sinon, le journal complet est indiqué sur la dernière ligne.

## 2. Lighthouse, avec le service temps réel démarré

Le port 3000 doit être libre : arrêter un `next dev` éventuel.

```bash
(cd apps/realtime && ORIGINES_AUTORISEES=http://127.0.0.1:3000 PORT=3201 HOTE=127.0.0.1 exec node dist/index.cjs) > "$(mktemp)" 2>&1 &
DIRECT=$!
for i in $(seq 1 20); do curl -sf http://127.0.0.1:3201/sante >/dev/null && break; sleep 0.5; done
LIGNES=60 ./docs/superpowers/plans/trait-conducteur/court.sh pnpm --filter web lighthouse
kill $DIRECT
```

Attendu :
- scripts de l'accueil ≤ 168 960 octets (bloquant ; mesuré à 165 731 : le trait n'est chargé qu'au premier défilement, et Lighthouse ne défile pas) ;
- CLS ≤ 0,05 (bloquant ; mesuré à 0) ;
- accessibilité ≥ 0,95 ; performance et LCP en avertissement seulement.

## 3. À regarder à la main

Sur la build locale (après l'étape 1), port 3000 libre :

```bash
HOSTNAME=127.0.0.1 PORT=3000 node apps/web/scripts/demarrer-standalone.mjs
```

Sur `http://127.0.0.1:3000/`, sur un écran d'au moins 1200 px de large :
- dès qu'on défile sous l'accroche, un trait pêche naît à gauche, avec une tête lumineuse vers les deux tiers de l'écran ; il descend d'un tracé libre, avec une petite boucle à hauteur des Réalisations ;
- il rejoint le nœud 01 de la Méthode et suit la ligne : chaque étape s'allume à son passage ; la traversée s'étale sur environ un demi-écran de défilement ;
- il ressort à droite, descend, enlace SCR Informatique et Epitech d'un ∞ **sans passer sur les photos**, et chaque anneau s'illumine quand il le touche ;
- il finit sur le bouton « Envoyer », qui fait une pulsation puis garde un léger halo ;
- en remontant, le trait recule ; ce qu'il a allumé reste allumé ;
- le défilement à la molette reste aussi fluide qu'avant ;
- aucune barre de défilement horizontale n'apparaît.

Ensuite :
- **téléphone** (ou vue mobile, 390 px) : un trait fin le long du bord gauche, qui se confond avec la ligne verticale de la Méthode et l'allume étape par étape, puis finit sur le bord gauche du bouton « Envoyer » ; pas de ∞ ;
- **écran de 1024 à 1199 px** : trait le long du bord gauche, ligne de la Méthode horizontale, puis le long du bord droit jusqu'au bouton ;
- **mouvement réduit** (préférence du système) : aucun trait, la Méthode est affichée finie ;
- **lien direct** `http://127.0.0.1:3000/#contact` : le trait est déjà tracé jusque-là, la Méthode et les logos sont allumés ;
- **page de prospect** `http://127.0.0.1:3000/?pour=exemple-0000` : le trait va jusqu'au bouton ;
- **rejouer l'intro** (palette Ctrl+K) : le trait disparaît pendant l'intro et revient après ;
- **redimensionner la fenêtre** (ou tourner le téléphone) en cours de visite : le trait se recalcule et repasse par les nœuds, les logos et le bouton.

## 4. Ensuite

Si tout est bon : pousser la branche et ouvrir la PR (ou me le demander).
