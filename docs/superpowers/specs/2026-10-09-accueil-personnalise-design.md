# Sous-projet 3 — Accueil personnalisé

Date : 2026-10-09 · Statut : design validé en conversation (parties 1 à 3), à relire par Augustin.

Prolonge les specs des sous-projets 1 (`2026-10-08-socle-et-accueil-design.md`) et 2
(`2026-10-09-etudes-de-cas-design.md`) : direction « Atelier clair », contenu typé dans
`apps/web/data/`, français uniquement, pas de nom de client, de projet ou d'employeur dans le dépôt,
mêmes budgets.

**Changement de feuille de route :** le service `apps/realtime` (Hono) n'est plus introduit ici mais au
sous-projet 4, le premier à avoir besoin de WebSocket. Le sous-projet 3 reste entièrement dans
`apps/web` (Next.js), avec une base Postgres.

## 1. Objectif

Avant d'envoyer un devis ou un premier mail à un prospect, Augustin crée un lien personnel
(`jouan.dev/?pour=boulangerie-martin-k7f3`). Le prospect arrive sur un accueil qui le salue par son nom
et met en avant l'offre qui le concerne ; Augustin reçoit un mail à chaque nouvelle visite, pour savoir
quand relancer.

Critères de réussite :

- un lien actif affiche « Bonjour Boulangerie Martin, » et l'angle choisi, sans clignotement ;
- une visite réelle déclenche un mail ; un aperçu, un robot ou un lien inconnu n'en déclenchent pas ;
- l'accueil sans paramètre reste statique et garde ses budgets ;
- les visiteurs ne reçoivent toujours aucun cookie ; aucune adresse IP n'est conservée.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Personnalisation | Nom du prospect + angle (`application` ou `vitrine`) ; pas de message libre |
| Notification | Mail via le SMTP du formulaire de contact ; liste des visites dans l'administration |
| Forme du lien | `?pour=<nom-normalisé>-<suffixe aléatoire de 4 caractères>` |
| Accès à l'administration | Mot de passe unique (empreinte `scrypt` en variable d'environnement), cookie de session signé |
| Stockage | Postgres (ressource Coolify) + Prisma |
| Fréquence des mails | À chaque nouvelle visite : au moins 30 minutes depuis la précédente du même lien |
| Rendu | Réécriture par le `proxy` de Next 16 vers une route dynamique ; accueil statique inchangé |

**Écartés :** message libre par lien, notification push (ntfy), notification en direct par WebSocket,
connexion GitHub ou passkey, SQLite, personnalisation dans le navigateur, accueil entièrement
dynamique, expiration automatique des liens.

## 3. Données

Schéma Prisma (`apps/web/prisma/schema.prisma`) :

```prisma
model Lien {
  id       String   @id @default(cuid())
  jeton    String   @unique   // « boulangerie-martin-k7f3 »
  nom      String             // « Boulangerie Martin », 1 à 60 caractères
  angle    Angle
  actif    Boolean  @default(true)
  creeLe   DateTime @default(now())
  visites  Visite[]
}

model Visite {
  id        String    @id @default(cuid())
  lienId    String
  lien      Lien      @relation(fields: [lienId], references: [id], onDelete: Cascade)
  le        DateTime  @default(now())
  appareil  Appareil
  numero    Int       // 1re, 2e… visite de ce lien
  mailEnvoye Boolean  @default(false)
  @@index([lienId, le])
}

enum Angle { application vitrine }
enum Appareil { mobile ordinateur }
```

- **Jeton** : le nom en minuscules, sans accents, mots séparés par des tirets, tronqué à 40 caractères,
  puis `-` et 4 caractères tirés de `[a-z0-9]` avec `crypto.randomInt` (environ 1,7 million de
  combinaisons par nom). En cas de collision, nouveau tirage.
- **Nom** : texte brut, espaces de début et de fin retirés, 1 à 60 caractères ; React l'échappe à
  l'affichage.
- **Pas d'adresse IP, pas d'en-tête complet, pas d'identifiant de navigateur.** L'appareil est déduit de
  l'en-tête `Sec-CH-UA-Mobile` ou, à défaut, du `User-Agent` (`Mobi|Android|iPhone|iPad`), puis oublié.

## 4. Ce que voit le prospect

À `jouan.dev/?pour=<jeton>` d'un lien actif :

