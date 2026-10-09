# Vérification finale (pour Augustin)

À lancer une fois la tâche 12 terminée, depuis la racine du worktree (`.superpowers/worktrees/charte`). C'est ici que se font les vérifications lourdes retirées des fiches : `pnpm e2e` complet, Lighthouse et captures.

Prérequis : le conteneur Postgres local tourne (`docker ps | grep postgres`). `court.sh` charge l'environnement des tests et n'affiche que la fin de chaque sortie.

## 1. Vérification complète

```bash
./docs/superpowers/plans/charte/court.sh bash -c 'pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm --filter realtime build \
  && pnpm --filter web verifier-accueil-statique && pnpm --filter web semer-lien-exemple \
  && pnpm e2e \
  && pnpm --filter web verifier-taille-encre && pnpm --filter web verifier-taille-direct \
  && pnpm --filter web verifier-taille-demo && pnpm --filter web verifier-taille-3d'
```

Attendu : `→ code de sortie 0`. Sinon, le journal complet est indiqué sur la dernière ligne.

## 2. Lighthouse, avec le service temps réel démarré

Le port 3000 doit être libre : arrêter un `next dev` éventuel.

```bash
(cd apps/realtime && ORIGINES_AUTORISEES=http://127.0.0.1:3000 PORT=3201 HOTE=127.0.0.1 exec node dist/index.cjs) > "$(mktemp)" 2>&1 &
DIRECT=$!
for i in $(seq 1 20); do curl -sf http://127.0.0.1:3201/sante >/dev/null && break; sleep 0.5; done
LIGNES=60 ./docs/superpowers/plans/charte/court.sh pnpm --filter web lighthouse
kill $DIRECT
```

Attendu :
- accessibilité ≥ 0,95 sur chaque adresse ;
- scripts ≤ 160 Ko (bloquant ; l'accueil était à 159 Ko avant la charte) ;
- performance et LCP en avertissement seulement.

## 3. Captures à parcourir

Hors du dépôt (rien n'est commité), après l'étape 1 (le build est fait) ; port 3000 libre :

```bash
SORTIE="$(mktemp -d)"; echo "Captures : $SORTIE"
HOSTNAME=127.0.0.1 PORT=3000 node apps/web/scripts/demarrer-standalone.mjs > "$SORTIE/serveur.log" 2>&1 &
SERVEUR=$!
for i in $(seq 1 40); do curl -sf -o /dev/null http://127.0.0.1:3000/ && break; sleep 0.5; done
cat > "$SORTIE/captures.mjs" <<'EOF'
import { chromium } from "@playwright/test";

const sortie = process.env.SORTIE;
const base = "http://127.0.0.1:3000";
const pages = [
  "/", "/?pour=exemple-0000", "/realisations/suivi-de-marches", "/realisations/site-artisan", "/contact",
  "/coulisses", "/mentions-legales", "/politique-de-confidentialite", "/admin/connexion",
  "/demo/suivi-de-marches/index.html?theme=sombre",
];
const formats = [
  { nom: "ordinateur", options: { viewport: { width: 1440, height: 900 } } },
  { nom: "mobile", options: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
];
const nomDe = (chemin) => (chemin === "/" ? "accueil" : chemin.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""));

const navigateur = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  for (const f of formats) {
    const contexte = await navigateur.newContext({ ...f.options, reducedMotion: "reduce" });
    const page = await contexte.newPage();
    for (const chemin of pages) {
      await page.goto(base + chemin, { waitUntil: "networkidle" });
      await page.screenshot({ path: `${sortie}/${f.nom}-${nomDe(chemin)}.png`, fullPage: true });
    }
    await contexte.close();
  }

  // L'intro en cours (goutte pêche, nom en nuit) : sans mouvement réduit, GPU
  // simulé (même principe que simulerGpu dans e2e/outils.ts).
  const contexte = await navigateur.newContext({ viewport: { width: 1440, height: 900 } });
  await contexte.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (nom) {
      if (nom === 0x1f01 || nom === 0x9246) return "GPU simulé (captures)";
      return original.call(this, nom);
    };
  });
  const page = await contexte.newPage();
  await page.goto(base + "/");
  let ecoule = 0;
  for (const ms of [400, 700, 1100]) {
    await page.waitForTimeout(ms - ecoule);
    ecoule = ms;
    await page.screenshot({ path: `${sortie}/ordinateur-intro-${ms}ms.png` });
  }
  await contexte.close();
} finally {
  await navigateur.close();
}
console.log(`Captures dans ${sortie}`);
EOF
(cd apps/web && SORTIE="$SORTIE" node --input-type=module < "$SORTIE/captures.mjs")
kill $SERVEUR
ls "$SORTIE"/*.png | wc -l
```

Attendu : 23 images (10 pages × 2 formats + 3 de l'intro). Les parcourir : aucune zone claire hors des captures d'écran des réalisations (images) ; le nom de l'intro lisible sur la goutte. L'autofill ne se déclenche pas en automatique : le signaler à Augustin comme point à vérifier à la main (remplir le contact avec les données enregistrées du navigateur).

## 4. Ensuite

- L'autofill du formulaire de contact ne se déclenche pas en automatique. Le vérifier à la main sur le build local : `/contact`, champs remplis par le navigateur, qui doivent garder un fond sombre et un texte clair.
- Si tout est bon : pousser la branche et ouvrir la PR (ou me le demander).
