# Sous-projet 8 — La maquette complète comme démo de l'étude de cas

Date : 2026-10-10 · Statut : design validé en conversation (sections 1 à 3), à relire par Augustin.

Prolonge les specs des sous-projets 2 (études de cas) et 6 (charte). Mêmes règles : français uniquement, aucun
nom de client, de projet client ou d'employeur dans le dépôt, mêmes budgets.

Branche : `sous-projet-8-demo-maquette`, partie de `main` après la fusion du sous-projet 7.

## 1. Objectif

La démo actuelle de l'étude de cas « Suivi de marchés » (`apps/demo-marches`, Vite et React) est une version
réduite de l'application : trois écrans et un seul chantier. La maquette fonctionnelle complète de
l'application, écrite pendant le projet client, montre bien plus : chantiers, marchés et récapitulatif, planning,
documents (comptes rendus, certificats de paiement, procès-verbaux de réception), artisans.

But : qu'un visiteur, surtout un futur client, puisse cliquer partout dans une application qui ressemble
exactement à celle livrée, sans qu'aucune donnée réelle ni aucune trace du client ne soit publiée.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Approche | La maquette anonymisée devient la démo, en **fichier statique commité** ; `apps/demo-marches` est supprimé |
| Apparence | Celle d'origine (polices, couleurs) ; dans l'étude de cas, **forcée dans son thème sombre** |
| Connexion | Aucun écran de connexion à l'ouverture : la démo s'ouvre **connectée sur un compte fictif** |
| Sauvegarde | **Le temps de l'onglet** (`sessionStorage`) ; « Revenir au jeu de démonstration » remet tout à zéro |
| Téléchargement | « Télécharger le tableur » **rendu fonctionnel** (CSV téléchargé par le navigateur) |
| Mobile | Inchangé : pas d'iframe, lien « Ouvrir la démo en plein écran » (la maquette est pensée pour ordinateur) |
| Entreprise fictive | **Maisons Exemple** |
| Anonymisation | Une fois, par un script local **jamais commité** ; garde-fou structurel commité |

