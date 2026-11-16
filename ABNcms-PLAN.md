# ABNcms 产品策划 · v0.1

> 面向 **Cloudflare Workers + D1 + 外部图床** 的免费开源轻量级 CMS。
> 本文是产品与技术方案，代码尚未改动；调研数据截至 2026-11-16。

---

## 0. 一句话定位

**零服务器、零运行时依赖、零托管费用**：一个 Worker 进程完成 SSR、后台、API 与定时任务，数据存 D1，图片存任意兼容图床，全部落在 Cloudflare 免费额度内。借鉴 Z-Blog 的"小巧 + 主题/应用生态"思路，但不复制它的 PHP 模板与桌面软件式安装体验。

---

## 1. 命名与开源建议

### 1.1 名称核查（真实结果）

| 位置 | 现状 | 判断 |
|---|---|---|
| GitHub 仓库 `abncms` | 已有 `aman5537jains/abncms`、`harikkadilara-sketch/abncms` 等无关小项目 | 不同账号下不冲突，但**搜索会混淆** |
| npm 包 `abncms` | 404（未占用） | ✅ 可占位 |
| 域名 `cms.abn.cn` | ABN.cn 主域在你手上 | ✅ 建议作为项目主页 |

### 1.2 建议

- **主品牌**：`ABNcms`（按你的指定，保持不变）
- **全称 / Slogan**：`ABN Cloud CMS` — *"A serverless CMS for the Cloudflare free tier"*
- **仓库名**：`abncms`（简洁），或 `abn-cms`（避开已有同名、可读性更好）。我倾向 **`abncms`** + 后续建 GitHub 组织 `abncms`，把 `abncms/core`、`abncms/marketplace`、`abncms/docs` 拆开
- **包名**：npm 上先占 `@abncms/core`（scope 比裸名更安全，也避免抢注）
- **默认主题名**：`Aurora` 或 `Paper`（**不要用"格熊"**）——开源项目的默认主题必须是中性的
- **项目主页**：`cms.abn.cn`，文档 `docs.abncms.dev` 或 GitHub Pages

### 1.3 License 与开源节奏

- **推荐 MIT**。同赛道的 Z-BlogPHP 也是 MIT（已核实）；MIT 对主题/插件商业化最友好，生态门槛最低
- 加一份 `TRADEMARK.md`：代码 MIT，但 **"ABNcms" 名称与 Logo 不随代码授权**，避免别人 fork 后同名发布
- 若担心专利或大厂白嫖，再考虑 Apache-2.0；**不要选 GPL**，会劝退主题作者
- 节奏建议：**私有迭代 → v0.9 公开预览（邀请测试）→ v1.0 正式开源**。不要现在转公开，先把品牌、示例数据、Secret、性能预算这几件事收干净

---

## 2. 定位与差异化

| 维度 | WordPress | Z-BlogPHP | Ghost | Halo | **ABNcms** |
|---|---|---|---|---|---|
| 运行基础 | PHP + MySQL 主机 | PHP + MySQL/SQLite | Node + 服务器 | Java + 服务器 | **Cloudflare Worker（无服务器）** |
| 月成本 | 主机费 | 主机费 | 主机费 | 主机费 | **0（免费额度内）** |
| 数据库 | MySQL | MySQL/SQLite/PG | MySQL/SQLite | MySQL/PG/H2 | **D1（边缘 SQLite）** |
| 图片 | 本地磁盘 | 本地磁盘 | 本地/对象存储 | 本地/对象存储 | **外部图床外链** |
| 扩展方式 | PHP 插件 | PHP 插件 + 应用中心 | Integrations | Java 插件 | **声明式主题 + 白名单 Hook** |
| 部署 | 上传文件 / 宝塔 | 上传文件 / 向导 | Docker | Docker | **`wrangler deploy` 一条命令** |
| 运维 | 需备份、补丁、防黑 | 同左 | 同左 | 同左 | **平台托管，无系统可打补丁** |

**目标用户**：个人博客、资源/导航站、文档站、小团队内容站；想白嫖免费额度、不想维护服务器、能接受 Cloudflare 生态的人。

