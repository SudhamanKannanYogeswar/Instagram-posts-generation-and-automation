/**
 * Finance image generator — pure text cards
 *
 * Style: exactly like the reference images
 * - Pure black (#000000) background
 * - White text, left-aligned
 * - Clean sans-serif font
 * - NO emojis, NO decorations, NO borders
 * - Just the text, laid out like a story
 *
 * Image 1: Hook card  — stops the scroll
 * Image 2: Content card — delivers the value
 */

import sharp from 'sharp'

const W = 1080
const H = 1920

// ── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Strip any emoji characters that sneak through
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
}

/** Wrap a single line of text to fit within maxWidth pixels at given fontSize */
function wrapLine(text: string, fontSize: number, maxWidth: number): string[] {
  // Approximate character width = fontSize * 0.52 for Arial
  const charW = fontSize * 0.52
  const maxChars = Math.floor(maxWidth / charW)

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
  return lines
}

/**
 * Build SVG for a pure black text card.
 *
 * @param rawText  The text content — use \n for line breaks, blank line for paragraph gap
 * @param fontSize Base font size in px
 */
function buildTextCardSvg(rawText: string, fontSize: number): Buffer {
  const PADDING_X = 72   // left/right margin
  const PADDING_Y = 140  // top margin
  const MAX_TEXT_W = W - PADDING_X * 2
  const LINE_H = fontSize * 1.55
  const PARA_GAP = fontSize * 0.9  // extra gap between paragraphs (blank lines)

  // Parse paragraphs (split on blank lines)
  const paragraphs = rawText
    .replace(/\\n/g, '\n')   // handle escaped newlines from JSON
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  // Build all rendered lines with their Y positions
  interface RenderLine {
    text: string
    y: number
    isBold: boolean
  }

  const renderLines: RenderLine[] = []
  let curY = PADDING_Y + fontSize

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const para = paragraphs[pi]
    const rawLines = para.split('\n').map(l => l.trim()).filter(l => l.length > 0)

    for (const rawLine of rawLines) {
      // Detect if this line should be bold (short lines, headings, or lines with numbers/Rs)
      const isBold = rawLine.length < 40 || /^Rs\.|^\d|^[A-Z][A-Z]/.test(rawLine)

      const wrapped = wrapLine(rawLine, fontSize, MAX_TEXT_W)
      for (const wl of wrapped) {
        renderLines.push({ text: wl, y: curY, isBold })
        curY += LINE_H
      }
    }

    // Add paragraph gap after each paragraph (except last)
    if (pi < paragraphs.length - 1) {
      curY += PARA_GAP
    }
  }

  // If content overflows, scale down font size
  const totalH = curY + PADDING_Y
  const scaleNeeded = totalH > H ? H / totalH : 1
  const effectiveFontSize = scaleNeeded < 1 ? Math.floor(fontSize * scaleNeeded * 0.92) : fontSize

  // Re-render with scaled font if needed
  let finalLines = renderLines
  if (scaleNeeded < 1) {
    const scaledLineH = effectiveFontSize * 1.55
    const scaledParaGap = effectiveFontSize * 0.9
    const scaledLines: RenderLine[] = []
    let sy = PADDING_Y + effectiveFontSize

    for (let pi = 0; pi < paragraphs.length; pi++) {
      const para = paragraphs[pi]
      const rawLines = para.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      for (const rawLine of rawLines) {
        const isBold = rawLine.length < 40 || /^Rs\.|^\d|^[A-Z][A-Z]/.test(rawLine)
        const wrapped = wrapLine(rawLine, effectiveFontSize, MAX_TEXT_W)
        for (const wl of wrapped) {
          scaledLines.push({ text: wl, y: sy, isBold })
          sy += scaledLineH
        }
      }
      if (pi < paragraphs.length - 1) sy += scaledParaGap
    }
    finalLines = scaledLines
  }

  const fs = effectiveFontSize

  const textEls = finalLines.map(({ text, y, isBold }) => {
    const weight = isBold ? '700' : '400'
    return `<text
      x="${PADDING_X}"
      y="${y}"
      font-family="Arial, Helvetica, sans-serif"
      font-weight="${weight}"
      font-size="${fs}"
      fill="white"
      dominant-baseline="auto"
    >${esc(text)}</text>`
  }).join('\n')

  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#000000"/>
    ${textEls}
  </svg>`)
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate the hook image card.
 * Pure black background, white text, left-aligned.
 */
export async function generateHookImage(hookImageText: string): Promise<string> {
  const svg = buildTextCardSvg(hookImageText, 68)

  const buf = await sharp({
    create: { width: W, height: H, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([{ input: svg, blend: 'over' }])
    .jpeg({ quality: 95 })
    .toBuffer()

  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

/**
 * Generate the content image card.
 * Pure black background, white text, left-aligned.
 */
export async function generateContentImage(contentImageText: string): Promise<string> {
  const svg = buildTextCardSvg(contentImageText, 60)

  const buf = await sharp({
    create: { width: W, height: H, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([{ input: svg, blend: 'over' }])
    .jpeg({ quality: 95 })
    .toBuffer()

  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

/**
 * Generate both reel images.
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
