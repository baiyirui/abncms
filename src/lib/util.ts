/** 通用工具函数 */

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 生成 URL 友好的 slug；保留中文（D1/UTF-8 环境可用），其余转连字符 */
export function slugify(input: string, fallback = 'post'): string {
  const s = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
  return s || fallback
}

/** 安全的随机 token（URL-safe base64） */
export function randomToken(bytes = 32): string {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  let bin = ''
  for (const b of a) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function nowSql(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

/** 估算阅读时长（分钟），中英文混排按 400 字/分钟 */
export function readingTime(md: string): number {
  const plain = md.replace(/```[\s\S]*?```/g, '').replace(/[#>*`\-_[\]()!]/g, ' ')
  const cjk = (plain.match(/[一-龥]/g) || []).length
  const words = plain.replace(/[一-龥]/g, ' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round((cjk + words) / 400))
}

/** 从 Markdown 正文截取纯文本摘要 */
export function plainExcerpt(md: string, len = 140): string {
  const t = md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*`_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return t.length > len ? t.slice(0, len) + '…' : t
}

/** 生成 Set-Cookie 字符串 */
export function buildCookie(
  name: string,
  value: string,
  opts: { maxAge?: number; path?: string; httpOnly?: boolean; sameSite?: string; secure?: boolean } = {}
): string {
  const parts = [`${name}=${value}`, `Path=${opts.path || '/'}`]
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`)
  if (opts.httpOnly !== false) parts.push('HttpOnly')
  parts.push(`SameSite=${opts.sameSite || 'Lax'}`)
  if (opts.secure !== false) parts.push('Secure')
  return parts.join('; ')
}

/** 客户端 IP（Cloudflare 注入） */
export function clientIp(headers: Headers): string {
  return headers.get('cf-connecting-ip') || headers.get('x-forwarded-for') || '0.0.0.0'
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const seg of header.split(';')) {
    const i = seg.indexOf('=')
    if (i > 0) out[seg.slice(0, i).trim()] = decodeURIComponent(seg.slice(i + 1).trim())
  }
  return out
}

/** 简易分页参数 */
export function paginate(sp: Record<string, string>, perPage = 10) {
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1)
  return { page, perPage, offset: (page - 1) * perPage }
}

/** 相对时间 / 固定日期展示 */
export function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return String(s).slice(0, 10)
}
