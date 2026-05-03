/**
 * Finance image generator
 * Image 1 (hook): Clean background + bold hook text — stops the scroll
 * Image 2 (content): Clean background + key script points — delivers value
 *
 * Primary: NVIDIA FLUX.1-schnell (real AI photo background)
 * Fallback: sharp gradient background
 */

import sharp from 'sharp'

const W = 1080
const H = 1920

// ── NVIDIA FLUX ──────────────────────────────────────────────────────────────

const FLUX_URL =
  process.env.NVIDIA_IMAGE_URL ||
  'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell'

async function fetchFluxBackground(prompt: string): Promise<Buffer | null> {
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
      signal: AbortSignal.timeout(45000),
    })

    if (!res.ok) return null
    const data = await res.json()
    const b64 = data?.artifacts?.[0]?.base64
    if (!b64) return null
    return Buffer.from(b64, 'base64')
  } catch {
    return null
  }
}

// ── Sharp fallback gradient ──────────────────────────────────────────────────

const GRADIENTS = [
  { bg1: '#0f0c29', bg2: '#302b63' }, // deep purple
  { bg1: '#0a1628', bg2: '#0e3460' }, // navy blue
  { bg1: '#0a2e0a', bg2: '#1a5c1a' }, // forest green
  { bg1: '#1a0a00', bg2: '#3d1a00' }, // dark amber
  { bg1: '#0a0a1a', bg2: '#1a1a3e' }, // midnight
  { bg1: '#1a0a2e', bg2: '#2e0a4a' }, // dark violet
]

function hex2rgb(h: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h)!
  return { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
}

function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t) }

function makeGradient(c1: string, c2: string): Buffer {
  const a = hex2rgb(c1), b = hex2rgb(c2)
  const buf = Buffer.alloc(W * H * 3)
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1)
    const r = lerp(a.r, b.r, t), g = lerp(a.g, b.g, t), bv = lerp(a.b, b.b, t)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = bv
    }
  }
  return buf
}

// ── SVG text overlay builders ────────────────────────────────────────────────

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function wrapLines(text: string, maxChars: number): string[] {
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

/**
 * Image 1 — HOOK card
 * Large bold hook text centred on a clean dark background.
 * Simple, readable, stops the scroll.
 */
function buildHookSvg(hook: string): Buffer {
  const lines = wrapLines(hook, 18)
  const fontSize = lines.length <= 2 ? 96 : lines.length <= 3 ? 80 : 68
  const lineH = fontSize * 1.35
  const totalH = lines.length * lineH
  const startY = H / 2 - totalH / 2

  const textEls = lines.map((line, i) => {
    const y = startY + i * lineH + fontSize * 0.8
    return `<text
      x="${W / 2}" y="${y}"
      font-family="Arial Black, Arial, sans-serif"
      font-weight="900"
      font-size="${fontSize}"
      fill="white"
      text-anchor="middle"
      paint-order="stroke"
      stroke="rgba(0,0,0,0.8)"
      stroke-width="8"
      stroke-linejoin="round"
    >${esc(line)}</text>`
  }).join('\n')

  // Subtle top/bottom accent lines
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <!-- Dark overlay for readability -->
    <rect width="${W}" height="${H}" fill="rgba(0,0,0,0.45)"/>

    <!-- Top accent -->
    <rect x="80" y="120" width="${W - 160}" height="6" rx="3" fill="rgba(255,255,255,0.3)"/>

    <!-- Hook text -->
    ${textEls}

    <!-- Bottom accent -->
    <rect x="80" y="${H - 126}" width="${W - 160}" height="6" rx="3" fill="rgba(255,255,255,0.3)"/>

    <!-- Swipe up hint -->
    <text x="${W / 2}" y="${H - 70}"
      font-family="Arial, sans-serif" font-size="36" fill="rgba(255,255,255,0.55)"
      text-anchor="middle">👇 Watch till the end</text>
  </svg>`)
}

/**
 * Image 2 — CONTENT card
 * Key points from the script in a clean list format.
 * Simple characters (✅ 💡 📌) to make it scannable.
 */
function buildContentSvg(script: string, hook: string): Buffer {
  // Extract 3–4 key sentences from the script
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 120)
    .slice(0, 4)

  const icons = ['✅', '💡', '📌', '🎯']
  const itemFontSize = 44
  const itemLineH = itemFontSize * 1.5
  const itemMaxChars = 26

  // Build each bullet point
  const items = sentences.map((sentence, i) => {
    const lines = wrapLines(sentence, itemMaxChars)
    const icon = icons[i % icons.length]
    const blockH = lines.length * itemLineH + 20
    return { lines, icon, blockH }
  })

  const totalContentH = items.reduce((sum, it) => sum + it.blockH + 30, 0)
  let curY = H / 2 - totalContentH / 2 + 60

  const itemEls = items.map(({ lines, icon, blockH }) => {
    const blockY = curY
    curY += blockH + 30

    const lineEls = lines.map((line, li) => {
      const y = blockY + li * itemLineH + itemFontSize * 0.85
      const xText = li === 0 ? 180 : 140 // indent continuation lines less
      return `<text x="${xText}" y="${y}"
        font-family="Arial, sans-serif" font-weight="${li === 0 ? '700' : '400'}"
        font-size="${itemFontSize}" fill="white"
        paint-order="stroke" stroke="rgba(0,0,0,0.6)" stroke-width="4"
      >${esc(line)}</text>`
    }).join('\n')

    const iconY = blockY + itemFontSize * 0.85
    return `
      <text x="80" y="${iconY}" font-size="${itemFontSize + 8}" dominant-baseline="auto">${icon}</text>
      ${lineEls}
    `
  }).join('\n')

  // Short hook reminder at top
  const hookShort = hook.length > 40 ? hook.substring(0, 37) + '…' : hook

  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <!-- Dark overlay -->
    <rect width="${W}" height="${H}" fill="rgba(0,0,0,0.5)"/>

    <!-- Top label -->
    <rect x="0" y="0" width="${W}" height="10" fill="rgba(255,255,255,0.2)"/>

    <!-- Hook reminder -->
    <text x="${W / 2}" y="110"
      font-family="Arial, sans-serif" font-size="36" fill="rgba(255,255,255,0.6)"
      text-anchor="middle" font-style="italic">"${esc(hookShort)}"</text>
    <rect x="80" y="135" width="${W - 160}" height="3" rx="1.5" fill="rgba(255,255,255,0.2)"/>

    <!-- Content points -->
    ${itemEls}

    <!-- Bottom CTA hint -->
    <rect x="80" y="${H - 160}" width="${W - 160}" height="3" rx="1.5" fill="rgba(255,255,255,0.2)"/>
    <text x="${W / 2}" y="${H - 100}"
      font-family="Arial, sans-serif" font-weight="bold" font-size="40" fill="rgba(255,255,255,0.75)"
      text-anchor="middle">Follow for more money tips 💰</text>
  </svg>`)
}

