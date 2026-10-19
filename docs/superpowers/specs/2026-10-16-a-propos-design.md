# Page /a-propos : parcours et projets

Date : 2026-10-16 · Statut : design discuté en conversation avec maquettes (disposition B), relu.

## Intention

Augustin veut, sur jouan.dev, une page qui raconte tout son parcours et montre ses projets. Deux usages, avec une
priorité claire :

- **Aujourd'hui, trouver des clients.** Pour un client, la page répond à « qui est derrière, et pourquoi lui
  faire confiance ». Elle ne doit rien dire qui suggère qu'Augustin cherche un poste : un client qui se
  demande s'il sera encore disponible dans six mois ne signe pas.
- **Demain, peut-être, être recruté.** Si Augustin se retrouve sans emploi, il doit pouvoir envoyer un lien qui
  montre tout (parcours académique complet, expérience, projets, ce qu'il y a fait) sans refaire le site dans
  l'urgence. La page sert alors de portfolio.

D'où un ton **factuel** : « voici ce que j'ai fait, voici ce que j'en ai tiré », ni vendeur ni candidat. La même
page sert aux deux publics sans rien changer le jour où il cherche.

## Objectifs

- Une page `/a-propos`, en français, qui montre d'abord les projets (la preuve), puis le parcours détaillé.
- Pour chaque projet d'école mis en avant : une vidéo (ou des graphiques) en premier, puis le récit, et
  surtout la part réelle d'Augustin.
- Trouvable depuis le menu, le pied de page, la palette Ctrl+K et la section Parcours de l'accueil.

## Non-objectifs

- Pas de version anglaise.
- Pas de CV en PDF.
- Pas de démo interactive pour les projets d'école (une démo factice dans le navigateur, comme celle de
  Sentinelle, pourra venir plus tard pour EpitChat ou Time Manager : hors de ce lot).
- Pas de lien vers le code des projets d'école : les dépôts sont privés, dans l'organisation GitHub d'Epitech.
  Le code se montre en entretien.
- L'accueil ne change pas, sauf le lien ajouté sous la section Parcours ; il reste la vitrine commerciale.
- *(Mon choix)* Le CV en terminal (`curl -L jouan.dev`) et `/api/me` ne changent pas dans ce lot, même si la page
  apporte des dates et des formations qu'ils n'ont pas.

## Anti-objectifs (ce qui ferait échouer la page même si elle « marche »)

- Un ton de candidat : « Open to work », « à la recherche d'opportunités », « disponible pour un poste ».
- Exagérer la part d'Augustin dans un projet d'équipe. Robocar est écarté pour cette raison (voir plus bas) ;
  chaque « Ma part » doit tenir face à la question « qu'est-ce que tu as fait, toi ? » en entretien.
- Publier les noms des coéquipiers, des données réelles ou une information interne de SCR.
- Une page lente : les vidéos ne doivent pas peser sur le premier affichage.

## Contraintes

- Next 16, Tailwind v4, charte « Nuit mauve » ; mêmes conventions que les pages existantes (`/realisations`,
  `/coulisses`) : `mx-auto w-full max-w-6xl 2xl:max-w-page px-5 sm:px-8`, surtitres en petites capitales, titres
  en serif. Lire `node_modules/next/dist/docs/` avant d'écrire du code (`apps/web/AGENTS.md`).
- Contenus dans `data/` (comme `data/realisations.ts`), composants dans `components/`.
- Lighthouse : ajouter `/a-propos` aux URL de `lighthouserc.json` ; mêmes seuils (performance ≥ 0,95 en
  avertissement, accessibilité ≥ 0,95, CLS ≤ 0,05, scripts ≤ 168 960 o).
- Accueil : le lien ajouté sous Parcours ne doit ajouter aucun JavaScript (budget de l'accueil serré, environ
  3 Ko de marge) ; la vérification `verifier-accueil-statique` doit rester verte.
- Mouvement réduit (`prefers-reduced-motion: reduce`) : aucune vidéo ne démarre seule.
- Ne jamais écrire dans `~/Documents/Projets/epitech/` : les projets sont copiés dans un dossier temporaire pour
  être lancés et filmés.

## La page

Disposition validée sur maquette (option « B »), de haut en bas.

### 1. En-tête

