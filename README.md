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
浏览器 ──► Cloudflare CDN 缓存（匿名页面命中时直接返回，Worker 不执行）
              │ 未命中
              ▼
        Cloudflare Worker（Hono SSR / 后台 / API / Cron）
          ├── D1        文章 · 页面 · 用户 · 分类 · 标签 · 评论 · 设置
          ├── KV        会话 · 设置缓存 · 侧栏缓存 · 限流
          ├── Workers AI + Vectorize   摘要 / 标签 / 语义搜索
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

**因此 ABNcms 的硬约束**：匿名页面走 CDN 缓存；CDN 未命中时单次前台请求 ≤5 次 D1 查询、≤2 次 KV 读。KV 写只发生在低频回源（设置缓存 1 小时、侧栏缓存 30 分钟各最多 1 次）与后台操作，正常浏览路径 **0 次 KV 写、0 次 D1 写**。

### 1.4 「发布后是不是就静态了？」

不生成静态文件，但**匿名访问的效果等价**：

| 场景 | 谁在响应 | Workers | D1 | KV |
|---|---|---|---|---|
| 匿名前台，CDN 命中 | Cloudflare 边缘缓存 | 0 | 0 | 0 |
| 匿名前台，CDN 未命中 | Worker 回源渲染 | 1 次 | 几次读 | 1–2 次读 |
| 后台 / 搜索 / 评论 / 登录态 | Worker 动态处理 | 1 次 | 读写 | 读写 |

- 匿名页面响应带 `Cache-Control: public, max-age=0, s-maxage=<TTL>, stale-while-revalidate=<N>`，TTL 按页面类型 120–1800 秒（首页 120s、文章 600s、标签云 1800s）；过期后先回旧内容再后台刷新，避免回源尖峰。
- **登录态一律 `private, no-store`**：既不串号，也保证草稿不会被缓存后泄露给匿名访客。
- 免费版 `workers.dev` 无法主动 purge CDN，所以发布/改文后靠 TTL 自然过期；后台编辑器的「查看（绕过缓存）」用 `?t=<时间戳>` 强制回源。绑定自定义域名后可在 Cloudflare 控制台手动清缓存。
- 浏览量不再由渲染请求写库（CDN 命中时 Worker 根本不执行）。改为前端 25% 采样 beacon → `POST /api/hit` → 服务端权重 ×4 聚合，单次最多 2 行 D1 写；后台「设置 → 开启访问统计」可一键关闭，关闭后前台即为**零写入纯静态供给**。该数字是估算值，不是精确计费指标。

### 1.5 功能一览

**前台**：文章流、分类/标签/归档、全文 + 语义搜索、Markdown 渲染、AI 摘要、上下篇、相关阅读、评论、RSS / Sitemap / JSON-LD、两栏侧栏 widget。

**后台**：登录（PBKDF2 + KV 会话 + 限流 + Turnstile）、文章 CRUD、Markdown 双栏编辑器、AI 摘要标签、**图床地址与 Token 可视化配置**、**站点 LOGO 上传**、媒体库、分类、评论审核、站点设置、修改密码、概览面板。

**Cron**：每日 UTC 03:00 清理 30 天前访问明细与 90 天前垃圾评论、刷新设置与侧栏缓存、写入心跳。

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

**发文**：`POST /admin/post/*` → 同源校验 → Markdown 渲染 → upsert `posts` / `post_tags` → 更新向量索引 → 清侧栏 KV 缓存（页面 HTML 由 CDN TTL 兜底）。

**传图**：`POST /api/upload`（FormData `file` + 可选 `channel`）→ Worker 注入 `Authorization: Bearer` → 图床 `/upload` → 外链写入 `media.key` → 返回 URL 插入编辑器。

**匿名读文章**：CDN 命中直接返回（0 后端消耗）；未命中时 Worker 读站点设置 / 侧栏 KV 缓存 → 查 D1 → 渲染 HTML → 输出 CDN 缓存头。整条渲染路径**无任何写操作**，浏览量由页面里的 beacon 单独打到 `/api/hit`。

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
| 改了站名 / LOGO / 设置，前台没立刻变 | CDN 按 TTL 过期；编辑器点「查看（绕过缓存）」，或绑定自定义域名后在控制台清缓存 |
| 阅读量不动或跳得快 | 统计是 25% 采样 ×4 聚合的估算值；后台「开启访问统计」可关闭 |
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
| v0.3 | 独立页面、导航菜单、定时发布、URL 规则、导入导出备份 |
| v0.4 | 声明式主题引擎、切换与预览、默认主题 Aurora |
| v0.5 | 白名单 Hook、静态索引商店、一键安装 |
| v0.9 → v1.0 | 开源清理、CI、文档站、Demo 站、正式转公开 |

完整论证（差异化、免费额度预算、主题/商店设计、数据模型、风险）见 [ABNcms-PLAN.md](./ABNcms-PLAN.md)。

## 许可证

[MIT](./LICENSE) · 名称与 Logo 的使用见 [TRADEMARK.md](./TRADEMARK.md)。