**非目标用户**：需要多站点集群、复杂工作流审批、电商、会员付费、大流量门户、需要本地文件系统的场景。这些要明确写进 README 的"不做什么"，比功能清单更能守住轻量化。

---

## 3. 从 Z-Blog 借鉴什么、不照抄什么

Z-BlogPHP 的已核实特征：MIT 协议、21 年历史、支持 MySQL/SQLite/PG；**应用中心**一键下载主题与插件、在线安装/更新/校验；`.zba` 包后台上传；主题在 `zb_users/theme/`、插件在 `zb_users/plugin/`；独立页面、模块管理、伪静态、标签云、友情链接；官方与第三方主题/插件生态（含收费应用，官方抽成 25%）。

| 借鉴（精神） | 不照抄（实现） | 原因 |
|---|---|---|
| 应用中心：一键安装、在线更新、版本校验 | 不做账号体系 / 支付 / 抽成 | 轻量 + 免费开源，商店用 GitHub 索引仓库即可 |
| 主题与功能分离、后台自由切换 | 不做 PHP 式任意模板代码执行 | Worker 里 `eval` / 动态 import 不可行且不安全 |
| 丰富的插件接口 | 不做任意代码插件 | 改为**白名单事件 Hook + 数据注入**，安全边界清晰 |
| 独立页面、侧栏模块、伪静态 | 不做文件目录安装（上传 zip 解压到 `zb_users/`） | Worker 无持久文件系统 |
| 小巧、快速、符合国人习惯 | 不复制 UI 与文案、不复制主题资产 | 避免视觉与版权争议 |

一句话：**抄"生态组织方式"，不抄"运行机制"**。

---

## 4. 轻量化边界 —— 免费的真实天花板

以下为 2026-11-16 核实的官方额度（Cloudflare 文档 / 定价页），这是整套设计的硬约束：

| 资源 | 免费额度 | 隐藏陷阱 |
|---|---|---|
| Workers 请求 | 100,000 / 天（UTC 重置） | **10ms CPU / 请求**、50 subrequests / 请求 |
| D1 行读 | 5,000,000 / 天 | 按**扫描行数**计，不是返回行数；无索引的全表扫描会瞬间烧光 |
| D1 行写 | 100,000 / 天 | `INSERT/UPDATE/DELETE` 各算一行；索引列写入额外 +1 行 |
| D1 存储 | 5 GB 总量 / 10 个库 | 控制台与 Wrangler 里跑的查询**同样计费** |
| KV 读 | 100,000 / 天 | 读到不存在的 key 也算 |
| **KV 写** | **1,000 / 天** | **比请求数少 100 倍，最容易先撞墙** |
| KV 删除 / list | 各 1,000 / 天 | 单值上限 25 MiB |
| R2 | 10 GB / 月 | 本项目不用 |

### 由此定下的性能预算（必须写进 CONTRIBUTING）

| 指标 | 目标 |
|---|---|
| 单次前台 GET 的 D1 查询数 | ≤ 5 |
| 单次前台 GET 的 **KV 写入** | **0** |
| 单次前台 GET 的 KV 读 | ≤ 2 |
| 所有列表 / 筛选 / slug 查询 | 必须命中索引 |
| 页面缓存 TTL | ≥ 60s |
| HTML 响应体积 | < 100 KB |

### 当前代码里已经存在的额度隐患（他没想到的第 1 条）

- `GET /p/:slug` 每次访问都 `bumpViews()` 写 D1 + `recordView()` 插一行 `page_views` → **每个 PV 至少 2 行写**，按 10 万/天上限，5 万 PV 就到顶
- 每次文章渲染 `KV.put('page:post:*')` → **每个新 slug 一次 KV 写**，1,000/天就满
- 登录成功写 `session:*` 属低频，可接受

**改造方向**：阅读量与访问明细改为「KV 计数 + Cron 每 10 分钟批量落库」，页面缓存只在内容变更时失效而非每请求重建；`waitUntil` 只用于低频后台任务。这一项建议提到 v0.2 一起做，否则开源后第一个流量稍大的用户就会遇到 500。

---

## 5. 功能矩阵（优先级）

