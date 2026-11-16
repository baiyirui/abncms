-- ============================================================================
--  ABNcms · 迁移 002：v0.2 新增站点设置项
--    - site_logo / site_logo_height   后台上传站点 LOGO
--    - imgbed_*                      图床地址 / 加密 Token / 渠道后台可配
--    - analytics_enabled             访问统计开关（关闭 = 零写入纯静态供给）
--  幂等：INSERT OR IGNORE 只补齐缺失 key，绝不覆盖后台已修改过的值
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
  ('analytics_enabled', '1'),
  ('site_logo',         ''),
  ('site_logo_height',  '36'),
  ('imgbed_base_url',   ''),
  ('imgbed_token_enc',  ''),
  ('imgbed_token_hint', ''),
  ('imgbed_token_name', ''),
  ('imgbed_channel',    '');

INSERT OR IGNORE INTO schema_migrations (version, description) VALUES
  ('001_baseline',      'v0.1 initial schema (cf-press)'),
  ('002_v0.2_settings', 'v0.2 site logo / image host / analytics settings');
