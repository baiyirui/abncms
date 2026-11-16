import { esc, fmtDate } from '../lib/util'
import type { PostRow, SiteSettings } from '../types'
import { page } from './layout'

interface TagLite {
  name: string
  slug: string
}

/** 边栏数据（热门文章 / 分类目录 / 热门标签） */
export interface SideData {
  hot: { id: number; slug: string; title: string; views: number }[]
  cats: { name: string; slug: string; post_count?: number }[]
  tags: { name: string; slug: string; post_count?: number }[]
}

/** 分页器 */
function pager(base: string, cur: number, total: number, perPage: number): string {
  const pages = Math.max(1, Math.ceil(total / perPage))
  if (pages <= 1) return ''
  const nums: number[] = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - cur) <= 2) nums.push(i)
  }
  let out = ''
  let last = 0
  for (const n of nums) {
    if (last && n - last > 1) out += `<span class="faint">…</span>`
    out += `<a class="num ${n === cur ? 'on' : ''}" href="${base}${base.includes('?') ? '&' : '?'}page=${n}">${n}</a>`
    last = n
  }
  return `<div class="pager">${out}</div>`
}

/** 右侧边栏：热门文章 / 分类目录 / 热门标签（参考站栏目） */
export function sidebarHtml(s: SideData): string {
  return `
<div class="widget"><h3>热门文章</h3>
  ${s.hot.length
    ? s.hot
        .map(
          (p) =>
            `<div class="w-post"><a href="/p/${esc(p.slug)}.html">${esc(p.title)}</a><span class="v">${p.views}</span></div>`
        )
        .join('')
    : '<div class="small faint">暂无文章</div>'}
</div>
<div class="widget"><h3>分类目录</h3><div class="w-cats">
  ${s.cats.length
    ? s.cats
        .map(
          (c) =>
            `<a class="tag" href="/c/${esc(c.slug)}">${esc(c.name)}${c.post_count != null ? ` <span class="faint">${c.post_count}</span>` : ''}</a>`
        )
        .join('')
    : '<span class="small faint">暂无分类</span>'}
</div></div>
<div class="widget"><h3>热门标签</h3><div class="w-cats">
  ${s.tags.length
    ? s.tags
        .map((t) => `<a class="tag" href="/t/${esc(t.slug)}">#${esc(t.name)}</a>`)
        .join('')
    : '<span class="small faint">暂无标签</span>'}
</div></div>`
}

/** 列表式文章条目：标题 + 摘要 + meta（作者/日期/阅读量），有封面时左侧缩略图 */
function postItem(p: PostRow): string {
  return `<article class="card post-item">
  ${p.cover ? `<a class="thumb" href="/p/${esc(p.slug)}.html"><img src="${esc(p.cover)}" alt="${esc(p.title)}" loading="lazy"></a>` : ''}
  <div class="body">
    <h2><a href="/p/${esc(p.slug)}.html">${esc(p.title)}</a></h2>
    <p class="excerpt">${esc(p.excerpt || p.ai_summary || '')}</p>
    <div class="meta">
      ${p.category_name ? `<a class="cat" href="/c/${esc(p.category_slug)}">${esc(p.category_name)}</a>` : ''}
      ${p.author_name ? `<span>${esc(p.author_name)}</span><span class="sep"></span>` : ''}
      <span>${fmtDate(p.published_at || p.created_at)}</span>
      <span class="sep"></span><span>${p.views} 阅读</span>
      ${p.pinned ? '<span class="sep"></span><span style="color:var(--warn);font-weight:600">置顶</span>' : ''}
    </div>
  </div>
</article>`
}

export function home(o: {
  posts: PostRow[]
  cur: number
  total: number
  perPage: number
  settings: SiteSettings
  side: SideData
}): string {
  // 顶部横幅：优先取置顶且带封面的文章，否则取任意带封面文章
  const bannerPost = o.posts.find((p) => p.pinned && p.cover) || o.posts.find((p) => p.cover)
  const banner = bannerPost
    ? `<a class="banner" href="/p/${esc(bannerPost.slug)}.html">
  <img src="${esc(bannerPost.cover)}" alt="${esc(bannerPost.title)}">
  <span class="cap">${esc(bannerPost.title)}</span>
</a>`
    : `<section class="hero"><h1>${esc(o.settings.site_name)}</h1><p>${esc(o.settings.site_description)}</p></section>`
  const body = `
${banner}
<div class="post-list">
  ${o.posts.length
    ? o.posts.map((p) => postItem(p)).join('\n')
    : '<div class="card empty">还没有文章，去后台写第一篇吧。</div>'}
</div>
${pager('/', o.cur, o.total, o.perPage)}`
  return page({
    title: o.cur > 1 ? `第 ${o.cur} 页` : '',
    settings: o.settings,
    body,
    active: '/',
    sidebar: sidebarHtml(o.side)
  })
}

export function archive(o: {
  posts: PostRow[]
  cur: number
  total: number
  perPage: number
  settings: SiteSettings
  side: SideData
}): string {
  const body = `
