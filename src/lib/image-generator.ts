/**
 * Professional finance image generator using Sharp
 * Produces high-quality 1080x1920 Instagram Reel visuals
 * Completely server-side — instant, free, unlimited
 */

import sharp from 'sharp'

const W = 1080
const H = 1920

// ── Colour palettes ──────────────────────────────────────────────────────────
const PALETTES = [
  { bg1: '#0a0a1a', bg2: '#1a1a3e', accent: '#FFD700', accent2: '#FFA500', name: 'gold'    },
  { bg1: '#001a0a', bg2: '#003320', accent: '#00FF88', accent2: '#00CC66', name: 'emerald' },
  { bg1: '#000d1a', bg2: '#001a33', accent: '#38BDF8', accent2: '#0EA5E9', name: 'sapphire'},
  { bg1: '#1a0000', bg2: '#330011', accent: '#FF6B6B', accent2: '#FF4444', name: 'ruby'    },
  { bg1: '#0d001a', bg2: '#1a0033', accent: '#C084FC', accent2: '#A855F7', name: 'violet'  },
  { bg1: '#001a1a', bg2: '#003333', accent: '#2DD4BF', accent2: '#14B8A6', name: 'teal'    },
]

function hex2rgb(h: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h)!
  return { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
}

function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t) }

/** Vertical gradient pixel buffer */
function gradientBuf(w: number, h: number, c1: string, c2: string): Buffer {
  const a = hex2rgb(c1), b = hex2rgb(c2)
  const buf = Buffer.alloc(w * h * 3)
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1)
    const r = lerp(a.r, b.r, t), g = lerp(a.g, b.g, t), bv = lerp(a.b, b.b, t)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = bv
    }
  }
  return buf
}

function esc(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

/** Wrap text to lines of maxChars */
function wrap(text: string, maxChars = 22): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (test.length > maxChars && cur) { lines.push(cur); cur = w }
    else cur = test
  }
  if (cur) lines.push(cur)
  return lines
}

// ── SVG builders ─────────────────────────────────────────────────────────────

