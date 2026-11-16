import type { Env } from '../types'

/**
 * 后台写入的敏感配置（目前是图床 API Token）加密。
 *
 * - 主密钥 CONFIG_ENCRYPTION_KEY 只来自 Cloudflare Secret，不入库、不下发页面。
 * - 用 SHA-256(主密钥串) 派生 256 位 AES-GCM 密钥，允许填任意长度的字符串。
 * - 每次加密随机 12 字节 IV，密文格式 v1.<iv>.<ciphertext>（base64）。
 * - 解密失败一律抛错，调用方负责降级，绝不回退明文。
 */

const enc = new TextEncoder()
const dec = new TextDecoder()

function b64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function unb64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** 是否允许后台编辑 Token（未配主密钥时降级为「仅环境变量模式」） */
export function configCryptoReady(env: Env): boolean {
  return !!(env.CONFIG_ENCRYPTION_KEY || '').trim()
}

async function deriveKey(env: Env): Promise<CryptoKey> {
  const raw = (env.CONFIG_ENCRYPTION_KEY || '').trim()
  if (!raw) throw new Error('CONFIG_ENCRYPTION_KEY not set')
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(raw))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function sealSecret(env: Env, plain: string): Promise<string> {
  const key = await deriveKey(env)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain))
  return 'v1.' + b64(iv) + '.' + b64(new Uint8Array(ct))
}

export async function openSecret(env: Env, payload: string): Promise<string> {
  const parts = String(payload || '').split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') throw new Error('invalid sealed payload')
  const key = await deriveKey(env)
  const iv = unb64(parts[1])
  const ct = unb64(parts[2])
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return dec.decode(plain)
}

/** 只用于后台展示：末尾 4 位 */
export function tokenHint(token: string): string {
  const t = String(token || '').trim()
  if (!t) return ''
  const tail = t.slice(-4)
  return t.length > 8 ? '••••••••' + tail : '••••' + tail
}
