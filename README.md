# ABNcms

> 面向 **Cloudflare Workers + D1 + 外部图床** 的免费开源轻量级 CMS。
> 零服务器、零托管费用、零运行时依赖（仅 Hono），全部能力落在 Cloudflare 免费计划内。

**当前状态**：v0.2 开发中 · 仓库私有 · [MIT](./LICENSE) · [商标声明](./TRADEMARK.md) · [完整产品策划](./ABNcms-PLAN.md)

---

## 一、系统介绍

### 1.1 它是什么

一个 Worker 进程完成前台 SSR、后台管理、API 与定时任务：内容存 D1，会话与缓存存 KV，图片上传到任意兼容图床并以外链引用，摘要与语义搜索由 Workers AI + Vectorize 提供。没有服务器、容器或数据库主机，`wrangler deploy` 一条命令上线。

借鉴 Z-Blog 的「小巧 + 主题/应用生态」思路，但不复制它的 PHP 模板、目录安装与账号支付体系 —— 详见[策划文档](./ABNcms-PLAN.md)。

### 1.2 架构

```
浏览器 ──► Cloudflare Worker（Hono SSR / 后台 / API / Cron）
              │  匿名访客先查边缘 Cache API 中的完整 HTML（键含 cache_gen 代数）
              │  ├─ 命中 → 直接返回，0 次 D1 / 0 次 KV
              │  └─ 未命中 → 读 D1 渲染 → 异步写入边缘缓存（不占 KV 额度）
          ├── D1        文章 · 页面 · 用户 · 分类 · 标签 · 评论 · 设置
          ├── KV        会话 · 设置 · 侧栏 · 限流 · **页面 HTML 缓存**
          ├── Workers AI + Vectorize   摘要 / 标签 / 语义搜索（默认关闭）
          └── 外部图床   POST /upload（Token 由 Worker 服务端注入）
```

### 1.3 免费额度的真实天花板

官方文档核实（2026-10-30 更新），所有日额度 UTC 00:00 重置：

| 资源 | 免费额度 | 设计含义 |
|---|---|---|
| Workers | 10 万请求/天，**10ms CPU/请求**，50 subrequests | 单次渲染要轻 |
| D1 | 500 万**行读**/天、10 万行写/天、5 GB | 按**扫描行数**计费，列表必走索引 |
| KV | 10 万读/天、**仅 1,000 写/天**、1 GB | 前台请求**禁止写 KV** |
| Workers AI | 每天 1 万 neurons | AI 功能可降级 |
| R2 | 10 GB/月 | 本项目不使用 |

**因此 ABNcms 的硬约束**：匿名页面命中边缘缓存时 **0 次 D1 查询、0 次 KV 读写**；未命中时 ≤5 次 D1 查询。页面 HTML 放 Cloudflare Cache API，**完全不占 KV 的 1,000 写/天额度**；KV 只留会话、设置（6 小时 TTL）、侧栏（6 小时 TTL）。所有可选消耗功能都有后台开关，小站长可一键降到「只缓存 HTML + 少量读」。

### 1.4 「发布后是不是就静态了？」

不生成静态文件，但**匿名访问的效果等价**：

| 场景 | 谁在响应 | Workers | D1 | KV |
|---|---|---|---|---|
| 匿名前台，页面缓存命中 | Worker 读边缘缓存直接返回 | 1 次（极轻） | **0** | **0** |
| 匿名前台，未命中 | Worker 回源渲染并异步写 KV | 1 次 | 几次读 | 1–2 读 + 1 写 |
| 关闭页面缓存 | 每次实时渲染 | 1 次 | 几次读 | 读设置/侧栏 |
| 后台 / 搜索 / 登录态 | Worker 动态处理 | 1 次 | 读写 | 读写 |

