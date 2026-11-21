<div align="center">

<img src="docs/assets/logo-readme.svg" alt="ABNCMS" width="520">

**免费、开源、全球极速的轻量内容管理系统**

**A free, open-source, globally fast lightweight CMS — built for Cloudflare's free tier.**

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Powered%20by-Cloudflare%20Workers-f6821f.svg)](https://workers.cloudflare.com/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/baiyirui/abncms/pulls)

[官网 Website](https://cms.abn.cn) · [开发手册 Docs](https://cms.abn.cn/docs.html) · [在线演示 Demo](https://abncms.eu.cc) · [GitHub](https://github.com/baiyirui/abncms) · [邮箱 Email](mailto:a@abn.cn)

<br/>

**🌐 多语言 / Languages**

[简体中文](README.md) · [English](README-en.md) · [日本語](README-ja.md) · [한국어](README-ko.md) · [Español](README-es.md) · [Français](README-fr.md) · [Deutsch](README-de.md) · [Português](README-pt.md) · [Русский](README-ru.md)

</div>

---

## 🌱 创作初衷

我们想做一个**真正属于每个人**的内容系统。

建一个网站，过去总要面对一串难题：买服务器、配数据库、按月付费、担心安全补丁、改一次内容就要重新构建……而对个人博主、小团队和资源站来说，这些内容更新的频率并不高，却要为一套重型基础设施长期买单。

与此同时，Cloudflare 的免费计划已经强大到可以承载真实网站——全球边缘网络、D1 数据库、KV、免费 HTTPS 与 DDoS 防护。但我们发现，缺少一个**真正围绕「免费额度」设计、同时又保留可视化后台写作体验**的开源 CMS：静态站够快却每次改内容都要重新构建，动态站够灵活却要花钱养服务器。

**ABNCMS 就是为了填这个空缺而生**：

> 让任何人用 Cloudflare 免费账号，就能拥有一个全球加速、零运维、有后台、内容随时可更新的网站——而且完全免费、完全开源。

这也是我们把文档做成多语言的原因：开源的精神在于**让世界上每个角落的人都能平等地使用、理解和改进它**。语言不该是门槛。

---

## ✨ 核心优势

### 1. 真正零成本
全部运行在 Cloudflare 免费计划内，**无需服务器、无需绑卡**。D1、KV、Worker、AI 都在免费额度内；生产依赖只有一个 `hono`。

### 2. 生来全球加速
页面缓存在 Cloudflare **300+ 全球边缘节点**，访客就近访问，跨地域同样流畅。免费自带 HTTPS 证书与 DDoS 防护。

### 3. 有后台，随时更新
不像纯静态站需要重新构建。**可视化后台**写文章、传图片、改设置，保存后前台立即更新——发布之后依然完全可控。

### 4. 边缘缓存极速
命中页面缓存时 **0 次数据库查询、0 次 KV 读写**，直接返回完整 HTML。发布或改文时只把缓存代数 `cache_gen` +1，旧缓存立即失效，全站秒级更新，无需逐页清理。

### 5. 轻量且消耗可控
后台可分别开关页面缓存、热门文章、相关阅读、语义搜索、AI 摘要、评论、访问统计等。小站可一键降到「只缓存 HTML + 少量读」，把免费额度花在刀刃上。

### 6. SEO 友好且安全
伪静态 `/p/{slug}.html` + 旧链接 301、RSS、Sitemap、JSON-LD 结构化数据；PBKDF2 密码、KV 会话、同源校验、失败限流、AES-GCM 加密 Token、SQL 全参数化。

### 7. 数据可带走，不被锁定
全量导出 / 导入备份，数据属于你自己。MIT 协议开源，可自由Fork、改造、私有部署。

---

## 💰 免费额度，花在刀刃上

| 资源 | 免费额度 | ABNCMS 的优化 |
|---|---|---|
| Workers | 10 万请求 / 天 | 边缘缓存直接返回，渲染保持轻量 |
| D1 数据库 | 500 万行读 / 10 万行写 | 命中缓存 0 查询，未命中 ≤ 5 次，列表必走索引 |
| KV | 10 万读 / 1,000 写 | 页面 HTML 放 Cache API，**不占 KV 写额度** |
| Workers AI | 1 万 neurons / 天 | 摘要、标签、语义搜索默认关闭，按需开启 |

> 匿名访问命中缓存时：**0 次 D1 查询、0 次 KV 读写**——兼具静态站的速度与动态站的「随时可更新」。

---

## 🚀 快速开始

从克隆到上线只需几条命令，Cloudflare 免费账号即可开始。

```bash
# 1. 克隆并进入项目
git clone https://github.com/baiyirui/abncms.git && cd abncms

# 2. 安装依赖
npm install

# 3. 准备配置（填入 account_id / D1 / KV ID）
cp wrangler.example.jsonc wrangler.jsonc
cp .dev.vars.example .dev.vars

# 4. 初始化本地数据库并启动
npm run db:local
npx wrangler d1 execute cf-press-db --local --file=./seed.sql
npm run dev          # → http://127.0.0.1:8787

# 5. 部署到 Cloudflare 全球边缘
npx wrangler login
python scripts/setup_remote.py    # 自动创建 D1 / KV / Vectorize 并回写 ID
npm run db:remote
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

部署后后台地址是 `/admin/login`；用 `.dev.vars` 中的 `ADMIN_PASSWORD` 首次登录，登录后请立即修改密码。详细步骤见[完整开发手册](https://cms.abn.cn/docs.html)。

---

## 🧩 功能一览

- **前台**：首页横幅、文章流（`/p/{slug}.html`）、独立页面、分类 / 标签 / 归档、全文搜索、Markdown 渲染、上下篇、相关阅读、评论、RSS / Sitemap / JSON-LD、响应式侧栏
- **后台**：登录保护（PBKDF2 + KV 会话 + 限流 + Turnstile）、文章与页面管理、双栏 Markdown 编辑器、图床 Token 可视化配置、站点 LOGO 上传、第三方统计代码、导航菜单、友情链接、媒体库、评论审核、全量备份导出导入、站点设置
- **Cron**：每日 UTC 03:00 清理过期访问明细与垃圾评论

除核心渲染外，绝大多数前台能力都可在后台开关。

---

## 📁 目录结构

```
abncms/
├── src/
│   ├── index.ts           # 全部路由 + Cron + 缓存策略
│   ├── lib/               # db / auth / crypto / imgbed / markdown / ai / util
│   └── views/             # layout / front / admin
├── public/                # 静态资源：admin.js、favicon、robots.txt
├── scripts/               # setup_remote / migrate / smoke_test
├── migrations/            # 增量迁移 SQL（幂等）
├── schema.sql             # 全新安装建表
├── seed.sql               # 示例数据
└── wrangler.example.jsonc # 配置模板
```

---

## 🔗 相关链接

| 项目 | 地址 |
|---|---|
| 产品官网 | https://cms.abn.cn |
| 开发手册（中文） | https://cms.abn.cn/docs.html |
| Documentation (EN) | https://cms.abn.cn/docs-en.html |
| 在线演示 | https://abncms.eu.cc |
| GitHub 源码 | https://github.com/baiyirui/abncms |
| 问题反馈 | https://github.com/baiyirui/abncms/issues |
| 联系邮箱 | a@abn.cn |

---

## 📄 许可证

[MIT](LICENSE) 开源。名称与 Logo 的使用见 [TRADEMARK.md](TRADEMARK.md)。

如果 ABNCMS 帮到了你，欢迎给仓库一个 ⭐，或提交 Issue / PR 一起把它做得更好。开源因你而不同。
