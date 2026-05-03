/**
 * Image generator — uses NVIDIA FLUX.1-schnell as primary (real AI images)
 * Falls back to sharp-based generator if FLUX is unavailable
 */

import sharp from 'sharp'

const W = 1080
const H = 1920

// ── NVIDIA FLUX.1-schnell ────────────────────────────────────────────────────

const FLUX_URL = process.env.NVIDIA_IMAGE_URL ||
  'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell'

/**
 * Generate an image using NVIDIA FLUX.1-schnell.
 * Returns a base64 data URL on success, null on failure.
 */
async function generateWithFlux(prompt: string): Promise<string | null> {
  const apiKey = process.env.NVIDIA_IMAGE_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(FLUX_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        width: 1024,
        height: 1024,
        seed: Math.floor(Math.random() * 999999),
        steps: 4,
      }),
      signal: AbortSignal.timeout(45000), // 45s timeout
    })

    if (!res.ok) {
      console.warn(`FLUX API returned ${res.status}`)
      return null
    }

    const data = await res.json()
    const b64 = data?.artifacts?.[0]?.base64
    if (!b64) return null

    return `data:image/jpeg;base64,${b64}`
  } catch (err) {
    console.warn('FLUX generation failed:', err)
    return null
  }
}

// ── Finance-themed prompts ───────────────────────────────────────────────────

function buildFluxPrompt(topic: string, type: 'background' | 'overlay'): string {
  const shortTopic = topic.substring(0, 60)

  if (type === 'background') {
    return `Professional finance Instagram Reel background for "${shortTopic}". ` +
      `Dark navy blue gradient, gold coins scattered, upward trending stock chart lines, ` +
      `modern minimalist design, luxury wealth aesthetic, no text, 9:16 vertical format, ` +
      `cinematic lighting, high quality, photorealistic`
  } else {
    return `Vibrant finance motivation visual for "${shortTopic}". ` +
      `Abstract money symbols, green growth arrows, dollar signs floating, ` +
      `dark background with glowing gold accents, wealth and success theme, ` +
      `no text, Instagram Reels format, professional, high quality`
  }
}

// ── Sharp fallback ───────────────────────────────────────────────────────────

const PALETTES = [
  { bg1: '#0a0a1a', bg2: '#1a1a3e', accent: '#FFD700', accent2: '#FFA500' },
  { bg1: '#001a0a', bg2: '#003320', accent: '#00FF88', accent2: '#00CC66' },
  { bg1: '#000d1a', bg2: '#001a33', accent: '#38BDF8', accent2: '#0EA5E9' },
  { bg1: '#1a0000', bg2: '#330011', accent: '#FF6B6B', accent2: '#FF4444' },
  { bg1: '#0d001a', bg2: '#1a0033', accent: '#C084FC', accent2: '#A855F7' },
  { bg1: '#001a1a', bg2: '#003333', accent: '#2DD4BF', accent2: '#14B8A6' },
]

function hex2rgb(h: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h)!
  return { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
}