| 优先级 | 功能 | 说明 |
|---|---|---|
| **P0 / v0.2** | 图床地址与 Token 后台可配、LOGO 上传、品牌中性化 ABNcms、写入聚合、schema 迁移框架 | 本轮明确需求 |
| **P1 / v0.3** | 独立页面（Page）、导航菜单、定时发布、URL 规则（伪静态）、**全量导出/导入备份**、阅读量聚合 | 开源 CMS 的信任基础是"数据能带走" |
| **P1 / v0.4** | 主题引擎：声明式 `theme.json`、后台切换与预览、默认主题抽出、主题开发文档 | 生态第一步 |
| **P2 / v0.5** | 白名单 Hook、扩展索引、商店（静态索引 + 一键安装 + 校验） | 生态第二步 |
| **P2** | 多作者与最小权限（管理员/编辑/作者）、审计日志、评论反垃圾增强、SEO 细项 | 视反馈排期 |
| **不做** | 多站点/站群、支付、会员、页面构建器、图片转码、任意代码插件、Admin SPA 化 | 守住轻量 |

---

## 6. 本轮两个明确功能的技术方案

### 6.1 图床地址 + API Token 后台可配

**关键冲突**：Cloudflare 的 Secret / 环境变量是**部署时绑定、write-only、运行时不可修改**；改值必须重新部署（已核实）。所以"后台可填 Token"必须落库。

**推荐方案：加密落 D1 + 环境变量兜底，三级优先级**

```
后台 D1（加密）  >  KV（可选缓存）  >  wrangler vars / Secret（兼容现有部署）
```

- 主密钥：`CONFIG_ENCRYPTION_KEY`（32 字节，用 `wrangler secret put` 注入，**不入库、不可读**）
- 加密：AES-GCM，每次随机 12 字节 IV，密文 base64 存 `settings.imgbed_token_enc`
- 页面：**永不回显明文**，只显示 `imgbed_••••••••3e3f`（后 4 位）；输入框留空 = 不修改；提供「清除并回退到 Secret」
- 连接测试：`POST /admin/imgbed/test` → 调图床 `GET /api/channels`（比上传一张测试图更干净），返回渠道列表与延迟
- 权限：仅 `role=admin`；每次修改写 `audit_log`；Token 不进日志、不进错误提示
- 若未配置主密钥：后台显示「仅环境变量模式」，只允许改地址，Token 只读展示为"由 Secret 注入"

**新增设置键**：`imgbed_base_url`、`imgbed_token_enc`、`imgbed_token_hint`、`imgbed_token_name`、`imgbed_channel`

**改动文件**（精确到函数）：

| 文件 | 改动 |
|---|---|
| `src/types.ts` | `SiteSettings` 增键；`Env` 增 `CONFIG_ENCRYPTION_KEY?` |
| `src/lib/crypto.ts`（新） | AES-GCM `seal()/open()` |
| `src/lib/db.ts` | `DEFAULT_SETTINGS` 增默认值；`getImgbedConfig()` 合并三级来源 |
| `src/lib/imgbed.ts` | `imgbedConfig()` 改 async、接收合并后的配置，不再只读 `env` |
| `src/index.ts` | `/admin/settings` GET/POST、新增 `/admin/imgbed/test`、`/api/upload`、`/admin/media`、dashboard 状态 |
| `src/views/admin.ts` | 设置页「图床接入」表单（地址/Token/渠道/测试/状态） |
| `wrangler.example.jsonc`、`.dev.vars.example` | 说明主密钥，去掉硬性私有域名 |

### 6.2 站点 LOGO 上传

- **复用现有 `/api/upload` 走图床**，不引入 R2、不加新存储桶
- 新增设置键：`site_logo`（外链 URL）、`site_logo_height`、`site_favicon`（P1，可先复用 logo）
- 前台/后台 header（现有 `.site-header .wrap{height:60px}`）：有 logo 显示 `<img>` + 站点名作 `alt`/无障碍文本；无 logo 回退现有 `.dot + 文字` 方案
- 后台交互：上传按钮 → 即时预览 → 尺寸提示 → 可清除；URL 也允许手动粘贴
- **推荐规格**（按现有 60px header 反推）：

