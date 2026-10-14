# Présence en direct — retrait des curseurs

Date : 2026-10-14 · Statut : design validé en conversation (parties 1 à 3), à relire par Augustin.

Modifie le sous-projet 4 (spec `2026-10-09-temps-reel-design.md`) et l'invitation de la PR #17.
Mêmes règles : français uniquement, mêmes budgets, rien de journalisé qui identifie un visiteur.

Branche : `retrait-curseurs`, partie de `main` après la fusion de la PR #23 (logos du parcours).

## 1. Objectif

Les curseurs des autres visiteurs disparaissent de l'accueil. On garde le **compteur** (« N personnes regardent
cette page ») et l'**invitation** (« Vous êtes seul ici. · Inviter quelqu'un »). Tout ce qui n'existait que pour les
curseurs est retiré, dans le service temps réel comme dans le site.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Périmètre | Seulement les curseurs ; le compteur, l'invitation et le service restent |
| Approche | Retrait complet du protocole des curseurs, des deux côtés |
| Invitation | Affichée partout (téléphone compris) ; texte après copie : « Lien copié : envoyez-le, le compteur passera à 2. » |
| Transition | Le service ignore les anciens messages du navigateur ; le site ignore les anciens messages du service |
| Infrastructure | Inchangée : DNS, ressources Coolify, variables (`DIRECT_URL`, `ORIGINES_AUTORISEES`) |

**Écartée :** masquer seulement l'affichage dans le site. Le service continuerait à recevoir et diffuser les
positions de souris pour rien : du code mort, et des données de navigation qui circulent sans raison, contraires à
la politique de confidentialité mise à jour.

## 3. Service temps réel (`apps/realtime`)

### 3.1 Protocole

Messages du service :

- `{ "type": "bienvenue", "presents": N }` à la connexion ;
- `{ "type": "presents", "nombre": N }` à tous, à chaque arrivée et à chaque départ (inchangé).

Disparaissent : l'identifiant et la couleur de `bienvenue`, sa liste `curseurs`, les messages `positions` et
`depart`, le type `Curseur`.

Le navigateur n'envoie plus rien. Un message reçu quand même (page encore ouverte sur l'ancienne version, qui envoie
`position` ou `masque`) est **ignoré, sans couper la connexion**. Les protections restent : un message plus long que
`TAILLE_MAX_MESSAGE` (128 octets) ou un débit au-delà de la limite actuelle (`Debit`) ferme la connexion, comme
aujourd'hui.

### 3.2 Ce qui disparaît

- `couleurs.ts` et son test (couleurs attribuées aux visiteurs) ;
- dans `salle.ts` : positions, ensembles `visibles` et `bouges`, `PLAFOND_CURSEURS`, `deplacer`, `masquer`,
  `curseurs`, `extraireLot` ; la salle ne garde que les présents (un identifiant opaque interne par connexion, pour
  retrouver la bonne au départ) et leur nombre ;
- dans `serveur.ts` : l'intervalle des lots (`intervalleLotMs`, 50 ms), la diffusion de `depart`, la lecture de
  `position` et `masque` ;
- dans `protocole.ts` : `lireMessage`, `MessageClient`, `NB_SECTIONS_MAX`, `arrondir`.

### 3.3 Ce qui ne change pas

`/sante` ; `/sonde` (écho de la page Coulisses, hors de la salle) ; le contrôle des origines ; les limites de
connexions (`CONNEXIONS_MAX`, `CONNEXIONS_PAR_IP`) ; le ping qui coupe les connexions mortes ; la file d'envoi
bornée ; aucune journalisation d'IP ou de comportement.

### 3.4 Tests

- protocole, salle et serveur mis à jour ; tests des couleurs supprimés ;
- nouveau : un ancien message `{"type":"position",…}` reçu par le service est ignoré, la connexion reste ouverte et
  le visiteur reçoit toujours `presents` ;
- inchangés : sonde, origines, limites, envoi.

## 4. Site (`apps/web`)

### 4.1 Connexion et état

- `lib/direct/connexion.ts` : n'écoute plus que. Gardés : reconnexion progressive (`DELAIS_RECONNEXION_MS`,
  ±20 %), fermeture après 30 s d'onglet caché, `MARQUEUR_DIRECT`. Retirés : `envoyer`, la cadence de 50 ms
  (`INTERVALLE_ENVOI_MS`), le message `masque` envoyé en cachant l'onglet.
- `lib/direct/protocole.ts` : `MessageServeur` = `bienvenue { presents }` | `presents { nombre }`.
  `lireMessageServeur` renvoie `null` pour tout autre type, dont `positions` et `depart` d'un ancien service. Un
  `bienvenue` d'un ancien service (avec `id`, `couleur`, `curseurs` en plus) reste lisible : seul `presents` est lu.
  `MessageClient` disparaît.
- `lib/direct/magasin.ts` : `EtatDirect` = `{ connecte, presents }`.
- `lib/direct/apres-affichage.ts` : n'exporte plus que `ConnexionDirecte` et `MagasinDirect`.

### 4.2 Ce qui disparaît

