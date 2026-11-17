import type { Env, PostRow, SiteSettings } from '../types'

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: 'ABNcms',
  site_description: 'A lightweight CMS on the Cloudflare free tier',
  site_keywords: 'ABNcms,Cloudflare Workers,D1,CMS',
  footer_text: 'Powered by ABNcms · Cloudflare Workers + D1',
  posts_per_page: '10',
  allow_comments: '1',
  turnstile_secret: '2x0000000000000000000000000000000AA',
  analytics_enabled: '1',
  analytics_script: '',
  site_logo: '',
  site_logo_height: '36',
  imgbed_base_url: '',
  imgbed_token_enc: '',
  imgbed_token_hint: '',
  imgbed_token_name: '',
  imgbed_channel: '',
  cache_gen: '1',
  enable_page_cache: '1',
  enable_hot: '1',
  enable_related: '1',
  enable_prevnext: '1',
  enable_semantic: '0',
  enable_ai: '0'
}

/** 站点设置：优先 KV 缓存，回源 D1。
 *  TTL 设为 6 小时：KV 免费额度只有 1,000 次写/天，1 小时会稳定产生 24 次写；
 *  6 小时降到 4 次/天，且保存设置/发布文章时会主动删除缓存，不存在陈旧问题。 */
export async function getSettings(env: Env): Promise<SiteSettings> {
  const cacheKey = 'settings:v1'
  const cached = await env.KV.get(cacheKey, 'json')
  if (cached) return { ...DEFAULT_SETTINGS, ...(cached as Partial<SiteSettings>) }
  try {
    const { results } = await env.DB.prepare('SELECT key, value FROM settings').all<{
      key: string
      value: string
    }>()
    const map: Record<string, string> = {}
    for (const r of results || []) map[r.key] = r.value
    await env.KV.put(cacheKey, JSON.stringify(map), { expirationTtl: 21600 })
    return { ...DEFAULT_SETTINGS, ...map }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(env: Env, patch: Partial<SiteSettings>): Promise<void> {
  const stmts = Object.entries(patch).map(([k, v]) =>
    env.DB.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).bind(k, String(v))
  )
  if (stmts.length) await env.DB.batch(stmts)
  await env.KV.delete('settings:v1')
  // 任何设置变化都可能影响已缓存 HTML（外观、开关、评论等），
  // 统一递增代数：只多 1 次 D1 写，换来「保存即生效」，避免站长困惑。
  await bumpCacheGen(env, false)
}

/**
 * 递增页面缓存代数并清掉派生缓存。
 *
 * 页面 HTML 以 `page:g<gen>:<path>` 存 KV，读时也带代数。发布/改文时只把
 * cache_gen +1，所有旧 key 瞬间「失踪」（TTL 到期自动清理），无需逐条
 * delete —— 这样每次发布只付 1 次 D1 写 + 1 次 KV 写，不受文章数影响。
 *
 * @param alsoSettings 是否同时清设置缓存（发布文章时不需要）
 */
export async function bumpCacheGen(env: Env, alsoSettings = true): Promise<void> {
  try {
    await env.DB.prepare(
      "UPDATE settings SET value = CAST(value AS INTEGER) + 1 WHERE key = 'cache_gen'"
    ).run()
  } catch {
    /* 旧库缺键时由迁移补齐，这里不能影响发布主流程 */
  }
  if (alsoSettings) await env.KV.delete('settings:v1')
  await env.KV.delete('side:v1')
}

// ── 文章查询 ────────────────────────────────────────────────────────────────

const POST_SELECT = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug, u.display_name AS author_name
  FROM posts p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN users u ON u.id = p.author_id
`

export async function listPosts(
  env: Env,
  opts: { status?: string; categoryId?: number; tagId?: number; limit: number; offset: number }
): Promise<PostRow[]> {
  const where: string[] = []
  const binds: any[] = []
  if (opts.status) {
    where.push('p.status = ?')
    binds.push(opts.status)
  }
  if (opts.categoryId) {
    where.push('p.category_id = ?')
    binds.push(opts.categoryId)
  }
  let sql = POST_SELECT
  if (opts.tagId) {
    sql += ' INNER JOIN post_tags pt ON pt.post_id = p.id '
    where.push('pt.tag_id = ?')
    binds.push(opts.tagId)
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ')
  sql += ' ORDER BY p.pinned DESC, COALESCE(p.published_at, p.created_at) DESC LIMIT ? OFFSET ?'
  binds.push(opts.limit, opts.offset)
  const { results } = await env.DB.prepare(sql).bind(...binds).all<PostRow>()
  return results || []
}

export async function countPosts(
  env: Env,
  opts: { status?: string; categoryId?: number; tagId?: number }
): Promise<number> {
  const where: string[] = []
  const binds: any[] = []
  if (opts.status) {
    where.push('p.status = ?')
    binds.push(opts.status)
  }
  if (opts.categoryId) {
    where.push('p.category_id = ?')
    binds.push(opts.categoryId)
  }
  let sql = 'SELECT COUNT(*) AS n FROM posts p'
  if (opts.tagId) {
    sql += ' INNER JOIN post_tags pt ON pt.post_id = p.id'
    where.push('pt.tag_id = ?')
    binds.push(opts.tagId)
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ')
  const r = await env.DB.prepare(sql).bind(...binds).first<{ n: number }>()
  return Number(r?.n || 0)
}

export async function getPostById(env: Env, id: number): Promise<PostRow | null> {
  return (await env.DB.prepare(POST_SELECT + ' WHERE p.id = ?').bind(id).first<PostRow>()) || null
}

export async function getPostBySlug(env: Env, slug: string): Promise<PostRow | null> {
  return (await env.DB.prepare(POST_SELECT + ' WHERE p.slug = ?').bind(slug).first<PostRow>()) || null
}

export async function getPostTags(env: Env, postId: number): Promise<{ id: number; name: string; slug: string }[]> {
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.name, t.slug FROM tags t
     INNER JOIN post_tags pt ON pt.tag_id = t.id
     WHERE pt.post_id = ? ORDER BY t.name`
  )
    .bind(postId)
    .all<{ id: number; name: string; slug: string }>()
  return results || []
}

