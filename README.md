# 格熊 CMS（gexiong_cms）

> 一套跑在 Cloudflare 边缘网络上的 Serverless 内容发布系统。单 Worker 进程完成前台 SSR、后台管理、API 与定时任务，**不需要服务器、容器或数据库主机**，全部能力落在 Cloudflare 免费计划内。
>
> 仓库当前为 **私有**，待功能完善后再决定是否公开。

---

## 一、系统介绍

### 1.1 定位与外观

本项目最初为格熊风格内容站（免费商用资源、字体、AI 工具、数码技巧、生活妙招）迁移而设计，因此前台采用格熊式版式：

- 顶部横幅 + **两栏布局**：左侧列表式文章流，右侧固定侧栏（热门文章 / 分类目录 / 热门标签）
- 六个内容栏目：`mfzy` 免费资源、`ztzy` 字体资源、`gjjq` 工具技巧、`rmzx` 热门资讯、`shmz` 生活妙招、`jyfx` 经验分享
- 文章条目含缩略图、标题、摘要、分类、作者、日期、阅读量、置顶标记；居中分页
- 站名、描述、关键词、页脚均可在后台「设置」里改，不写死在模板中

### 1.2 技术架构

```
浏览器
  │
  ├─ 页面请求 ──► Cloudflare Worker（Hono SSR）
  │                 ├─ D1        文章 / 用户 / 分类 / 标签 / 评论 / 设置 / 统计
  │                 ├─ KV        会话 / 页面缓存 / 侧栏缓存 / 失败限流
  │                 ├─ Workers AI  摘要、标签、文本向量
  │                 ├─ Vectorize   语义检索索引
  │                 ├─ ASSETS      CSS / JS / SVG 静态资源
  │                 └─ Cron        每日缓存重建与数据清理
  │
  └─ 上传图片 ──► POST /api/upload（本站，需登录）
                      │  Worker 服务端注入 Authorization: Bearer <TOKEN>
                      ▼
                   外部图床 POST /upload  ──► 返回完整外链 URL
                      │
                      └─ URL 存入 D1 media.key，前台直接引用外链
```

**关键取舍：图片不走 Cloudflare R2。** 上传由 Worker 代理转发到外部图床（兼容 CloudFlare-ImgBed / 自建图床 API），Token 只保存在 Cloudflare Secret 里，绝不下发浏览器。`media.key` 存的是完整外链 URL；`/media/*` 路由仅为历史 R2 记录保留兼容读取。

### 1.3 用到的 Cloudflare 能力

| 服务 | 用途 | 免费额度 |
|---|---|---|
| Workers | 全站 SSR、路由、API、定时任务 | 10 万次请求 / 天 |
| D1 | 关系数据（SQLite + FTS5 全文检索） | 5 GB 存储 |
| KV | 登录会话、页面/侧栏缓存、配置缓存、登录失败限流 | 10 万次读 / 天 |
| Workers AI | AI 摘要、自动标签、bge-m3 向量化 | 每日 1 万 neurons |
| Vectorize | 1024 维语义搜索索引 | 免费层索引 |
| Static Assets | 静态资源边缘分发 | 随 Workers |
| Turnstile | 登录 / 评论人机验证（无感） | 免费 |
| Cron Triggers | 每日 UTC 03:00 清理与缓存重建 | 免费 |
| Workers Logs | 可观测性 | 免费额度内 |

> 未使用 Durable Objects / Queues / Images，这些需要 Workers 付费计划。

### 1.4 数据模型（`schema.sql`）

| 表 | 内容 |
|---|---|
| `users` | 管理员账号（PBKDF2 加盐哈希） |
| `categories` / `tags` | 栏目与标签 |
| `posts` | 文章主体（Markdown + 渲染后 HTML、封面、摘要、AI 摘要、状态、置顶、阅读量） |
| `post_tags` | 文章与标签多对多 |
| `comments` | 评论及审核状态 |
| `media` | 媒体记录（`key` 为图床完整外链，或历史 R2 key） |
| `settings` | 站点设置键值对 |
| `page_views` | 访问明细（供统计与定时清理） |
| `posts_fts` | FTS5 虚拟表，全文检索 |

`schema.sql` 全部使用 `CREATE TABLE IF NOT EXISTS` / `INSERT OR IGNORE`，可重复执行。

### 1.5 功能清单

**前台**
- 首页文章流、分类页、标签页、归档页（按年份分组）、全站搜索
- 文章详情：Markdown 渲染、AI 摘要、上下篇导航、相关阅读、JSON-LD 结构化数据
- 搜索先走 D1 FTS5，命中不足时用 Workers AI + Vectorize 语义匹配兜底
- RSS `/feed.xml`、Sitemap `/sitemap.xml`、`robots.txt`
- 评论区（Turnstile 防机器人）