- 页面 HTML 存在 Cloudflare **Cache API**（不占 KV 额度），缓存键 = 完整 URL（含 `?page=` 分页参数）+ `cache_gen` 代数，TTL 7 天。**发布、改文、删文、改评论、改分类、改设置时只把 `cache_gen` +1**（1 次 D1 写），旧缓存立即不再命中，全站页面下一秒就是新内容 —— 不需要 purge，也不用逐页删除。用完整 URL 做键还顺带修好了分页串页问题。
- 排障时可看响应头 `x-abn-cache: HIT / MISS`，直接判断本次是否命中边缘缓存。
- 文章正式地址是伪静态 **`/p/{slug}.html`**；旧的 `/p/{slug}` 会 301 跳到新地址，保留历史收录。RSS / Sitemap / 前台所有内链均已同步。
- **登录态一律 `no-store`**，草稿与后台不进缓存；404 页也带 `<!--nocache-->` 标记不会被缓存，避免错误内容供给 7 天。
- **新建文章默认「正式发布」**，保存后首页立即可见；只有主动选「草稿」才会隐藏。后端也以「非草稿即发布」为准，避免漏传字段导致文章前台不显示。
- 浏览量由前端 25% 采样 beacon → `POST /api/hit` → 权重 ×4 聚合写 D1；后台可一键关闭，关闭后前台零写入。该数字是估算值，不是精确计费指标。
- **推荐用第三方统计替代内置打点**：后台「设置 → 第三方统计代码」粘贴百度统计 / GA / Umami 的完整 script，代码原样注入前台底部，与内置统计互不依赖。关掉内置统计后，统计这部分对本站 D1 / KV 的消耗为 **0**。
- 后台「设置 → 功能开关」可分别关闭：页面缓存、侧栏热门、相关阅读、上下篇、语义搜索（Vectorize）、AI 摘要标签，以及评论、访问统计。关闭后对应 D1/KV 查询或写入**根本不执行**。小站长建议只保留页面缓存 + 热门文章。

### 1.5 功能一览

**前台**：首页大横幅、文章流（`/p/{slug}.html` 伪静态）、独立页面（`/page/{slug}.html`）、自定义导航、分类/标签/归档、全文搜索、Markdown 渲染、AI 摘要、上下篇、相关阅读、评论、RSS / Sitemap / JSON-LD、两栏侧栏（含友情链接） —— **除核心渲染外全部可后台开关**。默认 LOGO 为「图标 + 站名」内联样式，改站名自动同步。

**后台**：登录（PBKDF2 + KV 会话 + 限流 + Turnstile）、文章 CRUD、Markdown 双栏编辑器、AI 摘要标签、**图床地址与 Token 可视化配置**、**站点 LOGO 上传**、**第三方统计代码**、**独立页面管理**、**导航菜单配置**、**友情链接管理**、**全量导出/导入备份**、媒体库、分类、评论审核、站点设置、修改密码、概览面板。

**Cron**：每日 UTC 03:00 清理 30 天前访问明细与 90 天前垃圾评论、写入一条心跳。设置/侧栏靠 6 小时 TTL 与发布时的主动失效，不再每天多删两次缓存。

---

## 二、代码介绍

### 2.1 目录

```
abncms/
├── src/
│   ├── index.ts              # 全部路由 + Cron + 缓存策略
│   ├── types.ts              # Env / SiteSettings / 数据类型
│   ├── lib/
│   │   ├── db.ts             # D1 访问层、站点设置读写
│   │   ├── auth.ts           # 密码哈希、会话、限流、Turnstile
│   │   ├── crypto.ts         # AES-GCM：后台写入的敏感配置加解密
│   │   ├── imgbed.ts         # 图床代理：上传 / 删除 / 连通性测试
│   │   ├── markdown.ts       # 零依赖 Markdown 渲染（转义防 XSS）
│   │   ├── ai.ts             # Workers AI + Vectorize
│   │   └── util.ts           # slug / 分页 / Cookie / 转义
│   └── views/                # layout.ts / front.ts / admin.ts
├── public/                   # admin.js、banner.svg、favicon.svg、robots.txt
├── scripts/                  # setup_remote.py / migrate.py / smoke_test.py
├── migrations/               # 增量迁移 SQL（按版本登记，幂等）
├── examples/gexiong-seed.sql # 首个 Demo 站点（格熊）的示例数据
├── schema.sql                # 全新安装：幂等建表 + 版本基线
├── seed.sql                  # 中性示例数据
├── wrangler.example.jsonc    # 配置模板
├── ABNcms-PLAN.md            # 产品策划与路线图
└── LICENSE / TRADEMARK.md
```

### 2.2 配置优先级：图床与 LOGO

Cloudflare 的 Secret / 环境变量是**部署时绑定、write-only、运行时不可改**。要让后台能改图床，Token 只能落库：

```
后台 D1（AES-GCM 加密）  >  wrangler vars / Secret  >  未配置
```

