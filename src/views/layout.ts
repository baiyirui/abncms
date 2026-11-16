import { esc } from '../lib/util'
import type { SiteSettings } from '../types'

/** 全站共用 CSS —— 参考站风格：两栏布局 + 右侧栏目 + 列表式文章流，轻盈留白 */
export const CSS = `
*,*::before,*::after{box-sizing:border-box}
:root{
  --bg:#f7f8fa; --surface:#fff; --surface-2:#f6f7f9;
  --text:#16181d; --muted:#6b7280; --faint:#9aa1ac;
  --border:#ececf1; --border-strong:#e0e0e7;
  --accent:#2563eb; --accent-soft:#eff4ff; --danger:#dc2626; --ok:#16a34a; --warn:#d97706;
  --radius:12px; --radius-sm:8px;
  --shadow:0 1px 2px rgba(16,24,40,.04),0 3px 12px rgba(16,24,40,.05);
  --maxw:1200px;
}
@media (prefers-color-scheme:dark){
  :root{
    --bg:#0e1013; --surface:#16191e; --surface-2:#1d2127;
    --text:#e8eaed; --muted:#9aa1ac; --faint:#6b7280;
    --border:#262a31; --border-strong:#333941;
    --accent:#6d9bff; --accent-soft:#1a2337; --danger:#f87171; --ok:#4ade80; --warn:#fbbf24;
    --shadow:0 1px 2px rgba(0,0,0,.25),0 6px 20px rgba(0,0,0,.28);
  }
}
html{-webkit-text-size-adjust:100%}
body{
  margin:0;background:var(--bg);color:var(--text);
  font:16px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
}
a{color:inherit;text-decoration:none}
img{max-width:100%;height:auto}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}
.row{display:flex;align-items:center;gap:12px}
.grow{flex:1}
.muted{color:var(--muted)}
.faint{color:var(--faint)}
.small{font-size:13px}
.center{text-align:center}

/* ── Header：logo 左 / 导航右 ── */
.site-header{position:sticky;top:0;z-index:20;background:var(--surface);border-bottom:1px solid var(--border)}
.site-header .wrap{height:60px;display:flex;align-items:center;gap:18px}
.brand{font-size:18px;font-weight:700;letter-spacing:-.02em;display:flex;align-items:center;gap:9px}
.brand .dot{width:10px;height:10px;border-radius:3px;background:var(--accent);display:inline-block}
.nav{display:flex;gap:18px;font-size:14.5px;color:var(--muted)}
.nav a:hover,.nav a.on{color:var(--text)}
@media (max-width:720px){.nav{gap:13px;font-size:13.5px}.hide-sm{display:none}}

/* ── 两栏布局：主栏 + 右侧边栏 ── */
.layout{display:grid;grid-template-columns:minmax(0,1fr) 312px;gap:26px;align-items:start;padding-top:24px}
@media(max-width:960px){.layout{grid-template-columns:1fr;padding-top:18px}.sidebar{display:none}}
.sidebar{display:flex;flex-direction:column;gap:16px;position:sticky;top:76px}

/* ── 边栏栏目 ── */
.widget{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:15px 17px}
.widget h3{margin:0 0 10px;font-size:14.5px;font-weight:650;display:flex;align-items:center;gap:8px;letter-spacing:-.01em}
.widget h3::before{content:"";width:4px;height:14px;border-radius:2px;background:var(--accent)}
.w-post{display:flex;align-items:baseline;gap:10px;padding:7px 0;border-bottom:1px dashed var(--border);font-size:13.5px}
.w-post:last-child{border-bottom:0;padding-bottom:0}
.w-post a{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.w-post a:hover{color:var(--accent)}
.w-post .v{font-size:12px;color:var(--faint);flex-shrink:0}
.w-cats{display:flex;flex-wrap:wrap;gap:8px}

/* ── 顶部横幅（置顶/带封面文章） ── */
.banner{display:block;position:relative;border-radius:var(--radius);overflow:hidden;border:1px solid var(--border);box-shadow:var(--shadow);margin-bottom:20px}
.banner img{width:100%;aspect-ratio:21/8;object-fit:cover;display:block}
.banner .cap{position:absolute;left:0;right:0;bottom:0;padding:38px 18px 13px;background:linear-gradient(180deg,transparent,rgba(0,0,0,.58));color:#fff;font-size:16.5px;font-weight:620;letter-spacing:-.01em}
@media(max-width:720px){.banner img{aspect-ratio:16/9}}

/* ── 卡片 / 按钮 ── */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  height:36px;padding:0 15px;border-radius:var(--radius-sm);border:1px solid var(--border-strong);
  background:var(--surface);color:var(--text);font-size:14px;font-weight:500;cursor:pointer;
  transition:background .15s,border-color .15s,color .15s;white-space:nowrap
}
.btn:hover{background:var(--surface-2)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.btn.primary:hover{filter:brightness(1.08)}
.btn.danger{color:var(--danger);border-color:var(--border-strong)}
.btn.danger:hover{background:var(--danger);color:#fff;border-color:var(--danger)}
.btn.sm{height:30px;padding:0 11px;font-size:13px}
.btn.ghost{border-color:transparent;background:transparent}
.btn.ghost:hover{background:var(--surface-2)}

.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow)}
.pad{padding:22px}
.tag{
  display:inline-block;padding:2px 9px;border-radius:999px;background:var(--surface-2);
  color:var(--muted);font-size:12.5px;border:1px solid var(--border)
}
.badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600}
.badge.pub{background:var(--accent-soft);color:var(--accent)}
.badge.draft{background:var(--surface-2);color:var(--muted)}
.badge.pin{background:#fff1e6;color:var(--warn)}

/* ── 页头标题区 ── */
.hero{padding:8px 0 18px}
.hero h1{margin:0 0 8px;font-size:26px;line-height:1.3;letter-spacing:-.025em;font-weight:680}
.hero p{margin:0;color:var(--muted);font-size:15px}
@media (max-width:720px){.hero h1{font-size:22px}}

/* ── 文章列表（列表式：标题+摘要+meta，可选左侧缩略图） ── */
.post-list{display:flex;flex-direction:column;gap:14px;margin:0 0 10px}
.post-item{display:flex;gap:16px;padding:18px 20px;transition:border-color .15s}
.post-item:hover{border-color:var(--border-strong)}
.post-item .thumb{width:120px;height:84px;border-radius:var(--radius-sm);overflow:hidden;flex-shrink:0;background:var(--surface-2)}
.post-item .thumb img{width:100%;height:100%;object-fit:cover;display:block}
.post-item .body{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.post-item h2{margin:0;font-size:17.5px;line-height:1.45;font-weight:620;letter-spacing:-.01em}
.post-item h2 a:hover{color:var(--accent)}
.post-item .excerpt{margin:0;color:var(--muted);font-size:14px;line-height:1.7;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.meta{display:flex;flex-wrap:wrap;align-items:center;gap:10px;font-size:13px;color:var(--faint)}
.meta .sep{width:3px;height:3px;border-radius:50%;background:var(--border-strong)}
.meta .cat{color:var(--accent);font-weight:600;font-size:12.5px;background:var(--accent-soft);padding:1px 8px;border-radius:6px}

/* ── 文章正文 ── */
.article{padding:10px 0 40px}
.article-head{margin-bottom:24px}
.article-head h1{margin:0 0 12px;font-size:28px;line-height:1.35;letter-spacing:-.025em;font-weight:680}
@media (max-width:720px){.article-head h1{font-size:22px}}
.prose{font-size:16.5px;line-height:1.85;color:var(--text);word-wrap:break-word}
.prose h1,.prose h2,.prose h3,.prose h4{line-height:1.4;letter-spacing:-.015em;margin:1.9em 0 .7em;font-weight:640}
.prose h1{font-size:25px}.prose h2{font-size:21px}.prose h3{font-size:18px}.prose h4{font-size:16px}
.prose p{margin:0 0 1.15em}
.prose ul,.prose ol{margin:0 0 1.15em;padding-left:1.5em}
.prose li{margin:.3em 0}
.prose blockquote{margin:1.4em 0;padding:2px 0 2px 18px;border-left:3px solid var(--accent);color:var(--muted)}
.prose blockquote p{margin:.4em 0}
.prose pre{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);
  padding:15px 17px;overflow-x:auto;font-size:13.5px;line-height:1.7;margin:0 0 1.3em}
.prose code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9em}
.prose :not(pre)>code{background:var(--surface-2);border:1px solid var(--border);padding:1px 5px;border-radius:5px}
.prose img{border-radius:var(--radius-sm);border:1px solid var(--border);margin:.6em 0}
.prose hr{border:0;border-top:1px solid var(--border);margin:2em 0}
.prose a{color:var(--accent);text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
.prose table{border-collapse:collapse;width:100%;margin:0 0 1.3em;font-size:14.5px}
.prose th,.prose td{border:1px solid var(--border);padding:8px 12px;text-align:left}
.prose th{background:var(--surface-2);font-weight:600}
.table-wrap{overflow-x:auto}

/* ── 导语框 / 落款 ── */
.intro-box{background:var(--surface-2);border-left:3px solid var(--accent);border-radius:var(--radius-sm);padding:13px 16px;color:var(--muted);font-size:15px;line-height:1.85;margin:0 0 24px}
.intro-box .t{font-size:12px;font-weight:700;color:var(--accent);letter-spacing:.04em;margin:0 0 5px}
.signature{margin:32px 0 0;padding-top:16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:13px;color:var(--muted);font-size:13.5px}
.signature .avatar{width:40px;height:40px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:650;font-size:17px;flex-shrink:0}
.signature .right{line-height:1.55}
.signature .right .name{color:var(--text);font-weight:600}
.signature .right .sub{font-size:12.5px;color:var(--faint)}

/* ── 分页（居中） ── */
.pager{display:flex;gap:8px;align-items:center;justify-content:center;padding:14px 0 40px}
.pager .num{min-width:34px;height:34px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;
  border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--surface)}
.pager .num.on{background:var(--accent);color:#fff;border-color:var(--accent)}

/* ── 表单 ── */
.field{margin-bottom:16px}
.field label{display:block;font-size:13.5px;font-weight:600;margin-bottom:6px}
.input,select.input,textarea.input{
  width:100%;padding:9px 12px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);
  background:var(--surface);color:var(--text);font:inherit;font-size:14.5px;outline:none
}
.input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
textarea.input{resize:vertical;line-height:1.7}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media (max-width:720px){.grid2{grid-template-columns:1fr}}

/* ── 提示条 ── */
.alert{padding:10px 14px;border-radius:var(--radius-sm);font-size:14px;margin-bottom:16px;border:1px solid}
.alert.err{background:#fef2f2;border-color:#fecaca;color:#b91c1c}
.alert.ok{background:#f0fdf4;border-color:#bbf7d0;color:#15803d}
@media (prefers-color-scheme:dark){
  .alert.err{background:#2a1516;border-color:#5b2b2c;color:#fca5a5}
  .alert.ok{background:#12241a;border-color:#2b5a3c;color:#86efac}
}

/* ── 后台 ── */
.admin{display:grid;grid-template-columns:212px 1fr;gap:26px;max-width:var(--maxw);margin:0 auto;padding:26px 24px 60px}
@media (max-width:860px){.admin{grid-template-columns:1fr}.admin .side{display:none}}
.admin .side .menu{display:flex;flex-direction:column;gap:2px;position:sticky;top:80px}
.admin .side .menu a{padding:8px 12px;border-radius:9px;font-size:14px;color:var(--muted)}
.admin .side .menu a:hover{background:var(--surface-2);color:var(--text)}
.admin .side .menu a.on{background:var(--accent-soft);color:var(--accent);font-weight:600}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:22px}
.stat{padding:16px 18px}
.stat .n{font-size:26px;font-weight:680;letter-spacing:-.02em}
.stat .l{font-size:12.5px;color:var(--muted);margin-top:2px}
table.tbl{width:100%;border-collapse:collapse;font-size:14px}
table.tbl th,table.tbl td{padding:10px 12px;border-bottom:1px solid var(--border);text-align:left}
table.tbl th{font-size:12.5px;color:var(--muted);font-weight:600;background:var(--surface-2)}
table.tbl tr:last-child td{border-bottom:0}
.editor-wrap{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media (max-width:980px){.editor-wrap{grid-template-columns:1fr}}
#md{min-height:520px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;line-height:1.7}
#preview{min-height:520px;overflow:auto;background:var(--surface-2)}

/* ── 搜索框 ── */
.searchbar{display:flex;gap:8px;margin:6px 0 16px}
.searchbar .input{height:38px}

/* ── 空状态 / 页脚（居中） ── */
.empty{padding:56px 20px;text-align:center;color:var(--muted)}
.site-footer{border-top:1px solid var(--border);padding:24px 0 36px;color:var(--faint);font-size:13px;margin-top:14px}
.site-footer .wrap{display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center}
`