**后台 `/admin`**
- 登录：PBKDF2 校验 + KV 会话 + 同 IP 失败限流 + Turnstile
- 文章 CRUD：Markdown 双栏编辑器、实时预览、草稿/发布、置顶、分类、标签
- AI 一键生成摘要与标签
- 媒体库：上传到外部图床，可选渠道（Backblaze B2 / HuggingFace）、复制链接、删除
- 分类管理、评论审核、站点设置、修改密码
- 概览面板：发布数 / 草稿 / 评论 / 阅读量 + 各服务绑定状态

**定时任务**（每日 UTC 03:00）
- 清理 30 天前访问明细、90 天前垃圾评论、刷新缓存、写入心跳

---

## 二、代码介绍

### 2.1 目录结构

```
gexiong_cms/
├── src/
│   ├── index.ts              # 全部路由（前台 / 后台 / API）+ Cron 入口
│   ├── types.ts              # Env 绑定类型与核心数据结构
│   ├── lib/
│   │   ├── db.ts             # D1 数据访问层、站点设置读写、统计
│   │   ├── auth.ts           # PBKDF2 哈希、KV 会话、失败限流、Turnstile 校验
│   │   ├── imgbed.ts         # 外部图床代理：上传 / 删除 / URL 解析
│   │   ├── markdown.ts       # 零依赖 Markdown 渲染器（输出前转义，防 XSS）
│   │   ├── ai.ts             # Workers AI 摘要与标签 + Vectorize 向量读写
│   │   └── util.ts           # slug、分页、Cookie、HTML 转义、客户端 IP
│   └── views/
│       ├── layout.ts         # 全站 CSS、页面骨架、登录页
│       ├── front.ts          # 前台页面模板 + 右侧栏三个 widget
│       └── admin.ts          # 后台全部页面模板
├── public/
│   ├── admin.js              # 后台交互：预览 / AI / 上传 / 复制
│   ├── banner.svg            # 首页横幅
│   ├── favicon.svg
│   └── robots.txt
├── scripts/
│   ├── setup_remote.py       # 自动创建远程 D1 / KV / Vectorize 并写回配置
│   └── smoke_test.py         # 端到端冒烟测试（纯标准库）
├── schema.sql                # 建表 + 格熊栏目/设置初始化（幂等）
├── seed.sql                  # 两篇演示文章（可重复执行）
├── wrangler.example.jsonc    # 配置模板（提交进仓库）
├── wrangler.jsonc            # 本地真实配置（含账号 ID，已被 .gitignore 忽略）
├── .dev.vars.example         # 本地环境变量模板
└── package.json
```

### 2.2 模块职责与设计要点

| 模块 | 关键设计 |
|---|---|
| `index.ts` | 单文件集中全部 ~45 条路由；`guard` 中间件统一校验会话；`S(c)` 从上下文取站点设置；`side(env)` 聚合侧栏数据并缓存到 KV 5 分钟，文章/分类变更时主动失效 |
| `db.ts` | 所有 SQL 集中在此；`getSettings()` 先读 KV（60s），未命中回源 D1，D1 异常时回落到代码内默认值；`saveSettings()` 批量 upsert 并清缓存 |
| `auth.ts` | PBKDF2-SHA256 / 5000 次（受免费计划 10ms CPU 限制）；会话写 `session:<token>` 到 KV，7 天过期；`verifyTurnstile()` 只要 Site Key 或 Secret 任一侧是测试/空密钥即放行，**避免测试 Site Key 配真实 Secret 把后台锁死** |
| `imgbed.ts` | 前端只 POST 本站 `/api/upload`，Worker 用 Secret 注入 `Authorization: Bearer` 后转发图床 `/upload`；请求带 `returnFormat=full&responseFormat=object`，可选 `uploadChannel=s3\|huggingface`；返回值兼容数组/对象多种结构；删除走 `POST /api/manage/delete/{fileId}` |
| `markdown.ts` | 自己实现的轻量渲染器，不引第三方依赖；所有用户输入先 HTML 转义再渲染，杜绝 XSS |
| `ai.ts` | 摘要/标签用 `@cf/meta/llama-3.2-3b-instruct`，向量用 `@cf/baai/bge-m3`（1024 维）；AI 不可用时优雅降级，不影响发布 |
| `views/*.ts` | 纯函数返回 HTML 字符串，无客户端框架；`layout.ts` 的 `page()` 根据是否传 `sidebar` 决定单栏/两栏布局 |

### 2.3 路由一览