- 主密钥 `CONFIG_ENCRYPTION_KEY` 用 `wrangler secret put` 注入，**不入库、页面不回显**
- 后台设置页只显示 Token 后 4 位掩码；输入框留空 = 不修改；可「清除并回退到环境变量」
- 「测试连接」调图床 `GET /api/channels`，不上传测试图
- 未配置主密钥时降级为「仅环境变量模式」，后台只能改地址
- LOGO 复用 `/api/upload` 走图床，不引入 R2；推荐显示高 32–40px、2x 源图 64–80px、宽 ≤200px、SVG 优先

### 2.3 典型链路

**发文**：`POST /admin/post/*` → 同源校验 → Markdown 渲染 → upsert `posts` / `post_tags` → （仅开启语义搜索时）更新向量索引 → `bumpCacheGen()` 递增代数，前台缓存即时失效。

**传图**：`POST /api/upload`（FormData `file` + 可选 `channel`）→ Worker 注入 `Authorization: Bearer` → 图床 `/upload` → 外链写入 `media.key` → 返回 URL 插入编辑器。

**匿名读文章**：Worker 读 `settings:v1` → 用「完整 URL + cache_gen」查 Cache API → 命中直接返回（0 次 D1、0 次 KV）；未命中则查 D1 渲染并 `waitUntil` 写边缘缓存。渲染路径无 D1 写，浏览量由页面 beacon 单独打到 `/api/hit`。

### 2.4 技术栈

TypeScript 严格模式 · Cloudflare Workers（V8 isolate，非 Node）· Hono 路由 · Wrangler 内置 esbuild · 生产依赖仅 `hono`。

```bash
npm run typecheck     # tsc --noEmit
npm run build         # dry-run 产物到 dist/
```

---

## 三、搭建环境介绍

### 3.1 环境要求

| 项 | 要求 |
|---|---|
| Node.js | 20+（推荐 22 LTS） |
| Python | 3.8+（仅辅助脚本与冒烟测试，纯标准库） |
| Cloudflare 账号 | **免费计划即可，无需绑卡** |
| Wrangler | devDependency 自带，`npx wrangler` |
| workers.dev 子域 | 需在控制台预先注册一次（OAuth 登录态无法用 API 创建） |

### 3.2 本地开发

```bash
git clone <repo> abncms && cd abncms
cp wrangler.example.jsonc wrangler.jsonc   # 填 account_id / D1 / KV ID
cp .dev.vars.example .dev.vars             # 设置初始管理员密码
npm install
npm run db:local
npx wrangler d1 execute cf-press-db --local --file=./seed.sql
npm run dev                                # http://127.0.0.1:8787
npm run typecheck
SMOKE_ADMIN_USER=admin SMOKE_ADMIN_PASS='你的密码' \
  python scripts/smoke_test.py http://127.0.0.1:8787
```

### 3.3 部署

```bash
npx wrangler login
python scripts/setup_remote.py             # 自动建 D1 / KV / Vectorize 并写回 ID
npm run db:remote                          # 全新库：直接建表
npm run db:seed                            # 可选

# 从旧版 cf-press 升级（线上已有数据）时不要重跑 schema.sql 覆盖后台设置，
# 改用增量迁移：只补齐缺失 key，绝不覆盖已修改过的站名 / 密码 / Token。
python scripts/migrate.py                  # 或 npm run db:migrate

npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put CONFIG_ENCRYPTION_KEY   # 32 字节随机串，后台改 Token 用
npx wrangler secret put IMGBED_TOKEN            # 可选：环境变量模式下的图床 Token

npm run deploy
```

部署后把 `wrangler.jsonc` 的 `SITE_URL` 改成真实地址，再 `npm run deploy` 一次。

### 3.4 环境变量与 Secrets

| 名称 | 位置 | 作用 |
|---|---|---|
| `account_id` / `database_id` / `kv id` | `wrangler.jsonc`（不入库） | 资源绑定 |
| `SITE_NAME` / `SITE_DESCRIPTION` / `SITE_URL` | `vars` | 站点信息，后台可改 |
| `TURNSTILE_SITE_KEY` | `vars` | 与后台 Secret **成对替换** |
| `IMGBED_BASE_URL` / `IMGBED_TOKEN_NAME` | `vars` | 环境变量模式的图床配置 |
| `ADMIN_PASSWORD` | Secret | 仅首次初始化管理员 |
| `CONFIG_ENCRYPTION_KEY` | Secret | 加密后台写入的 Token |
| `IMGBED_TOKEN` | Secret | 环境变量模式的图床 Token |
| `site_logo` / `imgbed_*` | D1 `settings` | 后台维护（Token 为密文） |

