import type { Env } from '../types'

const aiEnabled = (env: Env) => env.ENABLE_AI !== 'false' && !!env.AI
const vecEnabled = (env: Env) => env.ENABLE_VECTORIZE !== 'false' && !!env.VECTORIZE

/** 调用 Workers AI 文本生成（默认 llama-3.2-3b-instruct，免费额度内） */
async function text(env: Env, prompt: string, maxTokens = 200): Promise<string> {
  const model = env.AI_SUMMARY_MODEL || '@cf/meta/llama-3.2-3b-instruct'
  const res = (await env.AI.run(model, {
    prompt,
    max_tokens: maxTokens,
    temperature: 0.3
  })) as { response?: string } | string
  const out = typeof res === 'string' ? res : res?.response || ''
  return String(out).trim()
}

/** 生成一句话摘要 */
export async function aiSummary(env: Env, title: string, body: string): Promise<string> {
  if (!aiEnabled(env)) return ''
  const flat = body.replace(/```[\s\S]*?```/g, '').replace(/\s+/g, ' ').slice(0, 1800)
  const prompt =
    `你是编辑。为下面这篇文章写一句不超过 60 个中文字的摘要，只输出结果，不要任何解释或前缀。\n\n` +
    `标题：${title}\n正文：${flat}`
  try {
    return (await text(env, prompt, 120)).replace(/^["'「」]|["'「」]$/g, '')
  } catch {
    return ''
  }
}

/** 生成 3~5 个标签，逗号分隔 */
export async function aiTags(env: Env, title: string, body: string): Promise<string[]> {
  if (!aiEnabled(env)) return []
  const flat = body.replace(/```[\s\S]*?```/g, '').replace(/\s+/g, ' ').slice(0, 1500)
  const prompt =
    `从下面这篇文章中提取 3 到 5 个中文标签，用英文逗号分隔，只输出标签本身，不要任何解释。\n\n` +
    `标题：${title}\n正文：${flat}`
  try {
    const raw = await text(env, prompt, 60)
    return raw
      .split(/[,，、\n]/)
      .map((s) => s.trim().replace(/^[-•\d.\s]+/, ''))
      .filter((s) => s && s.length <= 12)
      .slice(0, 5)
  } catch {
    return []
  }
}

/** 文本向量化（bge-m3，1024 维，支持中文） */
async function embed(env: Env, input: string): Promise<number[] | null> {
  if (!aiEnabled(env)) return null
  try {
    const model = env.AI_EMBED_MODEL || '@cf/baai/bge-m3'
    const r = (await env.AI.run(model, { text: [input] })) as { data?: number[][] }
    const v = r?.data?.[0]
    return Array.isArray(v) && v.length ? v : null
  } catch {
    return null
  }
}

/** 发布/更新文章时写入向量索引，便于语义搜索 */
export async function indexPost(env: Env, id: number, title: string, body: string): Promise<boolean> {
  if (!vecEnabled(env)) return false
  const v = await embed(env, `${title}\n\n${body}`.slice(0, 4000))
  if (!v) return false
  try {
    await env.VECTORIZE.upsert([{ id: String(id), values: v, metadata: { title } }])
    return true
  } catch {
    return false
  }
}

export async function removeFromIndex(env: Env, id: number): Promise<void> {
  if (!vecEnabled(env)) return
  try {
    await env.VECTORIZE.deleteByIds([String(id)])
  } catch {
    /* 忽略 */
  }
}

/** 语义搜索：返回相似文章 id 与得分 */
export async function semanticSearch(
  env: Env,
  query: string,
  topK = 10
): Promise<{ id: number; score: number }[]> {
  if (!vecEnabled(env)) return []
  const v = await embed(env, query.slice(0, 2000))
  if (!v) return []
  try {
    const r = (await env.VECTORIZE.query(v, { topK, returnMetadata: false })) as {
      matches?: { id: string; score: number }[]
    }
    return (r?.matches || []).map((m) => ({ id: Number(m.id), score: m.score })).filter((m) => m.id > 0)
  } catch {
    return []
  }
}
