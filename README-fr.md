<div align="center">

<img src="docs/assets/logo-readme.svg" alt="ABNCMS" width="520">

**Un CMS léger, gratuit, open source et ultra-rapide à l'échelle mondiale**

**A free, open-source, globally fast lightweight CMS — built for Cloudflare's free tier.**

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Powered%20by-Cloudflare%20Workers-f6821f.svg)](https://workers.cloudflare.com/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/baiyirui/abncms/pulls)

[官网 Website](https://cms.abn.cn) · [开发手册 Docs](https://cms.abn.cn/docs.html) · [在线演示 Demo](https://abncms.883663.xyz) · [GitHub](https://github.com/baiyirui/abncms) · [邮箱 Email](mailto:a@abn.cn)

<br/>

**🌐 Langues / Languages**

[Chinois simplifié](README.md) · [Anglais](README-en.md) · [Japonais](README-ja.md) · [Coréen](README-ko.md) · [Espagnol](README-es.md) · [Français](README-fr.md) · [Allemand](README-de.md) · [Portugais](README-pt.md) · [Russe](README-ru.md)

</div>

---

## 🌱 Pourquoi ce projet

Nous voulons créer un système de gestion de contenus qui appartienne **vraiment à chacun**.

Créer un site web impliquait autrefois une succession d'obstacles : acheter un serveur, configurer une base de données, payer chaque mois, surveiller les correctifs de sécurité et reconstruire le site à chaque modification. Or, pour un blogueur individuel, une petite équipe ou un site de ressources, dont le contenu change peu souvent, cela revient à payer à long terme pour une infrastructure lourde et surdimensionnée.

Parallèlement, l'offre gratuite de Cloudflare est aujourd'hui assez puissante pour héberger de vrais sites : réseau mondial en périphérie, base de données D1, KV, HTTPS gratuit et protection DDoS. Mais il nous manquait un CMS open source **pensé pour le quota gratuit tout en conservant une expérience d'écriture visuelle avec back-office** : un site statique est rapide, mais il faut le reconstruire à chaque changement ; un site dynamique est flexible, mais il coûte un serveur.

**ABNCMS est né pour combler ce vide :**

> N'importe qui, avec un compte Cloudflare gratuit, peut disposer d'un site accéléré dans le monde entier, sans maintenance, avec un back-office et un contenu modifiable à tout moment — et ce, entièrement gratuitement et en open source.

C'est aussi pour cela que nous avons traduit la documentation : l'esprit de l'open source consiste à **permettre à chacun, partout dans le monde, d'utiliser, de comprendre et d'améliorer le projet sur un pied d'égalité**. La langue ne devrait pas être un obstacle.

---

## ✨ Atouts principaux

### 1. Vraiment zéro coût
Tout fonctionne dans le cadre du plan gratuit de Cloudflare : **aucun serveur, aucune carte bancaire requise**. D1, KV, Worker et AI rentrent dans le quota gratuit ; la seule dépendance de production est `hono`.

### 2. Accélération globale dès la conception
Les pages sont mises en cache sur les **300+ nœuds de bord** de Cloudflare à travers le monde : chaque visiteur accède depuis le point le plus proche, avec la même fluidité dans toutes les régions. Certificat HTTPS et protection DDoS inclus gratuitement.

### 3. Un back-office, des mises à jour à tout moment
Contrairement aux sites purement statiques, inutile de reconstruire le projet. Rédigez vos articles, téléversez vos images et modifiez les réglages dans le **back-office visuel** : le frontend se met à jour immédiatement. Après publication, vous gardez le contrôle total.

### 4. Cache edge ultrarapide
En cas de hit du cache de page : **0 requête vers la base de données, 0 lecture/écriture KV**, et le HTML complet est renvoyé directement. Lors d'une publication ou d'une modification, seule la génération de cache `cache_gen` est incrémentée de +1 : l'ancien cache est invalidé instantanément et tout le site se met à jour en quelques secondes, sans nettoyage page par page.

### 5. Léger et consommation maîtrisée
Le back-office permet d'activer ou de désactiver séparément le cache des pages, les articles populaires, les lectures associées, la recherche sémantique, les résumés IA, les commentaires et les statistiques de visites. Un petit site peut tout réduire d'un clic à « HTML en cache + quelques lectures » pour dépenser le quota gratuit là où cela compte vraiment.

### 6. Optimisé pour le SEO et sécurisé
URL pseudo-statiques `/p/{slug}.html` + redirections 301 des anciens liens, RSS, Sitemap et données structurées JSON-LD ; mots de passe PBKDF2, sessions KV, vérification de même origine, limitation des tentatives échouées, jetons chiffrés en AES-GCM et SQL entièrement paramétré.

### 7. Vos données vous appartiennent, sans verrouillage
Export et import de sauvegardes complètes : vos données restent les vôtres. Code open source sous licence MIT : forkez-le, modifiez-le ou déployez-le en privé sans restriction.

---

## 💰 Le quota gratuit, dépensé à bon escient

| Ressource | Quota gratuit | Optimisation d'ABNCMS |
|---|---|---|
| Workers | 100 000 requêtes / jour | Réponse directe via le cache edge, rendu léger |
| Base de données D1 | 5 millions de lectures / 100 000 écritures | 0 requête avec cache, ≤ 5 sans cache ; les listes passent toujours par un index |
| KV | 100 000 lectures / 1 000 écritures | Le HTML des pages va dans l'API Cache, **sans consommer le quota d'écriture KV** |
| Workers AI | 10 000 neurons / jour | Résumés, étiquettes et recherche sémantique désactivés par défaut, à activer au besoin |

> Lors d'une visite anonyme avec hit du cache : **0 requête D1, 0 lecture/écriture KV** — la vitesse d'un site statique avec la capacité de mise à jour « à tout moment » d'un site dynamique.

---

## 🚀 Démarrage rapide

Du clonage à la mise en ligne, quelques commandes suffisent. Un compte Cloudflare gratuit est tout ce qu'il faut pour commencer.

```bash
# 1. Cloner le projet et s'y rendre
git clone https://github.com/baiyirui/abncms.git && cd abncms

# 2. Installer les dépendances
npm install

# 3. Préparer la configuration (renseigner account_id / D1 / KV ID)
cp wrangler.example.jsonc wrangler.jsonc
cp .dev.vars.example .dev.vars

# 4. Initialiser la base de données locale et démarrer
npm run db:local
npx wrangler d1 execute cf-press-db --local --file=./seed.sql
npm run dev          # → http://127.0.0.1:8787

# 5. Déployer sur le réseau mondial de bord de Cloudflare
npx wrangler login
python scripts/setup_remote.py    # Crée automatiquement D1 / KV / Vectorize et renseigne les ID
npm run db:remote
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

Après le déploiement, le back-office est à `/admin/login`. Connectez-vous la première fois avec l'`ADMIN_PASSWORD` défini dans `.dev.vars`, puis changez immédiatement le mot de passe. Procédure détaillée dans le [guide de développement complet](https://cms.abn.cn/docs.html).

---

## 🧩 Fonctionnalités

- **Front-end** : bannière d'accueil, flux d'articles (`/p/{slug}.html`), pages indépendantes, catégories / étiquettes / archives, recherche plein texte, rendu Markdown, article précédent et suivant, lectures associées, commentaires, RSS / Sitemap / JSON-LD, barre latérale responsive
- **Back-office** : protection de la connexion (PBKDF2 + session KV + limitation des tentatives + Turnstile), gestion des articles et des pages, éditeur Markdown à deux panneaux, configuration visuelle du token d'hébergement d'images, téléversement du logo du site, code de statistiques tiers, menu de navigation, liens amis, médiathèque, modération des commentaires, export/import de sauvegardes complètes, paramètres du site
- **Cron** : nettoyage quotidien à 03:00 UTC des détails de visite expirés et des commentaires indésirables

Outre le rendu principal, la plupart des fonctionnalités du front-end peuvent être activées ou désactivées depuis le back-office.

---

## 📁 Structure du projet

```
abncms/
├── src/
│   ├── index.ts           # Toutes les routes + Cron + stratégie de cache
│   ├── lib/               # db / auth / crypto / imgbed / markdown / ai / util
│   └── views/             # layout / front / admin
├── public/                # Ressources statiques : admin.js, favicon, robots.txt
├── scripts/               # setup_remote / migrate / smoke_test
├── migrations/            # Migrations SQL incrémentales (idempotentes)
├── schema.sql             # Création des tables pour une installation neuve
├── seed.sql               # Données d'exemple
└── wrangler.example.jsonc # Modèle de configuration
```

---

## 🔗 Liens utiles

| Projet | Adresse |
|---|---|
| Site officiel | https://cms.abn.cn |
| Guide de développement (chinois) | https://cms.abn.cn/docs.html |
| Documentation (EN) | https://cms.abn.cn/docs-en.html |
| Démo en ligne | https://abncms.883663.xyz |
| Code source GitHub | https://github.com/baiyirui/abncms |
| Signaler un problème | https://github.com/baiyirui/abncms/issues |
| Adresse de contact | a@abn.cn |

---

## 📄 Licence

[MIT](LICENSE) sous licence open source. L'utilisation du nom et du logo est décrite dans [TRADEMARK.md](TRADEMARK.md).

Si ABNCMS vous a été utile, n'hésitez pas à ⭐ le dépôt ou à ouvrir une Issue / une PR pour l'améliorer. L'open source est plus fort grâce à vous.
