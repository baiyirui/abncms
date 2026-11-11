import type { Env } from '../types'

/**
 * 外部图床（CloudFlare-ImgBed / ABN图床）代理。
 *
 * 设计要点：
 * - API Token 只放在 Cloudflare Secret（IMGBED_TOKEN），由 Worker 服务端注入
 *   Authorization 头转发，绝不下发到浏览器，避免泄露。
 * - 前端仍 POST 到本站 /api/upload，Worker 收到文件后二次转发到图床 /upload。
 * - 上传接口官方文档：POST /upload  -H "Authorization: Bearer <TOKEN>" -F "file=@..."
 *   用 returnFormat=full 拿到完整 URL，responseFormat=object 拿到对象结构。
 * - 渠道（uploadChannel）可选：s3(Backblaze B2) / huggingface，留空走图床默认渠道。
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
}

export function imgbedConfig(env: Env): ImgbedConfig {
  // 具体图床地址与 Token 名称由部署方的环境变量提供，源码不内置任何私有实例
  const base = (env.IMGBED_BASE_URL || '').replace(/\/+$/, '')
  const token = (env.IMGBED_TOKEN || '').trim()
  return {
    base,
    token,
    configured: !!token && !!base,
    tokenName: env.IMGBED_TOKEN_NAME || ''
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
  if (!cfg.configured) return { ok: false, error: '图床未配置：请设置 IMGBED_TOKEN 密钥' }

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