function svgBackground(p: typeof PALETTES[0], topic: string): string {
  const lines = wrap(topic, 20)
  const fs = lines.length > 2 ? 52 : 60
  const lh = fs * 1.4
  const blockH = lines.length * lh + 40
  const blockY = H * 0.52 - blockH / 2

  const textEls = lines.map((l, i) => {
    const y = blockY + i * lh + fs
    const approxW = Math.min(l.length * fs * 0.56 + 60, W - 80)
    const rx = (W - approxW) / 2
    const ry = blockY + i * lh - 6
    return `
    <rect x="${rx}" y="${ry}" width="${approxW}" height="${fs + 20}" rx="14" fill="rgba(0,0,0,0.55)"/>
    <text x="${W/2}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-weight="bold"
      font-size="${fs}" fill="${p.accent}" text-anchor="middle">${esc(l)}</text>`
  }).join('')

  // Animated-style chart bars
  const bars = [80,130,100,180,140,220,170,260,200,300].map((bh, i) => {
    const x = 60 + i * 100
    const y = H - 120 - bh
    const alpha = 0.12 + (i / 10) * 0.18
    return `<rect x="${x}" y="${y}" width="70" height="${bh}" rx="6" fill="${p.accent}" opacity="${alpha.toFixed(2)}"/>`
  }).join('')

  // Trend line
  const pts = [
    [60,1700],[200,1580],[350,1620],[500,1450],[650,1480],[800,1300],[950,1200],[1020,1100]
  ].map(([x,y]) => `${x},${y}`).join(' ')

  // Floating circles (decorative)
  const circles = [
    { cx: 900, cy: 250, r: 320, op: 0.06 },
    { cx: 120, cy: 1650, r: 260, op: 0.08 },
    { cx: 540, cy: 960,  r: 420, op: 0.04 },
  ].map(c => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${p.accent}" opacity="${c.op}"/>`).join('')

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  ${circles}

  <!-- Grid -->
  ${Array.from({length:9},(_,i)=>`<line x1="0" y1="${H/8*i}" x2="${W}" y2="${H/8*i}" stroke="${p.accent}" stroke-width="0.5" opacity="0.08"/>`).join('')}
  ${Array.from({length:6},(_,i)=>`<line x1="${W/5*i}" y1="0" x2="${W/5*i}" y2="${H}" stroke="${p.accent}" stroke-width="0.5" opacity="0.08"/>`).join('')}

  <!-- Trend line -->
  <polyline points="${pts}" fill="none" stroke="${p.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
  <polyline points="${pts}" fill="none" stroke="${p.accent2}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.15"/>

  <!-- Bars -->
  ${bars}

  <!-- Top accent bar -->
  <rect x="0" y="0" width="${W}" height="8" fill="${p.accent}"/>
  <rect x="0" y="${H-8}" width="${W}" height="8" fill="${p.accent}"/>

  <!-- Corner accents -->
  <rect x="0" y="0" width="80" height="8" fill="${p.accent2}"/>
  <rect x="${W-80}" y="0" width="80" height="8" fill="${p.accent2}"/>

  <!-- Big emoji -->
  <text x="${W/2}" y="${H*0.38}" font-size="200" text-anchor="middle" dominant-baseline="middle">💰</text>

  <!-- Topic text block -->
  ${textEls}

  <!-- Brand tag -->
  <rect x="${W/2-160}" y="${H-90}" width="320" height="50" rx="25" fill="rgba(0,0,0,0.4)"/>
  <text x="${W/2}" y="${H-58}" font-family="Arial,sans-serif" font-size="28" fill="${p.accent}" text-anchor="middle" opacity="0.7">Finance Reels AI ✦</text>
</svg>`
}

function svgOverlay(p: typeof PALETTES[0], topic: string): string {
  const lines = wrap(topic, 22)
  const fs = 56
  const lh = fs * 1.4
  const blockH = lines.length * lh + 40
  const blockY = H * 0.55 - blockH / 2

  const textEls = lines.map((l, i) => {
    const y = blockY + i * lh + fs
    const approxW = Math.min(l.length * fs * 0.56 + 60, W - 80)
    const rx = (W - approxW) / 2
    const ry = blockY + i * lh - 6
    return `
    <rect x="${rx}" y="${ry}" width="${approxW}" height="${fs + 20}" rx="14" fill="rgba(0,0,0,0.6)"/>
    <text x="${W/2}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-weight="bold"
      font-size="${fs}" fill="white" text-anchor="middle">${esc(l)}</text>`
  }).join('')

  // Stats cards
  const stats = [
    { label: 'Returns', val: '+24.5%', x: 80,  y: 220 },
    { label: 'Saved',   val: '$10K',   x: 620, y: 220 },
  ]
  const statEls = stats.map(s => `
    <rect x="${s.x}" y="${s.y}" width="340" height="130" rx="20" fill="rgba(0,0,0,0.5)" stroke="${p.accent}" stroke-width="1.5" stroke-opacity="0.4"/>
    <text x="${s.x+170}" y="${s.y+62}" font-family="Arial,sans-serif" font-weight="bold" font-size="52" fill="${p.accent}" text-anchor="middle">${s.val}</text>
    <text x="${s.x+170}" y="${s.y+105}" font-family="Arial,sans-serif" font-size="30" fill="rgba(255,255,255,0.65)" text-anchor="middle">${s.label}</text>
  `).join('')

  // Diagonal accent lines
  const diags = Array.from({length:5},(_,i)=>`
    <line x1="${-200+i*280}" y1="0" x2="${600+i*280}" y2="${H}" stroke="${p.accent}" stroke-width="1.5" opacity="0.07"/>
  `).join('')

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <!-- Vignette -->
  <defs>
    <radialGradient id="vig" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.55)"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>

  ${diags}

  <!-- Top bar -->
  <rect x="0" y="0" width="${W}" height="8" fill="${p.accent}"/>

  <!-- Stats -->
  ${statEls}

  <!-- Big emoji -->
  <text x="${W/2}" y="${H*0.44}" font-size="220" text-anchor="middle" dominant-baseline="middle">📈</text>

  <!-- Accent divider -->
  <rect x="100" y="${H*0.52}" width="${W-200}" height="4" rx="2" fill="${p.accent}" opacity="0.6"/>

  <!-- Topic text -->
  ${textEls}

  <!-- CTA -->
  <rect x="${W/2-260}" y="${H*0.78}" width="520" height="80" rx="40" fill="${p.accent}" opacity="0.15" stroke="${p.accent}" stroke-width="2" stroke-opacity="0.4"/>
  <text x="${W/2}" y="${H*0.78+50}" font-family="Arial,sans-serif" font-weight="bold" font-size="38" fill="${p.accent}" text-anchor="middle">👇 Watch Till End</text>

  <!-- Brand -->
  <text x="${W/2}" y="${H-55}" font-family="Arial,sans-serif" font-size="28" fill="${p.accent}" text-anchor="middle" opacity="0.5">Finance Reels AI ✦</text>
</svg>`
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateFinanceImage(
  topic: string,
  type: 'background' | 'overlay' = 'background',
  paletteIndex?: number
): Promise<string> {
  const idx = paletteIndex ?? (Math.abs(topic.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % PALETTES.length)
  const palette = PALETTES[idx]

  // Gradient background
  const gradBuf = gradientBuf(W, H, palette.bg1, palette.bg2)

  // SVG overlay
  const svgStr = type === 'background'
    ? svgBackground(palette, topic)
    : svgOverlay(palette, topic)

  const imgBuf = await sharp(gradBuf, { raw: { width: W, height: H, channels: 3 } })
    .composite([{ input: Buffer.from(svgStr), blend: 'over' }])
    .jpeg({ quality: 92 })
    .toBuffer()

  return `data:image/jpeg;base64,${imgBuf.toString('base64')}`
}

export async function generateReelImages(topic: string, count = 2): Promise<string[]> {
  const types: Array<'background' | 'overlay'> = ['background', 'overlay']
  return Promise.all(
    Array.from({ length: count }, (_, i) =>
      generateFinanceImage(topic, types[i % 2], i % PALETTES.length)
    )
  )
}