/** 批量取多篇文章的标签（避免 N+1） */
export async function getTagsForPosts(env: Env, ids: number[]): Promise<Record<number, { name: string; slug: string }[]>> {
  const map: Record<number, { name: string; slug: string }[]> = {}
  if (!ids.length) return map
  const ph = ids.map(() => '?').join(',')
  const { results } = await env.DB.prepare(
    `SELECT pt.post_id, t.name, t.slug FROM post_tags pt
     INNER JOIN tags t ON t.id = pt.tag_id
     WHERE pt.post_id IN (${ph}) ORDER BY t.name`
  )
    .bind(...ids)
    .all<{ post_id: number; name: string; slug: string }>()
  for (const r of results || []) {
    ;(map[r.post_id] ||= []).push({ name: r.name, slug: r.slug })
  }
  return map
}

export async function syncTags(env: Env, postId: number, names: string[]): Promise<void> {
  await env.DB.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(postId).run()
  const cleaned = [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(0, 12)
  for (const name of cleaned) {
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    await env.DB.prepare('INSERT OR IGNORE INTO tags (name, slug) VALUES (?, ?)').bind(name, slug).run()
    const tag = await env.DB.prepare('SELECT id FROM tags WHERE slug = ?').bind(slug).first<{ id: number }>()
    if (tag) {
      await env.DB.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)')
        .bind(postId, tag.id)
        .run()
    }
  }
}

export async function listCategories(env: Env) {
  const { results } = await env.DB.prepare(
    'SELECT c.*, (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id AND p.status = "published") AS post_count FROM categories c ORDER BY c.sort_order, c.id'
  ).all<any>()
  return results || []
}

