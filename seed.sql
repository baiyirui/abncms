-- ============================================================================
--  ABNcms 示例内容：中性栏目 + 站点设置 + 两篇演示文章
--  执行：npx wrangler d1 execute abncms-db --remote --file=./seed.sql
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
  ('site_name',         'ABNcms'),
  ('site_description',  'A lightweight CMS on the Cloudflare free tier'),
  ('site_keywords',     'ABNcms,Cloudflare Workers,D1,CMS'),
  ('footer_text',       'Powered by ABNcms · Cloudflare Workers + D1'),
  ('posts_per_page',    '10'),
  ('allow_comments',    '1'),
  ('analytics_enabled', '1'),
  ('site_logo',         ''),
  ('site_logo_height',  '36');

-- ── 演示文章 ───────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO posts
  (slug, title, excerpt, content_md, content_html, status, category_id, pinned, published_at, reading_time)
VALUES
  (
    'hello-abncms',
    '你好，ABNcms',
    '一套跑在 Cloudflare 免费额度上的轻量 CMS：Workers 渲染、D1 存储、KV 缓存、图片走外部图床。',
    '## 它跑在哪里\n\n页面由 **Cloudflare Workers** 在就近节点渲染，数据存 **D1**（SQLite），会话与缓存在 **KV**，图片上传到**外部图床**并以外链引用，摘要和语义搜索由 **Workers AI** + **Vectorize** 提供。\n\n## 免费额度的真实天花板\n\n| 资源 | 每日额度 |\n|---|---|\n| Workers | 10 万请求 / 天，单次 10ms CPU |\n| D1 | 500 万行读 / 10 万行写（按扫描行数计） |\n| KV | 10 万次读，但**只有 1,000 次写** |\n\n> 所以 ABNcms 的设计原则是：匿名页面走 CDN 缓存，单次前台请求 0 次 KV 写，所有列表查询必走索引。\n\n## 下一步\n\n进入后台写一篇文章，或在「设置」里配置图床、上传站点 LOGO。\n',
    '<h2>它跑在哪里</h2><p>页面由 <strong>Cloudflare Workers</strong> 在就近节点渲染，数据存 <strong>D1</strong>（SQLite），会话与缓存在 <strong>KV</strong>，图片上传到<strong>外部图床</strong>并以外链引用，摘要和语义搜索由 <strong>Workers AI</strong> + <strong>Vectorize</strong> 提供。</p><h2>免费额度的真实天花板</h2><table><thead><tr><th>资源</th><th>每日额度</th></tr></thead><tbody><tr><td>Workers</td><td>10 万请求 / 天，单次 10ms CPU</td></tr><tr><td>D1</td><td>500 万行读 / 10 万行写（按扫描行数计）</td></tr><tr><td>KV</td><td>10 万次读，但<strong>只有 1,000 次写</strong></td></tr></tbody></table><blockquote><p>所以 ABNcms 的设计原则是：匿名页面走 CDN 缓存，单次前台请求 0 次 KV 写，所有列表查询必走索引。</p></blockquote><h2>下一步</h2><p>进入后台写一篇文章，或在「设置」里配置图床、上传站点 LOGO。</p>',
    'published', 1, 1, datetime('now'), 2
  ),
  (
    'draft-example',
    '草稿：边缘优先架构的设计笔记',
    '一份还没写完的草稿，用来演示后台的草稿状态。',
    '草稿内容待补充。\n\n- 哪些状态可以放边缘缓存\n- 什么时候必须回源 D1\n- 写入如何批量聚合\n',
    '<p>草稿内容待补充。</p><ul><li>哪些状态可以放边缘缓存</li><li>什么时候必须回源 D1</li><li>写入如何批量聚合</li></ul>',
    'draft', 3, 0, NULL, 1
  );
