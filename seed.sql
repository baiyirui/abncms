-- ============================================================================
--  演示内容：格熊风格栏目 + 站点设置 + 两篇示例文章（一篇已发布、一篇草稿）
--  执行：npx wrangler d1 execute cf-press-db --remote --file=./seed.sql
--  注意：本文件会 INSERT OR IGNORE / INSERT OR REPLACE，可重复执行。
-- ============================================================================

-- ── 栏目（与格熊一致）──────────────────────────────────────────────────────
INSERT OR IGNORE INTO categories (id, name, slug, description, sort_order)
VALUES
  (1, '免费资源', 'mfzy', '精选免费可商用的软件、素材与工具', 1),
  (2, '字体资源', 'ztzy', '免费商用中文字体与字体使用技巧', 2),
  (3, '工具技巧', 'gjjq', '效率工具与实用技巧', 3),
  (4, '热门资讯', 'rmzx', '行业动态与热点资讯', 4),
  (5, '生活妙招', 'shmz', '轻松搞定生活小麻烦', 5),
  (6, '经验分享', 'jyfx', '踩坑记录与经验总结', 6);

-- ── 站点设置（与格熊一致）──────────────────────────────────────────────────
INSERT OR REPLACE INTO settings (key, value)
VALUES
  ('site_name', '格熊'),
  ('site_description', '免费商用资源 · 字体 · AI 工具 · 数码技巧 · 生活妙招'),
  ('site_keywords', '免费资源,字体资源,工具技巧,热门资讯,生活妙招,经验分享,格熊'),
  ('footer_text', '© 格熊 gexiong.com · 免费资源与技巧分享'),
  ('posts_per_page', '10'),
  ('allow_comments', '1'),
  ('analytics_enabled', '1');

-- ── 演示文章（category_id 对应上面栏目）────────────────────────────────────
INSERT OR IGNORE INTO posts
  (slug, title, excerpt, content_md, content_html, status, category_id, pinned, published_at, reading_time)
VALUES
  (
    'hello-cloudflare',
    '你好，Cloudflare 边缘',
    '这套系统全部跑在 Cloudflare 的免费额度上：Workers 计算、D1 数据库、KV 缓存、R2 存储、Workers AI 与 Vectorize。',
    '## 它跑在哪里\n\n这个页面由 **Cloudflare Workers** 在你的就近节点直接渲染，数据库是 **D1**（SQLite），图片存在 **R2**，会话与缓存在 **KV**，摘要和语义搜索由 **Workers AI** + **Vectorize** 提供。\n\n## 免费额度一览\n\n- Workers：10 万次请求 / 天\n- D1：5 GB 存储\n- KV：10 万次读 / 天\n- R2：10 GB·月\n- Workers AI：每天 1 万 neurons\n\n> 全部都在免费计划内，不需要绑卡。\n\n## 下一步\n\n进入后台写一篇试试，发布后可以点「AI 生成摘要」。\n',
    '<h2>它跑在哪里</h2><p>这个页面由 <strong>Cloudflare Workers</strong> 在你的就近节点直接渲染，数据库是 <strong>D1</strong>（SQLite），图片存在 <strong>R2</strong>，会话与缓存在 <strong>KV</strong>，摘要和语义搜索由 <strong>Workers AI</strong> + <strong>Vectorize</strong> 提供。</p><h2>免费额度一览</h2><ul><li>Workers：10 万次请求 / 天</li><li>D1：5 GB 存储</li><li>KV：10 万次读 / 天</li><li>R2：10 GB·月</li><li>Workers AI：每天 1 万 neurons</li></ul><blockquote><p>全部都在免费计划内，不需要绑卡。</p></blockquote><h2>下一步</h2><p>进入后台写一篇试试，发布后可以点「AI 生成摘要」。</p>',
    'published', 1, 1, datetime('now'), 2
  ),
  (
    'draft-example',
    '草稿：如何设计一套边缘优先的架构',
    '一份还没写完的草稿，用来演示后台的草稿状态。',
    '草稿内容待补充。\n\n- 边缘优先意味着什么\n- 状态放在哪里\n- 什么时候需要 Durable Objects\n',
    '<p>草稿内容待补充。</p><ul><li>边缘优先意味着什么</li><li>状态放在哪里</li><li>什么时候需要 Durable Objects</li></ul>',
    'draft', 3, 0, NULL, 1
  );