Portrait (le même que l'accueil, anneau accent), surtitre « À propos », titre « Augustin Jouan », une phrase
d'introduction au ton factuel, validée par Augustin : « Développeur full stack : voici ce que j'ai construit,
et d'où je viens. »

### 2. Projets

Trois projets d'école en grands blocs pleine largeur, **vidéo d'un côté, texte de l'autre, en alternance**
(vidéo à gauche, puis à droite…). Sur téléphone, une colonne : la vidéo au-dessus du texte.

Ordre : **Time Manager, EpitChat, JOJA**.

Chaque bloc contient, dans cet ordre :

1. La vidéo (pour JOJA : les graphiques, voir plus bas).
2. Une ligne de contexte : école, année, taille de l'équipe (« Epitech · MSc 1 · 2026 · à cinq »).
3. Le titre du projet et deux phrases qui le décrivent.
4. « **Ma part** » : un paragraphe honnête sur ce qu'Augustin a fait.
5. Les technologies en pastilles.

Contenus de départ, tirés des README et de l'historique Git (à relire par Augustin) :

- **Time Manager** (Epitech MSc 1, 2026, à cinq, en cours). Application de pointage et de suivi du temps pour une
  entreprise fictive : API REST Spring Boot, interface Next.js, reverse proxy nginx, quatre services Docker.
  *Ma part* : premier contributeur (39 commits sur 78) ; backend Spring Boot, intégration continue GitHub
  Actions, documentation de l'API (OpenAPI, Swagger UI), documents du projet (rôles et permissions, recherche
  utilisateur, indicateurs). Pastilles : Java, Spring Boot, Next.js, Docker, nginx, GitHub Actions.
- **EpitChat** (Epitech Pré-MSc, 2026, à quatre). Messagerie collaborative en temps réel avec serveurs, canaux et
  messages, en web et en application desktop. *Ma part* : deuxième contributeur (84 commits sur 239), sur l'API
  et le client : authentification et jetons JWT, panneau utilisateur, messages en temps réel, tests et
  couverture. Pastilles : TypeScript, Express, Socket.io, Next.js, Electron, PostgreSQL.
- **JOJA** (Epitech Pré-MSc, 2026, à trois). Analyse exploratoire d'un extrait anonymisé d'un site de livraison
  de courses : 3,4 millions de commandes, 206 000 clients, 50 000 produits, transformés en recommandations
  concrètes. *Ma part* : trois des quatre études détaillées (produits les plus rachetés, premier produit ajouté
  au panier, part du bio). Pastilles : Python, pandas, Jupyter, visualisation.

Les tailles d'équipe (cinq, quatre, trois) sont confirmées par Augustin.

