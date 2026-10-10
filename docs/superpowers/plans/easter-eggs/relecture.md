# Relecture groupée (une conversation par groupe)

Trois relectures, plutôt que deux relecteurs après chaque tâche. Chacune lit **le diff du groupe dans un fichier**, pas l'historique des conversations.

## Préparer (toi)

`DEPART` est le commit noté avant la première conversation du groupe (voir `LISEZMOI.md`).

```bash
git log --oneline DEPART..HEAD
git diff DEPART..HEAD > /tmp/eggs-groupe-N.diff
wc -l /tmp/eggs-groupe-N.diff
```

## Message à donner au relecteur (niveau high, sans « fast »)

> Tu relis, sans rien modifier, le travail du groupe N des easter eggs. Lis `docs/superpowers/plans/easter-eggs/contexte.md`, les fiches FICHES (même dossier), puis le diff `/tmp/eggs-groupe-N.diff`. Voici les comptes rendus des agents : COMPTES RENDUS.
>
> Vérifie :
> 1. Le diff reprend le code des fiches à l'identique, et rien d'autre.
> 2. Aucun test n'est affaibli (seuil relevé, assertion retirée, règle désactivée) ; les tests demandés par les fiches existent.
> 3. Les points à surveiller ci-dessous pour ce groupe.
> 4. Règles de `contexte.md` : rôles de la charte seulement, pas d'opacité sur une couleur, insécables en `\u00a0`, français, aucun nom de client ou d'employeur.
>
> Tu peux lancer des tests ciblés avec `./docs/superpowers/plans/easter-eggs/court.sh`, mais ni `pnpm e2e` complet ni Lighthouse.

Ou donne-moi simplement les comptes rendus : je fais la relecture moi-même.

## Groupe 1 — tâches 01 à 04 (le CV)

**Fiches :** `tache-01.md` à `tache-04.md`.

**À surveiller :**
- Le bandeau ASCII est recopié à l'identique (barres obliques inverses doublées dans le code).
- Aucune ligne du CV ne dépasse 80 colonnes, couleurs exclues ; sans couleur, aucun octet ESC.
- Les trois routes sont `○` au build, l'accueil reste prérendu (`verifier-accueil-statique`).
- Le motif du User-Agent est identique dans le `matcher` de `proxy.ts` et dans `lib/cv/client-terminal.ts` (test), et la réécriture vers `/cv.ansi` passe **avant** la logique `?pour=`.
- `/api/me` : `Access-Control-Allow-Origin: *`, `Cache-Control: public, max-age=3600` ; aucune entreprise nommée, aucune date de poste.

## Groupe 2 — tâches 05 à 08 (la palette)

**Fiches :** `tache-05.md` à `tache-08.md`.

**À surveiller :**
- La palette (`PaletteCommandes.tsx`) n'importe rien de `data/`, et `RaccourciCommandes.tsx` ne l'importe que par `import()`.
- `verifier-taille-commandes` : un seul morceau marqué, hors des scripts de l'accueil, 8 Ko au plus (2,2 Ko attendus).
- Le budget Lighthouse est à 168 960 octets, et seulement lui a changé dans `lighthouserc.json`.
- Les deux e2e existants modifiés (`liens.spec.ts`, `admin.spec.ts`) ne changent que de sélecteur (`main code`).
- Le combobox : `aria-controls` seulement quand la liste existe, `aria-activedescendant` sur l'option choisie.

## Groupe 3 — tâche 09 (commandes ludiques)

**Fiche :** `tache-09.md`.

**À surveiller :**
- Intro : canvas neuf à chaque tour (`key={tour}`), relance à l'image suivante, effet de l'intro dépendant de `[mode, tour]`.
- Curseur : `data-presence` sur le bouton, écouteur réinscrit à chaque rendu (pas de `[]`).
- Coulisses : `?vue=3d` ouvre la 3D une seule fois (`vueDemandee`), seulement avec WebGL ; la seule exception de lint est commentée.
- Les e2e WebGL ont tourné sur ordinateur (pas ignorés).

**À regarder toi-même :** voir `verification-finale.md`, section 3.
