/* cf-press 后台交互脚本（原生 ES Module，无需打包） */

const $ = (s) => document.querySelector(s)

function toast(msg, ok = true) {
  const el = document.createElement('div')
  el.className = 'alert ' + (ok ? 'ok' : 'err')
  el.textContent = msg
  el.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:99;max-width:320px'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 3200)
}

async function postJSON(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {})
  })
  return r.json()
}

/* ── Markdown 预览 ── */
$('#btn-preview')?.addEventListener('click', async () => {
  const md = $('#md').value
  const btn = $('#btn-preview')
  btn.disabled = true
  btn.textContent = '渲染中…'
  try {
    const j = await postJSON('/api/preview', { md })
    $('#preview-body').innerHTML = j.html || '<span class="faint">（空）</span>'
  } catch (e) {
    toast('预览失败：' + e.message, false)
  } finally {
    btn.disabled = false
    btn.textContent = '预览'
  }
})

/* ── AI 生成摘要与标签 ── */
$('#btn-ai')?.addEventListener('click', async () => {
  const title = $('#title').value.trim()
  const md = $('#md').value
  if (!md.trim()) return toast('请先写点正文', false)
  const btn = $('#btn-ai')
  btn.disabled = true
  btn.textContent = 'AI 处理中…'
  try {
    const j = await postJSON('/api/ai/summary-tags', { title, md })
    if (j.error) return toast(j.error, false)
    const ex = document.querySelector('textarea[name="excerpt"]')
    if (j.summary && ex) ex.value = j.summary
    if (j.tags?.length) {
      const t = $('#tags')
      const cur = t.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
      t.value = [...new Set([...cur, ...j.tags])].join(', ')
    }
    toast('已生成摘要与标签')
  } catch (e) {
    toast('AI 请求失败：' + e.message, false)
  } finally {
    btn.disabled = false
    btn.textContent = 'AI 生成摘要与标签'
  }
})

/* ── 图片上传（代理到 ABN图床，Token 由服务端注入） ── */
async function upload(file) {
  const fd = new FormData()
  fd.append('file', file)
  const ch = document.querySelector('#channel')?.value || ''
  if (ch) fd.append('channel', ch)
  const r = await fetch('/api/upload', { method: 'POST', body: fd })
  return r.json()
}

$('#btn-upload')?.addEventListener('click', () => $('#file').click())
$('#file')?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]
  if (!f) return
  toast('正在上传到图床…')
  try {
    const j = await upload(f)
    if (j.error) return toast(j.error, false)
    const md = $('#md')
    const insert = `\n![](${j.url})\n`
    const pos = md.selectionStart || md.value.length
    md.value = md.value.slice(0, pos) + insert + md.value.slice(pos)
    const cover = document.querySelector('#cover')
    if (cover && !cover.value) cover.value = j.url
    toast('已插入（' + (j.channel || '图床') + '）：' + j.url)
  } catch (err) {
    toast('上传失败：' + err.message, false)
  }
  e.target.value = ''
})

/* ── 媒体库上传 ── */
const upform = $('#upform')
upform?.addEventListener('submit', async (e) => {
  e.preventDefault()
  const f = $('#mfile').files?.[0]
  if (!f) return
  toast('正在上传到图床…')
  const btn = upform.querySelector('button[type="submit"]')
  if (btn) btn.disabled = true
  try {
    const j = await upload(f)
    if (j.error) {
      toast(j.error, false)
      if (btn) btn.disabled = false
      return
    }
    toast('上传成功（' + (j.channel || '图床') + '），正在刷新…')
    setTimeout(() => location.reload(), 700)
  } catch (err) {
    toast('上传失败：' + err.message, false)
    if (btn) btn.disabled = false
  }
})

/* ── 媒体库：复制图片外链 ── */
document.querySelectorAll('.btn-copy').forEach((b) => {
  b.addEventListener('click', () => {
    navigator.clipboard.writeText(b.dataset.url || '').then(
      () => {
        const t = b.textContent
        b.textContent = '已复制'
        setTimeout(() => (b.textContent = t), 1500)
      },
      () => toast('复制失败，请手动复制链接', false)
    )
  })
})

/* ── 编辑器快捷键：Cmd/Ctrl+S 保存 ── */
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's' && $('#postform')) {
    e.preventDefault()
    $('#postform').requestSubmit()
  }
})
