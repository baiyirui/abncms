-- ============================================================================
--  ABNcms 示例内容：中性栏目 + 站点设置 + 多篇演示文章
--  执行：npx wrangler d1 execute cf-press-db --remote --file=./seed.sql
--  说明：全部使用 INSERT OR IGNORE，可重复执行，且不会覆盖你在后台改过的设置。
--        格熊风格的首个 Demo 站点数据见 examples/gexiong-seed.sql。
-- ============================================================================

-- ── 栏目（中性示例，可自行增删）─────────────────────────────────────────────
INSERT OR IGNORE INTO categories (id, name, slug, description, sort_order)
VALUES
  (1, '技术笔记', 'tech',      '工程实践与踩坑记录', 1),
  (2, '产品观察', 'product',   '产品设计与行业观察', 2),
  (3, '随笔',     'essay',     '生活与思考', 3),
  (4, '资源分享', 'resources', '工具、素材与资源', 4),
  (5, '使用教程', 'tutorial',  '上手指南与操作说明', 5),
  (6, '站点公告', 'notice',    '更新与公告', 6);

-- ── 站点设置 ───────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO settings (key, value)
VALUES
  ('site_name',         'ABNCMS'),
  ('site_description',  'ABNCMS · Cloudflare Workers + D1 + 图床，跑在免费额度下的轻量 CMS'),
  ('site_keywords',     'ABNcms,Cloudflare Workers,D1,轻量CMS,演示站'),
  ('footer_text',       'Powered by ABNCMS · Cloudflare Workers + D1'),
  ('posts_per_page',    '10'),
  ('allow_comments',    '1'),
  ('analytics_enabled', '0'),
  ('analytics_script',  ''),
  ('site_logo',         ''),
  ('site_logo_height',  '36'),
  ('nav_menu',          '[{"label":"首页","href":"/"},{"label":"技术笔记","href":"/c/tech"},{"label":"产品观察","href":"/c/product"},{"label":"随笔","href":"/c/essay"},{"label":"资源分享","href":"/c/resources"},{"label":"使用教程","href":"/c/tutorial"},{"label":"站点公告","href":"/c/notice"}]');

-- ── 演示文章 ───────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO posts
  (slug, title, excerpt, content_md, content_html, cover, status, category_id, pinned, published_at, reading_time)