export async function listTags(env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT t.*, COUNT(pt.post_id) AS post_count FROM tags t
     LEFT JOIN post_tags pt ON pt.tag_id = t.id
     GROUP BY t.id ORDER BY post_count DESC, t.name LIMIT 60`
  ).all<any>()
  return results || []
}

/** 全文检索（FTS5），失败时降级为 LIKE */
export async function searchPosts(env: Env, q: string, limit = 30): Promise<PostRow[]> {
  try {
    const { results } = await env.DB.prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug, u.display_name AS author_name
       FROM posts_fts f JOIN posts p ON p.id = f.rowid
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN users u ON u.id = p.author_id
       WHERE posts_fts MATCH ? AND p.status = 'published'
       ORDER BY p.published_at DESC LIMIT ?`
    )
      .bind(q.replace(/["*]/g, ' ').trim(), limit)
      .all<PostRow>()
    if (results && results.length) return results
  } catch {
    /* FTS5 不可用时走 LIKE 降级 */
  }
  const like = `%${q}%`
  const { results } = await env.DB.prepare(
    POST_SELECT + ` WHERE p.status = 'published' AND (p.title LIKE ? OR p.excerpt LIKE ? OR p.content_md LIKE ?)
     ORDER BY p.published_at DESC LIMIT ?`
  )
    .bind(like, like, like, limit)
    .all<PostRow>()
  return results || []
}

// ── 评论 ────────────────────────────────────────────────────────────────────

export async function listComments(env: Env, postId: number, onlyApproved = true) {
  const sql = `SELECT * FROM comments WHERE post_id = ? ${onlyApproved ? "AND status = 'approved'" : ''}
               ORDER BY created_at DESC LIMIT 100`
  const { results } = await env.DB.prepare(sql).bind(postId).all<any>()
  return results || []
}

export async function addComment(env: Env, c: {
  post_id: number; author: string; email: string; website: string; content: string; status: string
}) {
  await env.DB.prepare(
    'INSERT INTO comments (post_id, author, email, website, content, status) VALUES (?,?,?,?,?,?)'
  )
    .bind(c.post_id, c.author, c.email, c.website, c.content, c.status)
    .run()
}

// ── 统计 ────────────────────────────────────────────────────────────────────

/**
 * 聚合一次前端打点（/api/hit）。
 *
 * 页面 HTML 由 CDN 边缘缓存供给，Worker 根本不会执行，所以浏览量不能再在
 * 渲染请求里写库。改由前端按 25% 采样发一个轻量 beacon，服务端按权重
 * ×4 累加，使期望值仍等于真实浏览量；明细单次批量提交，最多 2 行写。
 * 数字是估算值，可在后台「设置」里一键关闭统计以换取零写入。
 */
export async function recordHit(env: Env, path: string, weight: number, headers: Headers): Promise<void> {
  const stmts: D1PreparedStatement[] = []
  const m = /^\/p\/([A-Za-z0-9._~%-]{1,160})$/.exec(path)
  if (m) {
    stmts.push(
      env.DB.prepare("UPDATE posts SET views = views + ? WHERE slug = ? AND status = 'published'")
        .bind(weight, decodeURIComponent(m[1]))
    )
  }
  stmts.push(
    env.DB.prepare('INSERT INTO page_views (path, country, referer) VALUES (?,?,?)')
      .bind(path.slice(0, 200), headers.get('cf-ipcountry') || '', (headers.get('referer') || '').slice(0, 200))
  )
  await env.DB.batch(stmts)
}

export async function dashboardStats(env: Env) {
  const [posts, drafts, comments, media, views, today] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) n FROM posts WHERE status='published'").first<{ n: number }>(),
    env.DB.prepare("SELECT COUNT(*) n FROM posts WHERE status='draft'").first<{ n: number }>(),
    env.DB.prepare('SELECT COUNT(*) n FROM comments').first<{ n: number }>(),
    env.DB.prepare('SELECT COUNT(*) n FROM media').first<{ n: number }>(),
    env.DB.prepare('SELECT COALESCE(SUM(views),0) n FROM posts').first<{ n: number }>(),
    env.DB.prepare("SELECT COUNT(*) n FROM page_views WHERE created_at >= datetime('now','-1 day')").first<{
      n: number
    }>()
  ])
  return {
    published: Number(posts?.n || 0),
    drafts: Number(drafts?.n || 0),
    comments: Number(comments?.n || 0),
    media: Number(media?.n || 0),
    views: Number(views?.n || 0),
    todayViews: Number(today?.n || 0)
  }
}

/** 初始化：确保至少有一个管理员账号 */
export async function ensureAdmin(env: Env, password: string): Promise<void> {
  const exists = await env.DB.prepare('SELECT id FROM users LIMIT 1').first()
  if (exists) return
  const { hashPassword } = await import('./auth')
  const hash = await hashPassword(password || 'admin12345')
  await env.DB.prepare(
    'INSERT INTO users (username, password_hash, display_name, role) VALUES (?,?,?,?)'
  )
    .bind('admin', hash, '管理员', 'admin')
    .run()
}
