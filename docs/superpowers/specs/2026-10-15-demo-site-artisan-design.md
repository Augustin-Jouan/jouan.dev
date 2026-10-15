# Réalisations — le site de l'artisan, navigable de A à Z

Date : 2026-10-15 · Statut : design validé en conversation (copie figée, bandeau en plein écran), à relire par
Augustin.

Branche : `demo-site-artisan`, partie de `main` (onglets de `/realisations` déjà fusionnés). Mêmes règles que les
sous-projets précédents : français uniquement, charte « Nuit mauve » (rôles de couleur, jamais de valeur brute), budgets
Lighthouse inchangés.

## 1. Objectif

Jérôme Dufourd (SARL Dufourd Jérôme, électricien-plombier) a donné son accord pour que son site figure dans le
portfolio. Aujourd'hui, l'étude « Site vitrine » de `/realisations` montre deux captures (ordinateur, téléphone) et un
lien vers le site en ligne. La démo du suivi de marchés, elle, se manie dans une fenêtre de la page.

On fait pareil pour le site de l'artisan : une **copie figée** de ses onze pages, servie par jouan.dev sous
`/demo/site-artisan/`, navigable dans la même fenêtre que la démo du suivi de marchés.

Critères de réussite :

- Sur ordinateur, dans l'onglet « Site vitrine », on parcourt tout le site dans la fenêtre : accueil, services et les
  quatre pages de service, réalisations, à propos, contact, mentions légales, confidentialité. Menu, animations et
  formulaire se comportent comme sur le vrai site.
- Le formulaire de la copie n'envoie rien : il affiche un message de démo.
- La copie ne fait aucune requête hors de jouan.dev : ni mesure d'audience, ni envoi de mail.
- Ouverte en plein écran, la copie dit clairement que c'est une démo, avec un lien vers le vrai site et un lien de
  retour au portfolio.
- Le portfolio ne dépend plus du site en ligne de Jérôme : ni de son domaine, qui va changer, ni de la passation, ni de
  ses modifications futures.
- Les budgets Lighthouse de `/realisations` tiennent, et `/realisations` reste prérendue.

Hors périmètre : modifier le dépôt sdjElec. Il reste en lecture seule ; la copie se fabrique à partir de son état
commité.

## 2. Ce qu'on a vérifié avant d'écrire cette spec

Un essai dans un dossier jetable (extraction de sdjElec, export statique, service sous le préfixe) a montré :