| 项 | 推荐值 | 理由 |
|---|---|---|
| 显示高度 | **32–40 px** | 60px header 上下留白均衡 |
| 源文件高度 | **64–80 px（2x）** | 视网膜屏不糊 |
| 宽度 | ≤ **200 px**，横版比例 3:1 ~ 5:1 | 避免挤压右侧导航 |
| 格式 | **SVG 优先**；位图 PNG / WebP 透明底 | 缩放无损、体积小 |
| 文件体积 | SVG < 20 KB，位图 < 100 KB | 边缘直出，别拖慢首屏 |
| 安全区 | 四周留 ≥ 8 px，不贴边 | 不同主题下都不裁切 |
| 方形图标 | 建议另设 64×64 `site_favicon` | 横版 logo 做 favicon 会糊 |

尺寸不符时给提示但**不阻断上传**（轻量优先）。

---

## 7. 主题引擎（v0.4）

主题 = **一个声明式 JSON**，不含可执行代码：

```json
{
  "id": "aurora",
  "name": "Aurora",
  "version": "1.0.0",
  "engine": "^1.0.0",
  "layout": "two-column",
  "sidebar": ["hot_posts", "categories", "tags"],
  "home": { "banner": true, "style": "list", "posts_per_page": 10 },
  "tokens": {
    "accent": "#2f6feb", "surface": "#ffffff",
    "radius": "10px", "font": "system-ui", "dark": false
  },
  "css": "/* 纯 CSS：仅允许变量覆盖与有限选择器 */"
}
```

- 枚举化 `layout` / `style` / `sidebar`，前端只认白名单值
- 模板变量固定白名单（`{{site.name}}` 等），**禁止 eval、禁止动态 import、禁止外链脚本**
- CSS 过滤掉 `@import`、`url(javascript:)`、`expression()` 等
- 存储：KV `theme:<id>`（单值 25 MiB 足够），渲染时读一次并缓存；切换主题只清页面缓存
- 预览：`?preview=aurora`，仅对已登录管理员生效，不写库

**为什么这样设计**：Z-Blog 的主题是 PHP 模板，能执行任意代码；Worker 没有文件系统也无法安全沙箱，所以"声明式 + 白名单"既是技术必然，也是开源项目敢让用户一键装第三方主题的前提。

---

## 8. 应用商店（v0.5）

- **独立公开仓库 `abncms/marketplace`**：`index.json` + `themes/<id>.json` + `extensions/<id>.json`
- CMS 端只做 `GET` 静态索引（GitHub raw / jsDelivr），带 ETag，结果缓存到 KV（**每天最多 1 次写**，不撞额度）
- 一键安装 = 校验 `sha256` + `engine` 兼容 + 体积上限 → 写入 KV → 设为 active
- 上架流程 = PR 到索引仓库 + CI 校验 schema + 维护者审核；用 GitHub Star / Issue 替代评分与评论
- **不做**：账号、支付、抽成、在线更新推送、加密应用包 —— 这些都是 Z-Blog 应用中心里最重的部分
- 扩展 Hook 白名单（只传数据、不执行代码）：`post.beforeSave`、`post.afterPublish`、`comment.beforeInsert`、`upload.after`、`render.head`、`render.footer`、`cron.daily`、`settings.afterSave`

---

## 9. 数据模型扩展

```sql
-- 独立页面（Z-Blog 的「页面」对应物）
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content_md TEXT DEFAULT '', content_html TEXT DEFAULT '',
  status TEXT DEFAULT 'published',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 导航菜单
CREATE TABLE IF NOT EXISTS menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL, url TEXT NOT NULL,
  target TEXT DEFAULT '_self', sort_order INTEGER DEFAULT 0,
  visible INTEGER DEFAULT 1
);

-- 幂等迁移记录（开源后用户升级不能丢数据）
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now'))
);

-- 敏感操作审计
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, action TEXT NOT NULL,
  detail TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
```

`settings` 表新增键走 `INSERT ... ON CONFLICT DO UPDATE`，无需改表结构；`posts` 增加 `scheduled_at` 用 `ALTER TABLE ... ADD COLUMN`（幂等迁移脚本里做）。