- **Salutation** « Bonjour Boulangerie Martin, » dans l'emplacement réservé au-dessus du surtitre de
  l'accroche (`components/accueil/Accroche.tsx`).
- **Angle `application`** : accroche actuelle ; offre « Application métier » en premier et mise en
  avant ; étude « suivi de marchés » en premier dans les réalisations.
- **Angle `vitrine`** : accroche orientée site vitrine (premier jet, à valider) — titre « Un site
  vitrine *qui vous ressemble*, rapide et bien référencé. », sous-titre « Je conçois, développe et
  héberge votre site, du premier échange à la mise en ligne. » ; offre « Site vitrine » en premier et
  mise en avant ; étude « site artisan » en premier.
- Le reste de l'accueil est identique (intro, méthode, parcours, contact).
- **Formulaire de contact** : un champ caché porte le jeton ; le mail de contact ajoute « Message
  envoyé depuis le lien de Boulangerie Martin » si le jeton correspond à un lien actif.
- **Lien inconnu, désactivé, ou base indisponible** : l'accueil normal, sans salutation, sans visite
  comptée, sans erreur visible.

Les textes des angles vivent dans `apps/web/data/accueil.ts` (type `Angle`, `accrochesParAngle`,
ordre des offres et des études par angle).

## 5. Parcours technique

1. **`apps/web/proxy.ts`** : `matcher` limité à `/` avec `has: [{ type: "query", key: "pour" }]`, et à
   `/admin/:path*`. Pour `/?pour=…`, réécriture vers `/pour/<jeton>` (l'adresse affichée ne change
   pas). Pour `/admin/*` hors `/admin/connexion`, redirection vers la connexion sans session valide.
2. **`app/pour/[jeton]/page.tsx`** : rendu à chaque requête ; lit le lien (actif) en base ; rend
   l'accueil en passant `{ nom, angle }` aux composants (`Accroche`, `Offre`, `Realisations`,
   `SectionContact`). `robots: noindex`, `canonical: "/"`. L'accueil `app/page.tsx` rend les mêmes
   composants sans personnalisation et reste statique.
3. **Signal de visite** : un petit composant client (`SignalVisite`) n'est rendu que sur la page
   personnalisée d'un lien actif, hors aperçu. Après **3 secondes de page visible** (cumulées,
   `visibilitychange`), il envoie une fois `navigator.sendBeacon("/api/visites", jeton)`.
4. **`app/api/visites/route.ts`** (`POST`) : répond toujours `204`, sans corps. En arrière-plan
   (`after()`) :
   - ignore les `User-Agent` de robots connus (aperçus de messageries, réseaux sociaux, moteurs) ;
   - limite à 10 signaux par jeton et par heure (`lib/rate-limit.ts`) ;
   - ignore un jeton inconnu ou inactif ;
   - si la dernière visite du lien date de moins de 30 minutes, ne fait rien ;
   - sinon, enregistre la visite (numéro = précédent + 1), supprime les visites de plus de 12 mois
     (tous liens), envoie le mail, puis marque `mailEnvoye`.
5. **Aperçu** : `/?pour=<jeton>&apercu=1` affiche la page personnalisée sans `SignalVisite`.

## 6. Administration

- **`/admin/connexion`** : formulaire « Mot de passe » ; Server Action qui compare à `ADMIN_EMPREINTE`
  (`scrypt`, sel et paramètres encodés dans la valeur, comparaison en temps constant). 5 essais par
  quart d'heure (clé globale, l'administration n'a qu'un utilisateur), message neutre en cas d'échec.
  Succès : cookie `admin_session` = expiration + signature HMAC-SHA256 avec `ADMIN_SECRET` ;
  `httpOnly`, `Secure` (hors développement), `SameSite=Strict`, `Path=/admin`, 30 jours.
- **Vérification double** : le `proxy` (redirection) et chaque page et Server Action de `/admin`
  (`exigerSession()` côté serveur).
- **`/admin`** :
  - formulaire « Nouveau lien » (nom, angle) ; à la création, le lien complet s'affiche avec
    « Copier le lien » ;
  - tableau : nom, angle, état, nombre de visites, dernière visite (« il y a 2 jours »), actions
    « Copier », « Aperçu » (nouvel onglet), « Désactiver » / « Réactiver », « Supprimer »
    (confirmation ; supprime aussi les visites) ;
  - détail dépliable d'un lien : ses visites (date et heure de Paris, appareil, mail envoyé ou non) ;
  - « Se déconnecter ».
