-- ============================================================================
--  ABNcms · 迁移 001：建立结构版本表并登记 v0.1 基线
--  适用：从旧版 cf-press（已有 D1 数据）升级，全新安装请用 schema.sql
--  幂等：可重复执行，不会改动任何既有文章 / 用户 / 设置
--  执行：python scripts/migrate.py
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  description TEXT DEFAULT '',
  applied_at  TEXT DEFAULT (datetime('now'))
);

-- 旧库视为已具备 v0.1 全部表结构
INSERT OR IGNORE INTO schema_migrations (version, description) VALUES
  ('001_baseline', 'v0.1 initial schema (cf-press)');
