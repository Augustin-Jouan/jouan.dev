# Vérification finale (pour Augustin)

À lancer une fois la tâche 09 terminée, depuis la racine du dépôt. C'est ici que se font les vérifications lourdes retirées des fiches : `pnpm e2e` complet, Lighthouse et les essais à la main.

Prérequis : le conteneur Postgres local tourne (`docker ps | grep postgres`). `court.sh` charge l'environnement des tests et n'affiche que la fin de chaque sortie.

## 1. Vérification complète

```bash
./docs/superpowers/plans/easter-eggs/court.sh bash -c 'pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm --filter realtime build \
  && pnpm --filter web verifier-accueil-statique && pnpm --filter web semer-lien-exemple \
  && pnpm e2e \
  && pnpm --filter web verifier-taille-encre && pnpm --filter web verifier-taille-direct \
  && pnpm --filter web verifier-taille-demo && pnpm --filter web verifier-taille-3d \
  && pnpm --filter web verifier-taille-commandes'
```

Attendu : `→ code de sortie 0`. Sinon, le journal complet est indiqué sur la dernière ligne.

## 2. Lighthouse, avec le service temps réel démarré

Le port 3000 doit être libre : arrêter un `next dev` éventuel.

```bash
(cd apps/realtime && ORIGINES_AUTORISEES=http://127.0.0.1:3000 PORT=3201 HOTE=127.0.0.1 exec node dist/index.cjs) > "$(mktemp)" 2>&1 &
DIRECT=$!
for i in $(seq 1 20); do curl -sf http://127.0.0.1:3201/sante >/dev/null && break; sleep 0.5; done
LIGNES=60 ./docs/superpowers/plans/easter-eggs/court.sh pnpm --filter web lighthouse
kill $DIRECT
```

Attendu :
- scripts de l'accueil ≤ 168 960 octets (bloquant ; mesuré à 164 300 pendant la préparation du plan) ;
- CLS ≤ 0,05 (bloquant ; mesuré à 0 : le passage de « ⌘K » à « Ctrl+K » dans le pied de page ne décale rien) ;
- accessibilité ≥ 0,95 ; performance et LCP en avertissement seulement.

## 3. À essayer à la main

Sur la build locale (après l'étape 1), port 3000 libre :

```bash
HOSTNAME=127.0.0.1 PORT=3000 node apps/web/scripts/demarrer-standalone.mjs
```

Dans un autre terminal :

```bash
curl -L http://127.0.0.1:3000/            # le CV en couleurs, 80 colonnes
curl http://127.0.0.1:3000/cv.txt         # le même, sans couleur
curl -s http://127.0.0.1:3000/api/me | head -20
```

Dans le navigateur, sur `http://127.0.0.1:3000/` :
- Ctrl+K (⌘K sur Mac) : la palette s'ouvre ; « contact » puis Entrée ; Échap rend le focus ; « Copier l'e-mail » affiche « E-mail copié » en bas de page.
- Sur l'accueil, « Rejouer l'intro » (page défilée ou non).
- « Voir l'architecture en 3D » ouvre les Coulisses directement en 3D.
- **Firefox** : Ctrl+K doit ouvrir la palette et non la barre de recherche du navigateur.
- La console (F12) montre le message « Bonjour, curieux ! » (une fois par session) ; « Afficher le code source » montre le même texte en commentaire en tête du `<body>`.
- Sur téléphone (ou en vue mobile) : « Ctrl+K pour naviguer », en bas de page, ouvre la palette.

## 4. Ensuite

- Si tout est bon : pousser la branche et ouvrir la PR (ou me le demander).
- En production, une fois le site sur `jouan.dev` : `curl -L jouan.dev` depuis un vrai terminal (Linux et, si possible, Terminal.app sur macOS pour les couleurs 256).