**Écartés :** reconstruire les écrans de la maquette dans l'application React (des semaines de travail pour un
résultat identique) ; garder l'ancienne démo à côté d'un lien vers la maquette (deux démos, dont une jugée trop
pauvre) ; repeindre la maquette aux couleurs « Nuit mauve » (elle ne montrerait plus l'application livrée) ;
conserver les données d'une visite à l'autre (`localStorage`).

## 3. Ce que voit le visiteur

- **Ordinateur, dans l'étude de cas :** l'iframe se charge à l'approche (comportement actuel de `FenetreDemo`),
  sur `/demo/suivi-de-marches/index.html?theme=sombre`. La maquette s'affiche dans son thème sombre d'origine ; son
  bouton clair / sombre reste utilisable.
- **Ouverture :** directement connectée sur le compte fictif (par exemple « Camille Martin », conducteur de
  travaux), sur l'écran « Mes chantiers ». « Se déconnecter » mène à l'écran de connexion, où le compte fictif est
  proposé.
- **Contenu :** quatre chantiers de démonstration et environ 60 artisans, tous fictifs ; tous les écrans de la
  maquette.
- **Sauvegarde :** les modifications survivent à un rechargement de la page et disparaissent à la fermeture de
  l'onglet. Un nouvel onglet repart du jeu de démonstration.
- **Téléchargement du récapitulatif :** le CSV est téléchargé par le navigateur. L'impression fonctionne déjà.
- **Mobile :** inchangé.
- **Légende** sous la fenêtre : « Chantiers, entreprises et montants fictifs. Vos modifications sont oubliées à la
  fermeture de l'onglet. »
- **Aperçu** (image affichée avant le chargement de l'iframe, et sans JavaScript) : recapturé sur la nouvelle démo
  avec `scripts/capturer-apercu-demo.mjs`.
- **Politique de confidentialité :** mentionne que la démo garde ses données dans le stockage de session de
  l'onglet.

## 4. Anonymisation

### 4.1 Procédé

- Un script d'anonymisation lit la maquette d'origine (dépôt privé du projet client, hors de ce dépôt, en lecture
  seule) et écrit `apps/web/public/demo/suivi-de-marches/index.html`.
- Il contient la correspondance entre valeurs réelles et valeurs fictives : il n'est **jamais commité**. Il vit
  dans `.superpowers/anonymat/` (ignoré par Git), pour être relancé si la maquette évolue.
- Il s'arrête en erreur si une valeur d'origine remplacée (nom, adresse, commune, téléphone, e-mail, identifiant
  légal) apparaît encore dans le résultat, ou si un terme de `.superpowers/anonymat/termes-interdits.txt` y figure.
- Il applique aussi les retouches de la section 5.2, après l'anonymisation : relancer le script suffit à
  regénérer la démo complète.

### 4.2 Ce qui est remplacé

1. **Nom du produit :** remplacé par « Suivi de marchés » partout (titre, textes, commentaires, clé de stockage).
   Le sigle « S » reste.
2. **Entreprise cliente :** remplacée par **Maisons Exemple** — nom, adresse, e-mails, identifiants légaux de
   l'en-tête des documents (valeurs visiblement fictives, par exemple `RCS 000 000 000`). Le logo (image JPEG
   intégrée) est remplacé par un monogramme en SVG.
3. **Comptes de démonstration :** un seul compte fictif, adresse en `.example` (domaine réservé, RFC 2606).
4. **Artisans :** environ 60 artisans inventés, couvrant tous les corps de métier des lots de base : raison
   sociale, interlocuteur, adresse dans une commune inventée, téléphone pris dans les tranches que l'ARCEP réserve
   à la fiction (`01 99 00`, `02 61 91`, `03 53 01`, `04 65 71`, `05 36 49`, `06 39 98`, suivis de quatre
   chiffres).
5. **Chantiers de démonstration :** maîtres d'ouvrage, adresses et communes inventés ; entreprises des lots tirées
   des artisans fictifs ; **montants modifiés** (facteur aléatoire entre 0,8 et 1,2, arrondi), pour ne publier aucun
   montant réel de marché. Les totaux restent justes : l'application les recalcule.
6. **Commentaires :** le commentaire de développement en tête du fichier (consignes de l'artefact claude.ai,
   historique) est retiré ; les autres commentaires restent et passent par les mêmes remplacements.

### 4.3 Garde-fou commité

Un test Vitest (`apps/web`) lit le fichier de la démo et échoue si :
- une adresse e-mail n'est pas en `.example` ;
- un numéro de téléphone français n'est pas dans une tranche de fiction de l'ARCEP ;
- une image JPEG ou PNG est intégrée en `data:` ;
- une ressource externe est chargée (`http://` ou `https://` dans un `src`, un `href` ou un `url(`), Google Fonts
  compris.

Il ne contient aucune valeur réelle : il peut être public.

## 5. Intégration

### 5.1 Fichiers

- `apps/web/public/demo/suivi-de-marches/index.html` : la maquette anonymisée et retouchée, **commitée**.
  `apps/web/public/demo/` sort du `.gitignore` (il recevait le build de l'ancienne démo). L'adresse publique, la
  réécriture `/demo/suivi-de-marches` et les en-têtes de la démo (`next.config.ts`, iframe acceptée par le site
  seul) ne changent pas.
- `apps/web/public/demo/suivi-de-marches/polices/` : Figtree (400, 500, 600), Outfit (500, 600, 700) et Spline Sans
  Mono (400 à 700) en `woff2`, sous-ensemble latin, avec la licence OFL. Déclarées en `@font-face` dans le fichier, à
  la place de Google Fonts (la CSP du site, `font-src 'self' data:`, bloque Google Fonts).
- Suppression de `apps/demo-marches` et de tout ce qui y renvoie :
  - `package.json` racine : `build` ne construit plus que le site ; `dev:demo` retiré ;
  - `pnpm-lock.yaml` ;
  - `Dockerfile` et `apps/realtime/Dockerfile` ;
  - `.github/workflows/ci.yml` (mesures Vitest de la démo) ;
  - README (structure du dépôt, lancer la démo en local, procédure de mise à jour de la démo) ;
  - commentaires qui citent `apps/demo-marches` (`next.config.ts`, `eslint.config.mjs`).
- `apps/web/public/demo/` reste exclu du lint et de `.cursorignore`.

### 5.2 Retouches de la maquette

- **Thème :** un script en tête de `<head>` lit `?theme=sombre` et pose `data-theme="dark"` sur `<html>` avant le
  premier affichage (pas d'éclair clair).
- **Connexion :** au démarrage, l'utilisateur est connecté sur le compte fictif.
- **Sauvegarde :** `sessionStorage` à la place de `localStorage`, sous la clé `suivi-de-marches-demo-v1` ; lecture
  et écriture dans un `try/catch`, comme aujourd'hui.
- **Téléchargement :** sans capacité `downloads` d'artefact, le CSV passe par un `Blob` et un lien `download`.

### 5.3 Ce qui est retiré

Les tests unitaires de calcul de l'ancienne démo (montants, avenants, certificat, planning) disparaissent avec
elle : la maquette n'en a pas. Le parcours de référence e2e (section 6) couvre le calcul principal.

## 6. Tests et vérifications

**Unitaires (Vitest) :**
- garde-fou d'anonymat (section 4.3) ;
- `FenetreDemo` : source avec `?theme=sombre`, nouvelle légende.

**Bout en bout (Playwright), `e2e/demo.spec.ts` réécrit :**
- l'iframe n'est chargée qu'à l'approche de sa fenêtre ;
- dans l'iframe : `<html data-theme="dark">`, écran « Mes chantiers » sans passer par la connexion ;
- parcours de référence : ouvrir un chantier, ajouter un avenant à un lot, voir le total du chantier changer, ouvrir
  le certificat de paiement de l'entreprise ;
- après un rechargement, la modification est toujours là ; dans un nouvel onglet (nouveau contexte), elle a
  disparu ;
- « Télécharger le tableur » déclenche un téléchargement de fichier CSV ;
- mobile : lien plein écran au lieu de l'iframe ;
- adresse courte de la démo, avec ou sans barre finale ;
- aucune requête vers un autre domaine que le site pendant ces parcours ;
- aucune erreur console.

**Accessibilité :** l'audit axe de la démo (`e2e/accessibilite.spec.ts`) est conservé. Les violations de la
maquette sont corrigées tant que la correction ne change pas visiblement son apparence ; les autres sont
signalées à Augustin avant toute décision.

**Budget :** `scripts/verifier-taille-demo.mjs` mesure désormais `index.html` compressé (gzip), limite inchangée
**110 Ko** (la maquette d'origine pèse 107 Ko compressés, avant retrait du commentaire d'en-tête et du logo). Les
polices ne comptent pas dans cette limite.

**Inchangés :** `verifier-accueil-statique`, Lighthouse et ses seuils (la démo n'est chargée qu'à l'approche).

## 7. Exécution

L'anonymisation et les retouches de la maquette touchent des données réelles et un script qui ne sort pas de la
machine d'Augustin : elles sont faites par Claude, pas déléguées. Le reste (suppression de l'ancienne démo, CI,
tests, README) peut être découpé en fiches ; le plan le décidera.

## 8. Documentation

README : la démo est un fichier statique dans `apps/web/public/demo/suivi-de-marches/`, généré par un script
local d'anonymisation (hors dépôt) qui applique aussi les retouches ; pour la mettre à jour, relancer ce script
puis commiter le fichier. Le garde-fou d'anonymat tourne en CI.
