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
  IMGBED_CHANNELS
} from './lib/imgbed'
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
  ;(c as any).set('user', await auth.readSession(env, c.req.header('cookie') || null))
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

function html(c: any, body: string, cacheSeconds = 0) {
  const h: Record<string, string> = { 'content-type': 'text/html; charset=utf-8' }
  if (cacheSeconds > 0) h['cache-control'] = `public, max-age=0, s-maxage=${cacheSeconds}`
  else h['cache-control'] = 'no-store'
  return c.body(body, { headers: h })
}

/** 边栏数据：热门文章 / 分类目录 / 热门标签（KV 缓存 5 分钟） */
async function side(env: Env): Promise<import('./views/front').SideData> {
  const hit = await env.KV.get('side:v1', 'json')
  if (hit) return hit as import('./views/front').SideData
  const [hotRes, cats, tags] = await Promise.all([
    env.DB.prepare(
      "SELECT id, slug, title, views FROM posts WHERE status = 'published' ORDER BY views DESC LIMIT 8"
    ).all<any>(),
    db.listCategories(env),
    db.listTags(env)
  ])
  const data = {
    hot: hotRes.results || [],
    cats: (cats || []).map((c: any) => ({ name: c.name, slug: c.slug, post_count: c.post_count })),
    tags: (tags || []).slice(0, 18).map((t: any) => ({ name: t.name, slug: t.slug, post_count: t.post_count }))
  }
  await env.KV.put('side:v1', JSON.stringify(data), { expirationTtl: 300 })
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

  const cacheKey = `page:home:${page}:${perPage}`
  if (page === 1) {
    const hit = await env.KV.get(cacheKey)
    if (hit) return html(c, hit, 60)
  }

  const [posts, total] = await Promise.all([
    db.listPosts(env, { status: 'published', limit: perPage, offset }),
    db.countPosts(env, { status: 'published' })
  ])
  const body = V.home({ posts, cur: page, total, perPage, settings: s, side: await side(env) })

  if (page === 1) await env.KV.put(cacheKey, body, { expirationTtl: 60 })
  c.executionCtx.waitUntil(db.recordView(env, '/', null, c.req.raw.headers))
  return html(c, body, 60)
})

app.get('/archive', async (c) => {
  const env = c.env
  const s = S(c)
  const perPage = 40
  const { page, offset } = paginate(c.req.query(), perPage)
  const [posts, total] = await Promise.all([
    db.listPosts(env, { status: 'published', limit: perPage, offset }),
    db.countPosts(env, { status: 'published' })
  ])
  return html(c, V.archive({ posts, cur: page, total, perPage, settings: s, side: await side(env) }), 300)
})

app.get('/c/:slug', async (c) => {
  const env = c.env
  const s = S(c)
  const cat = await env.DB.prepare('SELECT * FROM categories WHERE slug = ?')
    .bind(c.req.param('slug'))
    .first<any>()
  if (!cat) return html(c, V.notFound(s, await side(env), '分类不存在'), 0)
  const perPage = Number(s.posts_per_page) || 10
  const { page, offset } = paginate(c.req.query(), perPage)
  const [posts, total] = await Promise.all([
    db.listPosts(env, { status: 'published', categoryId: cat.id, limit: perPage, offset }),
    db.countPosts(env, { status: 'published', categoryId: cat.id })
  ])
  return html(
    c,
    V.categoryPage({ category: cat, posts, cur: page, total, perPage, settings: s, side: await side(env) }),
    300
  )
})

app.get('/t/:slug', async (c) => {
  const env = c.env
  const s = S(c)
  const tag = await env.DB.prepare('SELECT * FROM tags WHERE slug = ?').bind(c.req.param('slug')).first<any>()
  if (!tag) return html(c, V.notFound(s, await side(env), '标签不存在'))
  const perPage = Number(s.posts_per_page) || 10
  const { page, offset } = paginate(c.req.query(), perPage)
  const [posts, total] = await Promise.all([
    db.listPosts(env, { status: 'published', tagId: tag.id, limit: perPage, offset }),
    db.countPosts(env, { status: 'published', tagId: tag.id })
  ])
  return html(c, V.tagPage({ tag, posts, cur: page, total, perPage, settings: s, side: await side(env) }), 300)
})

app.get('/tags', async (c) => {
  return html(c, V.tagsPage({ tags: await db.listTags(c.env), settings: S(c), side: await side(c.env) }), 600)
})