| 分组 | 路由 |
|---|---|
| 前台页面 | `/`、`/archive`、`/c/:slug`、`/t/:slug`、`/tags`、`/search`、`/p/:slug` |
| 前台输出 | `/feed.xml`、`/sitemap.xml`、`/media/*`（历史 R2 兼容） |
| 认证 | `GET/POST /admin/login`、`GET /admin/logout` |
| 后台页面 | `/admin`、`/admin/posts`、`/admin/post/new`、`/admin/post/:id`、`/admin/categories`、`/admin/comments`、`/admin/media`、`/admin/settings` |
| 后台写操作 | `/admin/post/*`、`/admin/category/*`、`/admin/comment/*`、`/admin/media/:id/delete`、`/admin/settings`、`/admin/password` |
| API | `/api/preview`、`/api/ai/summary-tags`、`/api/upload`、`/api/health` |
| 其他 | `POST /comment`、Cron `scheduled` 处理器 |

### 2.4 典型请求链路

**发文章**：`POST /admin/post/*` → 校验会话与同源 → Markdown 渲染为 HTML → upsert `posts` / `post_tags` → 更新 FTS 索引 → 清页面缓存与 `side:v1` 侧栏缓存 →（可选）写 Vectorize 向量。

**传图片**：编辑器选文件 → `POST /api/upload`（FormData `file` + 可选 `channel`）→ Worker 读 `IMGBED_TOKEN` → 转发图床 → 拿回外链 → 写入 `media` 表 → 返回 `{url, key, channel}` → 前端把 `url` 插入 Markdown，封面为空时自动填充。

**登录**：`POST /admin/login` → 失败限流检查 → 确保管理员存在 → Turnstile 校验 → PBKDF2 校验密码 → 创建 KV 会话 → 下发 `sid` Cookie（HttpOnly + SameSite=Lax + HTTPS 下 Secure）→ 跳转 `/admin`。

### 2.5 技术栈与构建

- **语言**：TypeScript（严格模式），运行时 Cloudflare Workers（V8 isolate，非 Node.js）
- **框架**：Hono（仅用路由与上下文，无前端框架）
- **零运行时依赖**：除 `hono` 外无生产依赖；Markdown、Cookie、分页等全部自实现
- **构建**：Wrangler 内置 esbuild，`npm run deploy` 一步打包上传
- **校验**：`npm run typecheck`（`tsc --noEmit`）、`npm run build`（dry-run 产物到 `dist/`）

---

## 三、搭建环境介绍

### 3.1 环境与工具要求

| 项 | 要求 | 说明 |
|---|---|---|
| Node.js | 20+（推荐 22 LTS） | Wrangler 4.x 运行环境 |
| npm | 随 Node 附带 | 安装依赖 |
| Python | 3.8+ | 仅用于 `setup_remote.py` 与 `smoke_test.py`，均为标准库、无需 pip 安装 |
| Git | 任意近期版本 | 克隆仓库 |
| Cloudflare 账号 | **免费计划即可，无需绑卡** | 需先完成 `wrangler login` |
| Wrangler | 由 `npx wrangler` 提供 | 已列为 devDependency，无需全局安装 |
| 外部图床（可选） | 兼容 CloudFlare-ImgBed API | 不配置则除图片上传外功能全部可用 |

> **workers.dev 子域名**：账号需在 Cloudflare 控制台预先注册一个 `*.workers.dev` 子域名。OAuth 登录态无法用 API 创建子域名（会返回 `10405 Method not allowed for this authentication scheme`），首次请在控制台点一次即可，之后 `wrangler deploy` 会直接使用。

### 3.2 本地开发（从零到可访问）

```bash
git clone <your-private-repo-url> gexiong_cms
cd gexiong_cms

# 1) 配置：模板已提交，真实配置不进仓库
cp wrangler.example.jsonc wrangler.jsonc
#    编辑 wrangler.jsonc 填入 account_id / D1 database_id / KV id / SITE_URL / 图床地址
#    或者直接跑 `python scripts/setup_remote.py` 让它自动创建资源并写回 ID

# 2) 安装依赖
npm install

# 3) 本地数据库（Wrangler 会在 .wrangler/ 下建本地 SQLite）
npm run db:local
npx wrangler d1 execute cf-press-db --local --file=./seed.sql

# 4) 本地变量：复制模板并设置初始管理员密码
cp .dev.vars.example .dev.vars
#    编辑 .dev.vars 里的 ADMIN_PASSWORD

# 5) 启动
npm run dev            # http://127.0.0.1:8787
```

本地验收：

```bash
npm run typecheck
SMOKE_ADMIN_USER=admin SMOKE_ADMIN_PASS='你的密码' \
  python scripts/smoke_test.py http://127.0.0.1:8787
```

首次登录时若 `users` 表为空，系统会用 `ADMIN_PASSWORD` 自动创建 `admin` 账号；**登录后请立刻在「设置 → 修改密码」改掉**。

