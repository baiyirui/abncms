#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
cf-press 远程资源初始化脚本（幂等，可重复执行）

前置：先执行 `npx wrangler login`
作用：在 Cloudflare 账号下创建 D1 / KV / R2 / Vectorize 资源，
     把真实 ID 写回 wrangler.jsonc，并执行建表与演示数据。

用法：
    cd cf-press
    python scripts/setup_remote.py
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(ROOT, "wrangler.jsonc")

D1_NAME = "cf-press-db"
KV_TITLE = "cf-press-cache"
R2_BUCKET = "cf-press-media"
VEC_INDEX = "cf-press-posts"


def resolve_exe(cmd: str) -> str:
    """Windows 下 npx/npm/node 这类无扩展名命令需要补 .cmd 才能被 CreateProcess 找到"""
    if os.name != "nt" or os.path.isabs(cmd) or "." in os.path.basename(cmd):
        return cmd
    candidate = cmd + ".cmd"
    if shutil.which(candidate):
        return candidate
    return cmd


def run(args: list[str], capture=True) -> tuple[int, str, str]:
    """运行命令，返回 (returncode, stdout, stderr)"""
    args = [resolve_exe(args[0]), *args[1:]]
    print(f"  $ {' '.join(args)}")
    p = subprocess.run(
        args,
        cwd=ROOT,
        capture_output=capture,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    out = (p.stdout or "").strip()
    err = (p.stderr or "").strip()
    if out:
        print("    " + out.replace("\n", "\n    ")[:1200])
    if p.returncode != 0 and err:
        print("    ! " + err.replace("\n", "\n    ! ")[:800])
    return p.returncode, out, err


def run_json(args: list[str]) -> dict | list | None:
    """运行 wrangler --json 并解析输出（会自动跳过非 JSON 的日志行）"""
    code, out, _ = run(args + ["--json"])
    if code != 0:
        return None
    # wrangler 有时会在 JSON 前打印几行日志，逐段尝试解析
    candidates = [out]
    candidates += re.findall(r"(\{.*\}|\[.*\])", out, re.S)
    for c in candidates:
        try:
            return json.loads(c)
        except Exception:
            continue
    return None


def extract_uuid(text: str) -> str | None:
    m = re.search(
        r"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})",
        text or "",
    )
    return m.group(1) if m else None


def extract_kv_id(text: str) -> str | None:
    """KV namespace id 为 32 位 hex：优先匹配 JSON 形式，再退回通用十六进制"""
    m = re.search(r'"id"\s*:\s*"([0-9a-fA-F]{32})"', text or "")
    if m:
        return m.group(1)
    m = re.search(r"([0-9a-fA-F]{32})", text or "")
    return m.group(1) if m else None


def first_dict(obj):
    """按候选键名从字典里取值"""
    if not isinstance(d, dict):
        return None
    for k in keys:
        if k in d and d[k] not in (None, ""):
            return d[k]
    return None


def step(title: str):
    print(f"\n== {title} ==")


def patch_config(field: str, key: str, new_id: str) -> bool:
    """替换 wrangler.jsonc 中指定字段里的 ID 占位符"""
    with open(CONFIG, "r", encoding="utf-8") as f:
        text = f.read()
    pattern = re.compile(
        r'("' + key + r'"\s*:\s*")([0-9a-fA-F-]{32,36}|REPLACE_[A-Z_]+)(")'
    )
    if not pattern.search(text):
        print(f"  ! 未在 {field} 中找到 {key}，请手动填写 {new_id}")
        return False
    text = pattern.sub(lambda m: m.group(1) + new_id + m.group(3), text)
    with open(CONFIG, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"  ✓ wrangler.jsonc 已写入 {key} = {new_id}")
    return True


def main() -> int:
    print("\n=== cf-press · Cloudflare 远程资源初始化 ===\n")

    # 0. 检查登录态
    step("检查 wrangler 登录状态")
    code, out, _ = run(["npx", "wrangler", "whoami"])
    if code != 0 or "not authenticated" in out.lower():
        print("\n  ✗ 尚未登录。请先执行：npx wrangler login\n")
        return 1
    print("  ✓ 已登录")

    # 1. D1
    step("D1 数据库")
    d1_id = None
    code, out, _ = run(["npx", "wrangler", "d1", "list"])
    if D1_NAME in out:
        d1_id = extract_uuid(out[out.index(D1_NAME):])
    if not d1_id:
        code2, out2, _ = run(["npx", "wrangler", "d1", "create", D1_NAME])
        d1_id = extract_uuid(out2) or extract_uuid(out)
    if not d1_id:
        print(f"  ✗ 无法获取 D1 ID，请手动创建：npx wrangler d1 create {D1_NAME}")
        return 1
    print(f"  ✓ D1 = {d1_id}")
    patch_config("d1_databases", "database_id", d1_id)

    # 2. KV
    step("KV 命名空间")
    kv_id = None
    code, out, _ = run(["npx", "wrangler", "kv", "namespace", "list"])
    if KV_TITLE in out:
        for pat in (
            r'"id"\s*:\s*"([0-9a-fA-F]{32})"[^}]*?"title"\s*:\s*"' + re.escape(KV_TITLE),
            r'"title"\s*:\s*"' + re.escape(KV_TITLE) + r'"[^}]*?"id"\s*:\s*"([0-9a-fA-F]{32})"',
        ):
            m = re.search(pat, out)
            if m:
                kv_id = m.group(1)
                break
    if not kv_id:
        code2, out2, _ = run(["npx", "wrangler", "kv", "namespace", "create", KV_TITLE])
        kv_id = extract_kv_id(out2) or extract_kv_id(out)
    if not kv_id:
        print(f"  ✗ 无法获取 KV ID，请手动创建：npx wrangler kv namespace create {KV_TITLE}")
        return 1
    print(f"  ✓ KV = {kv_id}")
    patch_config("kv_namespaces", "id", kv_id)

    # 3. R2（仅当 wrangler.jsonc 配置了 r2_buckets 时才创建；当前未启用 R2 则跳过）
    step("R2 对象存储桶")
    with open(CONFIG, "r", encoding="utf-8") as f:
        _cfg = f.read()
    if '"r2_buckets"' in _cfg:
        run(["npx", "wrangler", "r2", "bucket", "create", R2_BUCKET])
        print(f"  ✓ R2 = {R2_BUCKET}（若提示已存在可忽略）")
    else:
        print("  - 未配置 r2_buckets，跳过 R2（代码已用 if(!env.R2) 守卫）")

    # 4. Vectorize
    step("Vectorize 语义索引")
    run(
        [
            "npx", "wrangler", "vectorize", "create", VEC_INDEX,
            "--dimensions=1024", "--metric=cosine",
        ]
    )
    print(f"  ✓ Vectorize = {VEC_INDEX}（若提示已存在可忽略）")

    # 5. 建表
    step("初始化数据库表结构")
    run(
        [
            "npx", "wrangler", "d1", "execute", D1_NAME,
            "--remote", "--file=./schema.sql",
        ]
    )

    # 6. 演示数据
    step("写入演示文章")
    run(
        [
            "npx", "wrangler", "d1", "execute", D1_NAME,
            "--remote", "--file=./seed.sql",
        ]
    )

    print("\n=== 初始化完成 ===\n")
    print("接下来执行：\n")
    print("  1) npx wrangler secret put ADMIN_PASSWORD   # 设置初始管理员密码")
    print("  2) npm run deploy                           # 部署上线")
    print("  3) 把 wrangler.jsonc 里的 SITE_URL 改成真实域名，再 npm run deploy\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