app.get('/search', async (c) => {
  const env = c.env
  const s = S(c)
  const q = (c.req.query('q') || '').trim()
  if (!q) return html(c, V.searchPage({ q: '', results: [], semantic: [], settings: s, side: await side(env) }), 600)

  const kw = await db.searchPosts(env, q, 30)
  const seen = new Set(kw.map((p) => p.id))
  const semIds: number[] = []

  // Workers AI + Vectorize：语义相似补充
  const sem = await semanticSearch(env, q, 8)
  const extra: PostRow[] = []
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

  const results = [...kw, ...extra]
  return html(c, V.searchPage({ q, results, semantic: semIds, settings: s, side: await side(env) }))
})

app.get('/p/:slug', async (c) => {
  const env = c.env
  const s = S(c)
  const slug = c.req.param('slug')
  const cacheKey = `page:post:${slug}`
  const cached = await env.KV.get(cacheKey)
  if (cached) {
    const p0 = await db.getPostBySlug(env, slug).catch(() => null)
    if (p0) c.executionCtx.waitUntil(db.bumpViews(env, p0.id))
    return html(c, cached, 120)
  }

  const p = await db.getPostBySlug(env, slug)
  if (!p) return html(c, V.notFound(s, await side(env), '文章不存在'))
  // 草稿仅登录用户可见
  if (p.status !== 'published' && !U(c)) return html(c, V.notFound(s, await side(env), '文章不存在'))

  const [tags, comments] = await Promise.all([
    db.getPostTags(env, p.id),
    db.listComments(env, p.id, true)
  ])

  const prev = await env.DB.prepare(
    "SELECT id, slug, title FROM posts WHERE status='published' AND COALESCE(published_at,created_at) < ? ORDER BY COALESCE(published_at,created_at) DESC LIMIT 1"
  )
    .bind(p.published_at || p.created_at)
    .first<PostRow>()
  const next = await env.DB.prepare(
    "SELECT id, slug, title FROM posts WHERE status='published' AND COALESCE(published_at,created_at) > ? ORDER BY COALESCE(published_at,created_at) ASC LIMIT 1"
  )
    .bind(p.published_at || p.created_at)
    .first<PostRow>()
  const related = p.category_id
    ? await db.listPosts(env, { status: 'published', categoryId: p.category_id, limit: 4, offset: 0 })
    : []
  const rel = related.filter((r) => r.id !== p.id).slice(0, 3)

  const body = V.postPage({
    post: p,
    tags,
    comments,
    related: rel,
    prev: prev || null,
    next: next || null,
    settings: s,
    allowComment: s.allow_comments === '1',
    siteKey: env.TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
    side: await side(env)
  })

  if (p.status === 'published') await env.KV.put(cacheKey, body, { expirationTtl: 120 })
  c.executionCtx.waitUntil(
    (async () => {
      await db.bumpViews(env, p.id)
      await db.recordView(env, '/p/' + slug, p.id, c.req.raw.headers)
    })()
  )
  return html(c, body, 120)
})

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
  if (!content) return c.redirect('/p/' + post.slug)
  await db.addComment(env, {
    post_id: postId,
    author: String(b.author || '匿名').slice(0, 40),
    email: String(b.email || '').slice(0, 80),
    website: '',
    content: content.slice(0, 1000),
    status: 'approved'
  })
  await env.KV.delete(`page:post:${post.slug}`)
  return c.redirect('/p/' + post.slug + '#comments')
})

