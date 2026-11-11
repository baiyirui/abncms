import { esc, fmtDate } from '../lib/util'
import type { PostRow, SiteSettings } from '../types'
import { adminPage } from './layout'

function pageHead(title: string, action?: string): string {
  return `<div class="row" style="margin-bottom:18px"><h1 style="margin:0;font-size:22px;font-weight:650;letter-spacing:-.02em">${esc(
    title
  )}</h1><span class="grow"></span>${action || ''}</div>`
}

export function dashboard(o: {
  stats: any
  recent: PostRow[]
  settings: SiteSettings
  user: { username: string; display_name: string }
  services: { name: string; ok: boolean; note: string }[]
}): string {
  const body = `
${pageHead('概览', `<a class="btn primary" href="/admin/post/new">写文章</a>`)}
<div class="stat-grid">
  ${[
    ['已发布', o.stats.published],
    ['草稿', o.stats.drafts],
    ['评论', o.stats.comments],
    ['媒体', o.stats.media],
    ['总阅读', o.stats.views],
    ['近 24h 访问', o.stats.todayViews]
  ]
    .map(([l, n]) => `<div class="card stat"><div class="n">${n}</div><div class="l">${l}</div></div>`)
    .join('')}
</div>

<div class="card pad" style="margin-bottom:22px">
  <div class="small muted" style="font-weight:600;margin-bottom:12px">Cloudflare 服务绑定状态</div>
  <div style="display:flex;flex-wrap:wrap;gap:8px">
    ${o.services
      .map(
        (s) =>
          `<span class="tag" style="border-color:transparent;background:${s.ok ? 'var(--accent-soft)' : 'var(--surface-2)'};color:${s.ok ? 'var(--accent)' : 'var(--muted)'}">${s.ok ? '✓' : '○'} ${esc(s.name)} · ${esc(s.note)}</span>`
      )
      .join('')}
  </div>
</div>

<div class="small muted" style="font-weight:600;margin-bottom:12px">最近文章</div>
<div class="card" style="overflow:hidden">
  <table class="tbl">
    <thead><tr><th>标题</th><th>状态</th><th>分类</th><th>阅读</th><th>更新时间</th><th></th></tr></thead>
    <tbody>
      ${o.recent.length
        ? o.recent
            .map(
              (p) => `<tr>
        <td><a href="/p/${esc(p.slug)}" target="_blank">${esc(p.title)}</a></td>
        <td><span class="badge ${p.status === 'published' ? 'pub' : 'draft'}">${p.status === 'published' ? '已发布' : '草稿'}</span></td>
        <td class="small muted">${esc(p.category_name || '—')}</td>
        <td class="small muted">${p.views}</td>
        <td class="small muted">${fmtDate(p.updated_at)}</td>
        <td style="text-align:right"><a class="btn sm" href="/admin/post/${p.id}">编辑</a></td>
      </tr>`
            )
            .join('')
        : '<tr><td colspan="6" class="center muted" style="padding:26px">还没有文章</td></tr>'}
    </tbody>
  </table>
</div>`
  return adminPage({ title: '概览', body, active: '/admin', user: o.user, settings: o.settings })
}

function adminPager(base: string, cur: number, total: number, perPage: number): string {
  const pages = Math.max(1, Math.ceil(total / perPage))
  if (pages <= 1) return ''
  let out = ''
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - cur) <= 2) {
      out += `<a class="btn sm ${i === cur ? 'primary' : ''}" href="${base}?page=${i}">${i}</a>`
    }
  }
  return `<div class="row" style="margin-top:16px;justify-content:center;gap:6px">${out}</div>`
}