- `components/direct/CalqueCurseurs.tsx` ;
- `lib/direct/coordonnees.ts` et son test ;
- dans `PresenceDirecte.tsx` : le suivi de la souris, le chargement du calque, le partage (`CLE_PARTAGE`,
  `lirePartage`, `ecrirePartage`, `basculerPartage`), la détection du pointeur fin, l'écoute de
  `EVENEMENT_BASCULER_CURSEUR` ;
- `components/direct/contexte.tsx` : la valeur se réduit à `{ etat }` ;
- `components/accueil/Section.tsx` : l'attribut `data-direct-section` et son commentaire (repère des curseurs).

La clé `direct:partage` déjà présente dans le stockage local de certains visiteurs n'est plus lue ; elle n'est pas
effacée (sans effet, et sans donnée personnelle).

### 4.3 Compteur et invitation (`CompteurPresents.tsx`)

- Seul (`connecte` et `presents === 1`), sur tout appareil : « Vous êtes seul ici. » et le bouton
  « Inviter quelqu'un ».
- Après la copie : « Lien copié : envoyez-le, le compteur passera à 2. »
- Copie refusée : « Envoyez ce lien : » suivi du lien à sélectionner (inchangé).
- Le lien copié reste celui de l'accueil public (`${location.origin}/`), jamais celui d'un prospect.
- À partir de 2 : « N personnes regardent cette page » avec le point qui pulse (inchangé) ; l'invitation est remise
  à zéro (inchangé).
- Le bouton « Masquer mon curseur / Montrer mon curseur » et son attribut `data-presence` disparaissent.
- La ligne garde sa hauteur fixe rendue par le serveur : son apparition ne décale rien.

### 4.4 Palette de commandes

- `data/commandes.ts` : la commande `curseur` disparaît.
- `lib/commandes/types.ts` : la condition `presence`, le champ `libelleInverse` et le champ `presence` du contexte
  disparaissent ; `ConditionCommande` = `"intro"`.
- `lib/commandes/contexte.ts` et `lib/commandes/visibles.ts` : la lecture de `data-presence` et le libellé inverse
  disparaissent.
- `lib/commandes/evenements.ts` : `EVENEMENT_BASCULER_CURSEUR` disparaît.

### 4.5 Poids

Le morceau du direct chargé après l'affichage maigrit (plus de coordonnées ni d'envoi) ; le budget de
`scripts/verifier-taille-direct.mjs` et celui de Lighthouse restent respectés. Plus de calque chargé à la demande.

## 5. Textes

- **Politique de confidentialité**, section « Présence en direct », réécrite :
  > Sur la page d'accueil, un compteur indique combien de personnes regardent la page en même temps. Votre
  > navigateur se connecte pour être compté, mais n'envoie rien : ni position, ni contenu. Rien n'est enregistré.
  >
  > Ce compteur sert à animer la page d'accueil et à montrer un savoir-faire technique. Sa base légale est mon
  > intérêt légitime (article 6.1.f du RGPD). Il dure le temps de votre visite : votre adresse IP sert uniquement,
  > en mémoire et le temps de la connexion, à limiter le nombre de connexions ; les journaux techniques de
  > l'hébergeur relèvent de la mention ci-dessus.
  >
  > Le repère de l'introduction déjà vue et les modifications faites dans la démo de l'étude de cas « Suivi de
  > marchés » ne durent que le temps de l'onglet (stockage de session). Aucun cookie supplémentaire n'est déposé.
- **Coulisses** (`data/architecture.ts`) : rôle du service « Compte les visiteurs de l'accueil et renvoie l'écho
  de cette page. »
- **README** : « Temps réel (compteur de l'accueil) » ; la ligne des limites garde les connexions, la taille
  (128 octets) et le débit (40 messages par seconde) des messages, toujours appliqués, et dit « Aucune IP n'est
  journalisée » (plus de position à mentionner).
- **Commentaires** : mentions des curseurs retirées de `lib/charte.ts`, `app/globals.css` et `IntroEncre.tsx` si
  elles parlent des curseurs du direct (pas du curseur de la souris).

## 6. Tests de bout en bout (`e2e/direct.spec.ts`, vrai service)

1. Deux visiteurs : chacun voit « 2 personnes regardent cette page » ; aucun curseur dessiné.
2. Invitation : seul, on copie le lien de l'accueil ; la personne invitée arrive, le compteur passe à 2.
3. Sur téléphone : compteur et invitation affichés.
4. Page personnalisée (`?pour=`) : elle rejoint la même salle.

Les tests de la palette (unitaires et `commandes.spec.ts`) sont adaptés ; `politique-de-confidentialite` vérifie
le nouveau texte (plus de « curseur » ni de « souris »).

## 7. Mise en ligne

Une seule PR. À la fusion, la CI reconstruit les deux images et Coolify les redéploie. L'ordre des deux
redéploiements est indifférent (§3.1, §4.1) ; les pages déjà ouvertes continuent de fonctionner. Rien à changer
dans le DNS, Coolify ou les variables.

## 8. Critères de réussite

- Plus aucun curseur, bouton ou commande de curseur sur le site ; le compteur et l'invitation fonctionnent, sur
  ordinateur comme sur téléphone.
- `git grep -i "curseur"` dans `apps/` ne renvoie plus que des mentions du curseur de la souris (intro, nuage de
  traits), plus aucune du direct.
- Tests unitaires, lint, types, build, e2e et Lighthouse au vert, budgets respectés.
