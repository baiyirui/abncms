import fs from 'node:fs'
import opentype from 'opentype.js'

const fontPath = new URL('./node_modules/@fontsource/quicksand/files/quicksand-latin-700-normal.woff', import.meta.url).pathname.slice(1)
const buf = fs.readFileSync(fontPath)
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))

const text = 'ABNCMS'
const fontSize = 42
const scale = fontSize / font.unitsPerEm

// 先以 baseline=0 生成所有字形路径，拿到整体实际边界框
let cursor = 0
const placed = []
for (let i = 0; i < text.length; i++) {
  const g = font.charToGlyph(text[i])
  const path = g.getPath(cursor, 0, fontSize)
  placed.push({ path, i })
  cursor += g.advanceWidth * scale
}

// 计算整体 bbox
let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
for (const { path } of placed) {
  const b = path.getBoundingBox()
  x1 = Math.min(x1, b.x1); y1 = Math.min(y1, b.y1)
  x2 = Math.max(x2, b.x2); y2 = Math.max(y2, b.y2)
}

const padX = 8
const contentW = x2 - x1
const contentH = y2 - y1
const viewW = Math.ceil(contentW + padX * 2)
const viewH = 64
// 平移量：让内容 bbox 居中于 viewBox
const tx = padX - x1
const ty = (viewH - contentH) / 2 - y1

let body = ''
for (const { path, i } of placed) {
  const d = path.toPathData(2)
  const color = i < 3 ? '#ff6a1a' : '#24272b'
  body += `    <path d="${d}" fill="${color}"/>\n`
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewW} ${viewH}" role="img" aria-label="ABNCMS">
  <g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)})">
${body}  </g>
</svg>
`

const out = 'D:/workbuddy/2026-10-24-00-07-28/cf-press/public/logo.svg'
fs.writeFileSync(out, svg, 'utf8')
console.log('written', out)
console.log('bbox', [x1, y1, x2, y2].map(v => v.toFixed(1)).join(','))
console.log('viewBox', viewW, viewH, 'translate', tx.toFixed(2), ty.toFixed(2), 'bytes', svg.length)