// ── RSS ──
app.get('/feed.xml', async (c) => {
  const env = c.env
  const s = S(c)
  const posts = await db.listPosts(env, { status: 'published', limit: 30, offset: 0 })
  const base = (env.SITE_URL || new URL(c.req.url).origin).replace(/\/$/, '')
  const items = posts
    .map(
      (p) => `<item>
      <title>${esc(p.title)}</title>
      <link>${base}/p/${esc(p.slug)}</link>
      <guid>${base}/p/${esc(p.slug)}</guid>
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
  return c.body(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=600' } })
})

// ── Sitemap ──
app.get('/sitemap.xml', async (c) => {
  const env = c.env
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
  ${posts.map((p) => url('/p/' + p.slug, '0.8')).join('\n  ')}
</urlset>`
  return c.body(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
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
    siteKey: c.env.TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
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
  return c.html(
    A.dashboard({
      stats,
      recent,
      settings: S(c),
      user: U(c)!,
      services: [
        { name: 'D1', ok: true, note: '文章/用户/评论' },
        { name: 'KV', ok: true, note: '会话与页面缓存' },
        {
          name: '图床',
          ok: imgbedConfig(env).configured,
          note: imgbedConfig(env).configured
            ? imgbedConfig(env).base.replace(/^https?:\/\//, '') + ' · B2/HF'
            : '未配置 IMGBED_TOKEN'
        },
        { name: 'Workers AI', ok: env.ENABLE_AI !== 'false' && !!env.AI, note: env.AI_SUMMARY_MODEL || 'llama-3.2-3b' },
        { name: 'Vectorize', ok: env.ENABLE_VECTORIZE !== 'false' && !!env.VECTORIZE, note: '语义搜索' },
        { name: 'Turnstile', ok: true, note: '人机验证' },
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
      aiEnabled: env.ENABLE_AI !== 'false' && !!env.AI,
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
  const status = b.status === 'published' ? 'published' : 'draft'
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

  // 向量索引（异步，不阻塞响应）
  if (status === 'published') {
    c.executionCtx.waitUntil(indexPost(env, postId!, title, md))
  }

  // 清缓存
  c.executionCtx.waitUntil(
    (async () => {
      await env.KV.delete(`page:post:${slug}`)
      await env.KV.delete('side:v1')
      await env.KV.delete('page:home:1:10')
      for (let i = 1; i <= 5; i++) await env.KV.delete(`page:home:${i}:10`)
    })()
  )

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
    c.executionCtx.waitUntil(
      (async () => {
        await removeFromIndex(env, id)
        await env.KV.delete(`page:post:${post.slug}`)
        await env.KV.delete('side:v1')
        await env.KV.delete('page:home:1:10')
      })()
    )
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
  await c.env.KV.delete('side:v1')
  return c.redirect('/admin/categories')
})

app.post('/admin/category/:id/delete', guard, async (c) => {
  await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(Number(c.req.param('id'))).run()
  await c.env.KV.delete('side:v1')
  return c.redirect('/admin/categories')
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
  return c.redirect('/admin/comments')
})

app.post('/admin/comment/:id/delete', guard, async (c) => {
  await c.env.DB.prepare('DELETE FROM comments WHERE id=?').bind(Number(c.req.param('id'))).run()
  return c.redirect('/admin/comments')
})

// ── 媒体库 ──
app.get('/admin/media', guard, async (c) => {
  const env = c.env
  const { results } = await env.DB.prepare('SELECT * FROM media ORDER BY id DESC LIMIT 100').all<any>()
  const cfg = imgbedConfig(env)
  return c.html(
    A.mediaPage({
      media: results || [],
      settings: S(c),
      user: U(c)!,
      imgbed: {
        configured: cfg.configured,
        base: cfg.base,
        tokenName: cfg.tokenName,
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
    const cfg = imgbedConfig(env)
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
app.get('/admin/settings', guard, async (c) =>
  c.html(
    A.settingsPage({
      settings: S(c),
      user: U(c)!,
      envInfo: {
        siteUrl: c.env.SITE_URL || new URL(c.req.url).origin,
        turnstileSiteKey: c.env.TURNSTILE_SITE_KEY || '',
        aiOn: c.env.ENABLE_AI !== 'false' && !!c.env.AI ? '已启用' : '未启用',
        vecOn: c.env.ENABLE_VECTORIZE !== 'false' && !!c.env.VECTORIZE ? '已启用' : '未启用',
        imgbed: (() => {
          const g = imgbedConfig(c.env)
          return { configured: g.configured, base: g.base, tokenName: g.tokenName }
        })()
      }
    })
  )
)

app.post('/admin/settings', guard, async (c) => {
  const b = (await c.req.parseBody()) as Record<string, string>
  await db.saveSettings(c.env, {
    site_name: String(b.site_name || '').slice(0, 60),
    site_description: String(b.site_description || '').slice(0, 200),
    site_keywords: String(b.site_keywords || '').slice(0, 200),
    footer_text: String(b.footer_text || '').slice(0, 200),
    posts_per_page: String(Math.min(50, Math.max(1, Number(b.posts_per_page) || 10))),
    allow_comments: b.allow_comments === '1' ? '1' : '0',
    turnstile_secret: String(b.turnstile_secret || '').slice(0, 80)
  })
  c.executionCtx.waitUntil(c.env.KV.delete('page:home:1:10'))
  return c.redirect('/admin/settings?saved=1')
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
  const cfg = imgbedConfig(env)
  if (!cfg.configured) return c.json({ error: '图床未配置：请设置 IMGBED_TOKEN 密钥' }, 503)

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
  const channel = String(form.get('channel') || '')

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

// ── 健康检查 ──
app.get('/api/health', (c) =>
  c.json({
    ok: true,
    runtime: 'cloudflare-workers',
    services: ['workers', 'd1', 'kv', 'r2', 'workers-ai', 'vectorize', 'turnstile', 'cron']
  })
)

// ── 404 ──
app.notFound(async (c) => {
  return c.html(V.notFound(await db.getSettings(c.env), await side(c.env)), 404)
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
        // 3. 刷新设置缓存与首页缓存
        await env.KV.delete('settings:v1')
        await env.KV.delete('page:home:1:10')
        // 4. 记录一条心跳，便于在后台确认 Cron 正常
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