### 3.3 部署到 Cloudflare（生产）

```bash
npx wrangler login

# 1) 创建远程资源（二选一）
#    A. 自动：读 wrangler.jsonc，创建 D1 / KV / Vectorize 并把 ID 写回
python scripts/setup_remote.py

#    B. 手动：
npx wrangler d1 create cf-press-db
npx wrangler kv namespace create cf-press-cache
npx wrangler vectorize create cf-press-posts --dimensions=1024 --metric=cosine
#       把返回的 ID 分别填进 wrangler.jsonc 的 database_id / id

# 2) 初始化数据库
npm run db:remote
npm run db:seed                # 演示文章，正式站点可跳过

# 3) 注入密钥（不会写进任何文件）
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put IMGBED_TOKEN      # 外部图床 API Token，可选

# 4) 部署
npm run deploy
```

部署成功后把 `wrangler.jsonc` 的 `SITE_URL` 改成返回的 `https://<name>.<subdomain>.workers.dev`（或自定义域名），再 `npm run deploy` 一次，Sitemap / RSS / 结构化数据里的绝对链接才会正确。

### 3.4 环境变量与 Secrets 对照

| 名称 | 位置 | 作用 |
|---|---|---|
| `account_id` / `database_id` / `kv id` | `wrangler.jsonc` | 绑定 Cloudflare 资源（不提交仓库） |
| `SITE_NAME` / `SITE_DESCRIPTION` / `SITE_URL` | `vars` | 站点基础信息，也可在后台设置里改 |
| `TURNSTILE_SITE_KEY` | `vars` | 前端 widget 的 Site Key |
| `AI_*` / `ENABLE_AI` / `ENABLE_VECTORIZE` | `vars` | AI 模型与开关 |
| `IMGBED_BASE_URL` / `IMGBED_TOKEN_NAME` | `vars` | 外部图床地址与 Token 名称（展示用） |
| `ADMIN_PASSWORD` | **Secret** | 仅首次初始化管理员时用 |
| `IMGBED_TOKEN` | **Secret** | 图床 API Token，Worker 服务端注入，绝不下发浏览器 |
| `turnstile_secret` | D1 `settings` 表 | 后台「设置」页维护的 Turnstile Secret |

外部图床接口约定：`POST /upload`，`Authorization: Bearer <TOKEN>`，FormData 字段 `file`，支持 `returnFormat=full`、`responseFormat=object` 与 `uploadChannel=s3|huggingface`；删除为 `POST /api/manage/delete/{fileId}`。

### 3.5 常见问题

| 现象 | 原因与处理 |
|---|---|
| Turnstile 显示「成功」但提示「人机验证未通过」 | Site Key 与 Secret **必须成对替换**。模板里两边都是官方测试密钥（始终通过）；只填一侧真实密钥就会错配。代码已做防锁死：任一侧为测试密钥即放行 |
| 站名回退成默认值 | `settings` 表缺键或 D1 查询异常时会用代码默认值。检查后台「设置」并保存一次，必要时重跑 `schema.sql` |
| 后台上传报「图床未配置」 | 未设置 `IMGBED_TOKEN` Secret，或 `IMGBED_BASE_URL` 为空。补齐后重新 `npm run deploy` |
| 登录报 500 / 超时 | 免费计划单次请求 CPU 10ms；PBKDF2 迭代数在 `src/lib/auth.ts`，如确需调整请同步重新生成密码哈希 |
| 子域名注册失败 `10405` | OAuth 登录态不支持该 API，去 Cloudflare 控制台手动注册一次 `*.workers.dev` 子域 |
| AI 摘要/语义搜索不生效 | 免费额度耗尽或 Vectorize 索引未创建；功能会降级，不影响发文 |

### 3.6 安全说明

- 密码 PBKDF2-SHA256 加盐哈希（5000 次迭代），会话 Cookie `HttpOnly` + `SameSite=Lax` + HTTPS 下 `Secure`，有效期 7 天
- 后台所有写操作校验登录态与同源 Origin；登录有同 IP 失败限流
- Markdown 输出全部转义，防 XSS；SQL 一律参数化绑定
- 图床 Token 只存 Cloudflare Secret，前端源码与页面 HTML 中都不会出现
- `wrangler.jsonc`、`.dev.vars`、`_*.sql` 等临时诊断文件均在 `.gitignore` 中，**推送前请再确认一次**
- 默认 Turnstile 为官方测试密钥，正式对外前请成对换成真实密钥并加强口令

---

## 仓库状态

- 私有仓库 `gexiong_cms`，仅用于版本管理与持续迭代
- 后续待办：热门文章迁移、图片上传生产验收、可选启用真实 Turnstile
- 若将来转公开，请先全文复查配置、账号 ID 与任何示例凭证
