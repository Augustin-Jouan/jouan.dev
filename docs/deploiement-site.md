# Déployer un site vitrine sur le VPS mutualisé

La recette « une fois par site », dans l'ordre, avec les commandes exactes.
L'installation du serveur lui-même (Coolify, GHCR, SSH, pare-feu) est faite
une fois pour toutes et documentée dans le dépôt du premier site hébergé,
`docs/runbook-serveur-et-deploiement.md`, partie A.

Aucun secret ici : les tokens et mots de passe sont dans Bitwarden.

## Le principe

Le VPS ne compile rien. GitHub Actions teste, construit l'image Docker et la
publie sur GHCR ; Coolify, sur le VPS, tire l'image et remplace le conteneur.
Un VPS-1 (2 vCores, 4 Go) suffit pour plusieurs sites : Coolify coûte
~600 Mo fixes, chaque site ~40 Mo.

```
push sur main → GitHub Actions (tests, build, publie) → GHCR
                       └── webhook POST ──────────────→ Coolify → pull → conteneur
visiteur → DNS → Traefik (HTTPS) → conteneur:3000
```

## 1. Le dépôt

Dans `.github/workflows/ci.yml`, bloc `env` :

- `SITE_URL` : l'URL finale du site (figée dans les pages au build :
  canonical, sitemap, JSON-LD).
- `IMAGE` : `ghcr.io/augustin-jouan/<nom-en-minuscules>` (GHCR impose les
  minuscules).

Les trois jobs : `verifier` (lint, types, tests, build), `image`
(construit ; sur `main` publie sur GHCR), `deployer` (sur `main`, appelle
le webhook Coolify si les secrets existent, sinon saute l'étape).

Premier push sur `main` : l'image est publiée, le job `deployer` affiche
« Secrets Coolify absents », c'est attendu.

## 2. DNS

Entrée **A** `<sous-domaine>` → IP du VPS, dans la zone du domaine concerné
(prévisualisation sur `jouan.dev`, puis domaine du client à la bascule).

Vérifier avant d'aller plus loin — en interrogeant directement le serveur
OVH, ce qui élimine la propagation comme explication :

```bash
dig +short <sous-domaine>.jouan.dev @dns111.ovh.net
```

Si rien ne sort, l'entrée n'existe pas (faute de frappe, assistant fermé
avant validation).

## 3. La ressource dans Coolify

Projects → projet → Production → **+ New Resource** → **Docker Image** :
`ghcr.io/augustin-jouan/<nom>:latest`.

Onglet General :

- **Domains** : `https://<sous-domaine>.jouan.dev` — avec `https://`,
  c'est ce qui déclenche le certificat et la redirection HTTP → HTTPS.
- **Ports Exposes** : `3000` — pas 80, la valeur par défaut. Avec 80,
  Traefik répond 503.
- Renommer l'application (le nom généré est `docker-image-<uuid>`).

Onglet Environment Variables, toutes en runtime (aucune *build variable*) :
`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
`CONTACT_FROM`, `CONTACT_TO`. Voir `.env.example`.

**Save**, puis **Deploy**. Les logs doivent montrer « Rolling update
completed ».

Vérification :

```bash
curl -sI https://<sous-domaine>.jouan.dev/ | head -1
```

Attendu `HTTP/2 200`. Puis un envoi de test via le formulaire de contact.

## 4. Redéploiement automatique

1. L'UUID de la ressource est dans l'URL du navigateur
   (`…/application/<uuid>`) et dans le nom généré.
2. Coolify → Keys & Tokens → API Tokens → *New token*, permission
   **deploy** uniquement. Le coller nulle part ailleurs que dans GitHub.
3. Test depuis la machine locale (l'endpoint est en **POST**) :

```bash
curl -s -X POST -H "Authorization: Bearer <token>" "https://coolify.jouan.dev/api/v1/deploy?uuid=<uuid>&force=false"
```

Attendu : `deployment queued`. `Unauthenticated` = token mal collé
(chevrons ou espaces en trop).

4. GitHub → dépôt → Settings → Secrets and variables → Actions → Secrets :
   - `COOLIFY_WEBHOOK_URL` = `https://coolify.jouan.dev/api/v1/deploy?uuid=<uuid>&force=false`
   - `COOLIFY_TOKEN` = le token
5. Un push sur `main` (ou *Re-run all jobs*) : le job `deployer` doit
   afficher `deployment queued`, et Coolify redéployer seul.

## 5. Mesure d'audience

Créer le site dans Umami Cloud, puis variable de dépôt GitHub (onglet
*Variables*, pas *Secrets*) : `UMAMI_WEBSITE_ID`. Absente, le script n'est
pas injecté. La créer seulement quand le déploiement mesuré est celui-ci.

## 6. Bascule sur le domaine du client

Le jour où l'on a accès à la zone DNS du client (≈ 15 min de manipulation,
plus la propagation) :

1. Si possible quelques jours avant : abaisser le TTL des entrées à 300 s.
2. Zone DNS : entrées **A** `@` et `www` → IP du VPS. Ne pas toucher aux MX.
3. Coolify → Domains : `https://www.<domaine>,https://<domaine>`, redirection
   *non-www → www*. Save, Redeploy.
4. GitHub → variable `UMAMI_WEBSITE_ID`, puis *Re-run*.
5. Retirer le sous-domaine de prévisualisation de la liste des domaines.
6. Éteindre un éventuel déploiement de prévisualisation ailleurs (Vercel…).
7. Search Console (déclarer le sitemap), fiche Google Business.

Rien à changer dans le code : `SITE_URL` vaut déjà l'URL finale.

## Pièges connus

| Symptôme | Cause | Remède |
| --- | --- | --- |
| `dig` ne renvoie rien | Entrée DNS absente ou mal nommée | Interroger `@dns111.ovh.net` pour trancher propagation vs absence |
| Site en 503, certificat `TRAEFIK DEFAULT CERT` | Port exposé 80 au lieu de 3000, domaine en `http://` | Ports Exposes 3000, domaine en `https://` |
| `This endpoint has changed to a POST request` | Webhook appelé en GET | `--request POST` |
| `API access is turned off` | API Coolify désactivée | Settings → Advanced → API enabled |
| `Unauthenticated` sur le webhook | Token mal collé | Regénérer, coller sans chevrons ni espaces |