<div class="hero"><h1>归档</h1><p>共 ${o.total} 篇文章，按时间排序</p></div>
<div class="post-list">
  ${o.posts.length
    ? o.posts.map((p) => postItem(p)).join('\n')
    : '<div class="card empty">还没有文章。</div>'}
</div>
${pager('/archive', o.cur, o.total, o.perPage)}`
  return page({ title: '归档', settings: o.settings, body, active: '/archive', sidebar: sidebarHtml(o.side) })
}

export function categoryPage(o: {
  category: { name: string; slug: string; description: string }
  posts: PostRow[]
  cur: number
  total: number
  perPage: number
  settings: SiteSettings
  side: SideData
}): string {
  const body = `
<div class="hero"><h1>${esc(o.category.name)}</h1><p>${esc(o.category.description || `分类下共 ${o.total} 篇文章`)}</p></div>
<div class="post-list">
  ${o.posts.length
    ? o.posts.map((p) => postItem(p)).join('\n')
    : '<div class="card empty">该分类下暂无文章。</div>'}
</div>
${pager('/c/' + o.category.slug, o.cur, o.total, o.perPage)}`
  return page({
    title: o.category.name,
    settings: o.settings,
    body,
    active: '/c/' + o.category.slug,
    sidebar: sidebarHtml(o.side)
  })
}

export function tagPage(o: {
  tag: { name: string; slug: string }
  posts: PostRow[]
  cur: number
  total: number
  perPage: number
  settings: SiteSettings
  side: SideData
}): string {
  const body = `
<div class="hero"><h1>#${esc(o.tag.name)}</h1><p>共 ${o.total} 篇</p></div>
<div class="post-list">
  ${o.posts.length
    ? o.posts.map((p) => postItem(p)).join('\n')
    : '<div class="card empty">该标签下暂无文章。</div>'}
</div>
${pager('/t/' + o.tag.slug, o.cur, o.total, o.perPage)}`
  return page({
    title: '#' + o.tag.name,
    settings: o.settings,
    body,
    active: '/t/' + o.tag.slug,
    sidebar: sidebarHtml(o.side)
  })
}

export function tagsPage(o: { tags: any[]; settings: SiteSettings; side: SideData }): string {
  const body = `
<div class="hero"><h1>标签</h1><p>按主题浏览全部内容</p></div>
<div class="card pad" style="display:flex;flex-wrap:wrap;gap:10px">
  ${o.tags.length
    ? o.tags
        .map(
          (t) =>
            `<a class="tag" style="font-size:13.5px;padding:5px 13px" href="/t/${esc(t.slug)}">#${esc(t.name)} <span class="faint">${t.post_count}</span></a>`
        )
        .join('')
    : '<span class="muted">暂无标签</span>'}
</div>`
  return page({ title: '标签', settings: o.settings, body, active: '/tags', sidebar: sidebarHtml(o.side) })
}

export function searchPage(o: {
  q: string
  results: PostRow[]
  semantic: number[]
  settings: SiteSettings
  side: SideData
}): string {
  const list = o.results
  const body = `
<div class="hero"><h1>搜索</h1><p>支持关键词全文检索${o.semantic.length ? ' 与 Workers AI 语义匹配' : ''}</p></div>
<form class="searchbar" method="get" action="/search">
  <input class="input" name="q" value="${esc(o.q)}" placeholder="输入关键词后回车…" autofocus>
  <button class="btn primary" type="submit">搜索</button>
</form>
${o.q ? `<div class="small muted" style="margin:0 0 14px">找到 ${list.length} 条结果</div>` : ''}
<div class="post-list">
  ${list.length
    ? list
        .map(
          (p) =>
            postItem(p) +
            (o.semantic.includes(p.id)
              ? '<div class="small faint" style="margin:-8px 0 0 22px">语义匹配</div>'
              : '')
        )
        .join('\n')
    : o.q
      ? '<div class="card empty">没有找到匹配的文章，换个关键词试试。</div>'
      : ''}
</div>`
  return page({
    title: o.q ? `搜索：${o.q}` : '搜索',
    settings: o.settings,
    body,
    active: '/search',
    sidebar: sidebarHtml(o.side)
  })
}

export function postPage(o: {
  post: PostRow
  tags: TagLite[]
  comments: any[]
  related: PostRow[]
  prev: PostRow | null
  next: PostRow | null
  settings: SiteSettings
  allowComment: boolean
  siteKey: string
  side: SideData
}): string {
  const p = o.post
  const tsOff = !o.siteKey || /^(off|none|disabled)$/i.test(o.siteKey)
  const head = `<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.excerpt || p.ai_summary)}">
${p.cover ? `<meta property="og:image" content="${esc(p.cover)}">` : ''}
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.excerpt,
    datePublished: p.published_at,
    dateModified: p.updated_at
  }).replace(/</g, '\\u003c')}</script>`

  const body = `