export interface PageOpts {
  title: string
  settings: SiteSettings
  body: string
  active?: string
  head?: string
  description?: string
  user?: { username: string; display_name: string } | null
  wide?: boolean
  /** 右侧边栏 HTML（传入后正文改为两栏布局） */
  sidebar?: string
}

/** 前台页面外壳：logo 左 / 导航右，可选两栏布局与边栏 */
export function page(o: PageOpts): string {
  const s = o.settings
  const nav = [
    ['/', '首页'],
    ['/archive', '归档'],
    ['/tags', '标签'],
    ['/search', '搜索']
  ]
  const main = o.sidebar
    ? `<div class="layout"><div>${o.body}</div><aside class="sidebar">${o.sidebar}</aside></div>`
    : o.body
  // 访问统计：页面 HTML 由 CDN 边缘缓存供给，Worker 不执行，所以浏览量改由
  // 前端异步打点 + 服务端按采样权重聚合。关闭统计后不注入任何脚本，
  // 前台即成为纯静态供给（命中时 Workers / D1 / KV 消耗均为 0）。
  const hitScript =
    s.analytics_enabled === '0'
      ? ''
      : `<script>(function(){try{
if(navigator.webdriver)return;
if(Math.random()>0.25)return;
var f=new URLSearchParams();f.set('p',location.pathname);f.set('w','4');
if(navigator.sendBeacon)navigator.sendBeacon('/api/hit',f);
else fetch('/api/hit',{method:'POST',body:f,keepalive:true});
}catch(e){}})();</script>`
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)}${o.title ? ' · ' : ''}${esc(s.site_name)}</title>
<meta name="description" content="${esc(o.description || s.site_description)}">
<meta name="keywords" content="${esc(s.site_keywords)}">
<meta property="og:title" content="${esc(o.title || s.site_name)}">
<meta property="og:description" content="${esc(o.description || s.site_description)}">
<meta property="og:type" content="website">
<link rel="alternate" type="application/rss+xml" title="${esc(s.site_name)}" href="/feed.xml">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>${CSS}</style>
${o.head || ''}
</head>
<body>
<header class="site-header"><div class="wrap">
  <a class="brand" href="/">${s.site_logo && /^https?:\/\//.test(s.site_logo) ? `<img src="${esc(s.site_logo)}" alt="${esc(s.site_name)}" style="height:${Math.min(120, Math.max(24, Number(s.site_logo_height) || 36))}px;max-width:200px;object-fit:contain">` : `<span class="dot"></span>${esc(s.site_name)}`}</a>
  <span class="grow"></span>
  <nav class="nav">
    ${nav
      .map(
        ([href, label]) =>
          `<a class="${o.active === href ? 'on' : ''}" href="${href}">${esc(label)}</a>`
      )
      .join('')}
    <a class="hide-sm" href="/admin">后台</a>
  </nav>
  <a class="btn sm hide-sm" href="/search">搜索</a>
</div></header>
<main class="${o.wide ? '' : 'wrap'}">${main}</main>
<footer class="site-footer"><div class="wrap">
  <span>${esc(s.footer_text)}</span>
  <span>© ${new Date().getFullYear()} ${esc(s.site_name)}</span>
</div></footer>
${hitScript}
</body></html>`
}

/** 后台页面外壳（含侧边栏与登录态） */
export function adminPage(o: {
  title: string
  body: string
  active: string
  user: { username: string; display_name: string }
  settings: SiteSettings
  head?: string
}): string {
  const menu = [
    ['/admin', '概览'],
    ['/admin/posts', '文章'],
    ['/admin/post/new', '写文章'],
    ['/admin/categories', '分类'],
    ['/admin/comments', '评论'],
    ['/admin/media', '媒体库'],
    ['/admin/settings', '设置']
  ]
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)} · 后台 · ${esc(o.settings.site_name)}</title>
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>${CSS}</style>
${o.head || ''}
</head>
<body>
<header class="site-header"><div class="wrap">
  <a class="brand" href="/">${o.settings.site_logo && /^https?:\/\//.test(o.settings.site_logo) ? `<img src="${esc(o.settings.site_logo)}" alt="${esc(o.settings.site_name)}" style="height:${Math.min(120, Math.max(24, Number(o.settings.site_logo_height) || 36))}px;max-width:200px;object-fit:contain">` : `<span class="dot"></span>${esc(o.settings.site_name)}`}</a>
  <span class="grow"></span>
  <a class="btn sm" href="/" target="_blank">查看站点</a>
  <span class="small muted">${esc(o.user.display_name || o.user.username)}</span>
  <a class="btn sm danger" href="/admin/logout">退出</a>
</div></header>
<div class="admin">
  <aside class="side"><nav class="menu">
    ${menu
      .map(
        ([href, label]) =>
          `<a class="${o.active === href ? 'on' : ''}" href="${href}">${esc(label)}</a>`
      )
      .join('')}
  </nav></aside>
  <section>${o.body}</section>
</div>
</body></html>`
}