- `noindex`, `Disallow: /admin` dans `robots.txt`, absente du sitemap. Style « Atelier clair », sobre,
  utilisable sur téléphone. Hors budgets Lighthouse.
- **Base indisponible** : bandeau « Base de données indisponible » ; les actions sont désactivées.

## 7. Notification par mail

Envoyée par le module SMTP existant (`lib/email.ts`, généralisé), au destinataire `CONTACT_TO` :

- **Objet** : « Boulangerie Martin a ouvert son lien — 3e visite » (« 1re visite » la première fois).
- **Corps (texte)** : date et heure de Paris, appareil, date de la visite précédente (« il y a
  2 jours », absente la première fois), lien vers `<SITE_URL>/admin`.
- **Échec d'envoi** : visite enregistrée avec `mailEnvoye = false`, erreur journalisée, pas de nouvel
  essai.

## 8. Confidentialité

- `app/politique-de-confidentialite` gagne une section « Liens personnalisés » : personnes concernées
  (destinataires d'un lien), données (date, type d'appareil, nombre de visites), finalité (suivi
  commercial), base légale (intérêt légitime), durée (12 mois), droits (effacement sur simple demande,
  par le formulaire de contact), absence de cookie et d'adresse IP.
- Le seul cookie du site est `admin_session`, limité à `/admin`, strictement nécessaire.

## 9. Exploitation

- **Coolify** : ressource Postgres ; variables `DATABASE_URL`, `ADMIN_EMPREINTE`, `ADMIN_SECRET`
  (au moins 32 octets aléatoires). Le mot de passe va dans Bitwarden, jamais dans le dépôt.
- **Script** `pnpm --filter web empreinte-mot-de-passe` : demande le mot de passe sans l'afficher et
  imprime l'empreinte à coller dans Coolify.
- **Migrations** : `prisma migrate deploy` au démarrage du conteneur, avant `node apps/web/server.js`.
  Le Dockerfile inclut le client Prisma généré et les migrations.
- **Développement sans base** : `DATABASE_URL` absente → pages personnalisées = accueil normal,
  `/api/visites` = `204`, administration = bandeau « Base de données indisponible ».
- **README** : mise en place (base locale par Docker, migrations, création de l'empreinte).

## 10. Budgets, tests, erreurs

| Mesure | Seuil | Contrôle |
|---|---|---|
| Accueil `/` | reste statique (`○` au build) ; budgets inchangés | build, Lighthouse CI |
| Page personnalisée (lien d'exemple créé en CI) | mêmes seuils que l'accueil | Lighthouse CI |
| JS ajouté à la page personnalisée | `SignalVisite` < 1 Kio compressé | revue |

Tests :

- **Unitaires** : génération et normalisation du jeton ; empreinte et vérification du mot de passe ;
  signature et expiration de la session ; règle des 30 minutes et numérotation ; filtre des robots ;
  déduction de l'appareil ; contenu du mail (objet, 1re visite, visite précédente) ; textes et ordres
  par angle ; page personnalisée (salutation, angle, lien inconnu) ; `SignalVisite` (3 s visibles, un
  seul envoi, rien en aperçu).
- **E2E (base Postgres de test en CI, service GitHub Actions)** : connexion refusée puis acceptée ;
  `/admin` sans session → connexion ; création d'un lien puis ouverture → salutation et angle, mail
  reçu par le faux SMTP avec « 1re visite » ; deuxième ouverture immédiate → pas de mail ; aperçu → pas
  de mail ; lien désactivé et lien inconnu → accueil normal ; suppression ; `/` toujours statique ;
  aucune erreur de console.

Erreurs : aucune erreur n'est montrée au prospect ; toute erreur serveur (base, SMTP) est journalisée
et dégrade vers l'accueil normal ou `204`.

## 11. À valider par Augustin

- Les textes de l'angle `vitrine` (titre, sous-titre).
- La formule de salutation (« Bonjour Boulangerie Martin, »).
- La section « Liens personnalisés » de la politique de confidentialité.
- La création de la ressource Postgres et des variables dans Coolify, puis le mot de passe dans
  Bitwarden.