// ── Compose final image ──────────────────────────────────────────────────────

async function compose(bgBuf: Buffer, overlaySvg: Buffer): Promise<string> {
  // Resize background to 1080x1920
  const bg = await sharp(bgBuf)
    .resize(W, H, { fit: 'cover', position: 'center' })
    .toBuffer()

  const result = await sharp(bg)
    .composite([{ input: overlaySvg, blend: 'over' }])
    .jpeg({ quality: 90 })
    .toBuffer()

  return `data:image/jpeg;base64,${result.toString('base64')}`
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate exactly 2 images for a reel:
 * [0] Hook image  — bold hook text on clean background
 * [1] Content image — key script points on clean background
 */
export async function generateReelImages(
  topic: string,
  hook?: string,
  script?: string
): Promise<string[]> {
  const hookText = hook || topic
  const scriptText = script || topic

  // FLUX prompts — simple, clean, no text in image
  const fluxPromptHook =
    `Clean minimal dark background suitable for text overlay, ` +
    `subtle Indian finance theme, soft bokeh, no text, no people, ` +
    `professional, calm, dark navy or charcoal tone`

  const fluxPromptContent =
    `Clean minimal dark background suitable for text overlay, ` +
    `subtle warm tones, soft light, no text, no people, ` +
    `professional, calm, dark background with gentle gradient`

  // Try FLUX for both in parallel
  const [fluxBg1, fluxBg2] = await Promise.all([
    fetchFluxBackground(fluxPromptHook),
    fetchFluxBackground(fluxPromptContent),
  ])

  // Fallback gradient if FLUX fails
  const idx = Math.abs(topic.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % GRADIENTS.length
  const grad = GRADIENTS[idx]
  const fallbackBuf = makeGradient(grad.bg1, grad.bg2)

  const bg1 = fluxBg1 || fallbackBuf
  const bg2 = fluxBg2 || fallbackBuf

  // Build SVG overlays
  const hookSvg = buildHookSvg(hookText)
  const contentSvg = buildContentSvg(scriptText, hookText)

  // Compose both images in parallel
  const [img1, img2] = await Promise.all([
    compose(bg1, hookSvg),
    compose(bg2, contentSvg),
  ])

  return [img1, img2]
}

// Keep backward compat
export async function generateFinanceImage(
  topic: string,
  type: 'background' | 'overlay' = 'background'
): Promise<string> {
  const images = await generateReelImages(topic)
  return type === 'background' ? images[0] : images[1]
}