function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t) }

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

  const bars = [80,130,100,180,140,220,170,260,200,300].map((bh, i) => {
    const x = 60 + i * 100
    const y = H - 120 - bh
    const alpha = 0.12 + (i / 10) * 0.18
    return `<rect x="${x}" y="${y}" width="70" height="${bh}" rx="6" fill="${p.accent}" opacity="${alpha.toFixed(2)}"/>`
  }).join('')

  const pts = [[60,1700],[200,1580],[350,1620],[500,1450],[650,1480],[800,1300],[950,1200],[1020,1100]]
    .map(([x,y]) => `${x},${y}`).join(' ')

  const circles = [
    { cx: 900, cy: 250, r: 320, op: 0.06 },
    { cx: 120, cy: 1650, r: 260, op: 0.08 },
    { cx: 540, cy: 960,  r: 420, op: 0.04 },
  ].map(c => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${p.accent}" opacity="${c.op}"/>`).join('')

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  ${circles}
  ${Array.from({length:9},(_,i)=>`<line x1="0" y1="${H/8*i}" x2="${W}" y2="${H/8*i}" stroke="${p.accent}" stroke-width="0.5" opacity="0.08"/>`).join('')}
  ${Array.from({length:6},(_,i)=>`<line x1="${W/5*i}" y1="0" x2="${W/5*i}" y2="${H}" stroke="${p.accent}" stroke-width="0.5" opacity="0.08"/>`).join('')}
  <polyline points="${pts}" fill="none" stroke="${p.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
  ${bars}
  <rect x="0" y="0" width="${W}" height="8" fill="${p.accent}"/>
  <rect x="0" y="${H-8}" width="${W}" height="8" fill="${p.accent}"/>
  <text x="${W/2}" y="${H*0.38}" font-size="200" text-anchor="middle" dominant-baseline="middle">💰</text>
  ${textEls}
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

  const stats = [
    { label: 'Returns', val: '+24.5%', x: 80,  y: 220 },
    { label: 'Saved',   val: '$10K',   x: 620, y: 220 },
  ]
  const statEls = stats.map(s => `
    <rect x="${s.x}" y="${s.y}" width="340" height="130" rx="20" fill="rgba(0,0,0,0.5)" stroke="${p.accent}" stroke-width="1.5" stroke-opacity="0.4"/>
    <text x="${s.x+170}" y="${s.y+62}" font-family="Arial,sans-serif" font-weight="bold" font-size="52" fill="${p.accent}" text-anchor="middle">${s.val}</text>
    <text x="${s.x+170}" y="${s.y+105}" font-family="Arial,sans-serif" font-size="30" fill="rgba(255,255,255,0.65)" text-anchor="middle">${s.label}</text>
  `).join('')

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="vig" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.55)"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  <rect x="0" y="0" width="${W}" height="8" fill="${p.accent}"/>
  ${statEls}
  <text x="${W/2}" y="${H*0.44}" font-size="220" text-anchor="middle" dominant-baseline="middle">📈</text>
  <rect x="100" y="${H*0.52}" width="${W-200}" height="4" rx="2" fill="${p.accent}" opacity="0.6"/>
  ${textEls}
  <rect x="${W/2-260}" y="${H*0.78}" width="520" height="80" rx="40" fill="${p.accent}" opacity="0.15" stroke="${p.accent}" stroke-width="2" stroke-opacity="0.4"/>
  <text x="${W/2}" y="${H*0.78+50}" font-family="Arial,sans-serif" font-weight="bold" font-size="38" fill="${p.accent}" text-anchor="middle">👇 Watch Till End</text>
  <text x="${W/2}" y="${H-55}" font-family="Arial,sans-serif" font-size="28" fill="${p.accent}" text-anchor="middle" opacity="0.5">Finance Reels AI ✦</text>
</svg>`
}

async function generateWithSharp(topic: string, type: 'background' | 'overlay', idx: number): Promise<string> {
  const palette = PALETTES[idx % PALETTES.length]
  const gradBuf = gradientBuf(W, H, palette.bg1, palette.bg2)
  const svgStr = type === 'background' ? svgBackground(palette, topic) : svgOverlay(palette, topic)

  const imgBuf = await sharp(gradBuf, { raw: { width: W, height: H, channels: 3 } })
    .composite([{ input: Buffer.from(svgStr), blend: 'over' }])
    .jpeg({ quality: 92 })
    .toBuffer()

  return `data:image/jpeg;base64,${imgBuf.toString('base64')}`
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a finance image.
 * Tries NVIDIA FLUX first (real AI photo), falls back to sharp if unavailable.
 */
export async function generateFinanceImage(
  topic: string,
  type: 'background' | 'overlay' = 'background',
  paletteIndex?: number
): Promise<string> {
  const idx = paletteIndex ??
    (Math.abs(topic.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % PALETTES.length)

  // Try NVIDIA FLUX first
  const fluxPrompt = buildFluxPrompt(topic, type)
  const fluxResult = await generateWithFlux(fluxPrompt)
  if (fluxResult) {
    console.log(`✅ FLUX image generated for: ${topic.substring(0, 40)}`)
    return fluxResult
  }

  // Fallback to sharp
  console.log(`⚠️ FLUX unavailable, using sharp fallback for: ${topic.substring(0, 40)}`)
  return generateWithSharp(topic, type, idx)
}

export async function generateReelImages(topic: string, count = 2): Promise<string[]> {
  const types: Array<'background' | 'overlay'> = ['background', 'overlay']
  // Generate in parallel for speed
  return Promise.all(
    Array.from({ length: count }, (_, i) =>
      generateFinanceImage(topic, types[i % 2], i % PALETTES.length)
    )
  )
}
