-- ============================================================================
--  ABNcms · 迁移 004：第三方统计代码
--  只补缺失 key，不覆盖已有设置；可重复执行。
--  执行：python scripts/migrate.py
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  description TEXT DEFAULT '',
  applied_at  TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('analytics_script', '');

INSERT OR IGNORE INTO schema_migrations (version, description) VALUES
  ('004_analytics_script', 'v0.2.3 third-party analytics script setting');
