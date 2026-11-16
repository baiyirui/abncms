-- ============================================================================
--  ABNcms · 迁移 003：页面缓存代数 + 额度开关
--  目标：让小站长在 Cloudflare 免费额度内获得「发文即时可见」且可自主降耗。
--  幂等：INSERT OR IGNORE 只补缺失 key，不覆盖后台已保存的值。
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
  ('cache_gen',         '1'),
  ('enable_page_cache', '1'),
  ('enable_hot',        '1'),
  ('enable_related',    '1'),
  ('enable_prevnext',   '1'),
  ('enable_semantic',   '0'),
  ('enable_ai',         '0');

INSERT OR IGNORE INTO schema_migrations (version, description) VALUES
  ('001_baseline',          'v0.1 initial schema (cf-press)'),
  ('002_v0.2_settings',     'v0.2 site logo / image host / analytics settings'),
  ('003_cache_and_switches','v0.2.1 page cache generation / quota switches');
