import type { Env, PostRow, SiteSettings } from '../types'

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: '格熊',
  site_description: '免费商用资源 · 字体 · AI 工具 · 数码技巧 · 生活妙招',
  site_keywords: '免费资源,字体资源,工具技巧,热门资讯,生活妙招,经验分享,格熊',
  footer_text: '© 格熊 gexiong.com · 免费资源与技巧分享',
  posts_per_page: '10',
  allow_comments: '1',
  turnstile_secret: '2x0000000000000000000000000000000AA',
  analytics_enabled: '1'
}

/** 站点设置：优先 KV 缓存（60s），回源 D1 */
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
    await env.KV.put(cacheKey, JSON.stringify(map), { expirationTtl: 60 })
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

export async function bumpViews(env: Env, postId: number): Promise<void> {
  await env.DB.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').bind(postId).run()
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
  await env.KV.delete('recent_comments:v1')
}

// ── 统计 ────────────────────────────────────────────────────────────────────

export async function recordView(env: Env, path: string, postId: number | null, headers: Headers) {
  if (!postId && path !== '/') return
  await env.DB.prepare(
    'INSERT INTO page_views (path, post_id, country, referer) VALUES (?,?,?,?)'
  )
    .bind(path, postId, headers.get('cf-ipcountry') || '', headers.get('referer') || '')
    .run()
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
