import { esc } from './util'

/**
 * 极简 Markdown → HTML 渲染器（零依赖，专为 Workers 边缘运行时优化）
 * 支持：标题 / 段落 / 引用 / 无序与有序列表 / 围栏代码块 / 行内代码 /
 *       粗体 斜体 删除线 / 链接 / 图片 / 分割线 / 表格
 * 所有文本输出均经过 HTML 转义，杜绝 XSS。
 */

interface Ctx {
  /** 行内代码占位符 */
  codes: string[]
}

function inline(text: string, ctx: Ctx): string {
  // 1. 先抽出行内代码，避免内部内容被其他规则破坏
  let s = text.replace(/`([^`\n]+)`/g, (_m, code: string) => {
    ctx.codes.push(`<code>${esc(code)}</code>`)
    return `\u0000C${ctx.codes.length - 1}\u0000`
  })

  s = esc(s)

  // 2. 图片 ![alt](src)
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_m, alt, src) => {
    const safeSrc = sanitizeUrl(src)
    return `<img src="${safeSrc}" alt="${alt}" loading="lazy" decoding="async">`
  })

  // 3. 链接 [text](href)
  s = s.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, txt, href) => {
    const safe = sanitizeUrl(href)
    const ext = /^https?:\/\//i.test(safe)
    return `<a href="${safe}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${txt}</a>`
  })

  // 4. 强调
  s = s
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')

  // 5. 还原行内代码
  s = s.replace(/\u0000C(\d+)\u0000/g, (_m, i: string) => ctx.codes[Number(i)] ?? '')

  return s
}

function sanitizeUrl(u: string): string {
  const t = String(u || '').trim()
  if (/^(https?:|\/|#|mailto:)/i.test(t)) return t.replace(/"/g, '%22')
  return '#'
}

export function renderMarkdown(md: string): string {
  const ctx: Ctx = { codes: [] }
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []

  let i = 0
  let inList: 'ul' | 'ol' | null = null
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join('\n'), ctx).replace(/\n/g, '<br>')}</p>`)
      paragraph = []
    }
  }
  const closeList = () => {
    if (inList) {
      out.push(`</${inList}>`)
      inList = null
    }
  }

  while (i < lines.length) {
    const line = lines[i]

    // 围栏代码块
    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      flushParagraph()
      closeList()
      const lang = fence[1]
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i])
        i++
      }
      i++ // 跳过结束围栏
      const cls = lang ? ` class="language-${esc(lang)}" data-lang="${esc(lang)}"` : ''
      out.push(`<pre><code${cls}>${esc(buf.join('\n'))}</code></pre>`)
      continue
    }

    // 空行
    if (!line.trim()) {
      flushParagraph()
      closeList()
      i++
      continue
    }

    // 分割线
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
      flushParagraph()
      closeList()
      out.push('<hr>')
      i++
      continue
    }

    // 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      flushParagraph()
      closeList()
      const lv = Math.min(6, h[1].length)
      out.push(`<h${lv}>${inline(h[2], ctx)}</h${lv}>`)
      i++
      continue
    }

    // 引用
    if (/^>\s?/.test(line)) {
      flushParagraph()
      closeList()
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      out.push(`<blockquote>${renderMarkdown(buf.join('\n')).replace(/^<p>|<\/p>$/g, '')}</blockquote>`)
      continue
    }

    // 表格（| a | b |）
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      flushParagraph()
      closeList()
      const cells = (row: string) =>
        row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const head = cells(line)
      i += 2
      const body: string[][] = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        body.push(cells(lines[i]))
        i++
      }
      out.push(
        `<div class="table-wrap"><table><thead><tr>${head
          .map((c) => `<th>${inline(c, ctx)}</th>`)
          .join('')}</tr></thead><tbody>${body
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c, ctx)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`
      )
      continue
    }

    // 列表
    const ul = line.match(/^\s*[-*+]\s+(.*)$/)
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (ul || ol) {
      flushParagraph()
      const type = ul ? 'ul' : 'ol'
      if (inList && inList !== type) closeList()
      if (!inList) {
        out.push(`<${type}>`)
        inList = type
      }
      const item = (ul ? ul[1] : ol![1]) as string
      out.push(`<li>${inline(item, ctx)}</li>`)
      i++
      continue
    }

    // 普通段落
    paragraph.push(line)
    i++
  }

  flushParagraph()
  closeList()
  return out.join('\n')
}

/** 抽取正文里出现的第一个图片地址，用作封面 */
export function firstImage(md: string): string {
  const m = String(md || '').match(/!\[[^\]]*\]\(([^)\s]+)\)/)
  return m ? m[1] : ''
}
