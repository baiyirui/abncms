import { Hono } from 'hono'
import type { Env, PostRow, SessionUser, SiteSettings } from './types'
import * as db from './lib/db'
import * as auth from './lib/auth'
import { aiSummary, aiTags, indexPost, removeFromIndex, semanticSearch } from './lib/ai'
import { renderMarkdown, firstImage } from './lib/markdown'
import {
  imgbedConfig,
  imgbedUpload,
  imgbedDelete,
  imgbedTest,
  IMGBED_CHANNELS
} from './lib/imgbed'
import { sealSecret, tokenHint, configCryptoReady } from './lib/crypto'
import {
  esc,
  slugify,
  nowSql,
  readingTime,
  plainExcerpt,
  paginate,
  buildCookie,
  randomToken
} from './lib/util'
import * as V from './views/front'
import { loginPage } from './views/layout'
import * as A from './views/admin'

const app = new Hono<{ Bindings: Env }>()

// ── 通用中间件：把站点设置与登录态挂到 context ──────────────────────────────
app.use('*', async (c, next) => {
  const env = c.env
  ;(c as any).set('settings', await db.getSettings(env))
  // 匿名请求不查会话 KV：免费额度里 KV 读虽宽裕，但 CDN 未命中时
  // 这一笔读完全没必要，跳过可让「静态供给」路径只依赖一次设置读。
  const cookie = c.req.header('cookie') || ''
  const user = /(?:^|;\s*)sid=/.test(cookie) ? await auth.readSession(env, cookie) : null
  ;(c as any).set('user', user)
  await next()
})

const S = (c: any): SiteSettings => c.get('settings')
const U = (c: any): SessionUser | null => c.get('user')

/** 后台登录守卫 */
const guard = async (c: any, next: any) => {
  if (!U(c)) return c.redirect('/admin/login')
  await next()
}

/** 简单的跨站 POST 防护：校验 Origin 与 Host 一致 */
function sameOrigin(c: any): boolean {
  const o = c.req.header('origin')
  if (!o) return true
  try {
    return new URL(o).host === new URL(c.req.url).host
  } catch {
    return false
  }
}

/**
 * 前台 HTML 输出：一律 no-store，缓存交给 Worker 内的 KV 层（见 cachedPage）。
 * 这样浏览器/CDN 不会缓存旧页面，发布后改 cache_gen 即可让全站立刻更新，
 * 同时命中 KV 的请求不再查 D1 —— 兼顾「像正常 CMS 一样即时」与低额度。
 * 登录态同样 no-store，防止草稿泄露与会话串号。
 */
function html(c: any, body: string, _cacheSeconds = 0) {
  return c.body(body, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
  })
}

/** 渲染结果前缀：标记「这页不许缓存」（404 / 草稿），避免错误内容被供给 7 天 */
const NO_CACHE = '<!--abncms:nocache-->'

/**
 * 页面级边缘缓存（Cloudflare Cache API，**不占 KV 额度**）：
 *  - 只有匿名访客且开启 enable_page_cache 时才读/写；
 *  - key = 完整 URL（含 ?page= 分页参数）+ cache_gen，发布时代数 +1，
 *    旧缓存自动不再命中，7 天后由 TTL 清理，完全不需要 purge；
 *  - 命中 0 次 D1、0 次 KV 写、0 次 KV 读（设置由中间件读一次）；
 *  - 未命中才渲染并写边缘缓存，KV 免费额度 1,000 写/天完全留给会话等真正需要的地方。
 */
async function cachedPage(
  c: any,
  s: SiteSettings,
  render: () => Promise<string>,
  ttl = 604800
): Promise<Response> {
  const canCache = !U(c) && s.enable_page_cache !== '0'
  if (canCache) {
    const url = new URL(c.req.url)
    url.searchParams.set('__abn_g', s.cache_gen || '1')
    const key = new Request(url.toString(), { method: 'GET' })
    const cache = caches.default
    try {
      const hit = await cache.match(key)
      // 缓存里存的是公开缓存响应；返回给浏览器时改回 no-store，
      // 保证用户硬刷新就能拿到新版本，不被浏览器自己缓存住。
      if (hit) {
        const res = html(c, await hit.text())
        res.headers.set('x-abn-cache', 'HIT')
        return res
      }
    } catch {
      /* Cache API 不可用时降级为实时渲染，不影响可用性 */
    }
    const body = await render()
    if (body.startsWith(NO_CACHE)) return html(c, body.slice(NO_CACHE.length))
    const cacheable = new Response(body, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': `public, max-age=${ttl}`
      }
    })
    c.executionCtx.waitUntil(cache.put(key, cacheable).catch(() => undefined))
    const res = html(c, body)
    res.headers.set('x-abn-cache', 'MISS')
    return res
  }
  const body = await render()
  return html(c, body.startsWith(NO_CACHE) ? body.slice(NO_CACHE.length) : body)
}

/**
 * XML 缓存（RSS / Sitemap）：与页面共用 cache_gen 代数，
 * 命中直接返回，不查 D1；发布、改文、改设置时随代数一起失效。
 * 爬虫高频抓取这两处时，不再每次扫描整张 posts 表。
 */
async function cachedXml(c: any, s: SiteSettings, contentType: string, render: () => Promise<string>): Promise<Response> {
  const url = new URL(c.req.url)
  url.searchParams.set('__abn_g', s.cache_gen || '1')
  const key = new Request(url.toString(), { method: 'GET' })
  const cache = caches.default
  try {
    const hit = await cache.match(key)
    if (hit) {
      const body = await hit.text()
      return c.body(body, { headers: { 'content-type': contentType, 'cache-control': 'public, max-age=300' } })
    }
  } catch {
    /* 缓存不可用时降级实时渲染 */
  }
  const xml = await render()
  const cacheable = new Response(xml, {
    headers: { 'content-type': contentType, 'cache-control': 'public, max-age=86400' }
  })
  c.executionCtx.waitUntil(cache.put(key, cacheable).catch(() => undefined))
  return c.body(xml, { headers: { 'content-type': contentType, 'cache-control': 'public, max-age=300' } })
}

