import type { Env, SessionUser } from '../types'
import { randomToken, parseCookies, clientIp } from './util'

/**
 * PBKDF2 迭代次数。Cloudflare Workers 免费计划单次请求 CPU 上限为 10ms，
 * 这里取 5000 次以在安全与耗时之间取得平衡；如需更高强度可自行上调
 * （付费计划 CPU 上限 30s，可安全调到 100000+）。
 */
const PBKDF2_ITERATIONS = 5000
const SESSION_TTL = 60 * 60 * 24 * 7 // 7 天
const MAX_FAIL = 8 // 同 IP 连续失败上限
const FAIL_WINDOW = 60 * 15 // 15 分钟

const enc = new TextEncoder()

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomToken(16)
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  )
  return `${salt}:${toHex(bits)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hex] = String(stored || '').split(':')
  if (!salt || !hex) return false
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  )
  return toHex(bits) === hex
}

// ── 会话 ────────────────────────────────────────────────────────────────────

export async function createSession(env: Env, user: SessionUser): Promise<string> {
  const token = randomToken(32)
  await env.KV.put(
    `session:${token}`,
    JSON.stringify({ ...user, created: Date.now() }),
    { expirationTtl: SESSION_TTL }
  )
  return token
}

export async function readSession(env: Env, cookieHeader: string | null): Promise<SessionUser | null> {
  const token = parseCookies(cookieHeader).sid
  if (!token) return null
  const raw = await env.KV.get(`session:${token}`)
  if (!raw) return null
  try {
    const u = JSON.parse(raw) as SessionUser
    if (!u?.id) return null
    return u
  } catch {
    return null
  }
}

export async function destroySession(env: Env, cookieHeader: string | null): Promise<void> {
  const token = parseCookies(cookieHeader).sid
  if (token) await env.KV.delete(`session:${token}`)
}

// ── 登录失败限流（KV 计数）──────────────────────────────────────────────────

export async function loginBlocked(env: Env, headers: Headers): Promise<boolean> {
  const n = await env.KV.get(`loginfail:${clientIp(headers)}`)
  return Number(n || 0) >= MAX_FAIL
}

export async function bumpLoginFail(env: Env, headers: Headers): Promise<void> {
  const k = `loginfail:${clientIp(headers)}`
  const n = Number((await env.KV.get(k)) || 0) + 1
  await env.KV.put(k, String(n), { expirationTtl: FAIL_WINDOW })
}

export async function clearLoginFail(env: Env, headers: Headers): Promise<void> {
  await env.KV.delete(`loginfail:${clientIp(headers)}`)
}

// ── Cloudflare Turnstile 人机校验 ───────────────────────────────────────────

/** Cloudflare 官方测试密钥前缀（Site Key 与 Secret 都以此开头） */
const TEST_KEY_PREFIXES = ['1x00000000000000000000', '2x00000000000000000000', '3x00000000000000000000']
const isTestKey = (k: string) => !k || TEST_KEY_PREFIXES.some((p) => k.startsWith(p))

export async function verifyTurnstile(
  env: Env,
  token: string,
  headers: Headers,
  secret: string
): Promise<boolean> {
  // 只要任意一侧仍是官方测试密钥，就一律放行。
  // 这样即便在后台误填了「真实 Secret」而 Site Key 仍是测试值（或反之），
  // 也不会出现「测试 widget + 真实 Secret」错配把登录永久锁死的情况。
  const siteKey = env.TURNSTILE_SITE_KEY || ''
  if (isTestKey(siteKey) || isTestKey(secret)) return true
  if (!token) return false
  try {
    const body = new URLSearchParams()
    body.set('secret', secret)
    body.set('response', token)
    body.set('remoteip', clientIp(headers))
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    })
    const j = (await r.json()) as { success?: boolean }
    return !!j.success
  } catch {
    // 网络异常时不阻断登录，避免误伤
    return true
  }
}