/** 纯登录页（无侧栏） */
export function loginPage(o: {
  error?: string
  settings: SiteSettings
  siteKey: string
  csrf: string
}): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>登录 · ${esc(o.settings.site_name)}</title>
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" defer></script>
<style>${CSS}
.login-box{max-width:380px;margin:11vh auto 0;padding:28px}
.login-box h1{margin:0 0 4px;font-size:21px;font-weight:650;letter-spacing:-.02em}
.login-box .sub{color:var(--muted);font-size:13.5px;margin-bottom:22px}
</style>
</head>
<body>
<div class="wrap">
<form class="card login-box" method="post" action="/admin/login">
  <h1>${esc(o.settings.site_name)}</h1>
  <div class="sub">后台管理登录</div>
  ${o.error ? `<div class="alert err">${esc(o.error)}</div>` : ''}
  <input type="hidden" name="csrf" value="${esc(o.csrf)}">
  <div class="field">
    <label for="u">用户名</label>
    <input class="input" id="u" name="username" autocomplete="username" required autofocus>
  </div>
  <div class="field">
    <label for="p">密码</label>
    <input class="input" id="p" name="password" type="password" autocomplete="current-password" required>
  </div>
  <div class="field">
    <div class="cf-turnstile" data-sitekey="${esc(o.siteKey)}" data-theme="light"></div>
  </div>
  <button class="btn primary" style="width:100%;height:40px" type="submit">登录</button>
  <div class="center small faint" style="margin-top:16px">Cloudflare Workers · D1 · Turnstile</div>
</form>
</div>
</body></html>`
}