/** 边栏数据：热门文章 / 分类目录 / 热门标签（KV 缓存 30 分钟） */
async function side(env: Env, s?: SiteSettings): Promise<import('./views/front').SideData> {
  const hit = await env.KV.get('side:v1', 'json')
  if (hit) return hit as import('./views/front').SideData
  // 关掉热门文章后，热门那条 D1 查询直接不执行
  const wantHot = !s || s.enable_hot !== '0'
  const wantLinks = !s || s.enable_links === '1'
  const [hotRes, cats, tags, linksRes] = await Promise.all([
    wantHot
      ? env.DB.prepare(
          "SELECT id, slug, title, views FROM posts WHERE status = 'published' ORDER BY views DESC LIMIT 8"
        ).all<any>()
      : Promise.resolve({ results: [] as any[] }),
    db.listCategories(env),
    db.listTags(env),
    wantLinks
      ? env.DB.prepare('SELECT name, url, description FROM links WHERE enabled=1 ORDER BY sort_order,id LIMIT 12').all<any>()
      : Promise.resolve({ results: [] as any[] })
  ])
  const data = {
    hot: hotRes.results || [],
    cats: (cats || []).map((c: any) => ({ name: c.name, slug: c.slug, post_count: c.post_count })),
    tags: (tags || []).slice(0, 18).map((t: any) => ({ name: t.name, slug: t.slug, post_count: t.post_count })),
    links: (linksRes.results || []).map((l: any) => ({ name: l.name, url: l.url, description: l.description || '' }))
  }
  // 侧栏低频写：TTL 6 小时（发布/分类/评论变更都会主动删除），
  // 从 48 次写/天降到 4 次/天，给 KV 免费额度留出余量
  await env.KV.put('side:v1', JSON.stringify(data), { expirationTtl: 21600 })
  return data
}

// ═══════════════════════════════════════════════════════════════════════════
//  前台
// ═══════════════════════════════════════════════════════════════════════════

app.get('/', async (c) => {
  const env = c.env
  const s = S(c)
  const perPage = Math.min(50, Math.max(1, Number(s.posts_per_page) || 10))
  const { page, offset } = paginate(c.req.query(), perPage)

  return cachedPage(c, s, async () => {
    const [posts, total] = await Promise.all([
      db.listPosts(env, { status: 'published', limit: perPage, offset }),
      db.countPosts(env, { status: 'published' })
    ])
    return V.home({ posts, cur: page, total, perPage, settings: s, side: await side(env, s) })
  })
})

app.get('/archive', async (c) => {
  const env = c.env
  const s = S(c)
  const perPage = 40
  const { page, offset } = paginate(c.req.query(), perPage)
  return cachedPage(c, s, async () => {
    const [posts, total] = await Promise.all([
      db.listPosts(env, { status: 'published', limit: perPage, offset }),
      db.countPosts(env, { status: 'published' })
    ])
    return V.archive({ posts, cur: page, total, perPage, settings: s, side: await side(env, s) })
  })
})

app.get('/c/:slug', async (c) => {
  const env = c.env
  const s = S(c)
  const cat = await env.DB.prepare('SELECT * FROM categories WHERE slug = ?')
    .bind(c.req.param('slug'))
    .first<any>()
  if (!cat) return html(c, V.notFound(s, await side(env, s), '分类不存在'))
  const perPage = Number(s.posts_per_page) || 10
  const { page, offset } = paginate(c.req.query(), perPage)
  return cachedPage(c, s, async () => {
    const [posts, total] = await Promise.all([
      db.listPosts(env, { status: 'published', categoryId: cat.id, limit: perPage, offset }),
      db.countPosts(env, { status: 'published', categoryId: cat.id })
    ])
    return V.categoryPage({ category: cat, posts, cur: page, total, perPage, settings: s, side: await side(env, s) })
  })
})

app.get('/t/:slug', async (c) => {
  const env = c.env
  const s = S(c)
  const tag = await env.DB.prepare('SELECT * FROM tags WHERE slug = ?').bind(c.req.param('slug')).first<any>()
  if (!tag) return html(c, V.notFound(s, await side(env, s), '标签不存在'))
  const perPage = Number(s.posts_per_page) || 10
  const { page, offset } = paginate(c.req.query(), perPage)
  return cachedPage(c, s, async () => {
    const [posts, total] = await Promise.all([
      db.listPosts(env, { status: 'published', tagId: tag.id, limit: perPage, offset }),
      db.countPosts(env, { status: 'published', tagId: tag.id })
    ])
    return V.tagPage({ tag, posts, cur: page, total, perPage, settings: s, side: await side(env, s) })
  })
})

app.get('/tags', async (c) => {
  const s = S(c)
  return cachedPage(c, s, async () =>
    V.tagsPage({ tags: await db.listTags(c.env), settings: s, side: await side(c.env, s) })
  )
})

app.get('/search', async (c) => {
  const env = c.env
  const s = S(c)
  const q = (c.req.query('q') || '').trim()
  if (!q) return html(c, V.searchPage({ q: '', results: [], semantic: [], settings: s, side: await side(env, s) }))

  const kw = await db.searchPosts(env, q, 30)
  const seen = new Set(kw.map((p) => p.id))
  const semIds: number[] = []
  const extra: PostRow[] = []

  // 语义搜索默认关闭：Workers AI / Vectorize 会额外吃额度，站长可自行开启
  if (s.enable_semantic === '1') {
    const sem = await semanticSearch(env, q, 8)
    for (const m of sem) {
      if (seen.has(m.id)) {
        semIds.push(m.id)
        continue
      }
      const p = await db.getPostById(env, m.id)
      if (p && p.status === 'published') {
        extra.push(p)
        semIds.push(p.id)
        seen.add(p.id)
      }
    }
  }

  const results = [...kw, ...extra]
  return html(c, V.searchPage({ q, results, semantic: semIds, settings: s, side: await side(env, s) }))
})

