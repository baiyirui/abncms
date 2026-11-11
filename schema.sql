-- ============================================================================
--  cf-press · D1 (SQLite) 数据库结构
--  执行：npx wrangler d1 execute cf-press-db --remote --file=./schema.sql
--  幂等：全部使用 CREATE TABLE IF NOT EXISTS，可重复执行
-- ============================================================================

-- ── 账号 ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,               -- PBKDF2: salt:hex
  display_name  TEXT    DEFAULT '',
  email         TEXT    DEFAULT '',
  role          TEXT    DEFAULT 'admin',        -- admin | editor
  created_at    TEXT    DEFAULT (datetime('now'))
);

-- ── 分类 ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  slug        TEXT    NOT NULL UNIQUE,
  description TEXT    DEFAULT '',
  sort_order  INTEGER DEFAULT 0
);

-- ── 标签 ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT    NOT NULL,
  slug  TEXT    NOT NULL UNIQUE
);

-- ── 文章 ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT    NOT NULL UNIQUE,
  title        TEXT    NOT NULL,
  excerpt      TEXT    DEFAULT '',
  content_md   TEXT    DEFAULT '',
  content_html TEXT    DEFAULT '',
  cover        TEXT    DEFAULT '',              -- R2 key 或外链 URL
  status       TEXT    DEFAULT 'draft',         -- draft | published
  pinned       INTEGER DEFAULT 0,
  category_id  INTEGER,
  author_id    INTEGER,
  views        INTEGER DEFAULT 0,
  ai_summary   TEXT    DEFAULT '',
  reading_time INTEGER DEFAULT 1,               -- 分钟
  created_at   TEXT    DEFAULT (datetime('now')),
  updated_at   TEXT    DEFAULT (datetime('now')),
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_posts_status      ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published   ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category    ON posts(category_id);

-- ── 文章 ↔ 标签 ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL,
  tag_id  INTEGER NOT NULL,
  PRIMARY KEY (post_id, tag_id)
);

-- ── 评论 ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL,
  author     TEXT    NOT NULL,
  email      TEXT    DEFAULT '',
  website    TEXT    DEFAULT '',
  content    TEXT    NOT NULL,
  status     TEXT    DEFAULT 'approved',        -- pending | approved | spam
  created_at TEXT    DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC);

-- ── 媒体库（R2 对象索引）───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  key          TEXT    NOT NULL UNIQUE,
  filename     TEXT    DEFAULT '',
  content_type TEXT    DEFAULT '',
  size         INTEGER DEFAULT 0,
  uploader_id  INTEGER,
  created_at   TEXT    DEFAULT (datetime('now'))
);

-- ── 站点设置 ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);

-- ── 访问统计（原始明细，Cron 定期清理 30 天前数据）─────────────────────────
CREATE TABLE IF NOT EXISTS page_views (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  path       TEXT    DEFAULT '',
  post_id    INTEGER,
  country    TEXT    DEFAULT '',
  referer    TEXT    DEFAULT '',
  created_at TEXT    DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pv_created ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_pv_post    ON page_views(post_id);

-- ── 全文检索（FTS5；若 D1 环境不支持可忽略该段报错）──────────────────────
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title, excerpt, content_md, content='posts', content_rowid='id', tokenize='unicode61'
);

-- ── 初始分类（与格熊一致）─────────────────────────────────────────────────
INSERT OR IGNORE INTO categories (id, name, slug, description, sort_order) VALUES
  (1, '免费资源', 'mfzy', '精选免费可商用的软件、素材与工具', 1),
  (2, '字体资源', 'ztzy', '免费商用中文字体与字体使用技巧', 2),
  (3, '工具技巧', 'gjjq', '效率工具与实用技巧', 3),
  (4, '热门资讯', 'rmzx', '行业动态与热点资讯', 4),
  (5, '生活妙招', 'shmz', '轻松搞定生活小麻烦', 5),
  (6, '经验分享', 'jyfx', '踩坑记录与经验总结', 6);

-- ── 默认站点设置 ───────────────────────────────────────────────────────────
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('site_name',        '格熊'),
  ('site_description', '免费商用资源 · 字体 · AI 工具 · 数码技巧 · 生活妙招'),
  ('site_keywords',    '免费资源,字体资源,工具技巧,热门资讯,生活妙招,经验分享,格熊'),
  ('footer_text',      '© 格熊 gexiong.com · 免费资源与技巧分享'),
  ('posts_per_page',   '10'),
  ('allow_comments',   '1'),
  ('turnstile_secret', '2x0000000000000000000000000000000AA'),
  ('analytics_enabled','1');
