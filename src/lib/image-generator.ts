/**
 * Finance image generator
 * Pure black background, white text, left-aligned
 * Exactly like the reference images — story format, no emojis
 */

import sharp from 'sharp'

const W = 1080
const H = 1920
const PADDING_L = 80   // left margin
const PADDING_R = 80   // right margin
const PADDING_T = 120  // top margin
const TEXT_W = W - PADDING_L - PADDING_R  // 920px usable width

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Strip emojis and escape XML special chars */
function clean(s: string): string {
  return s
    // Remove emoji ranges
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FEFF}]/gu, '')
    // XML escape
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .trim()
}

/**
 * Word-wrap a single line to fit within TEXT_W at given fontSize.
 * Uses approximate char width = fontSize * 0.54 for Arial.
 */
function wrapText(text: string, fontSize: number): string[] {
  const maxChars = Math.floor(TEXT_W / (fontSize * 0.54))
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''

  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word
    if (test.length > maxChars && cur) {
      lines.push(cur)
      cur = word
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)
  return lines.length > 0 ? lines : ['']
}

/**
 * Parse raw text into paragraphs.
 * Handles both literal \n (from JSON) and actual newlines.
 */
function parseParagraphs(raw: string): string[][] {
  // Normalise: replace escaped \n with real newline
  const normalised = raw
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  // Split into paragraphs on blank lines
  const paragraphs = normalised
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  // Each paragraph is an array of lines
  return paragraphs.map(p =>
    p.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
  )
}

// ── SVG builder ───────────────────────────────────────────────────────────────

/**
 * Build a pure black SVG text card.
 * Renders paragraphs with spacing between them, exactly like the reference images.
 */
function buildSvg(rawText: string, baseFontSize: number): Buffer {
  const paragraphs = parseParagraphs(rawText)

  // First pass: calculate total height to check if we need to scale down
  function calcHeight(fs: number): number {
    const lineH = fs * 1.6
    const paraGap = fs * 1.2
    let h = PADDING_T

    for (let pi = 0; pi < paragraphs.length; pi++) {
      for (const line of paragraphs[pi]) {
        const wrapped = wrapText(line, fs)
        h += wrapped.length * lineH
      }
      if (pi < paragraphs.length - 1) h += paraGap
    }
    h += PADDING_T
    return h
  }

  // Scale font down if content overflows
  let fs = baseFontSize
  while (calcHeight(fs) > H - 40 && fs > 36) {
    fs -= 2
  }

  const lineH = fs * 1.6
  const paraGap = fs * 1.2

  // Second pass: build SVG text elements
  const elements: string[] = []
  let curY = PADDING_T + fs

  for (let pi = 0; pi < paragraphs.length; pi++) {
    for (const line of paragraphs[pi]) {
      const wrapped = wrapText(line, fs)
      for (const wl of wrapped) {
        const cleaned = clean(wl)
        if (cleaned) {
          elements.push(
            `<text x="${PADDING_L}" y="${Math.round(curY)}"` +
            ` font-family="Arial, Helvetica, sans-serif"` +
            ` font-size="${fs}"` +
            ` font-weight="400"` +
            ` fill="white"` +
            ` dominant-baseline="auto"` +
            `>${cleaned}</text>`
          )
        }
        curY += lineH
      }
    }
    if (pi < paragraphs.length - 1) {
      curY += paraGap
    }
  }

  return Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${W}" height="${H}" fill="#000000"/>` +
    elements.join('') +
    `</svg>`
  )
}

// ── Render image ──────────────────────────────────────────────────────────────

async function renderCard(rawText: string, fontSize: number): Promise<string> {
  const svg = buildSvg(rawText, fontSize)

  const buf = await sharp({
    create: { width: W, height: H, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([{ input: svg, blend: 'over' }])
    .jpeg({ quality: 95 })
    .toBuffer()

  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateHookImage(hookImageText: string): Promise<string> {
  return renderCard(hookImageText, 68)
}

export async function generateContentImage(contentImageText: string): Promise<string> {
  return renderCard(contentImageText, 60)
}

/**
 * Generate both reel images in parallel.
 * Returns [hookImage, contentImage]
 */
export async function generateReelImages(
  topic: string,
  hookImageText?: string,
  contentImageText?: string
): Promise<string[]> {
  const hookText = hookImageText || topic
  const contentText = contentImageText || topic

  const [img1, img2] = await Promise.all([
    generateHookImage(hookText),
    generateContentImage(contentText),
  ])

  return [img1, img2]
}

// Backward compat
export async function generateFinanceImage(
  topic: string,
  type: 'background' | 'overlay' = 'background'
): Promise<string> {
  const images = await generateReelImages(topic)
  return type === 'background' ? images[0] : images[1]
}