图床接口约定：`POST /upload`，`Authorization: Bearer <TOKEN>`，字段 `file`，支持 `returnFormat=full`、`responseFormat=object`、`uploadChannel=s3|huggingface`；删除 `POST /api/manage/delete/{fileId}`。

### 3.5 排错速查

| 现象 | 处理 |
|---|---|
| Turnstile 显示成功却提示未通过 | Site Key 与 Secret 必须成对替换；任一侧是测试密钥时代码会放行 |
| 后台改不了图床 Token | 未配置 `CONFIG_ENCRYPTION_KEY`，当前是「仅环境变量模式」 |
| 图片上传报「图床未配置」 | 后台「设置 → 图床接入」填地址与 Token，或设置 `IMGBED_TOKEN` Secret |
| 站名回退成默认值 | `settings` 缺键或 D1 异常时回落；进后台保存一次即可 |
| 改了文章前台没立刻变 | 确认已部署 v0.2.1+；保存文章会自动递增 `cache_gen`，若仍为旧内容是浏览器缓存，按 Ctrl+F5 硬刷新 |
| 改了站名 / LOGO / 设置，前台没立刻变 | 设置保存同样会递增缓存代数；如仍为旧内容，执行 `wrangler kv key delete settings:v1 --binding=KV --remote` |
| 阅读量不动或跳得快 | 统计是 25% 采样 ×4 聚合的估算值；建议关掉内置统计，改用后台「第三方统计代码」 |
| 升级后后台缺 LOGO / 图床设置 | 旧库需跑 `python scripts/migrate.py` 补齐设置项 |
| 子域注册失败 `10405` | 去 Cloudflare 控制台手动注册一次 `*.workers.dev` 子域 |

### 3.6 安全

- 密码 PBKDF2-SHA256 加盐哈希；会话 Cookie `HttpOnly` + `SameSite=Lax` + HTTPS 下 `Secure`，7 天
- 后台写操作校验登录态与同源 Origin；登录有同 IP 失败限流
- Markdown 输出全转义、SQL 全参数化绑定
- 图床 Token：AES-GCM 加密落库、页面掩码、不进日志、导出备份时排除
- `/api/hit` 校验同源 Origin、站内路径白名单与权重上限；统计为采样估算、可被伪造，不作为业务 / 计费依据
- `wrangler.jsonc`、`.dev.vars` 与临时诊断文件均在 `.gitignore`

---

## 路线图

| 版本 | 内容 |
|---|---|
| **v0.2** | 图床/LOGO 后台化、品牌中性化、CDN 缓存与写入聚合、迁移框架 |
| **v0.2.1** | `.html` 伪静态 + 旧链接 301、`cache_gen` 即时失效、6 项额度开关 |
| **v0.2.2** | 新建文章默认正式发布、页面 HTML 迁至 Cache API（零 KV 写）、设置/侧栏 TTL 6 小时、修复分页串页 |
| **v0.2.3** | 第三方统计代码、默认「图标 + 站名」LOGO、演示站内容重做与多篇示范文章 |
| **v0.2.4** | 恢复首页横幅与封面、RSS/Sitemap 缓存、导出导入备份、独立页面与导航菜单、友情链接模块 |
| **v0.2.5** | 参考格熊调整页面宽度与顶栏、描边字标 LOGO（ABNCMS）、顶部分类菜单可后台一键生成 |
| **v0.2.6** | 修复顶部分类菜单 slug 不匹配导致的 404；默认 LOGO 改为橙灰双色实心斜切字标（无描边） |
| **v0.2.7** | 默认 LOGO 改为 Quicksand（OFL 免费商用）圆润字体字标，ABN 橙 / CMS 灰，字形转路径不依赖字体文件 |
| v0.3 | 独立页面、导航菜单、定时发布、URL 规则、导入导出备份 |
| v0.4 | 声明式主题引擎、切换与预览、默认主题 Aurora |
| v0.5 | 白名单 Hook、静态索引商店、一键安装 |
| v0.9 → v1.0 | 开源清理、CI、文档站、Demo 站、正式转公开 |

完整论证（差异化、免费额度预算、主题/商店设计、数据模型、风险）见 [ABNcms-PLAN.md](./ABNcms-PLAN.md)。

## 许可证

[MIT](./LICENSE) · 名称与 Logo 的使用见 [TRADEMARK.md](./TRADEMARK.md)。
