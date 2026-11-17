-- ============================================================================
--  ABNcms · 迁移 005：独立页面 / 友情链接 / 导航菜单
--  幂等，可重复执行。执行：python scripts/migrate.py
-- ============================================================================

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

CREATE TABLE IF NOT EXISTS links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  url         TEXT    NOT NULL,
  description TEXT    DEFAULT '',
  sort_order  INTEGER DEFAULT 0,
  enabled     INTEGER DEFAULT 1,
  created_at  TEXT    DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('enable_links', '0'),
  ('nav_menu',     '');

INSERT OR IGNORE INTO schema_migrations (version, description) VALUES
  ('005_pages_links_backup', 'v0.2.4 pages / links / navigation menu');