export function postsList(o: {
  posts: PostRow[]
  cur: number
  total: number
  perPage: number
  settings: SiteSettings
  user: { username: string; display_name: string }
  msg?: string
}): string {
  const body = `
${pageHead('文章', `<a class="btn primary" href="/admin/post/new">+ 新建</a>`)}
${o.msg ? `<div class="alert ok">${esc(o.msg)}</div>` : ''}
<div class="card" style="overflow:hidden">
  <table class="tbl">
    <thead><tr><th>标题</th><th>状态</th><th>分类</th><th>阅读</th><th>更新</th><th style="text-align:right">操作</th></tr></thead>
    <tbody>
      ${o.posts.length
        ? o.posts
            .map(
              (p) => `<tr>
        <td>${p.pinned ? '<span class="badge pin">顶</span> ' : ''}<a href="/p/${esc(p.slug)}" target="_blank">${esc(p.title)}</a></td>
        <td><span class="badge ${p.status === 'published' ? 'pub' : 'draft'}">${p.status === 'published' ? '已发布' : '草稿'}</span></td>
        <td class="small muted">${esc(p.category_name || '—')}</td>
        <td class="small muted">${p.views}</td>
        <td class="small muted">${fmtDate(p.updated_at)}</td>
        <td style="text-align:right;white-space:nowrap">
          <a class="btn sm" href="/admin/post/${p.id}">编辑</a>
          <form method="post" action="/admin/post/${p.id}/delete" style="display:inline" onsubmit="return confirm('确认删除《${esc(p.title)}》？')">
            <button class="btn sm danger" type="submit">删除</button>
          </form>
        </td>
      </tr>`
            )
            .join('')
        : '<tr><td colspan="6" class="center muted" style="padding:26px">还没有文章</td></tr>'}
    </tbody>
  </table>
</div>
${adminPager('/admin/posts', o.cur, o.total, o.perPage)}`
  return adminPage({ title: '文章', body, active: '/admin/posts', user: o.user, settings: o.settings })
}