<article class="article">
  <div class="article-head">
    <div class="meta" style="margin-bottom:12px">
      ${p.category_name ? `<a class="cat" href="/c/${esc(p.category_slug)}">${esc(p.category_name)}</a>` : ''}
      ${p.author_name ? `<span>${esc(p.author_name)}</span><span class="sep"></span>` : ''}
      <span>${fmtDate(p.published_at || p.created_at)}</span>
      <span class="sep"></span><span>${p.reading_time} 分钟阅读</span>
      <span class="sep"></span><span>${p.views} 次阅读</span>
    </div>
    <h1>${esc(p.title)}</h1>
  </div>
  ${p.cover ? `<img src="${esc(p.cover)}" alt="${esc(p.title)}" style="width:100%;border-radius:var(--radius);border:1px solid var(--border);margin-bottom:20px">` : ''}
  ${p.excerpt ? `<div class="intro-box"><div class="t">导语</div>${esc(p.excerpt)}</div>` : ''}
  ${p.ai_summary ? `<div class="card pad" style="background:var(--accent-soft);border-color:transparent"><div class="small" style="font-weight:600;color:var(--accent);margin-bottom:4px">AI 摘要</div>${esc(p.ai_summary)}</div>` : ''}
  <div class="prose">${p.content_html}</div>
  ${o.tags.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:28px 0 0">${o.tags
        .map((t) => `<a class="tag" href="/t/${esc(t.slug)}">#${esc(t.name)}</a>`)
        .join('')}</div>`
    : ''}

  <div class="signature">
    <div class="avatar">${esc((p.author_name || '编').slice(0, 1))}</div>
    <div class="right">
      <div class="name">${esc(p.author_name || '编辑部')}</div>
      <div class="sub">发布于 ${fmtDate(p.published_at || p.created_at)} · ${p.views} 次阅读</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:32px 0 0" class="grid2">
    ${o.prev ? `<a class="card pad" href="/p/${esc(o.prev.slug)}.html"><div class="small faint">上一篇</div><div style="font-weight:600;margin-top:3px">${esc(o.prev.title)}</div></a>` : '<span></span>'}
    ${o.next ? `<a class="card pad" href="/p/${esc(o.next.slug)}.html" style="text-align:right"><div class="small faint">下一篇</div><div style="font-weight:600;margin-top:3px">${esc(o.next.title)}</div></a>` : '<span></span>'}
  </div>

  ${
    o.related.length
      ? `<div class="card pad" style="margin:30px 0 0"><div class="small muted" style="font-weight:600;margin-bottom:6px">相关阅读</div>
    ${o.related
      .map(
        (r) =>
          `<div class="w-post"><a href="/p/${esc(r.slug)}.html">${esc(r.title)}</a><span class="v">${r.views} 阅读</span></div>`
      )
      .join('')}</div>`
      : ''
  }

  <div id="comments" style="margin:40px 0 0">
    <div class="small muted" style="font-weight:600;margin-bottom:14px">评论（${o.comments.length}）</div>
    ${
      o.comments.length
        ? o.comments
            .map(
              (c) => `<div class="card pad" style="margin-bottom:10px;padding:14px 18px">
        <div class="row small" style="margin-bottom:4px"><strong>${esc(c.author)}</strong><span class="faint">${fmtDate(c.created_at)}</span></div>
        <div style="font-size:14.5px">${esc(c.content).replace(/\n/g, '<br>')}</div>
      </div>`
            )
            .join('')
        : '<div class="small faint">还没有评论，来说两句。</div>'
    }
    ${
      o.allowComment
        ? `<form class="card pad" method="post" action="/comment" style="margin-top:18px">
      <input type="hidden" name="post_id" value="${p.id}">
      <div class="grid2">
        <div class="field"><label>昵称 *</label><input class="input" name="author" required maxlength="40"></div>
        <div class="field"><label>邮箱</label><input class="input" name="email" type="email" maxlength="80"></div>
      </div>
      <div class="field"><label>评论内容 *</label><textarea class="input" name="content" rows="4" required maxlength="1000"></textarea></div>
      ${tsOff ? '' : `<div class="field"><div class="cf-turnstile" data-sitekey="${esc(o.siteKey)}" data-theme="light"></div></div>`}
      <button class="btn primary" type="submit">提交评论</button>
    </form>`
        : ''
    }
  </div>
</article>`
  return page({
    title: p.title,
    description: p.excerpt || p.ai_summary || '',
    settings: o.settings,
    body,
    head:
      head +
      (o.allowComment && !tsOff
        ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" defer></script>'
        : ''),
    sidebar: sidebarHtml(o.side)
  })
}

export function notFound(settings: SiteSettings, side: SideData, msg = '页面不存在'): string {
  return page({
    title: '404',
    settings,
    body: `<div class="empty"><h1 style="font-size:44px;margin:0 0 8px">404</h1><p>${esc(msg)}</p>
    <p style="margin-top:18px"><a class="btn" href="/">回到首页</a></p></div>`,
    sidebar: sidebarHtml(side)
  })
}
