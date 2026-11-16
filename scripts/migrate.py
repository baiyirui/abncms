#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ABNcms · D1 增量迁移执行器（幂等，可重复执行）

适用场景：已经跑过旧版 cf-press 的线上 D1，需要补齐 v0.2 新增的设置项，
         又不能重跑 schema.sql 覆盖后台已修改过的站名 / 密码 / Token。
全新安装请直接用 `python scripts/setup_remote.py`（内含 schema.sql）。

用法：
    python scripts/migrate.py              # 只执行尚未登记的迁移
    python scripts/migrate.py --force      # 全部重跑（SQL 幂等，安全）
    python scripts/migrate.py --local      # 作用于本地 D1 而非远端
    python scripts/migrate.py --dry-run    # 只列出将要执行的迁移

约定：
    migrations/<序号>_<名称>.sql
    文件名去掉 .sql 即 version；每个文件末尾必须
    INSERT OR IGNORE INTO schema_migrations(...)，因此天然幂等。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(ROOT, "wrangler.jsonc")
MIGRATIONS = os.path.join(ROOT, "migrations")
DEFAULT_DB = "cf-press-db"


def resolve_exe(cmd: str) -> str:
    """Windows 下 npx/npm 这类无扩展名命令需要补 .cmd 才能被 CreateProcess 找到"""
    if os.name != "nt" or os.path.isabs(cmd) or "." in os.path.basename(cmd):
        return cmd
    candidate = cmd + ".cmd"
    if shutil.which(candidate):
        return candidate
    return cmd


def run(args: list[str]) -> tuple[int, str]:
    args = [resolve_exe(args[0]), *args[1:]]
    print(f"  $ {' '.join(args)}")
    p = subprocess.run(
        args, cwd=ROOT, capture_output=True, text=True,
        encoding="utf-8", errors="replace",
    )
    out = (p.stdout or "").strip()
    err = (p.stderr or "").strip()
    if out:
        print("    " + out.replace("\n", "\n    ")[:900])
    if p.returncode != 0 and err:
        print("    ! " + err.replace("\n", "\n    ! ")[:500])
    return p.returncode, out


def database_name() -> str:
    """从 wrangler.jsonc 读取第一个 D1 绑定名（JSONC 带注释，用正则而非 json.load）"""
    try:
        with open(CONFIG, "r", encoding="utf-8") as f:
            m = re.search(r'"database_name"\s*:\s*"([^"]+)"', f.read())
        if m:
            return m.group(1)
    except OSError:
        pass
    return DEFAULT_DB


def collect_versions(obj, acc: set[str]) -> None:
    """wrangler --json 输出结构在不同版本不一致，递归找出所有 version 字段"""
    if isinstance(obj, dict):
        v = obj.get("version")
        if isinstance(v, str):
            acc.add(v)
        for val in obj.values():
            collect_versions(val, acc)
    elif isinstance(obj, list):
        for item in obj:
            collect_versions(item, acc)


def applied_versions(db: str, local: bool) -> set[str]:
    scope = "--local" if local else "--remote"
    code, out = run([
        "npx", "wrangler", "d1", "execute", db, scope,
        "--command=SELECT version FROM schema_migrations", "--json",
    ])
    if code != 0:
        # version 表还不存在（旧库首次升级），视为全部未应用
        return set()
    acc: set[str] = set()
    for candidate in (out, *re.findall(r"(\{.*\}|\[.*\])", out, re.S)):
        try:
            collect_versions(json.loads(candidate), acc)
        except (ValueError, TypeError):
            continue
    return acc


def main() -> int:
    ap = argparse.ArgumentParser(description="ABNcms D1 migrations")
    ap.add_argument("--force", action="store_true", help="忽略版本记录，全部重跑")
    ap.add_argument("--local", action="store_true", help="作用于本地 D1")
    ap.add_argument("--dry-run", action="store_true", help="只列出待执行迁移")
    args = ap.parse_args()

    if not os.path.isdir(MIGRATIONS):
        print(f"✗ 找不到迁移目录：{MIGRATIONS}")
        return 1
    files = sorted(f for f in os.listdir(MIGRATIONS) if f.endswith(".sql"))
    if not files:
        print("✓ migrations/ 为空，无需迁移")
        return 0

    db = database_name()
    scope = "--local" if args.local else "--remote"
    print(f"\n=== ABNcms · D1 迁移（{db} / {'local' if args.local else 'remote'}）===\n")

    done = set() if args.force else applied_versions(db, args.local)
    pending = [f for f in files if f[:-4] not in done]

    if done:
        print(f"  已应用：{', '.join(sorted(done))}\n")
    if not pending:
        print("✓ 所有迁移均已应用，数据库结构最新\n")
        return 0

    print("  待执行：" + ", ".join(pending) + "\n")
    if args.dry_run:
        return 0

    for name in pending:
        print(f"-- {name} --")
        code, _ = run([
            "npx", "wrangler", "d1", "execute", db, scope,
            f"--file=./migrations/{name}",
        ])
        if code != 0:
            print(f"\n✗ 迁移 {name} 失败，已停止（前面成功的迁移不会回滚）\n")
            return 1
        print(f"  ✓ {name} 完成\n")

    print("=== 迁移完成 ===\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