/** 文章页：/p/{slug}.html 为正式地址；老 /p/{slug} 301 过去，保住旧链接权重 */
const articleRoute = async (c: any) => {
  const env: Env = c.env
  const s = S(c)
  const raw = c.req.param('slug')
  if (!raw.endsWith('.html')) return c.redirect('/p/' + raw + '.html', 301)
  const slug = raw.slice(0, -5)

  return cachedPage(c, s, async () => {
    const p = await db.getPostBySlug(env, slug)
    // 404 与未登录草稿绝不进 KV，否则会错误供给所有访客 7 天
    if (!p) return NO_CACHE + V.notFound(s, await side(env, s), '文章不存在')
    if (p.status !== 'published' && !U(c))
      return NO_CACHE + V.notFound(s, await side(env, s), '文章不存在')

    const [tags, comments] = await Promise.all([
      db.getPostTags(env, p.id),
      s.allow_comments === '1' ? db.listComments(env, p.id, true) : Promise.resolve([])
    ])

    // 上下篇 / 相关阅读都可用开关关掉，省下 2~3 次 D1 查询
    let prev: PostRow | null = null
    let next: PostRow | null = null
    if (s.enable_prevnext !== '0') {
      prev = await env.DB.prepare(
        "SELECT id, slug, title FROM posts WHERE status='published' AND COALESCE(published_at,created_at) < ? ORDER BY COALESCE(published_at,created_at) DESC LIMIT 1"
      ).bind(p.published_at || p.created_at).first<PostRow>()
      next = await env.DB.prepare(
        "SELECT id, slug, title FROM posts WHERE status='published' AND COALESCE(published_at,created_at) > ? ORDER BY COALESCE(published_at,created_at) ASC LIMIT 1"
      ).bind(p.published_at || p.created_at).first<PostRow>()
    }
    let rel: PostRow[] = []
    if (s.enable_related !== '0' && p.category_id) {
      const related = await db.listPosts(env, { status: 'published', categoryId: p.category_id, limit: 4, offset: 0 })
      rel = related.filter((r) => r.id !== p.id).slice(0, 3)
    }

    return V.postPage({
      post: p,
      tags,
      comments,
      related: rel,
      prev: prev || null,
      next: next || null,
      settings: s,
      allowComment: s.allow_comments === '1',
      siteKey: env.TURNSTILE_SITE_KEY || '',
      side: await side(env, s)
    })
  })
}
app.get('/p/:slug', articleRoute)

/** 独立页面：/page/{slug}.html，老地址 301 兼容 */
const pageRoute = async (c: any) => {
  const env: Env = c.env
  const s = S(c)
  const raw = c.req.param('slug')
  if (!raw.endsWith('.html')) return c.redirect('/page/' + raw + '.html', 301)
  const slug = raw.slice(0, -5)
  return cachedPage(c, s, async () => {
    const p = await env.DB.prepare('SELECT * FROM pages WHERE slug=?').bind(slug).first<any>()
    if (!p) return NO_CACHE + V.notFound(s, await side(env, s), '页面不存在')
    if (p.status !== 'published' && !U(c))
      return NO_CACHE + V.notFound(s, await side(env, s), '页面不存在')
    return V.pageView({ page: p, settings: s, side: await side(env, s) })
  })
}
app.get('/page/:slug', pageRoute)

// ── 评论提交 ──
app.post('/comment', async (c) => {
  const env = c.env
  const s = S(c)
  if (s.allow_comments !== '1') return c.text('评论已关闭', 403)
  if (!sameOrigin(c)) return c.text('跨站请求被拒绝', 403)
  const b = (await c.req.parseBody()) as Record<string, string>
  const postId = Number(b.post_id || 0)
  const post = await db.getPostById(env, postId)
  if (!post) return c.text('文章不存在', 404)

  const ok = await auth.verifyTurnstile(env, b['cf-turnstile-response'] || '', c.req.raw.headers, s.turnstile_secret)
  if (!ok) return c.text('人机验证未通过', 400)

  const content = String(b.content || '').trim()
  if (!content) return c.redirect('/p/' + post.slug + '.html')
  await db.addComment(env, {
    post_id: postId,
    author: String(b.author || '匿名').slice(0, 40),
    email: String(b.email || '').slice(0, 80),
    website: '',
    content: content.slice(0, 1000),
    status: 'approved'
  })
  // 新评论要让文章页缓存失效：递增代数（1 次 D1 写 + 1 次 KV 写），
  // 全站页面随之刷新，所有访客都能立刻看到，而不是只有提交者。
  await db.bumpCacheGen(env)
  return c.redirect('/p/' + post.slug + '.html#comments')
})

// ── RSS ──
app.get('/feed.xml', async (c) => {
  const env = c.env
  const s = S(c)
  return cachedXml(c, s, 'application/rss+xml; charset=utf-8', async () => {
  const posts = await db.listPosts(env, { status: 'published', limit: 30, offset: 0 })
  const base = (env.SITE_URL || new URL(c.req.url).origin).replace(/\/$/, '')
  const items = posts
    .map(
      (p) => `<item>
      <title>${esc(p.title)}</title>
      <link>${base}/p/${esc(p.slug)}.html</link>
      <guid>${base}/p/${esc(p.slug)}.html</guid>
      <pubDate>${new Date(String(p.published_at || p.created_at).replace(' ', 'T') + 'Z').toUTCString()}</pubDate>
      <description>${esc(p.excerpt || p.ai_summary || '')}</description>
    </item>`
    )
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${esc(s.site_name)}</title>
  <link>${base}</link>
  <description>${esc(s.site_description)}</description>
  <language>zh-CN</language>
  ${items}
</channel></rss>`
  return xml
  })
})

// ── Sitemap ──
app.get('/sitemap.xml', async (c) => {
  const env = c.env
  const s = S(c)
  return cachedXml(c, s, 'application/xml; charset=utf-8', async () => {
  const [posts, cats, tags] = await Promise.all([
    db.listPosts(env, { status: 'published', limit: 1000, offset: 0 }),
    db.listCategories(env),
    db.listTags(env)
  ])
  const base = (env.SITE_URL || new URL(c.req.url).origin).replace(/\/$/, '')
  const url = (loc: string, pri = '0.6') =>
    `<url><loc>${base}${esc(loc)}</loc><priority>${pri}</priority></url>`
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${url('/', '1.0')}
  ${url('/archive', '0.5')}
  ${url('/tags', '0.4')}
  ${cats.map((x) => url('/c/' + x.slug, '0.6')).join('\n  ')}
  ${tags.map((x) => url('/t/' + x.slug, '0.4')).join('\n  ')}
  ${posts.map((p) => url('/p/' + p.slug + '.html', '0.8')).join('\n  ')}
</urlset>`
  return xml
  })
})

