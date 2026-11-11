#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
cf-press 端到端冒烟测试
用法：先 `npx wrangler dev --port 8787 --local`，再 `python scripts/smoke_test.py [base_url]
"""
import http.cookiejar
import json
import os
import sys
import urllib.parse
import urllib.request
import uuid

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8787").rstrip("/")

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
opener.addheaders = [("User-Agent", "cf-press-smoke/1.0")]

results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("  PASS  " if ok else "  FAIL  ") + name + (("  -> " + str(detail)) if detail else ""))


def get(path):
    with opener.open(BASE + path, timeout=30) as r:
        return r.status, r.read().decode("utf-8", "ignore")


def post(path, data):
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(BASE + path, data=body)
    try:
        with opener.open(req, timeout=30) as r:
            return r.status, r.read().decode("utf-8", "ignore")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "ignore")


def post_json(path, obj):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(obj).encode(),
        headers={"content-type": "application/json"},
    )
    with opener.open(req, timeout=30) as r:
        return r.status, json.loads(r.read().decode("utf-8", "ignore"))


def post_file(path, field, filename, content, ctype="image/png"):
    boundary = "----cfpress" + uuid.uuid4().hex
    body = b""
    body += f"--{boundary}\r\n".encode()
    body += f'Content-Disposition: form-data; name="{field}"; filename="{filename}"\r\n'.encode()
    body += f"Content-Type: {ctype}\r\n\r\n".encode()
    body += content + b"\r\n"
    body += f"--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        BASE + path,
        data=body,
        headers={"content-type": f"multipart/form-data; boundary={boundary}"},
    )
    with opener.open(req, timeout=60) as r:
        return r.status, json.loads(r.read().decode("utf-8", "ignore"))


print(f"\n== cf-press 冒烟测试 · {BASE} ==\n")

# 1. 前台
for path, needle in [
    ("/", "post-item"),
    ("/p/hello-cloudflare", "prose"),
    ("/archive", "归档"),
    ("/tags", "标签"),
    ("/search?q=Cloudflare", "搜索"),
    ("/feed.xml", "<rss"),
    ("/sitemap.xml", "<urlset"),
    ("/api/health", "cloudflare-workers"),
]:
    try:
        st, txt = get(path)
        check(f"GET {path}", st == 200 and needle in txt, f"status={st}")
    except Exception as e:
        check(f"GET {path}", False, e)

# 2. 未登录访问后台应跳转
st, _ = get("/admin/posts")
check("未登录访问 /admin/posts 应跳登录页", "后台管理登录" in _ or st != 200, f"status={st}")

# 3. 登录
# 管理员凭证从环境变量读取，避免在仓库里写死任何账号密码
st, _ = post("/admin/login", {
    "username": os.environ.get("SMOKE_ADMIN_USER", "admin"),
    "password": os.environ.get("SMOKE_ADMIN_PASS", ""),
})
has_sid = any(c.name == "sid" for c in jar)
check("POST /admin/login", has_sid, f"status={st}")

# 4. 后台页面
for path, needle in [
    ("/admin", "概览"),
    ("/admin/posts", "文章"),
    ("/admin/post/new", "Markdown 正文"),
    ("/admin/categories", "新增分类"),
    ("/admin/comments", "评论"),
    ("/admin/media", "上传到 R2"),
    ("/admin/settings", "站点信息"),
]:
    try:
        st, txt = get(path)
        check(f"GET {path}", st == 200 and needle in txt, f"status={st}")
    except Exception as e:
        check(f"GET {path}", False, e)

# 5. 新建文章
title = "冒烟测试文章 " + uuid.uuid4().hex[:6]
md = (
    "## 小标题\n\n这是一段 **加粗** 的正文，带 `行内代码`。\n\n"
    "- 列表项一\n- 列表项二\n\n> 引用一句话\n\n```js\nconsole.log('hi')\n```\n"
)
st, _ = post(
    "/admin/post/new",
    {
        "title": title,
        "content_md": md,
        "status": "published",
        "tags": "冒烟,Cloudflare",
        "category_id": "1",
    },
)
check("POST /admin/post/new", st in (200, 302), f"status={st}")

st, txt = get("/admin/posts")
check("新文章出现在后台列表", title in txt, f"status={st}")

st, txt = get("/")
check("新文章出现在前台首页", title in txt, f"status={st}")

# 6. Markdown 渲染
st, txt = get("/")
idx = txt.find(title)
slug = ""
if idx > 0:
    frag = txt[max(0, idx - 300):idx]
    import re

    m = re.findall(r'/p/([A-Za-z0-9%\-_一-龥]+)', frag)
    slug = m[-1] if m else ""
if slug:
    st, txt = get("/p/" + urllib.parse.quote(slug, safe=""))
    check("文章详情渲染 Markdown", "<h2>" in txt and "<strong>" in txt and "<pre>" in txt, f"slug={slug}")
else:
    check("文章详情渲染 Markdown", False, "未能定位 slug")

# 7. API
st, j = post_json("/api/preview", {"md": "# 标题\n\n**粗体**"})
check("POST /api/preview", st == 200 and "<strong>粗体</strong>" in j.get("html", ""), j.get("html", "")[:60])

# 8. 图片上传 R2
png = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
    b"\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00"
    b"\x00\x00IEND\xaeB`\x82"
)
st, j = post_file("/api/upload", "file", "smoke.png", png)
url = j.get("url", "")
check("POST /api/upload (R2)", st == 200 and url.startswith("/media/"), url)
if url:
    st, _ = get(url)
    check("GET " + url, st == 200, f"status={st}")

# 9. 评论
if slug:
    st, _ = post("/comment", {"post_id": "1", "author": "冒烟", "content": "测试评论内容"})
    check("POST /comment", st in (200, 302), f"status={st}")

# 10. 退出
st, _ = get("/admin/logout")
check("GET /admin/logout", st in (200, 302), f"status={st}")

passed = sum(1 for _, ok, _ in results if ok)
print(f"\n== 结果：{passed}/{len(results)} 通过 ==\n")
sys.exit(0 if passed == len(results) else 1)