**导出/导入**：`GET /admin/export` 输出单文件 JSON（文章、页面、分类、标签、菜单、设置，**不含 Token 与用户哈希**）；`POST /admin/import` 校验后事务写入。这是开源 CMS 最基本的可信承诺。

---

## 10. 开源前必须收干净的清单

| 项 | 现状 | 要做 |
|---|---|---|
| 品牌 | README、banner.svg、seed.sql 全是「格熊」+ 6 个拼音栏目 | 源码中性化为 ABNcms / Aurora 主题；格熊作为**示例站点数据**单独放 `examples/` |
| 私有域名 | 已清除私有图床 / 生产站点域名等硬编码 | ✅ 已完成，继续守住 |
| 账号 ID | `wrangler.jsonc` 已 gitignore + 模板化 | ✅ 已完成 |
| 凭证 | 后台密码、PAT、图床 Token、Turnstile 真实 Secret | 全文扫描；示例值一律换成占位符 |
| 依赖 | 仅 `hono` 一个运行时依赖 | 保持；开源前跑 `npm audit` |
| 迁移 | 目前只有 `schema.sql` 幂等建表 | 补 `schema_migrations` + 版本化 migration |
| 文档 | README 已覆盖系统/代码/环境 | 补：主题开发指南、插件 Hook 文档、贡献指南、安全披露 policy |
| 工程 | 无 CI | GitHub Actions：`typecheck` + `build` + 敏感串扫描 + schema 幂等测试 |
| 法务 | 无 LICENSE / TRADEMARK | MIT + 商标声明；确认无第三方素材混入 |
| 演示 | 无公开 Demo | 部署一个只读 Demo 站（免费额度内），README 首屏可点 |

---

## 11. 演进路线

| 版本 | 主题 | 交付 |
|---|---|---|
| **v0.2** | 可配置化 | 图床后台化 + LOGO + ABNcms 中性品牌 + 写入聚合 + 迁移框架 |
| **v0.3** | 内容模型 | 独立页面 / 菜单 / 定时发布 / URL 规则 / 导入导出备份 |
| **v0.4** | 主题引擎 | 声明式 manifest、切换与预览、Aurora 默认主题、主题开发文档 |
| **v0.5** | 扩展与商店 | 白名单 Hook、索引仓库、一键安装与校验 |
| **v0.9** | 开源预备 | 清理清单、CI、文档站、Demo 站、MIT + 商标、安全审计 |
| **v1.0** | 公开发布 | 仓库转公开、Release、社区与贡献流程 |

---

## 12. 需要拍板的决策

1. **仓库与品牌**：沿用 `gexiong_cms` 私有仓库继续开发，还是现在 rename 为 `abncms`？（GitHub 已有他人同名仓库，不同账号不冲突）
2. **License**：MIT（推荐）/ Apache-2.0 / 其它
3. **图床 Token 落库**：AES-GCM 加密存 D1（推荐）/ 只放 KV / 保持 Secret 且后台只改地址
4. **本轮动作**：先只出策划（本文），还是立刻按 v0.2 动代码
5. **格熊线上站点**：保留为首个 demo 站（推荐，源码中性化即可），还是一并改名

---

## 13. 风险登记

| 风险 | 缓解 |
|---|---|
| Token 落库后泄露（后台被攻破 / 数据库导出） | 加密 + 页面掩码 + 导出文件排除 + 审计日志 |
| 免费额度撞墙导致站点 500 | 第 4 节性能预算 + CI 里加查询计数断言 |
| 第三方主题注入恶意内容 | 声明式白名单 + CSS 过滤 + 禁止脚本 |
| 改名影响现有线上 Worker | 先在现有 Worker 上迭代，v0.9 再统一改名与迁移 |
| 开源后用户误把 Secret 提交 | 模板化配置 + CI 敏感串扫描 + 文档显式警告 |
| 生态没人用 | 商店先做"索引 + 一键安装"最小闭环，不做账号和支付 |

---

*调研来源：Cloudflare Workers / KV / D1 官方定价与限额文档（2026-10-30 更新）、Z-Blog 官网与应用中心、Z-Blog Wiki（MIT 协议）、GitHub / npm 名称核查。*
