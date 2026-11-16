import type { Env, SiteSettings } from '../types'
import { configCryptoReady, openSecret } from './crypto'

/**
 * 外部图床（CloudFlare-ImgBed 等兼容实现）代理。
 *
 * 设计要点：
 * - 配置三级优先级：后台 D1（AES-GCM 加密） > 环境变量 / Secret > 未配置。
 *   Cloudflare Secret 运行时不可改，所以「后台可改」必须落库。
 * - Token 永不下发浏览器：前端只 POST 本站 /api/upload，由 Worker 注入
 *   Authorization: Bearer 后二次转发到图床 /upload。
 * - 上传接口：POST /upload  -H "Authorization: Bearer <TOKEN>" -F "file=@..."
 *   用 returnFormat=full 拿到完整 URL，responseFormat=object 拿到对象结构。
 */

/** 后台可选的上传渠道 */
export const IMGBED_CHANNELS: { value: string; label: string }[] = [
  { value: '', label: '默认渠道' },
  { value: 's3', label: 'Backblaze B2 (S3)' },
  { value: 'huggingface', label: 'HuggingFace' }
]

export interface ImgbedConfig {
  base: string
  token: string
  configured: boolean
  tokenName: string
  /** 默认上传渠道 */
  channel: string
  /** 当前生效的 Token 来源，供后台状态展示 */
  source: 'database' | 'env' | 'none'
  /** 是否允许后台写入 Token（取决于主密钥是否配置） */
  canEditToken: boolean
}

/** 解析生效配置。s 传当前请求上下文里的站点设置（S(c)）。 */
export async function imgbedConfig(env: Env, s?: SiteSettings): Promise<ImgbedConfig> {
  const canEditToken = configCryptoReady(env)
  let dbToken = ''
  if (s?.imgbed_token_enc && canEditToken) {
    try {
      dbToken = (await openSecret(env, s.imgbed_token_enc)).trim()
    } catch {
      dbToken = ''
    }
  }
  const dbBase = (s?.imgbed_base_url || '').trim().replace(/\/+$/, '')
  const envBase = (env.IMGBED_BASE_URL || '').trim().replace(/\/+$/, '')
  const envToken = (env.IMGBED_TOKEN || '').trim()
  const base = dbBase || envBase
  const token = dbToken || envToken
  return {
    base,
    token,
    configured: !!token && !!base,
    tokenName: s?.imgbed_token_name || env.IMGBED_TOKEN_NAME || '',
    channel: s?.imgbed_channel || '',
    source: dbToken ? 'database' : envToken ? 'env' : 'none',
    canEditToken
  }
}

/** 后台「测试连接」：只读图床渠道列表，不上传测试图、不污染图床 */
export async function imgbedTest(cfg: ImgbedConfig): Promise<{ ok: boolean; message: string }> {
  if (!cfg.base) return { ok: false, message: '未填写图床地址' }
  if (!cfg.token) return { ok: false, message: '未配置 API Token' }
  try {
    const r = await fetch(`${cfg.base}/api/channels`, {
      headers: { Authorization: `Bearer ${cfg.token}` }
    })
    const text = await r.text()
    if (!r.ok) return { ok: false, message: `HTTP ${r.status} ${text.slice(0, 120)}` }
    return { ok: true, message: (text.slice(0, 240) || '连接成功').trim() }
  } catch (e: any) {
    return { ok: false, message: e?.message || '连接失败' }
  }
}

export interface UploadResult {
  ok: boolean
  /** 图片完整外链 URL */
  url?: string
  /** 图床文件 id（/file/ 后的路径），用于删除 */
  fileId?: string
  /** 使用的渠道标签 */
  channel?: string
  error?: string
}

/** 从图床返回体里健壮地解析出图片 URL（兼容 数组/对象、src/publicUrl、相对路径/完整 URL） */
function pickUrl(data: any, base: string): string {
  const items: any[] = Array.isArray(data) ? data : [data]
  for (const it of items) {
    if (!it || typeof it !== 'object') continue
    let src = String(it.src || it.publicUrl || it.url || '')
    if (!src) continue
    if (/^\//.test(src)) src = base + src // 相对路径补全域名
    if (/^https?:\/\//.test(src)) return src
  }
  return ''
}

/** 从完整外链解析出图床文件 id（供删除 API 使用） */
export function imgbedFileId(url: string): string {
  try {
    const path = new URL(url).pathname
    return decodeURIComponent(path.replace(/^\/file\//, '').replace(/^\//, ''))
  } catch {
    return ''
  }
}

const ALLOWED_CHANNELS = new Set(['s3', 'cfr2', 'discord', 'telegram', 'huggingface', 'webdav'])

/** 把文件代理上传到图床，返回完整外链 */
export async function imgbedUpload(
  cfg: ImgbedConfig,
  file: File,
  channel = ''
): Promise<UploadResult> {
  if (!cfg.configured) return { ok: false, error: '图床未配置：请在「设置 → 图床接入」填写地址与 Token' }

  const qs = new URLSearchParams({ returnFormat: 'full', responseFormat: 'object' })
  const ch = ALLOWED_CHANNELS.has(channel) ? channel : ''
  if (ch) qs.set('uploadChannel', ch)

  const fd = new FormData()
  fd.append('file', file, file.name || 'upload.bin')

  let resp: Response
  try {
    resp = await fetch(`${cfg.base}/upload?${qs.toString()}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}` },
      body: fd
    })
  } catch (e: any) {
    return { ok: false, error: '连接图床失败：' + (e?.message || '网络错误') }
  }

  const text = await resp.text()
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    data = null
  }

  if (!resp.ok) {
    const msg =
      (data && (data.error || data.message || data.code)) ||
      (text && text.slice(0, 120)) ||
      `HTTP ${resp.status}`
    return { ok: false, error: `图床上传失败（${resp.status}）：${msg}` }
  }
  if (data && data.success === false) {
    return { ok: false, error: '图床上传失败：' + (data.error || data.message || '未知错误') }
  }

  const url = pickUrl(data, cfg.base)
  if (!url) return { ok: false, error: '图床返回异常，未取到图片地址' }

  const label = ch === 's3' ? 'Backblaze B2' : ch === 'huggingface' ? 'HuggingFace' : '默认渠道'
  return { ok: true, url, fileId: imgbedFileId(url), channel: label }
}

/** 尽力删除图床远端文件（失败不影响本地记录删除） */
export async function imgbedDelete(cfg: ImgbedConfig, url: string): Promise<boolean> {
  if (!cfg.configured) return false
  const id = imgbedFileId(url)
  if (!id) return false
  try {
    const resp = await fetch(`${cfg.base}/api/manage/delete/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}` }
    })
    return resp.ok
  } catch {
    return false
  }
}
