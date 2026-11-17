-- ============================================================================
--  ABNcms · D1 (SQLite) 数据库结构（全新安装用）
--  执行：npx wrangler d1 execute cf-press-db --remote --file=./schema.sql
--  幂等：全部使用 CREATE TABLE IF NOT EXISTS / INSERT OR IGNORE，可重复执行
--  已有旧库升级请改用：python scripts/migrate.py
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

-- ── 独立页面 ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT    NOT NULL UNIQUE,
  title        TEXT    NOT NULL,
  content_md   TEXT    DEFAULT '',
  content_html TEXT    DEFAULT '',
  status       TEXT    DEFAULT 'published',
  sort_order   INTEGER DEFAULT 0,
  created_at   TEXT    DEFAULT (datetime('now')),
  updated_at   TEXT    DEFAULT (datetime('now'))
);

-- ── 友情链接 ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  url         TEXT    NOT NULL,
  description TEXT    DEFAULT '',
  sort_order  INTEGER DEFAULT 0,
  enabled     INTEGER DEFAULT 1,
  created_at  TEXT    DEFAULT (datetime('now'))
);

-- ── 站点设置 ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);

-- ── 结构版本（供 scripts/migrate.py 判断增量升级）─────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  description TEXT DEFAULT '',
  applied_at  TEXT DEFAULT (datetime('now'))
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

-- ── 初始分类（中性示例，可自行增删）─────────────────────────────────────
INSERT OR IGNORE INTO categories (id, name, slug, description, sort_order) VALUES
  (1, '技术笔记', 'tech', '工程实践与踩坑记录', 1),
  (2, '产品观察', 'product', '产品设计与行业观察', 2),
  (3, '随笔', 'essay', '生活与思考', 3),
  (4, '资源分享', 'resources', '工具、素材与资源', 4),
  (5, '使用教程', 'tutorial', '上手指南与操作说明', 5),
  (6, '站点公告', 'notice', '更新与公告', 6);

-- ── 默认站点设置 ───────────────────────────────────────────────────────────
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('site_name',        'ABNcms'),
  ('site_description', 'A lightweight CMS on the Cloudflare free tier'),
  ('site_keywords',    'ABNcms,Cloudflare Workers,D1,CMS'),
  ('footer_text',      'Powered by ABNcms · Cloudflare Workers + D1'),
  ('posts_per_page',   '10'),
  ('allow_comments',   '1'),
  ('turnstile_secret', '2x0000000000000000000000000000000AA'),
  ('analytics_enabled','1'),
  ('analytics_script', ''),
  ('site_logo',        ''),
  ('site_logo_height', '36'),
  ('imgbed_base_url',  ''),
  ('imgbed_token_enc', ''),
  ('imgbed_token_hint',''),
  ('imgbed_token_name',''),
  ('imgbed_channel',   ''),
  ('cache_gen',        '1'),
  ('enable_page_cache','1'),
  ('enable_hot',       '1'),
  ('enable_related',   '1'),
  ('enable_prevnext',  '1'),
  ('enable_semantic',  '0'),
  ('enable_ai',        '0'),
  ('enable_links',     '0'),
  ('nav_menu',         '');

-- 全新安装等同于已应用全部历史迁移，后续只需跑新增的 migrations/*.sql
INSERT OR IGNORE INTO schema_migrations (version, description) VALUES
  ('001_baseline',         'v0.1 initial schema (cf-press)'),
  ('002_v0.2_settings',    'v0.2 site logo / image host / analytics settings'),
  ('003_cache_and_switches','v0.2.1 page cache generation / quota switches'),
  ('004_analytics_script',  'v0.2.3 third-party analytics script setting'),
  ('005_pages_links_backup','v0.2.4 pages / links / navigation menu');