VALUES
  (
    'hello-abncms',
    '你好，ABNcms',
    '一套跑在 Cloudflare 免费额度上的轻量 CMS：Workers 渲染、D1 存储、边缘缓存、图片走外部图床。',
    '## 它跑在哪里

页面由 **Cloudflare Workers** 在就近节点渲染，数据存 **D1**（SQLite），会话与缓存在 **KV**，页面 HTML 放在边缘缓存，图片上传到**外部图床**并以外链引用。没有服务器，没有容器，`wrangler deploy` 一条命令上线。

## 免费额度的真实天花板

| 资源 | 每日额度 | 本项目的做法 |
|---|---|---|
| Workers | 10 万请求 / 天 | 缓存命中也计请求，关掉内置统计可撑约 10 万 PV |
| D1 | 500 万行读 / 10 万行写 | 命中缓存时 0 次查询，发布时只写 1 行代数 |
| KV | 10 万读，仅 1,000 写 | 只存会话、设置、侧栏，页面缓存不占 KV |

> 发布、改文、删文、改评论时只递增缓存代数，旧缓存立即不再命中——不需要 purge，也不会出现「后台改了前台没变」。

## 下一步

- 在「使用教程」里看如何发布第一篇文章
- 在「设置」里配置图床地址与 Token，或粘贴第三方统计代码
- 默认 LOGO 是 ABNCMS 橙灰双色实心字标，也可在后台上传自定义 LOGO',
    '<h2>它跑在哪里</h2>
<p>页面由 <strong>Cloudflare Workers</strong> 在就近节点渲染，数据存 <strong>D1</strong>（SQLite），会话与缓存在 <strong>KV</strong>，页面 HTML 放在边缘缓存，图片上传到<strong>外部图床</strong>并以外链引用。没有服务器，没有容器，<code>wrangler deploy</code> 一条命令上线。</p>
<h2>免费额度的真实天花板</h2>
<table><thead><tr><th>资源</th><th>每日额度</th><th>本项目的做法</th></tr></thead><tbody><tr><td>Workers</td><td>10 万请求 / 天</td><td>缓存命中也计请求，关掉内置统计可撑约 10 万 PV</td></tr><tr><td>D1</td><td>500 万行读 / 10 万行写</td><td>命中缓存时 0 次查询，发布时只写 1 行代数</td></tr><tr><td>KV</td><td>10 万读，仅 1,000 写</td><td>只存会话、设置、侧栏，页面缓存不占 KV</td></tr></tbody></table>
<blockquote><p>发布、改文、删文、改评论时只递增缓存代数，旧缓存立即不再命中——不需要 purge，也不会出现「后台改了前台没变」。</p></blockquote>
<h2>下一步</h2>
<ul><li>在「使用教程」里看如何发布第一篇文章</li><li>在「设置」里配置图床地址与 Token，或粘贴第三方统计代码</li><li>默认 LOGO 是 ABNCMS 橙灰双色实心字标，也可在后台上传自定义 LOGO</li></ul>',
    '/covers/cover-tech.svg',
    'published', 1, 1, datetime('now'), 2
  ),
  (
    'quick-start',
    '5 分钟上手：从部署到发布第一篇文章',
    '从 Wrangler 初始化到后台写作，全程不需要一台服务器，也不需要先买域名。',
    '## 1. 准备资源

在 Cloudflare 控制台创建一个 **D1 数据库**和一个 **KV 命名空间**，拿到它们的 ID。 fork 仓库后执行 `npm install`，把 `wrangler.example.jsonc` 复制成 `wrangler.jsonc` 并填入 ID。

## 2. 初始化表结构

```bash
npx wrangler d1 execute <数据库名> --remote --file=./schema.sql
npx wrangler d1 execute <数据库名> --remote --file=./seed.sql
```

`schema.sql` 是全新安装用的完整结构；`seed.sql` 带有示范栏目和文章，不需要的话可以跳过第二条。

## 3. 部署

```bash
npx wrangler deploy
```

部署完成后会输出一个 `workers.dev` 地址，前台立刻可访问。站点名称、描述、LOGO、图床都在后台「设置」里改，不用再动代码。

## 4. 写第一篇文章

打开 `/admin/login` 登录，进入「写文章」。标题必填，正文用 Markdown，右侧实时预览。**新建文章默认是正式发布**，保存后首页立即可见；只有主动选「草稿」才会藏起来。

## 5. 确认缓存生效

在浏览器开发者工具里看响应头：`x-abn-cache: MISS` 表示这次是首次渲染并写入缓存，再刷新一次变成 `HIT`，说明后续访问不再查库。',
    '<h2>1. 准备资源</h2>
<p>在 Cloudflare 控制台创建一个 <strong>D1 数据库</strong>和一个 <strong>KV 命名空间</strong>，拿到它们的 ID。 fork 仓库后执行 <code>npm install</code>，把 <code>wrangler.example.jsonc</code> 复制成 <code>wrangler.jsonc</code> 并填入 ID。</p>
<h2>2. 初始化表结构</h2>
<pre><code>npx wrangler d1 execute &lt;数据库名&gt; --remote --file=./schema.sql
npx wrangler d1 execute &lt;数据库名&gt; --remote --file=./seed.sql</code></pre>
<p><code>schema.sql</code> 是全新安装用的完整结构；<code>seed.sql</code> 带有示范栏目和文章，不需要的话可以跳过第二条。</p>
<h2>3. 部署</h2>
<pre><code>npx wrangler deploy</code></pre>
<p>部署完成后会输出一个 <code>workers.dev</code> 地址，前台立刻可访问。站点名称、描述、LOGO、图床都在后台「设置」里改，不用再动代码。</p>
<h2>4. 写第一篇文章</h2>
<p>打开 <code>/admin/login</code> 登录，进入「写文章」。标题必填，正文用 Markdown，右侧实时预览。<strong>新建文章默认是正式发布</strong>，保存后首页立即可见；只有主动选「草稿」才会藏起来。</p>
<h2>5. 确认缓存生效</h2>
<p>在浏览器开发者工具里看响应头：<code>x-abn-cache: MISS</code> 表示这次是首次渲染并写入缓存，再刷新一次变成 <code>HIT</code>，说明后续访问不再查库。</p>',
    '/covers/cover-tutorial.svg',
    'published', 5, 0, datetime('now'), 4
  ),
  (
    'free-tier-guide',
    '免费额度下如何撑起 10 万 PV/天',
    '算清楚 Workers、KV、D1 三堵墙，再把统计交给第三方，小站也能有大流量。',
    '## 三堵墙分别在哪

Cloudflare 免费版每天（UTC 00:00 重置）的硬上限是：Workers **10 万请求**、KV **10 万读 / 1,000 写**、D1 **500 万行读 / 10 万行写**。

> 注意：边缘缓存命中也算一次 Worker 请求。缓存省下的是 D1 和 KV，不是请求数。

## 每次访问的真实消耗

匿名访客打开一个页面：1 次 Worker 请求，1 次 KV 读（站点设置），缓存命中时 **0 次 D1 查询、0 次 KV 写**。

如果打开内置访问统计，25% 的页面会额外发一次打点请求，于是变成 1.25 次请求 + 1.25 次 KV 读 + 少量 D1 写。天花板也从 10 万 PV 降到约 8 万 PV。

## 三条建议

1. **关掉内置统计，改用第三方代码。** 后台「设置 → 第三方统计代码」粘贴百度统计或 Umami 的完整 script，本站读写立刻归零。
2. **保留页面缓存。** 它让 D1 行读只占额度的百分之几，把最贵的数据库查询挡在缓存后面。
3. **关掉用不到的功能。** 语义搜索、AI 摘要、相关阅读、上下篇、侧栏热门都有独立开关，关闭后对应的查询根本不执行。

## 超出额度会怎样

不是降速，是这一类操作直接报错。好在设置读取有降级逻辑，会退回默认值；但会话写不进去会导致无法登录——所以务必给统计和缓存留足余量。',
    '<h2>三堵墙分别在哪</h2>
<p>Cloudflare 免费版每天（UTC 00:00 重置）的硬上限是：Workers <strong>10 万请求</strong>、KV <strong>10 万读 / 1,000 写</strong>、D1 <strong>500 万行读 / 10 万行写</strong>。</p>
<blockquote><p>注意：边缘缓存命中也算一次 Worker 请求。缓存省下的是 D1 和 KV，不是请求数。</p></blockquote>
<h2>每次访问的真实消耗</h2>
<p>匿名访客打开一个页面：1 次 Worker 请求，1 次 KV 读（站点设置），缓存命中时 <strong>0 次 D1 查询、0 次 KV 写</strong>。</p>
<p>如果打开内置访问统计，25% 的页面会额外发一次打点请求，于是变成 1.25 次请求 + 1.25 次 KV 读 + 少量 D1 写。天花板也从 10 万 PV 降到约 8 万 PV。</p>
<h2>三条建议</h2>
<p>1. <strong>关掉内置统计，改用第三方代码。</strong> 后台「设置 → 第三方统计代码」粘贴百度统计或 Umami 的完整 script，本站读写立刻归零。 2. <strong>保留页面缓存。</strong> 它让 D1 行读只占额度的百分之几，把最贵的数据库查询挡在缓存后面。 3. <strong>关掉用不到的功能。</strong> 语义搜索、AI 摘要、相关阅读、上下篇、侧栏热门都有独立开关，关闭后对应的查询根本不执行。</p>
<h2>超出额度会怎样</h2>
<p>不是降速，是这一类操作直接报错。好在设置读取有降级逻辑，会退回默认值；但会话写不进去会导致无法登录——所以务必给统计和缓存留足余量。</p>',
    '/covers/cover-tech.svg',
    'published', 1, 0, datetime('now'), 5
  ),
  (
    'third-party-analytics',
    '用第三方统计替代内置打点，把额度全留给访客',
    '内置打点会消耗 D1 写入；换成百度统计或 Umami 后，本站读写归零。',
    '## 为什么要换

内置统计的实现是：页面里 25% 采样发一个 `sendBeacon` 到 `/api/hit`，服务端按权重 4 倍聚合，写回文章的阅读数和明细表。准确说是**估算值**，却要花掉真实的 D1 写入额度。

如果你已经在用百度统计、Google Analytics 或自建 Umami，完全没必要重复统计。

## 怎么配置

在后台「设置 → 第三方统计代码」粘贴平台给的**完整 script 标签**，例如：

```html
<script>
var _hmt = _hmt || [];
(function(){
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?你的ID";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();
</script>
```

保存后代码会原样注入前台每个页面的底部。想彻底零消耗，把上面的「开启访问统计」取消勾选即可——第三方代码**不会**跟着被关掉，两者互不依赖。

## 安全提醒

这段代码只有管理员能填写，会以原始 HTML 注入。请只粘贴来源可信的服务商代码，不要从不明网站复制整段脚本。',
    '<h2>为什么要换</h2>
<p>内置统计的实现是：页面里 25% 采样发一个 <code>sendBeacon</code> 到 <code>/api/hit</code>，服务端按权重 4 倍聚合，写回文章的阅读数和明细表。准确说是<strong>估算值</strong>，却要花掉真实的 D1 写入额度。</p>
<p>如果你已经在用百度统计、Google Analytics 或自建 Umami，完全没必要重复统计。</p>
<h2>怎么配置</h2>
<p>在后台「设置 → 第三方统计代码」粘贴平台给的<strong>完整 script 标签</strong>，例如：</p>
<pre><code>&lt;script&gt;
var _hmt = _hmt || [];
(function(){
  var hm = document.createElement(&quot;script&quot;);
  hm.src = &quot;https://hm.baidu.com/hm.js?你的ID&quot;;
  var s = document.getElementsByTagName(&quot;script&quot;)[0];
  s.parentNode.insertBefore(hm, s);
})();
&lt;/script&gt;</code></pre>
<p>保存后代码会原样注入前台每个页面的底部。想彻底零消耗，把上面的「开启访问统计」取消勾选即可——第三方代码<strong>不会</strong>跟着被关掉，两者互不依赖。</p>
<h2>安全提醒</h2>
<p>这段代码只有管理员能填写，会以原始 HTML 注入。请只粘贴来源可信的服务商代码，不要从不明网站复制整段脚本。</p>',
    '/covers/cover-tech.svg',
    'published', 1, 0, datetime('now'), 3
  ),
  (
    'image-host-setup',
    '配置外部图床：Token 加密存储与服务端代理上传',
    '图床地址随时可换，API Token 经 AES-GCM 加密落库，浏览器永远看不到明文。',
    '## 为什么用外部图床

图片走外部图床，意味着本站的 Workers、D1、KV 额度完全不被图片流量占用，也不需要在 Cloudflare 开 R2。图床域名可以随时更换，后台改地址即可，不用改代码。

## 填写三项配置

在「设置 → 图床接入」里填：

- **图床 API 地址**：例如 `https://img.example.com`
- **API Token**：只写一次，保存后页面只显示掩码
- **默认上传渠道**：按你的图床支持的渠道选

Token 会用 **AES-GCM** 加密后存入 D1，主密钥 `CONFIG_ENCRYPTION_KEY` 只放在 Cloudflare Secret 里，不进代码库、不回显到页面。

## 上传链路

浏览器把文件 POST 到本站 `/api/upload`，Worker 在服务端注入 `Authorization: Bearer <Token>` 后转发到图床。也就是说 Token 根本不会下发到浏览器，前端看不到明文。

上传成功后，媒体库登记的是图床返回的完整外链，编辑器里可以直接复制使用。

## 没有主密钥怎么办

未配置 `CONFIG_ENCRYPTION_KEY` 时是「仅环境变量模式」：可以改图床地址，但不能在后台写入 Token。此时用 `wrangler secret put IMGBED_TOKEN` 注入即可。',
    '<h2>为什么用外部图床</h2>
<p>图片走外部图床，意味着本站的 Workers、D1、KV 额度完全不被图片流量占用，也不需要在 Cloudflare 开 R2。图床域名可以随时更换，后台改地址即可，不用改代码。</p>
<h2>填写三项配置</h2>
<p>在「设置 → 图床接入」里填：</p>
<ul><li><strong>图床 API 地址</strong>：例如 <code>https://img.example.com</code></li><li><strong>API Token</strong>：只写一次，保存后页面只显示掩码</li><li><strong>默认上传渠道</strong>：按你的图床支持的渠道选</li></ul>
<p>Token 会用 <strong>AES-GCM</strong> 加密后存入 D1，主密钥 <code>CONFIG_ENCRYPTION_KEY</code> 只放在 Cloudflare Secret 里，不进代码库、不回显到页面。</p>
<h2>上传链路</h2>
<p>浏览器把文件 POST 到本站 <code>/api/upload</code>，Worker 在服务端注入 <code>Authorization: Bearer &lt;Token&gt;</code> 后转发到图床。也就是说 Token 根本不会下发到浏览器，前端看不到明文。</p>
<p>上传成功后，媒体库登记的是图床返回的完整外链，编辑器里可以直接复制使用。</p>
<h2>没有主密钥怎么办</h2>
<p>未配置 <code>CONFIG_ENCRYPTION_KEY</code> 时是「仅环境变量模式」：可以改图床地址，但不能在后台写入 Token。此时用 <code>wrangler secret put IMGBED_TOKEN</code> 注入即可。</p>',
    '/covers/cover-tutorial.svg',
    'published', 5, 0, datetime('now'), 4
  ),
  (
    'why-lightweight-cms',
    '为什么我们需要一个轻量的 CMS',
    '不是每个站点都需要数据库主机和容器；边缘优先的轻量方案更适合小站长。',
    '##  complication 的成本

传统 CMS 往往意味着：一台服务器、一个数据库实例、一套备份方案，以及每月固定的账单。对于个人博客、作品集、小型资讯站来说，这些成本远大于实际需要。

## 边缘优先的另一条路

ABNcms 把前台、后台、API、定时任务全部塞进一个 Worker：内容存 D1，会话与设置存 KV，页面 HTML 放边缘缓存，图片交给外部图床。没有服务器要维护，也没有数据库主机要付钱。

> 它不追求功能数量，而是把「发文快、访问省、开关多」做到位。

## 像正常 CMS 一样用

- 新建文章默认正式发布，保存后首页立刻可见
- 文章地址是 `/p/xxx.html` 这样的伪静态，旧地址自动跳转
- 功能开关齐全：评论、统计、AI、语义搜索都能单独关掉
- 后台可配置 LOGO、图床、第三方统计，不用碰代码

## 未来

主题引擎和应用商店在规划中。代码采用 MIT 协议，名称与 Logo 另有商标说明，方便二次开发和社区共建。',
    '<h2> complication 的成本</h2>
<p>传统 CMS 往往意味着：一台服务器、一个数据库实例、一套备份方案，以及每月固定的账单。对于个人博客、作品集、小型资讯站来说，这些成本远大于实际需要。</p>
<h2>边缘优先的另一条路</h2>
<p>ABNcms 把前台、后台、API、定时任务全部塞进一个 Worker：内容存 D1，会话与设置存 KV，页面 HTML 放边缘缓存，图片交给外部图床。没有服务器要维护，也没有数据库主机要付钱。</p>
<blockquote><p>它不追求功能数量，而是把「发文快、访问省、开关多」做到位。</p></blockquote>
<h2>像正常 CMS 一样用</h2>
<ul><li>新建文章默认正式发布，保存后首页立刻可见</li><li>文章地址是 <code>/p/xxx.html</code> 这样的伪静态，旧地址自动跳转</li><li>功能开关齐全：评论、统计、AI、语义搜索都能单独关掉</li><li>后台可配置 LOGO、图床、第三方统计，不用碰代码</li></ul>
<h2>未来</h2>
<p>主题引擎和应用商店在规划中。代码采用 MIT 协议，名称与 Logo 另有商标说明，方便二次开发和社区共建。</p>',
    '/covers/cover-product.svg',
    'published', 2, 0, datetime('now'), 3
  ),
  (
    'site-notice',
    '演示站使用说明',
    '这里是 ABNcms 的演示站，可以浏览前台内容，也可以进入后台体验完整发布流程。',
    '## 关于这个站点

本站是 ABNcms 的在线演示，部署在 Cloudflare 免费额度上。栏目、文章、图床配置都是示例数据，你可以自由浏览。

## 可以体验什么

- 前台：归档、标签、搜索、RSS、Sitemap，以及 `.html` 结尾的伪静态文章地址
- 后台：文章发布与编辑、媒体库、分类、评论审核、站点设置、图床测试
- 设置：默认 LOGO、功能开关、第三方统计代码都可以试着改

> 演示站的数据会被恢复，请勿把它当作正式内容存储使用。

## 自己搭一套

参考 `quick-start` 那篇文章，从 `wrangler.example.jsonc` 开始，十分钟就能拥有同样的站点。代码仓库里有完整的 README 和策划文档。',
    '<h2>关于这个站点</h2>
<p>本站是 ABNcms 的在线演示，部署在 Cloudflare 免费额度上。栏目、文章、图床配置都是示例数据，你可以自由浏览。</p>
<h2>可以体验什么</h2>
<ul><li>前台：归档、标签、搜索、RSS、Sitemap，以及 <code>.html</code> 结尾的伪静态文章地址</li><li>后台：文章发布与编辑、媒体库、分类、评论审核、站点设置、图床测试</li><li>设置：默认 LOGO、功能开关、第三方统计代码都可以试着改</li></ul>
<blockquote><p>演示站的数据会被恢复，请勿把它当作正式内容存储使用。</p></blockquote>
<h2>自己搭一套</h2>
<p>参考 <code>quick-start</code> 那篇文章，从 <code>wrangler.example.jsonc</code> 开始，十分钟就能拥有同样的站点。代码仓库里有完整的 README 和策划文档。</p>',
    '/covers/cover-notice.svg',
    'published', 6, 0, datetime('now'), 2
  ),
  (
    'draft-example',
    '草稿：边缘优先架构的设计笔记',
    '一份还没写完的草稿，用来演示后台的草稿状态：前台默认不可见。',
    '草稿内容待补充。这份文章故意保持草稿状态，用来演示后台的筛选与前台的隐藏逻辑。

- 哪些状态可以放边缘缓存
- 什么时候必须回源 D1
- 写入如何批量聚合',
    '<p>草稿内容待补充。这份文章故意保持草稿状态，用来演示后台的筛选与前台的隐藏逻辑。</p>
<ul><li>哪些状态可以放边缘缓存</li><li>什么时候必须回源 D1</li><li>写入如何批量聚合</li></ul>',
    '/covers/cover-essay.svg',
    'draft', 3, 0, NULL, 1
  );
