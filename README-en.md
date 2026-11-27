<div align="center">

<img src="docs/assets/logo-readme.svg" alt="ABNCMS" width="520">

**Free, open-source, blazing-fast lightweight CMS**

**A free, open-source, globally fast lightweight CMS — built for Cloudflare's free tier.**

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Powered%20by-Cloudflare%20Workers-f6821f.svg)](https://workers.cloudflare.com/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/baiyirui/abncms/pulls)

[Website](https://cms.abn.cn) · [Docs](https://cms.abn.cn/docs.html) · [Live Demo](https://abncms.883663.xyz) · [GitHub](https://github.com/baiyirui/abncms) · [Email](mailto:a@abn.cn)

<br/>

**🌐 多语言 / Languages**

[简体中文](README.md) · [English](README-en.md) · [日本語](README-ja.md) · [한국어](README-ko.md) · [Español](README-es.md) · [Français](README-fr.md) · [Deutsch](README-de.md) · [Português](README-pt.md) · [Русский](README-ru.md)

</div>

---

## 🌱 Why We Built It

We wanted to build a content system that **truly belongs to everyone**.

Building a website used to mean facing a string of hurdles: buying a server, setting up a database, paying month after month, worrying about security patches, and rebuilding the whole site every time you change a single piece of content. For personal bloggers, small teams, and resource sites, content isn't updated all that often — yet they end up paying for a heavyweight infrastructure in the long run.

At the same time, Cloudflare's free plan has become powerful enough to host real websites — a global edge network, the D1 database, KV, free HTTPS, and DDoS protection. But we noticed something missing: **an open-source CMS designed around the "free tier" while still preserving a visual, browser-based writing experience**. Static sites are fast but need a rebuild for every content change; dynamic sites are flexible but cost money to keep a server running.

**ABNCMS was born to fill that gap**:

> Let anyone with a free Cloudflare account have a globally accelerated, zero-maintenance website with a real admin backend and content that can be updated any time — completely free and completely open source.

That's also why we made the documentation multilingual: the spirit of open source is **letting people in every corner of the world use, understand, and improve it on equal terms**. Language should never be a barrier.

---

## ✨ Key Advantages

### 1. Truly Zero Cost
Everything runs within Cloudflare's free plan — **no server, no credit card required**. D1, KV, Workers, and AI all fit within the free quotas; the only production dependency is `hono`.

### 2. Globally Fast by Design
Pages are cached on Cloudflare's **300+ edge locations worldwide**, so visitors are served from the nearest node and the experience stays smooth across regions. HTTPS certificates and DDoS protection come free of charge.

### 3. A Real Backend, Always Updatable
Unlike pure static sites that require a rebuild, ABNCMS gives you a **visual admin panel** to write posts, upload images, and change settings — the front end updates instantly on save. You stay fully in control even after publishing.

### 4. Blazing-Fast Edge Caching
On a page-cache hit there are **zero database queries and zero KV reads/writes** — the complete HTML is returned directly. Publishing or editing simply bumps the cache generation `cache_gen` by 1, instantly invalidating stale caches and refreshing the whole site in seconds, with no per-page purging.

### 5. Lightweight, with Predictable Usage
The admin panel lets you toggle page caching, popular posts, related reading, semantic search, AI summaries, comments, view statistics, and more independently. Small sites can drop to "HTML caching plus minimal reads" with one click, spending the free quota where it matters most.

### 6. SEO-Friendly and Secure
Pretty URLs `/p/{slug}.html` with 301 redirects for old links, RSS, Sitemap, and JSON-LD structured data; PBKDF2 passwords, KV sessions, same-origin checks, rate limiting on failures, AES-GCM encrypted tokens, and fully parameterized SQL.

### 7. Your Data, No Lock-In
Full backup export and import — your data belongs to you. Open sourced under the MIT license, free to fork, adapt, and self-host.

---

## 💰 Free Quotas, Spent Where It Counts

| Resource | Free quota | How ABNCMS optimizes |
|---|---|---|
| Workers | 100,000 requests / day | Edge cache returns directly, rendering stays lightweight |
| D1 Database | 5M rows read / 100K rows written | 0 queries on a cache hit, ≤ 5 on a miss, lists always use indexes |
| KV | 100K reads / 1,000 writes | Page HTML goes to the Cache API, **no KV write quota consumed** |
| Workers AI | 10,000 neurons / day | Summaries, tags, and semantic search are off by default — enable on demand |

> On an anonymous cache hit: **0 D1 queries, 0 KV reads/writes** — the speed of a static site with the "always updatable" flexibility of a dynamic one.

---

## 🚀 Quick Start

From clone to launch takes only a few commands, and a free Cloudflare account is all you need.

```bash
# 1. Clone and enter the project
git clone https://github.com/baiyirui/abncms.git && cd abncms

# 2. Install dependencies
npm install

# 3. Prepare config (fill in account_id / D1 / KV IDs)
cp wrangler.example.jsonc wrangler.jsonc
cp .dev.vars.example .dev.vars

# 4. Initialize the local database and start
npm run db:local
npx wrangler d1 execute cf-press-db --local --file=./seed.sql
npm run dev          # → http://127.0.0.1:8787

# 5. Deploy to Cloudflare's global edge
npx wrangler login
python scripts/setup_remote.py    # Auto-create D1 / KV / Vectorize and write back IDs
npm run db:remote
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

After deployment the admin panel lives at `/admin/login`; sign in for the first time with the `ADMIN_PASSWORD` from `.dev.vars`, then change it immediately. See the [full documentation](https://cms.abn.cn/docs.html) for detailed steps.

---

## 🧩 Feature Overview

- **Front end**: homepage banner, post stream (`/p/{slug}.html`), standalone pages, categories / tags / archives, full-text search, Markdown rendering, previous & next posts, related reading, comments, RSS / Sitemap / JSON-LD, responsive sidebar
- **Admin panel**: login protection (PBKDF2 + KV sessions + rate limiting + Turnstile), posts & pages management, two-column Markdown editor, visual image-hosting token setup, site logo upload, third-party analytics code, navigation menus, friend links, media library, comment moderation, full backup export/import, site settings
- **Cron**: daily cleanup of expired visit logs and spam comments at 03:00 UTC

Apart from core rendering, almost all front-end features can be switched on or off in the admin panel.

---

## 📁 Directory Structure

```
abncms/
├── src/
│   ├── index.ts           # All routes + Cron + cache strategy
│   ├── lib/               # db / auth / crypto / imgbed / markdown / ai / util
│   └── views/             # layout / front / admin
├── public/                # Static assets: admin.js, favicon, robots.txt
├── scripts/               # setup_remote / migrate / smoke_test
├── migrations/            # Incremental migrations SQL (idempotent)
├── schema.sql             # Create tables for a fresh install
├── seed.sql               # Sample data
└── wrangler.example.jsonc # Config template
```

---

## 🔗 Related Links

| Project | URL |
|---|---|
| Official Website | https://cms.abn.cn |
| Dev Manual (中文) | https://cms.abn.cn/docs.html |
| Documentation (EN) | https://cms.abn.cn/docs-en.html |
| Live Demo | https://abncms.883663.xyz |
| GitHub Source | https://github.com/baiyirui/abncms |
| Issue Tracker | https://github.com/baiyirui/abncms/issues |
| Contact Email | a@abn.cn |

---

## 📄 License

Open sourced under the [MIT](LICENSE) license. See [TRADEMARK.md](TRADEMARK.md) for use of the name and logo.

If ABNCMS has helped you, feel free to star the repository or open an Issue / PR to make it better together. Open source is better because of you.