Puis **les projets freelance** en deux cartes plus petites, côte à côte (une colonne sur téléphone) : sdjElec
(site vitrine d'un électricien-plombier) et Sentinelle (suivi des marchés de travaux). Chacune : son aperçu
existant, une phrase, un lien vers son étude sur `/realisations` (`/realisations#…`, ancres existantes). Pas de
contenu dupliqué depuis `/realisations`.

### 3. Parcours

Frise **verticale** détaillée : l'année à gauche, le fil lumineux au milieu (même esprit que le fil de la
Méthode sur l'accueil), puis le titre de l'étape et deux ou trois lignes de récit. Les logos SCR et Epitech
(déjà dans `public/parcours/`) accompagnent leurs étapes, avec un lien vers leur site comme sur l'accueil.

Étapes et textes de départ (à relire) :

| Année | Étape | Récit |
|---|---|---|
| 2021 – 2025 | Licence MIASHS · Université de Rennes | Mathématiques, informatique et sciences humaines : Python, R, SQL, statistiques et premiers modèles d'apprentissage. Projets d'analyse sur les ventes de pesticides en France et les données de la SNCF. |
| 2024 | Six mois en Irlande | Bénévole dans un temple bouddhiste tibétain, en immersion complète : anglais courant, vie en communauté, autonomie loin de ses repères. |
| 2025 | Voiturier · hôtel cinq étoiles | Le service client au plus haut niveau d'exigence : ponctualité, discrétion, sang-froid. |
| 2025 – 2026 | Pré-MSc · Epitech Rennes | Une pédagogie par projets, en équipe : web full stack, temps réel, DevOps, IA et data. Projets de l'année : EpitChat, JOJA, Robocar (voiture autonome en simulateur). |
| 2026 – 2028 | Master of Science · Epitech Rennes | En cours, promo 2028. Time Manager, à cinq. |
| depuis 2025 | Développeur full stack en alternance · SCR Informatique | *(Mon choix, à relire)* « Développement d'applications web, de l'interface à l'API, au sein d'une équipe produit. » Rien d'interne à SCR. |
| depuis 2026 | Indépendant · applications métier et sites vitrines | Conçus, développés et hébergés de A à Z : le site d'un électricien-plombier, une application de suivi des marchés de travaux. Lien « Voir les réalisations → ». |

**Robocar** n'a pas de bloc : Augustin y a peu contribué, et une grande vidéo suivie d'une réponse vague en
entretien desservirait la page. Il n'est cité que dans la ligne Pré-MSc, ce qui reste exact.

## Vidéos et graphiques

- **Tournage par Claude**, à partir de copies des projets dans un dossier temporaire (jamais dans
  `~/Documents/Projets/epitech/`), lancées avec leur `docker-compose.yml` et des **données fictives**.
  - Time Manager : un pointage d'arrivée et de départ, puis le tableau de bord.
  - EpitChat : deux utilisateurs dans deux fenêtres côte à côte, un message envoyé qui apparaît en direct chez
    l'autre.
- **Format** : de 10 à 30 secondes, muettes, en boucle, sans curseur parasite ni données réelles. Encodage web
  léger (par exemple AV1 ou VP9 en WebM avec repli MP4/H.264) ; chaque vidéo accompagnée d'une image d'attente
  (poster) aux dimensions de la vidéo, pour ne provoquer aucun décalage de mise en page.
- **Chargement** : rien avant que la vidéo approche de l'écran ; le poster s'affiche en attendant. Lecture
  automatique en boucle quand elle est visible, pause hors de l'écran. Avec mouvement réduit : poster seul, la
  vidéo démarre seulement si on clique.
- **Accessibilité** : chaque vidéo a une description textuelle de ce qu'elle montre (pour les lecteurs d'écran) ;
  elle est décorative par rapport au texte du bloc, qui se suffit à lui-même.
- **JOJA** : pas de vidéo ; deux ou trois graphiques choisis parmi les 24 du notebook principal
  (`02_joja_eda.ipynb`), exportés en images optimisées, avec un texte alternatif qui dit ce que montre chaque
  graphique.
- Les fichiers vont dans `public/` (dossier dédié à la page). *(Mon choix)* Un contrôle de taille, sur le modèle
  des `verifier-taille-*` existants, plafonne le poids total des médias de la page (limite à fixer par le
  constructeur après encodage, autour de quelques Mo).

## Où trouver la page

- Menu du haut : « À propos », à côté de Réalisations, Coulisses et Contact. *(Mon choix)* Ordre : Réalisations,
  À propos, Coulisses, Contact. Le menu doit tenir sur une ligne à 360 px de large (sous le nom du site, qui
  passe déjà au-dessus sur téléphone) : resserrer l'espacement des liens sous 40 rem si besoin.
- Pied de page, colonne Site.
- Palette de commandes Ctrl+K (`data/commandes.ts`).
- Accueil : un lien « Tout mon parcours → » au bas de la section Parcours (lien simple, sans JavaScript).
- Plan du site (`app/sitemap.ts`), titre et description de page, image d'aperçu de partage (comme
  `app/realisations/opengraph-image.tsx`).

## Tests attendus

- Unitaires : contenus de `data/` (ordre des projets, chaque projet a une « Ma part », pas de Robocar en bloc,
  étapes du parcours dans l'ordre chronologique), composants (structure des blocs, alternance, vidéo avec poster
  et description), entrées du menu, du pied de page et de la palette.
- e2e : la page s'affiche sur ordinateur et téléphone ; aucune vidéo chargée avant d'approcher de l'écran ; avec
  mouvement réduit, aucune vidéo ne joue seule ; les liens vers `/realisations` arrivent à la bonne étude ;
  `/a-propos` ajoutée aux listes de pages des e2e existants (liens externes…).
- Lighthouse avec `/a-propos` dans les URL ; contrôle de taille des médias dans la CI.

## Laissé au constructeur

- Le découpage exact des composants et des données, les noms.
- Les encodages, résolutions et débits des vidéos, dans les limites ci-dessus.
- Le choix des graphiques de JOJA (les plus lisibles en petit).
- Le détail de l'alternance des blocs aux tailles intermédiaires (tablette).