export function editor(o: {
  post: PostRow | null
  categories: any[]
  tags: string
  settings: SiteSettings
  user: { username: string; display_name: string }
  msg?: string
  err?: string
  aiEnabled: boolean
  siteKey: string
}): string {
  const p = o.post
  const isNew = !p
  const body = `
${pageHead(isNew ? '写文章' : '编辑文章', `<a class="btn" href="/admin/posts">返回列表</a>`)}
${o.msg ? `<div class="alert ok">${esc(o.msg)}</div>` : ''}
${o.err ? `<div class="alert err">${esc(o.err)}</div>` : ''}
<form method="post" action="${isNew ? '/admin/post/new' : '/admin/post/' + p!.id}" id="postform">
  <div class="grid2">
    <div class="field"><label>标题 *</label><input class="input" name="title" id="title" value="${esc(p?.title || '')}" required maxlength="200"></div>
    <div class="field"><label>URL 别名（留空自动生成）</label><input class="input" name="slug" value="${esc(p?.slug || '')}" maxlength="160"></div>
  </div>
  <div class="field"><label>摘要（留空时自动截取正文）</label>
    <textarea class="input" name="excerpt" rows="2" maxlength="300">${esc(p?.excerpt || '')}</textarea></div>

  <div class="editor-wrap">
    <div>
      <div class="row" style="margin-bottom:6px">
        <label style="font-size:13.5px;font-weight:600">Markdown 正文</label>
        <span class="grow"></span>
        ${o.aiEnabled ? `<button class="btn sm" type="button" id="btn-ai">AI 生成摘要与标签</button>` : ''}
        <button class="btn sm" type="button" id="btn-preview">预览</button>
        <select class="input" id="channel" style="width:auto;height:30px;padding:0 8px;font-size:13px" title="图片上传渠道">
          <option value="">默认渠道</option>
          <option value="s3">Backblaze B2</option>
          <option value="huggingface">HuggingFace</option>
        </select>
        <button class="btn sm" type="button" id="btn-upload">插入图片</button>
      </div>
      <textarea class="input" id="md" name="content_md" placeholder="在这里用 Markdown 写作…">${esc(p?.content_md || '')}</textarea>
    </div>
    <div>
      <div class="small muted" style="font-weight:600;margin-bottom:6px">预览</div>
      <div class="card pad" id="preview"><div class="prose" id="preview-body">${p?.content_html || '<span class="faint">点击「预览」查看渲染效果</span>'}</div></div>
    </div>
  </div>

  <div class="grid2" style="margin-top:16px">
    <div class="field"><label>分类</label>
      <select class="input" name="category_id">
        <option value="">— 未分类 —</option>
        ${o.categories
          .map(
            (c) =>
              `<option value="${c.id}" ${p?.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`
          )
          .join('')}
      </select>
    </div>
    <div class="field"><label>标签（英文逗号分隔）</label>
      <input class="input" id="tags" name="tags" value="${esc(o.tags)}" placeholder="Cloudflare, Workers">
    </div>
  </div>
  <div class="grid2">
    <div class="field"><label>封面图地址（粘贴图床外链，或用「插入图片」自动填充）</label>
      <input class="input" id="cover" name="cover" value="${esc(p?.cover || '')}" placeholder="https://your-image-host.example.com/file/xxx.png">
    </div>
    <div class="field"><label>状态</label>
      <select class="input" name="status">
        <option value="published" ${p?.status === 'published' ? 'selected' : ''}>已发布</option>
        <option value="draft" ${p?.status !== 'published' ? 'selected' : ''}>草稿</option>
      </select>
    </div>
  </div>
  <div class="row">
    <label class="row small" style="gap:7px"><input type="checkbox" name="pinned" value="1" ${p?.pinned ? 'checked' : ''}> 置顶</label>
    <span class="grow"></span>
    ${!isNew ? `<a class="btn" href="/p/${esc(p!.slug)}" target="_blank">查看</a>` : ''}
    <button class="btn primary" type="submit">${isNew ? '发布' : '保存修改'}</button>
  </div>
</form>
<input type="file" id="file" accept="image/*" hidden>
<div class="cf-turnstile" data-sitekey="${esc(o.siteKey)}" hidden></div>
<script type="module" src="/admin.js"></script>`
  return adminPage({
    title: isNew ? '写文章' : '编辑',
    body,
    active: '/admin/post/new',
    user: o.user,
    settings: o.settings,
    head: '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" defer></script>'
  })
}

export function categoriesPage(o: {
  categories: any[]
  settings: SiteSettings
  user: { username: string; display_name: string }
  msg?: string
}): string {
  const body = `
${pageHead('分类')}
${o.msg ? `<div class="alert ok">${esc(o.msg)}</div>` : ''}
<div class="card" style="overflow:hidden;margin-bottom:22px">
  <table class="tbl">
    <thead><tr><th>名称</th><th>别名</th><th>描述</th><th>文章</th><th style="text-align:right">操作</th></tr></thead>
    <tbody>
      ${o.categories
        .map(
          (c) => `<tr>
        <td>${esc(c.name)}</td><td class="small muted">${esc(c.slug)}</td>
        <td class="small muted">${esc(c.description || '—')}</td>
        <td class="small muted">${c.post_count}</td>
        <td style="text-align:right"><form method="post" action="/admin/category/${c.id}/delete" style="display:inline" onsubmit="return confirm('删除分类《${esc(c.name)}》？')"><button class="btn sm danger">删除</button></form></td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>
</div>
<form class="card pad" method="post" action="/admin/category/new">
  <div class="small muted" style="font-weight:600;margin-bottom:12px">新增分类</div>
  <div class="grid2">
    <div class="field"><label>名称</label><input class="input" name="name" required></div>
    <div class="field"><label>别名（英文）</label><input class="input" name="slug" placeholder="tech"></div>
  </div>
  <div class="field"><label>描述</label><input class="input" name="description"></div>
  <button class="btn primary" type="submit">添加</button>
</form>`
  return adminPage({ title: '分类', body, active: '/admin/categories', user: o.user, settings: o.settings })
}

export function commentsPage(o: {
  comments: any[]
  settings: SiteSettings
  user: { username: string; display_name: string }
  msg?: string
}): string {
  const body = `
${pageHead('评论')}
${o.msg ? `<div class="alert ok">${esc(o.msg)}</div>` : ''}
<div class="card" style="overflow:hidden">
  <table class="tbl">
    <thead><tr><th>作者</th><th>内容</th><th>文章</th><th>状态</th><th>时间</th><th style="text-align:right">操作</th></tr></thead>
    <tbody>
      ${o.comments.length
        ? o.comments
            .map(
              (c) => `<tr>
        <td class="small">${esc(c.author)}</td>
        <td class="small">${esc(c.content).slice(0, 90)}</td>
        <td class="small muted"><a href="/p/${esc(c.post_slug || '')}" target="_blank">${esc(c.post_title || '—')}</a></td>
        <td><span class="badge ${c.status === 'approved' ? 'pub' : 'draft'}">${esc(c.status)}</span></td>
        <td class="small muted">${fmtDate(c.created_at)}</td>
        <td style="text-align:right;white-space:nowrap">
          ${c.status !== 'approved' ? `<form method="post" action="/admin/comment/${c.id}/approve" style="display:inline"><button class="btn sm">通过</button></form>` : ''}
          <form method="post" action="/admin/comment/${c.id}/delete" style="display:inline"><button class="btn sm danger">删除</button></form>
        </td>
      </tr>`
            )
            .join('')
        : '<tr><td colspan="6" class="center muted" style="padding:26px">暂无评论</td></tr>'}
    </tbody>
  </table>
</div>`
  return adminPage({ title: '评论', body, active: '/admin/comments', user: o.user, settings: o.settings })
}

/** 媒体记录预览/访问地址：新记录为图床完整外链，旧记录为 R2 key */
function mediaSrc(m: any): string {
  const k = String(m.key || '')
  return /^https?:\/\//.test(k) ? k : '/media/' + k
}

export function mediaPage(o: {
  media: any[]
  settings: SiteSettings
  user: { username: string; display_name: string }
  imgbed?: {
    configured: boolean
    base: string
    tokenName: string
    channels: { value: string; label: string }[]
  }
  msg?: string
  err?: string
}): string {
  const im = o.imgbed
  const channelSelect = `<select class="input" id="channel" style="width:auto;min-width:150px;height:36px;padding:0 10px" title="选择上传渠道">
    ${(im?.channels || [{ value: '', label: '默认渠道' }])
      .map((ch) => `<option value="${esc(ch.value)}">${esc(ch.label)}</option>`)
      .join('')}
  </select>`
  const statusLine = im
    ? im.configured
      ? `<div class="small faint" style="margin-top:10px">图床：<a href="${esc(im.base)}" target="_blank" rel="noopener">${esc(im.base)}</a> · Token「${esc(im.tokenName)}」已配置 · 服务端代理上传（Token 不下发浏览器）</div>`
      : `<div class="alert err" style="margin:12px 0 0">图床未配置：请在 Cloudflare 执行 <code>wrangler secret put IMGBED_TOKEN</code> 后重新部署。</div>`
    : ''
  const body = `
${pageHead('媒体库')}
${o.msg ? `<div class="alert ok">${esc(o.msg)}</div>` : ''}
${o.err ? `<div class="alert err">${esc(o.err)}</div>` : ''}
<form class="card pad" id="upform" style="margin-bottom:22px">
  <div class="row" style="flex-wrap:wrap;gap:10px">
    <input type="file" name="file" id="mfile" accept="image/*,application/pdf,video/*" required>
    ${channelSelect}
    <button class="btn primary" type="submit" ${im && !im.configured ? 'disabled' : ''}>上传到图床</button>
  </div>
  ${statusLine}
</form>
<div class="card" style="overflow:hidden">
  <table class="tbl">
    <thead><tr><th>预览</th><th>文件名</th><th>类型</th><th>大小</th><th>时间</th><th style="text-align:right">操作</th></tr></thead>
    <tbody>
      ${o.media.length
        ? o.media
            .map(
              (m) => `<tr>
        <td>${
          /^image\//.test(m.content_type || '')
            ? `<img src="${esc(mediaSrc(m))}" loading="lazy" style="width:52px;height:38px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">`
            : '<span class="faint small">—</span>'
        }</td>
        <td class="small"><a href="${esc(mediaSrc(m))}" target="_blank" rel="noopener">${esc(m.filename || m.key)}</a></td>
        <td class="small muted">${esc(m.content_type)}</td>
        <td class="small muted">${(m.size / 1024).toFixed(1)} KB</td>
        <td class="small muted">${fmtDate(m.created_at)}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn sm btn-copy" data-url="${esc(mediaSrc(m))}">复制链接</button>
          <form method="post" action="/admin/media/${m.id}/delete" style="display:inline" onsubmit="return confirm('删除该媒体记录？将同时尝试删除图床远端文件。')"><button class="btn sm danger">删除</button></form>
        </td>
      </tr>`
            )
            .join('')
        : '<tr><td colspan="6" class="center muted" style="padding:26px">还没有上传文件</td></tr>'}
    </tbody>
  </table>
</div>
<script type="module" src="/admin.js"></script>`
  return adminPage({ title: '媒体库', body, active: '/admin/media', user: o.user, settings: o.settings })
}

export function settingsPage(o: {
  settings: SiteSettings
  user: { username: string; display_name: string }
  envInfo: {
    siteUrl: string
    turnstileSiteKey: string
    aiOn: string
    vecOn: string
    imgbed?: { configured: boolean; base: string; tokenName: string }
  }
  msg?: string
  err?: string
}): string {
  const s = o.settings
  const im = o.envInfo.imgbed
  const body = `
${pageHead('设置')}
${o.msg ? `<div class="alert ok">${esc(o.msg)}</div>` : ''}
${o.err ? `<div class="alert err">${esc(o.err)}</div>` : ''}
<form class="card pad" method="post" action="/admin/settings" style="margin-bottom:22px">
  <div class="small muted" style="font-weight:600;margin-bottom:14px">站点信息</div>
  <div class="field"><label>站点名称</label><input class="input" name="site_name" value="${esc(s.site_name)}"></div>
  <div class="field"><label>站点描述</label><input class="input" name="site_description" value="${esc(s.site_description)}"></div>
  <div class="field"><label>关键词（逗号分隔）</label><input class="input" name="site_keywords" value="${esc(s.site_keywords)}"></div>
  <div class="field"><label>页脚文字</label><input class="input" name="footer_text" value="${esc(s.footer_text)}"></div>
  <div class="grid2">
    <div class="field"><label>每页文章数</label><input class="input" name="posts_per_page" type="number" min="1" max="50" value="${esc(s.posts_per_page)}"></div>
    <div class="field"><label>开启评论</label>
      <select class="input" name="allow_comments">
        <option value="1" ${s.allow_comments === '1' ? 'selected' : ''}>开启</option>
        <option value="0" ${s.allow_comments !== '1' ? 'selected' : ''}>关闭</option>
      </select></div>
  </div>
  <div class="field"><label>Turnstile Secret Key</label>
    <input class="input" name="turnstile_secret" value="${esc(s.turnstile_secret)}">
    <div class="small faint" style="margin-top:5px">当前使用 Cloudflare 官方测试密钥（始终通过）。启用真实人机验证需 <b>Site Key 与 Secret 成对替换</b>：Site Key 在 <code>wrangler.jsonc</code> 的 <code>TURNSTILE_SITE_KEY</code> 变量里，改完需重新部署；只填一侧会错配。</div>
  </div>
  <button class="btn primary" type="submit">保存设置</button>
</form>

<form class="card pad" method="post" action="/admin/password">
  <div class="small muted" style="font-weight:600;margin-bottom:14px">修改密码</div>
  <div class="grid2">
    <div class="field"><label>当前密码</label><input class="input" name="old" type="password" required></div>
    <div class="field"><label>新密码（至少 8 位）</label><input class="input" name="new" type="password" required minlength="8"></div>
  </div>
  <button class="btn" type="submit">更新密码</button>
</form>

<div class="card pad" style="margin-top:22px">
  <div class="small muted" style="font-weight:600;margin-bottom:10px">运行环境</div>
  <div class="small faint" style="line-height:2">
    <div>站点地址：${esc(o.envInfo.siteUrl)}</div>
    <div>Turnstile Site Key：${esc(o.envInfo.turnstileSiteKey)}</div>
    <div>Workers AI：${esc(o.envInfo.aiOn)} · Vectorize：${esc(o.envInfo.vecOn)}</div>
    <div>图片存储：${im ? (im.configured ? `ABN图床 <a href="${esc(im.base)}" target="_blank" rel="noopener">${esc(im.base)}</a>（Token「${esc(im.tokenName)}」· Backblaze B2 / HuggingFace）` : '图床未配置（缺 IMGBED_TOKEN）') : '—'}</div>
    <div>运行时：Cloudflare Workers · 数据库 D1 · 缓存 KV · 图床代理上传</div>
  </div>
</div>
${im ? `<div class="card pad" style="margin-top:16px">
  <div class="small muted" style="font-weight:600;margin-bottom:10px">图床接入（ABN图床 / CloudFlare-ImgBed）</div>
  <div class="small faint" style="line-height:2">
    <div>API 地址：${esc(im.base)}/upload</div>
    <div>认证方式：服务端注入 <code>Authorization: Bearer ***</code>（Token 存于 Cloudflare Secret，不出现在页面源码）</div>
    <div>可选渠道：默认 / Backblaze B2（S3）/ HuggingFace</div>
    <div>状态：${im.configured ? '<span style="color:var(--ok)">● 已启用</span>' : '<span style="color:var(--danger)">● 未配置</span>'} · 在「媒体库」或编辑器点「插入图片」即可上传</div>
  </div>
</div>` : ''}`
  return adminPage({ title: '设置', body, active: '/admin/settings', user: o.user, settings: o.settings })
}
