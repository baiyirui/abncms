-- ============================================================================
--  示例站点数据：格熊风格（ABNcms 的首个 Demo 站点）
--  用途：仅作为「如何把 ABNcms 定制成某个具体站点」的示例，不是默认数据。
--  建议在一个全新的 D1 库上执行；若用于已有库，请先自行清理 categories / posts /
--  settings 中冲突的记录（本文件用 INSERT OR REPLACE 覆盖设置）。
-- ============================================================================

INSERT OR IGNORE INTO categories (id, name, slug, description, sort_order)
VALUES
  (1, '免费资源', 'mfzy', '精选免费可商用的软件、素材与工具', 1),
  (2, '字体资源', 'ztzy', '免费商用中文字体与字体使用技巧', 2),
  (3, '工具技巧', 'gjjq', '效率工具与实用技巧', 3),
  (4, '热门资讯', 'rmzx', '行业动态与热点资讯', 4),
  (5, '生活妙招', 'shmz', '轻松搞定生活小麻烦', 5),
  (6, '经验分享', 'jyfx', '踩坑记录与经验总结', 6);

INSERT OR REPLACE INTO settings (key, value)
VALUES
  ('site_name',         '格熊'),
  ('site_description',  '免费商用资源 · 字体 · AI 工具 · 数码技巧 · 生活妙招'),
  ('site_keywords',     '免费资源,字体资源,工具技巧,热门资讯,生活妙招,经验分享,格熊'),
  ('footer_text',       '© 格熊 gexiong.com · 免费资源与技巧分享'),
  ('posts_per_page',    '10'),
  ('allow_comments',    '1'),
  ('analytics_enabled', '1');

-- 站点 LOGO 建议在「后台 → 设置 → 站点 LOGO」上传后自动生成 site_logo。
-- 图床地址与 Token 同样在后台填写，不要写进 SQL。