// ── R2 媒体文件（兼容历史 R2 记录；新上传走图床外链） ──
app.get('/media/*', async (c) => {
  const r2 = c.env.R2
  if (!r2) return c.notFound()
  let key = c.req.path.replace(/^\/media\//, '')
  try {
    key = decodeURIComponent(key)
  } catch {
    /* 保留原始值 */
  }
  if (!key) return c.notFound()
  const obj = await r2.get(key)
  if (!obj) return c.notFound()
  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('content-type', obj.httpMetadata?.contentType || 'application/octet-stream')
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('etag', obj.httpEtag)
  return c.body(obj.body as any, { headers })
})

// ═══════════════════════════════════════════════════════════════════════════
//  后台 —— 登录 / 登出
// ═══════════════════════════════════════════════════════════════════════════

app.get('/admin/login', async (c) => {
  if (U(c)) return c.redirect('/admin')
  const csrf = randomToken(12)
  const body = loginPage({
    settings: S(c),
    siteKey: c.env.TURNSTILE_SITE_KEY || '',
    csrf
  })
  return c.html(body)
})

app.post('/admin/login', async (c) => {
  const env = c.env
  const s = S(c)
  const b = (await c.req.parseBody()) as Record<string, string>

  if (await auth.loginBlocked(env, c.req.raw.headers)) {
    return c.html(
      loginPage({ error: '尝试次数过多，请 15 分钟后再试', settings: s, siteKey: env.TURNSTILE_SITE_KEY || '', csrf: '' })
    )
  }

  await db.ensureAdmin(env, env.ADMIN_PASSWORD || 'admin12345')

  const okTurnstile = await auth.verifyTurnstile(
    env,
    b['cf-turnstile-response'] || '',
    c.req.raw.headers,
    s.turnstile_secret
  )
  if (!okTurnstile) {
    return c.html(loginPage({ error: '人机验证未通过', settings: s, siteKey: env.TURNSTILE_SITE_KEY || '', csrf: '' }))
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(String(b.username || '').trim())
    .first<any>()
  const valid = user ? await auth.verifyPassword(String(b.password || ''), user.password_hash) : false
  if (!user || !valid) {
    await auth.bumpLoginFail(env, c.req.raw.headers)
    return c.html(loginPage({ error: '用户名或密码错误', settings: s, siteKey: env.TURNSTILE_SITE_KEY || '', csrf: '' }))
  }

  await auth.clearLoginFail(env, c.req.raw.headers)
  const token = await auth.createSession(env, {
    id: user.id,
    username: user.username,
    display_name: user.display_name || user.username,
    role: user.role
  })
  // 本地 http 环境下不设置 Secure，否则浏览器不会回传 Cookie
  const secure = new URL(c.req.url).protocol === 'https:'
  c.header('set-cookie', buildCookie('sid', token, { maxAge: 60 * 60 * 24 * 7, secure }))
  return c.redirect('/admin')
})

app.get('/admin/logout', async (c) => {
  await auth.destroySession(c.env, c.req.header('cookie') || null)
  const secure = new URL(c.req.url).protocol === 'https:'
  c.header('set-cookie', buildCookie('sid', '', { maxAge: 0, secure }))
  return c.redirect('/admin/login')
})

// ═══════════════════════════════════════════════════════════════════════════
//  后台 —— 页面
// ═══════════════════════════════════════════════════════════════════════════

app.get('/admin', guard, async (c) => {
  const env = c.env
  const [stats, recent] = await Promise.all([
    db.dashboardStats(env),
    db.listPosts(env, { limit: 8, offset: 0 })
  ])
  const img = await imgbedConfig(env, S(c))
  return c.html(
    A.dashboard({
      stats,
      recent,
      settings: S(c),
      user: U(c)!,
      services: [
        { name: 'D1', ok: true, note: '文章/用户/评论' },
        { name: 'KV', ok: true, note: '会话 / 设置 / 页面 HTML 缓存' },
        {
          name: '页面缓存',
          ok: S(c).enable_page_cache !== '0',
          note: S(c).enable_page_cache !== '0' ? `KV HTML · 代数 g${S(c).cache_gen || '1'}，发布即失效` : '已关闭（每次实时查库）'
        },
        {
          name: '图床',
          ok: img.configured,
          note: img.configured
            ? img.base.replace(/^https?:\/\//, '') + ' · ' + (img.source === 'database' ? '后台配置' : '环境变量')
            : '未配置地址或 Token'
        },
        {
          name: 'Workers AI',
          ok: S(c).enable_ai === '1' && env.ENABLE_AI !== 'false' && !!env.AI,
          note: S(c).enable_ai === '1' ? env.AI_SUMMARY_MODEL || 'llama-3.2-3b' : '后台已关闭'
        },
        {
          name: 'Vectorize',
          ok: S(c).enable_semantic === '1' && env.ENABLE_VECTORIZE !== 'false' && !!env.VECTORIZE,
          note: S(c).enable_semantic === '1' ? '语义搜索已开启' : '后台已关闭'
        },
        {
          name: 'Turnstile',
          ok: !env.TURNSTILE_SITE_KEY || !/^(off|none|disabled)$/i.test(env.TURNSTILE_SITE_KEY),
          note: !env.TURNSTILE_SITE_KEY || /^(off|none|disabled)$/i.test(env.TURNSTILE_SITE_KEY) ? '已关闭' : '人机验证'
        },
        { name: 'Cron', ok: true, note: '每日清理' }
      ]
    })
  )
})

app.get('/admin/posts', guard, async (c) => {
  const env = c.env
  const { page, offset } = paginate(c.req.query(), 20)
  const [posts, total] = await Promise.all([
    db.listPosts(env, { limit: 20, offset }),
    db.countPosts(env, {})
  ])
  return c.html(A.postsList({ posts, cur: page, total, perPage: 20, settings: S(c), user: U(c)! }))
})

const editorRoute = async (c: any, post: PostRow | null, msg?: string, err?: string) => {
  const env = c.env
  const categories = await db.listCategories(env)
  const tags = post ? (await db.getPostTags(env, post.id)).map((t) => t.name).join(', ') : ''
  return c.html(
    A.editor({
      post,
      categories,
      tags,
      settings: S(c),
      user: U(c)!,
      msg,
      err,
      aiEnabled: S(c).enable_ai === '1' && env.ENABLE_AI !== 'false' && !!env.AI,
      siteKey: env.TURNSTILE_SITE_KEY || ''
    })
  )
}

app.get('/admin/post/new', guard, async (c) => editorRoute(c, null))
app.get('/admin/post/:id', guard, async (c) => {
  const id = Number(c.req.param('id'))
  const post = await db.getPostById(c.env, id)
  if (!post) return c.redirect('/admin/posts')
  return editorRoute(c, post)
})

/** 保存文章（新建 / 更新） */
const savePost = async (c: any, id: number | null) => {
  const env = c.env
  if (!sameOrigin(c)) return c.text('跨站请求被拒绝', 403)
  const b = (await c.req.parseBody()) as Record<string, string>
  const title = String(b.title || '').trim()
  if (!title) return editorRoute(c, id ? await db.getPostById(env, id) : null, undefined, '标题不能为空')

  const md = String(b.content_md || '')
  const contentHtml = renderMarkdown(md)
  const slug = String(b.slug || '').trim() || slugify(title, 'post-' + Date.now())
  const excerpt = String(b.excerpt || '').trim() || plainExcerpt(md)
  const cover = String(b.cover || '').trim() || firstImage(md)
  // 默认正式发布：只有显式选「草稿」才隐藏，避免漏传字段导致文章前台不可见
  const status = b.status === 'draft' ? 'draft' : 'published'
  const categoryId = b.category_id ? Number(b.category_id) : null
  const pinned = b.pinned ? 1 : 0
  const now = nowSql()

  let postId = id
  if (postId) {
    await env.DB.prepare(
      `UPDATE posts SET slug=?,title=?,excerpt=?,content_md=?,content_html=?,cover=?,status=?,pinned=?,category_id=?,updated_at=?,published_at=CASE WHEN ?='published' AND published_at IS NULL THEN ? ELSE published_at END, reading_time=? WHERE id=?`
    )
      .bind(
        slug, title, excerpt, md, contentHtml, cover, status, pinned, categoryId, now,
        status, now, readingTime(md), postId
      )
      .run()
  } else {
    const r = await env.DB.prepare(
      `INSERT INTO posts (slug,title,excerpt,content_md,content_html,cover,status,pinned,category_id,author_id,published_at,reading_time,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
      .bind(
        slug, title, excerpt, md, contentHtml, cover, status, pinned, categoryId,
        U(c)!.id, status === 'published' ? now : null, readingTime(md), now, now
      )
      .run()
    postId = Number(r.meta?.last_row_id ?? 0)
  }

  // 标签
  const tagNames = String(b.tags || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean)
  await db.syncTags(env, postId!, tagNames)

  // 向量索引默认关闭：开启语义搜索才写 Vectorize，避免白吃额度
  if (status === 'published' && S(c).enable_semantic === '1') {
    c.executionCtx.waitUntil(indexPost(env, postId!, title, md))
  }

  // 关键：递增缓存代数，让首页/归档/分类/文章旧 HTML 立即全部失效。
  // 只写 1 次 D1 + 1 次 KV，与文章数量无关，发布后前台刷新即可见。
  await db.bumpCacheGen(env)

  return c.redirect('/admin/posts?saved=1')
}

app.post('/admin/post/new', guard, (c) => savePost(c, null))
app.post('/admin/post/:id', guard, (c) => savePost(c, Number(c.req.param('id'))))

app.post('/admin/post/:id/delete', guard, async (c) => {
  const env = c.env
  const id = Number(c.req.param('id'))
  const post = await db.getPostById(env, id)
  if (post) {
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run()
    await env.DB.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(id).run()
    if (S(c).enable_semantic === '1') c.executionCtx.waitUntil(removeFromIndex(env, id))
    await db.bumpCacheGen(env)
  }
  return c.redirect('/admin/posts')
})

// ── 分类 ──
app.get('/admin/categories', guard, async (c) =>
  c.html(A.categoriesPage({ categories: await db.listCategories(c.env), settings: S(c), user: U(c)! }))
)

app.post('/admin/category/new', guard, async (c) => {
  const b = (await c.req.parseBody()) as Record<string, string>
  const name = String(b.name || '').trim()
  if (!name) return c.redirect('/admin/categories')
  const slug = String(b.slug || '').trim() || slugify(name, 'cat-' + Date.now())
  await c.env.DB.prepare('INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?,?,?)')
    .bind(name, slug, String(b.description || '').slice(0, 200))
    .run()
  await db.bumpCacheGen(c.env)
  return c.redirect('/admin/categories')
})

app.post('/admin/category/:id/delete', guard, async (c) => {
  await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(Number(c.req.param('id'))).run()
  await db.bumpCacheGen(c.env)
  return c.redirect('/admin/categories')
})

// ── 独立页面 ──
app.get('/admin/pages', guard, async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM pages ORDER BY sort_order,id').all<any>()
  return c.html(A.pagesPage({ pages: results || [], settings: S(c), user: U(c)!, msg: c.req.query('saved') ? '已保存' : undefined }))
})
app.get('/admin/page/new', guard, (c) => c.html(A.pageEditor({ page: null, settings: S(c), user: U(c)! })))
app.get('/admin/page/:id', guard, async (c) => {
  const p = await c.env.DB.prepare('SELECT * FROM pages WHERE id=?').bind(Number(c.req.param('id'))).first<any>()
  if (!p) return c.redirect('/admin/pages')
  return c.html(A.pageEditor({ page: p, settings: S(c), user: U(c)! }))
})
const savePage = async (c: any, id: number | null) => {
  if (!sameOrigin(c)) return c.text('跨站请求被拒绝', 403)
  const b = (await c.req.parseBody()) as Record<string, string>
  const title = String(b.title || '').trim()
  if (!title) return c.redirect('/admin/pages?err=title')
  const rawSlug = String(b.slug || '').trim() || slugify(title, 'page-' + Date.now())
  const slug = rawSlug.replace(/\.html$/i, '')
  const md = String(b.content_md || '')
  const status = b.status === 'draft' ? 'draft' : 'published'
  const sort = Number(b.sort_order) || 0
  if (id) {
    await c.env.DB.prepare('UPDATE pages SET slug=?,title=?,content_md=?,content_html=?,status=?,sort_order=?,updated_at=? WHERE id=?')
      .bind(slug, title, md, renderMarkdown(md), status, sort, nowSql(), id).run()
  } else {
    await c.env.DB.prepare('INSERT INTO pages (slug,title,content_md,content_html,status,sort_order) VALUES (?,?,?,?,?,?)')
      .bind(slug, title, md, renderMarkdown(md), status, sort).run()
  }
  await db.bumpCacheGen(c.env)
  return c.redirect('/admin/pages?saved=1')
}
app.post('/admin/page/new', guard, (c) => savePage(c, null))
app.post('/admin/page/:id', guard, (c) => savePage(c, Number(c.req.param('id'))))
app.post('/admin/page/:id/delete', guard, async (c) => {
  await c.env.DB.prepare('DELETE FROM pages WHERE id=?').bind(Number(c.req.param('id'))).run()
  await db.bumpCacheGen(c.env)
  return c.redirect('/admin/pages')
})

// ── 友情链接 ──
app.get('/admin/links', guard, async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order,id').all<any>()
  return c.html(A.linksPage({ links: results || [], settings: S(c), user: U(c)!, msg: c.req.query('saved') ? '已保存' : undefined }))
})
app.post('/admin/links/settings', guard, async (c) => {
  const b = (await c.req.parseBody()) as Record<string, string>
  await db.saveSettings(c.env, { enable_links: b.enable_links === '1' ? '1' : '0' })
  return c.redirect('/admin/links?saved=1')
})
app.post('/admin/links/new', guard, async (c) => {
  const b = (await c.req.parseBody()) as Record<string, string>
  const name = String(b.name || '').trim()
  const url = String(b.url || '').trim()
  if (!name || !/^https?:\/\//.test(url)) return c.redirect('/admin/links')
  await c.env.DB.prepare('INSERT INTO links (name,url,description,sort_order) VALUES (?,?,?,?)')
    .bind(name.slice(0, 60), url.slice(0, 300), String(b.description || '').slice(0, 120), Number(b.sort_order) || 0).run()
  await db.bumpCacheGen(c.env)
  return c.redirect('/admin/links?saved=1')
})
app.post('/admin/links/:id/toggle', guard, async (c) => {
  await c.env.DB.prepare('UPDATE links SET enabled = CASE WHEN enabled=1 THEN 0 ELSE 1 END WHERE id=?')
    .bind(Number(c.req.param('id'))).run()
  await db.bumpCacheGen(c.env)
  return c.redirect('/admin/links?saved=1')
})
app.post('/admin/links/:id/delete', guard, async (c) => {
  await c.env.DB.prepare('DELETE FROM links WHERE id=?').bind(Number(c.req.param('id'))).run()
  await db.bumpCacheGen(c.env)
  return c.redirect('/admin/links?saved=1')
})

// 一键按当前分类生成顶部菜单（首页 + 全部分类）；搜索由右上角放大镜单独渲染
app.post('/admin/menu/from-categories', guard, async (c) => {
  const cats = await db.listCategories(c.env)
  const menu = [
    { label: '首页', href: '/' },
    ...cats.map((x) => ({ label: x.name, href: '/c/' + x.slug }))
  ]
  await db.saveSettings(c.env, { nav_menu: JSON.stringify(menu) })
  return c.redirect('/admin/settings?saved=1&menu=1')
})

// ── 备份 / 恢复 ──
app.get('/admin/backup', guard, (c) => c.html(A.backupPage({ settings: S(c), user: U(c)!, msg: c.req.query('saved') ? '导入完成' : undefined })))
app.get('/admin/backup/export', guard, async (c) => {
  const data = await db.exportAll(c.env)
  const name = `abncms-backup-${new Date().toISOString().slice(0, 10)}.json`
  return c.body(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${name}"`,
      'cache-control': 'no-store'
    }
  })
})
app.post('/admin/backup/import', guard, async (c) => {
  if (!sameOrigin(c)) return c.text('跨站请求被拒绝', 403)
  try {
    const form = await c.req.formData()
    const file = form.get('file') as File | null
    if (!file || typeof file === 'string') throw new Error('没有选择文件')
    if (file.size > 10 * 1024 * 1024) throw new Error('备份文件不能超过 10MB')
    const payload = JSON.parse(await file.text())
    const stats = await db.importAll(c.env, payload)
    await db.bumpCacheGen(c.env)
    return c.html(A.backupPage({ settings: S(c), user: U(c)!, stats }))
  } catch (e: any) {
    return c.html(A.backupPage({ settings: S(c), user: U(c)!, err: '导入失败：' + (e?.message || '未知错误') }), 400)
  }
})

// ── 评论 ──
app.get('/admin/comments', guard, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT cm.*, p.title AS post_title, p.slug AS post_slug FROM comments cm
     LEFT JOIN posts p ON p.id = cm.post_id ORDER BY cm.created_at DESC LIMIT 100`
  ).all<any>()
  return c.html(A.commentsPage({ comments: results || [], settings: S(c), user: U(c)! }))
})

app.post('/admin/comment/:id/approve', guard, async (c) => {
  await c.env.DB.prepare("UPDATE comments SET status='approved' WHERE id=?").bind(Number(c.req.param('id'))).run()
  await db.bumpCacheGen(c.env)
  return c.redirect('/admin/comments')
})

app.post('/admin/comment/:id/delete', guard, async (c) => {
  await c.env.DB.prepare('DELETE FROM comments WHERE id=?').bind(Number(c.req.param('id'))).run()
  await db.bumpCacheGen(c.env)
  return c.redirect('/admin/comments')
})

// ── 媒体库 ──
app.get('/admin/media', guard, async (c) => {
  const env = c.env
  const { results } = await env.DB.prepare('SELECT * FROM media ORDER BY id DESC LIMIT 100').all<any>()
  const cfg = await imgbedConfig(env, S(c))
  return c.html(
    A.mediaPage({
      media: results || [],
      settings: S(c),
      user: U(c)!,
      imgbed: {
        configured: cfg.configured,
        base: cfg.base,
        tokenName: cfg.tokenName,
        source: cfg.source,
        channels: IMGBED_CHANNELS
      }
    })
  )
})

app.post('/admin/media/:id/delete', guard, async (c) => {
  const env = c.env
  const id = Number(c.req.param('id'))
  const m = await env.DB.prepare('SELECT * FROM media WHERE id=?').bind(id).first<any>()
  if (m) {
    const cfg = await imgbedConfig(env, S(c))
    const key = String(m.key || '')
    // 新记录存的是图床完整外链 → 尽力删远端；旧 R2 记录 → 删 R2 对象
    if (/^https?:\/\//.test(key)) {
      c.executionCtx.waitUntil(imgbedDelete(cfg, key))
    } else if (env.R2) {
      try {
        await env.R2.delete(key)
      } catch {
        /* 忽略对象删除失败，仍清本地记录 */
      }
    }
    await env.DB.prepare('DELETE FROM media WHERE id=?').bind(id).run()
  }
  return c.redirect('/admin/media')
})

// ── 设置 / 密码 ──
app.get('/admin/settings', guard, async (c) => {
  const g = await imgbedConfig(c.env, S(c))
  return c.html(
    A.settingsPage({
      settings: S(c),
      user: U(c)!,
      msg: c.req.query('menu') === '1' ? '已按当前分类生成顶部菜单' : c.req.query('saved') ? '设置已保存' : undefined,
      err:
        c.req.query('err') === 'nokey'
          ? '未配置 CONFIG_ENCRYPTION_KEY，无法在后台写入 Token。请先设置主密钥 Secret，或改用环境变量模式。'
          : undefined,
      envInfo: {
        siteUrl: c.env.SITE_URL || new URL(c.req.url).origin,
        turnstileSiteKey: c.env.TURNSTILE_SITE_KEY || '',
        aiOn: c.env.ENABLE_AI !== 'false' && !!c.env.AI ? '已启用' : '未启用',
        vecOn: c.env.ENABLE_VECTORIZE !== 'false' && !!c.env.VECTORIZE ? '已启用' : '未启用',
        imgbed: {
          configured: g.configured,
          base: g.base,
          tokenName: g.tokenName,
          tokenHint: S(c).imgbed_token_hint || '',
          source: g.source,
          canEditToken: g.canEditToken,
          channel: g.channel,
          channels: IMGBED_CHANNELS
        }
      }
    })
  )
})

app.post('/admin/settings', guard, async (c) => {
  const b = (await c.req.parseBody()) as Record<string, string>
  const channel = String(b.imgbed_channel || '')
  const patch: Partial<SiteSettings> = {
    site_name: String(b.site_name || '').slice(0, 60),
    site_description: String(b.site_description || '').slice(0, 200),
    site_keywords: String(b.site_keywords || '').slice(0, 200),
    footer_text: String(b.footer_text || '').slice(0, 200),
    posts_per_page: String(Math.min(50, Math.max(1, Number(b.posts_per_page) || 10))),
    allow_comments: b.allow_comments === '1' ? '1' : '0',
    analytics_enabled: b.analytics_enabled === '1' ? '1' : '0',
    // 第三方统计代码：仅管理员可写，原样注入前台；限制长度防止误粘贴整页内容
    analytics_script: String(b.analytics_script || '').slice(0, 8000),
    // 额度开关： unchecked 一律视为关闭，避免老表单漏字段时误开功能
    enable_page_cache: b.enable_page_cache === '1' ? '1' : '0',
    enable_hot: b.enable_hot === '1' ? '1' : '0',
    enable_related: b.enable_related === '1' ? '1' : '0',
    enable_prevnext: b.enable_prevnext === '1' ? '1' : '0',
    enable_semantic: b.enable_semantic === '1' ? '1' : '0',
    enable_ai: b.enable_ai === '1' ? '1' : '0',
    enable_links: b.enable_links === '1' ? '1' : '0',
    turnstile_secret: String(b.turnstile_secret || '').slice(0, 80),
    site_logo: String(b.site_logo || '').trim().slice(0, 500),
    site_logo_height: String(Math.min(120, Math.max(24, Number(b.site_logo_height) || 36))),
    imgbed_base_url: String(b.imgbed_base_url || '').trim().replace(/\/+$/, '').slice(0, 200),
    imgbed_token_name: String(b.imgbed_token_name || '').trim().slice(0, 60),
    imgbed_channel: ['s3', 'huggingface'].includes(channel) ? channel : ''
  }

  // 导航菜单：「显示名 | 地址」逐行解析为 JSON，忽略空行与无分隔符的行
  const menuLines = String(b.nav_menu || '').split(/\r?\n/)
  const menu = menuLines
    .map((line) => line.split('|').map((x) => x.trim()))
    .filter((parts) => parts.length >= 2 && parts[0] && parts[1])
    .slice(0, 12)
    .map(([label, href]) => ({ label: label.slice(0, 20), href: href.slice(0, 200) }))
  patch.nav_menu = JSON.stringify(menu)

  // Token 留空 = 不修改；勾「清除」则回到环境变量模式；填写则加密落库。
  const rawToken = String(b.imgbed_token || '').trim()
  if (b.imgbed_clear === '1') {
    patch.imgbed_token_enc = ''
    patch.imgbed_token_hint = ''
  } else if (rawToken) {
    if (!configCryptoReady(c.env)) return c.redirect('/admin/settings?err=nokey')
    patch.imgbed_token_enc = await sealSecret(c.env, rawToken)
    patch.imgbed_token_hint = tokenHint(rawToken)
  }

  // saveSettings 已清 settings:v1 并递增 cache_gen，前台页面保存后立即生效
  await db.saveSettings(c.env, patch)
  return c.redirect('/admin/settings?saved=1')
})

// 图床连通性测试：支持尚未保存的表单值，只读渠道列表、不上传测试图
app.post('/admin/imgbed/test', guard, async (c) => {
  const b = (await c.req.parseBody()) as Record<string, string>
  const g = await imgbedConfig(c.env, {
    ...S(c),
    imgbed_base_url: String(b.imgbed_base_url ?? S(c).imgbed_base_url)
  })
  const typedBase = String(b.imgbed_base_url || '').trim().replace(/\/+$/, '')
  if (typedBase) g.base = typedBase
  const typedToken = String(b.imgbed_token || '').trim()
  if (typedToken) g.token = typedToken
  g.configured = !!g.token && !!g.base
  return c.json(await imgbedTest(g))
})

app.post('/admin/password', guard, async (c) => {
  const b = (await c.req.parseBody()) as Record<string, string>
  const u = U(c)!
  const row = await c.env.DB.prepare('SELECT * FROM users WHERE id=?').bind(u.id).first<any>()
  if (!row || !(await auth.verifyPassword(String(b.old || ''), row.password_hash))) {
    return c.html(
      A.settingsPage({
        settings: S(c),
        user: u,
        envInfo: {
          siteUrl: c.env.SITE_URL || '',
          turnstileSiteKey: c.env.TURNSTILE_SITE_KEY || '',
          aiOn: '',
          vecOn: ''
        },
        err: '当前密码不正确'
      })
    )
  }
  const hash = await auth.hashPassword(String(b.new || ''))
  await c.env.DB.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(hash, u.id).run()
  return c.redirect('/admin/settings?pwd=1')
})

// ═══════════════════════════════════════════════════════════════════════════
//  API（后台使用）
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/preview', guard, async (c) => {
  const { md } = (await c.req.json()) as { md?: string }
  return c.json({ html: renderMarkdown(String(md || '')) })
})

app.post('/api/ai/summary-tags', guard, async (c) => {
  // AI 摘要/标签是可选消耗功能，后台关闭后直接拒绝调用
  if (S(c).enable_ai !== '1') return c.json({ error: 'AI 功能已在后台关闭' }, 403)
  const { title, md } = (await c.req.json()) as { title?: string; md?: string }
  try {
    const [summary, tags] = await Promise.all([
      aiSummary(c.env, String(title || ''), String(md || '')),
      aiTags(c.env, String(title || ''), String(md || ''))
    ])
    return c.json({ summary, tags })
  } catch (e: any) {
    return c.json({ error: 'AI 服务暂不可用：' + (e?.message || '未知错误') })
  }
})

app.post('/api/upload', guard, async (c) => {
  const env = c.env
  const cfg = await imgbedConfig(env, S(c))
  if (!cfg.configured) return c.json({ error: '图床未配置：请在「设置 → 图床接入」填写地址与 Token' }, 503)

  let form: FormData
  try {
    form = await c.req.formData()
  } catch {
    return c.json({ error: '请求格式错误（需要 multipart/form-data）' }, 400)
  }
  const file = form.get('file') as File | null
  if (!file || typeof file === 'string') return c.json({ error: '没有选择文件' }, 400)
  // Workers 请求体 / 图床 HF 渠道受 CPU 时间限制，图片建议控制在 20MB 内
  if (file.size > 20 * 1024 * 1024) return c.json({ error: '文件不能超过 20MB' }, 400)
  if (file.size === 0) return c.json({ error: '文件内容为空' }, 400)
  const channel = String(form.get('channel') || cfg.channel || '')

  const result = await imgbedUpload(cfg, file, channel)
  if (!result.ok || !result.url) return c.json({ error: result.error || '上传失败' }, 502)

  // 媒体库登记：key 存图床完整外链（唯一），预览/复制/删除都基于它
  await env.DB.prepare(
    'INSERT OR REPLACE INTO media (key, filename, content_type, size, uploader_id) VALUES (?,?,?,?,?)'
  )
    .bind(result.url, file.name.slice(0, 120), file.type || 'application/octet-stream', file.size, U(c)!.id)
    .run()

  return c.json({ url: result.url, key: result.url, size: file.size, channel: result.channel })
})

// ── 访问打点（前端 beacon，永不缓存）──────────────────────────────────────
// 页面 HTML 命中 CDN 时 Worker 不执行，所以浏览量只能靠这个独立轻量接口。
// 25% 客户端采样 + 权重 ×4 聚合，单次最多 2 行 D1 写；后台可一键关闭。
app.post('/api/hit', async (c) => {
  c.header('cache-control', 'no-store')
  // 统计关闭后，旧 CDN 缓存页仍可能继续打点，这里直接丢弃
  if (S(c).analytics_enabled === '0') return c.json({ ok: false })
  if (!sameOrigin(c)) return c.json({ ok: false }, 403)

  let b: Record<string, string>
  try {
    b = (await c.req.parseBody()) as Record<string, string>
  } catch {
    return c.json({ ok: false }, 400)
  }
  const path = String(b.p || '')
  // 只接受站内路径，拒绝查询串 / 协议 / 路径穿越，避免被当成任意写入接口
  if (!/^\/[A-Za-z0-9._~%/\-]{0,199}$/.test(path) || path.includes('..')) {
    return c.json({ ok: false }, 400)
  }
  const weight = Math.min(20, Math.max(1, Number(b.w) || 1))
  try {
    await db.recordHit(c.env, path, weight, c.req.raw.headers)
    return c.json({ ok: true })
  } catch {
    // 统计失败绝不能影响访客体验
    return c.json({ ok: false })
  }
})

// ── 健康检查 ──
app.get('/api/health', (c) =>
  c.json({
    ok: true,
    runtime: 'cloudflare-workers',
    services: ['workers', 'd1', 'kv', 'external-image-host', 'workers-ai', 'vectorize', 'turnstile', 'cron', 'cdn-cache']
  })
)

// ── 404 ──
app.notFound(async (c) => {
  const body = V.notFound(await db.getSettings(c.env), await side(c.env))
  c.header('cache-control', 'private, no-store')
  return c.html(body, 404)
})

// ═══════════════════════════════════════════════════════════════════════════
//  Cron：每日清理 + 缓存重建
// ═══════════════════════════════════════════════════════════════════════════
async function scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  ctx.waitUntil(
    (async () => {
      try {
        // 1. 清理 30 天前的访问明细
        await env.DB.prepare("DELETE FROM page_views WHERE created_at < datetime('now','-30 day')").run()
        // 2. 清理 90 天前的垃圾评论
        await env.DB.prepare("DELETE FROM comments WHERE status='spam' AND created_at < datetime('now','-90 day')").run()
        // 3. 不再每天主动删设置/侧栏缓存：它们有 6 小时 TTL，
        //    且发布与后台保存时会即时失效，Cron 里多删只是白花 KV 写额度。
        // 4. 记录一条心跳，便于在后台确认 Cron 正常（1 次写/天）
        await env.KV.put('cron:last', new Date().toISOString())
      } catch {
        /* Cron 失败不影响站点 */
      }
    })()
  )
}

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => app.fetch(request, env, ctx),
  scheduled
}