- **Le site s'exporte en statique**, une fois retirés :
  - les en-têtes et les redirections (incompatibles avec l'export) ;
  - `robots.ts` et `sitemap.ts` ;
  - les images de partage (`opengraph-image`), qui demandent un réglage d'export ;
  - les fichiers de test (l'un importe le sitemap retiré) ;
  - l'action serveur du formulaire.
- **13 fichiers HTML** : les 11 pages, dont les 4 pages de service (`generateStaticParams`), la page 404 et `_not-found`. Poids : 6,3 Mo, dont
  3,7 Mo d'images et 1,1 Mo de JavaScript et CSS.
- **La navigation marche sous le préfixe** `/demo/site-artisan` (`basePath`). Les liens du site le prennent tous ;
  `tel:` et `mailto:` restent tels quels. Aucune requête ne part hors de l'hôte.
- **Un seul défaut :** les images (`next/image` sans optimisation) ne prennent pas le préfixe et répondent en 404. Un
  chargeur d'images personnalisé, qui ajoute le préfixe, le corrige (§3.2).
- **Umami est déjà absent :** son composant ne s'affiche que si `UMAMI_WEBSITE_ID` est défini.

## 3. Fabriquer la copie

### 3.1 Le script

`apps/web/scripts/fabriquer-demo-site-artisan.mjs`, lancé à la main (`pnpm fabriquer-demo-site-artisan`). La CI ne
le lance pas, car elle n'a pas accès au dépôt privé sdjElec. Son résultat est commité, comme le fichier de la démo du
suivi de marchés.

Étapes :

1. **Source.** Le chemin du dépôt sdjElec est un argument (par défaut `~/Documents/Projets/EI/sdjElec`). Le script
   s'arrête si le dépôt a des modifications non commitées : la copie doit correspondre à un commit précis.
2. **Extraction.** `git archive HEAD` vers un dossier temporaire. C'est la seule commande lancée sur le dépôt sdjElec,
   en lecture seule.
3. **Adaptations** (§3.2), dans le dossier temporaire.
4. **Construction.** `npm ci`, puis `next build`, dans le dossier temporaire. Ses dépendances ne touchent pas le
   monorepo.
5. **Remplacement.** Le contenu de `out/` remplace `apps/web/public/demo/site-artisan/` : l'ancien dossier est vidé
   d'abord, aucun fichier périmé ne reste.
6. **Trace.** Le script écrit `apps/web/data/demo-site-artisan.ts` :

   ```ts
   export const COPIE_SITE_ARTISAN = { date: "2026-10-15", commit: "19c7902" };
   ```

   La date et le commit court sont ceux de la copie ; la légende de `/realisations` lit la date.
7. **Nettoyage.** Le dossier temporaire est supprimé, même en cas d'échec.

**Garde-fou :** chaque adaptation vérifie que sa cible existe, et qu'un remplacement de texte a bien trouvé son texte.
Sinon, le script s'arrête avec un message qui nomme le fichier et l'adaptation : le site de Jérôme a changé, la copie
serait bancale.

### 3.2 Les adaptations

| Cible dans la copie | Adaptation | Pourquoi |
|---|---|---|
| `next.config.ts` | `output: "export"`, `basePath: "/demo/site-artisan"`, `trailingSlash: false` ; retire `headers()` et `redirects()` | Export statique sous le préfixe. Pas de barre finale, comme jouan.dev, qui redirige les adresses à barre finale. |
| `next.config.ts` | `images: { loader: "custom", loaderFile: "./chargeur-images-demo.ts" }` | Le chargeur ajoute le préfixe aux images (défaut constaté au §2). |
| `chargeur-images-demo.ts` (créé) | `({ src }) => src.startsWith("/") ? "/demo/site-artisan" + src : src` | Idem. |
| `app/contact/actions.ts` | Remplacé : même type `ContactFormState`, même signature `submitContactForm`. Garde la validation des champs (même messages d'erreur), puis renvoie un succès avec le message de démo, sans rien envoyer. | Pas d'action serveur en export ; aucun mail. |
| `app/robots.ts`, `app/sitemap.ts`, `app/**/opengraph-image.*`, `**/*.test.*` | Supprimés | Incompatibles avec l'export, ou inutiles à la démo. |
| `public/images/**` | Réduites et recompressées par sharp : 1 200 px au plus sur le grand côté (la fenêtre fait au plus 1 088 px), même format, même nom, JPEG qualité 75 (mozjpeg), autres formats qualité 80. Une image n'est remplacée que si elle y gagne. | Alléger les 3,7 Mo sans toucher aux chemins. À 1 600 px, la copie faisait 5,8 Mio, au-delà du budget ; à 1 200 px, 3,8 Mio. |
| `app/layout.tsx` | Insère le bandeau de démo (§3.3) en tête de `<body>` | Plein écran sans confusion. |

Message de démo du formulaire : « Démo : ce message n'est pas envoyé. Pour joindre l'entreprise, passez par son vrai
site. »

La validation des champs est reprise du vrai fichier, et non réécrite : le script garde la fonction de validation, et
ne remplace que la partie qui limite le débit et envoie le mail. Si la découpe ne trouve pas ses repères, le
garde-fou s'applique.

### 3.3 Le bandeau de démo

Une fine bande en haut de chaque page de la copie, **seulement hors de l'iframe** (plein écran, ou adresse ouverte
directement). Dans la fenêtre de `/realisations`, la barre de titre suffit.

- **Contenu :** « Démo réalisée par Augustin Jouan · Le vrai site ↗ · Retour au portfolio ».
  - « Le vrai site » ouvre l'adresse en ligne (`SITE_ARTISAN` de `data/realisations.ts`) dans un nouvel onglet.
  - « Retour au portfolio » mène à `/realisations#site-vitrine`.
  - Ce sont des liens `<a>` simples : `basePath` ne les préfixe pas.
- **Sans saut d'affichage :** un script de deux lignes, lu avant l'affichage, pose `data-plein-ecran` sur `<html>`
  quand `window.self === window.top`. Le bandeau est masqué en CSS sans cet attribut, donc rien ne bouge à l'arrivée.
  Sans JavaScript, il reste masqué.
- **Téléphone et e-mail inertes :** le même script annule le clic sur les liens `tel:` et `mailto:`, dans la fenêtre
  comme en plein écran. Dans l'iframe, Chrome bloque leur navigation (« This content is blocked ») ; en plein écran, un
  visiteur du portfolio appellerait l'artisan par erreur.
- **Style :** couleurs et typographie de la copie (ses propres classes Tailwind), lisible et contrasté, sans imiter la
  charte de jouan.dev. Le texte exact et l'adresse en ligne sont passés au script, pas recopiés à la main.

## 4. Servir la copie depuis jouan.dev

- **Réécritures** (`next.config.ts`). Next ne sert pas l'`index.html` d'un dossier de `public`, et l'export sans barre
  finale produit `services.html`. Deux règles, après celles qui existent :
  - `/demo/site-artisan` → `/demo/site-artisan/index.html` ;
  - `/demo/site-artisan/:chemin` (chemins sans point, hors `_next/`) → `/demo/site-artisan/:chemin.html`.

  Les fichiers de navigation du routeur (`.txt`) et les ressources de `_next/` sont servis tels quels.
- **En-têtes.** Ceux de `/demo/:path*` s'appliquent déjà : affichage en iframe par jouan.dev seulement
  (`frame-ancestors 'self'`, `SAMEORIGIN`). On y ajoute `X-Robots-Tag: noindex`, pour que Google n'indexe pas un
  double du site de Jérôme. La démo du suivi de marchés en profite aussi. Les balises canonical de la copie pointent
  déjà vers le vrai domaine de Jérôme.
- **La CSP de jouan.dev** couvre la copie sans changement : scripts et styles servis par le site (`'self'`), script en
  ligne autorisé, aucune requête externe.
- **Page introuvable.** Un lien cassé dans la copie affiche la 404 de jouan.dev. Le §6 vérifie qu'aucun lien de la
  copie n'y mène.

## 5. Sur `/realisations`

- **Une fenêtre générique.** `FenetreDemo` reçoit l'adresse, le titre de la barre, le titre de l'iframe et la légende
  au lieu de les coder en dur. Le comportement ne change pas :
  - l'iframe est chargée à l'approche, à partir de 768 px de large ;
  - avant, et sans JavaScript, l'aperçu tient sa place ;
  - un bouton « Ouvrir la démo en plein écran » ouvre la démo dans un nouvel onglet.
- **Données.** Le média `demo` gagne ces champs. Le suivi de marchés garde ses valeurs actuelles. Le site de l'artisan
  passe de `captures` à `demo` :
  - adresse : `/demo/site-artisan` ;
  - barre : « SARL Dufourd Jérôme — démo » ;
  - iframe : « Démo interactive : site vitrine de l'artisan » ;
  - légende : « Copie du site au <date de COPIE_SITE_ARTISAN>. Le formulaire n'envoie rien. »
- **L'étude.** Son bloc média s'intitule « La démo » comme l'autre. Le lien « Voir le site » vers le site en ligne
  reste dans l'en-tête de l'étude.
- **Aperçu.** `ordinateur.webp` est recapturé à partir de la copie, avec le vrai nom et les vraies coordonnées
  (Jérôme a donné son accord). C'est `scripts/capturer-apercu-demo.mjs`, étendu à la copie, qui le fait. Son texte
  alternatif ne dit plus « nom et coordonnées remplacés ». L'offre de l'accueil, qui affiche cet aperçu, en profite.
  `mobile.webp`, qui n'est plus utilisé, est supprimé.
- **`Captures`.** Le composant et le type `captures` restent, pour une future étude sans démo, mais aucune étude ne
  s'en sert plus.

## 6. Tests et garde-fous

- **Unitaires.**
  - `data/realisations.test.ts` : chaque démo a une adresse sous `/demo/`, et l'aperçu du site de l'artisan existe à
    ses vraies dimensions. Le test « une seule étude porte la démo » devient « chaque étude porte une démo ».
  - `FenetreDemo` : affiche l'adresse, la barre et la légende reçues.
  - Le chargeur d'images : il préfixe les chemins absolus et laisse les autres.
- **Budget** (`scripts/verifier-taille-demo.mjs`, déjà en CI). Ajoute la copie : 5 Mio au plus sur le disque pour
  `public/demo/site-artisan/`, et le dossier doit contenir les 11 pages du site et la page 404.
- **e2e** (`e2e/realisations.spec.ts`, ordinateur) :
  - dans l'onglet « Site vitrine », l'iframe se charge. On y suit le parcours accueil → Services → Électricité →
    Contact, l'adresse de l'iframe suit et le titre de chaque page s'affiche ;
  - le formulaire, rempli et envoyé, affiche le message de démo ;
  - pendant tout le parcours : aucune requête hors de l'hôte, aucune réponse 4xx ou 5xx, aucune erreur de console ;
  - ouverte directement, la copie montre le bandeau, et ses deux liens ont les bonnes adresses. Dans l'iframe, le
    bandeau est masqué ;
  - `/demo/site-artisan/services` répond avec `X-Robots-Tag: noindex` et `X-Frame-Options: SAMEORIGIN` ;
  - chaque lien interne de chaque page de la copie mène à une page qui existe (pas de 404).
- **e2e mobile.** La fenêtre montre l'aperçu, et « Ouvrir la démo en plein écran » vise `/demo/site-artisan`.
- **Accessibilité.** `/demo/site-artisan` rejoint la liste de `e2e/accessibilite.spec.ts`, comme la démo du suivi de
  marchés. Si axe y trouve des violations, elles viennent du site de Jérôme : elles se corrigent dans sdjElec, pas
  dans la copie. Je les signale à Augustin au lieu de les masquer.
  - Constat à la première copie : `target-size` (WCAG 2.2) sur les liens téléphone et e-mail en ligne dans le texte.
    La règle est désactivée pour cette page seulement (`EXCEPTIONS` de `e2e/accessibilite.spec.ts`, commentée).
    Quand sdjElec sera corrigé, on refabrique la copie et on retire l'exception.
- **Lighthouse** n'est pas touché : l'iframe ne se charge qu'à l'approche, et jamais sous 768 px.

## 7. Poids et entretien

- Le dépôt jouan.dev gagne quelques mégaoctets, surtout des images. Chaque nouvelle copie remplace l'ancienne, mais
  l'historique Git garde les anciennes : on ne refabrique la copie que quand le site de Jérôme change vraiment.
- Pour mettre la copie à jour : `pnpm fabriquer-demo-site-artisan`, puis relire le diff, puis commiter. Le garde-fou
  arrête le script si une adaptation ne s'applique plus.
