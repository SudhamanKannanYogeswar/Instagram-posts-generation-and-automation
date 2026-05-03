/**
 * Finance image generator — pure canvas, no SVG, no AI
 *
 * Uses @napi-rs/canvas to draw directly:
 * - Pure black background
 * - White text, left-aligned
 * - No XML, no special character issues
 * - Works with any text including Rs., ->, ---, etc.
 *
 * Produces:
 *   Image 1 (hook)    — hook text card
 *   Image 2 (content) — content/script card
 *   Image 3 (combined)— hook on top half, content on bottom half (single image)
 */

import { createCanvas, SKRSContext2D } from '@napi-rs/canvas'

const W = 1080
const H = 1920

// ── Text utilities ────────────────────────────────────────────────────────────

/** Remove emojis and normalise special characters */
function sanitise(text: string): string {
  return text
    // Normalise escaped newlines from JSON
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    // Remove emoji ranges
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FEFF}]/gu, '')
    // Normalise common special chars to ASCII equivalents
    .replace(/[\u2018\u2019]/g, "'")   // curly single quotes
    .replace(/[\u201C\u201D]/g, '"')   // curly double quotes
    .replace(/[\u2013\u2014]/g, '-')   // en/em dash
    .replace(/\u2192/g, '->')          // right arrow
    .replace(/\u2190/g, '<-')          // left arrow
    .replace(/\u20B9/g, 'Rs.')         // rupee sign
    .replace(/\u2022/g, '-')           // bullet
    .replace(/\u25C6/g, '-')           // diamond
    .replace(/\u2714/g, '-')           // checkmark
    .replace(/\u00A0/g, ' ')           // non-breaking space
}

/** Parse raw text into paragraphs (array of line arrays) */
function parseParagraphs(raw: string): string[][] {
  const normalised = sanitise(raw)
  return normalised
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p =>
      p.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
    )
}

/** Word-wrap a single line to fit within maxWidth pixels */
function wrapLine(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''

  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur)
      cur = word
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)
  return lines.length > 0 ? lines : ['']
}

// ── Core renderer ─────────────────────────────────────────────────────────────

interface RenderOptions {
  fontSize?: number
  paddingLeft?: number
  paddingTop?: number
  paddingRight?: number
  lineHeightMultiplier?: number
  paraGapMultiplier?: number
}

/**
 * Render text onto a canvas context.
 * Returns the Y position after the last line (useful for combined images).
 */
function renderText(
  ctx: SKRSContext2D,
  rawText: string,
  startY: number,
  canvasHeight: number,
  opts: RenderOptions = {}
): number {
  const {
    fontSize = 62,
    paddingLeft = 80,
    paddingTop = 0,
    paddingRight = 80,
    lineHeightMultiplier = 1.65,
    paraGapMultiplier = 1.1,
  } = opts

  const maxTextW = W - paddingLeft - paddingRight
  const paragraphs = parseParagraphs(rawText)

  // Calculate total height to auto-scale font
  function calcTotalHeight(fs: number): number {
    const lh = fs * lineHeightMultiplier
    const pg = fs * paraGapMultiplier
    let h = startY + paddingTop

    for (let pi = 0; pi < paragraphs.length; pi++) {
      ctx.font = `${fs}px Arial`
      for (const line of paragraphs[pi]) {
        const wrapped = wrapLine(ctx, line, maxTextW)
        h += wrapped.length * lh
      }
      if (pi < paragraphs.length - 1) h += pg
    }
    return h
  }

  // Scale down font if content overflows
  let fs = fontSize
  while (calcTotalHeight(fs) > canvasHeight - 80 && fs > 32) {
    fs -= 2
  }

  const lh = fs * lineHeightMultiplier
  const pg = fs * paraGapMultiplier

  ctx.font = `${fs}px Arial`
  ctx.fillStyle = 'white'
  ctx.textBaseline = 'top'

  let curY = startY + paddingTop

  for (let pi = 0; pi < paragraphs.length; pi++) {
    for (const line of paragraphs[pi]) {
      ctx.font = `${fs}px Arial`
      const wrapped = wrapLine(ctx, line, maxTextW)
      for (const wl of wrapped) {
        ctx.fillText(wl, paddingLeft, curY)
        curY += lh
      }
    }
    if (pi < paragraphs.length - 1) {
      curY += pg
    }
  }

  return curY
}

// ── Image generators ──────────────────────────────────────────────────────────

/** Generate hook image card — black bg, white text */
export async function generateHookImage(hookImageText: string): Promise<string> {
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // Black background
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)

  // Render text
  renderText(ctx, hookImageText, 0, H, {
    fontSize: 68,
    paddingLeft: 80,
    paddingTop: 120,
    paddingRight: 80,
  })

  const buf = await canvas.encode('jpeg', 95)
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

/** Generate content image card — black bg, white text */
export async function generateContentImage(contentImageText: string): Promise<string> {
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)

  renderText(ctx, contentImageText, 0, H, {
    fontSize: 60,
    paddingLeft: 80,
    paddingTop: 120,
    paddingRight: 80,
  })

  const buf = await canvas.encode('jpeg', 95)
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

/**
 * Generate a COMBINED image:
 * Top half = hook text
 * Thin white divider line
 * Bottom half = content text
 *
 * This is the single image that can be used as the reel visual.
 */
export async function generateCombinedImage(
  hookImageText: string,
  contentImageText: string
): Promise<string> {
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // Black background
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)

  const HALF = H / 2
  const DIVIDER_Y = HALF - 1

  // ── Top half: hook ──
  renderText(ctx, hookImageText, 0, HALF, {
    fontSize: 64,
    paddingLeft: 80,
    paddingTop: 100,
    paddingRight: 80,
  })

  // ── Divider line ──
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(80, DIVIDER_Y)
  ctx.lineTo(W - 80, DIVIDER_Y)
  ctx.stroke()

  // ── Bottom half: content ──
  renderText(ctx, contentImageText, HALF, H, {
    fontSize: 54,
    paddingLeft: 80,
    paddingTop: 60,
    paddingRight: 80,
  })

  const buf = await canvas.encode('jpeg', 95)
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

/**
 * Generate all 3 images for a reel:
 * [0] Hook image
 * [1] Content image
 * [2] Combined image (hook + content in one)
 */
export async function generateReelImages(
  topic: string,
  hookImageText?: string,
  contentImageText?: string
): Promise<string[]> {
  const hookText = hookImageText || topic
  const contentText = contentImageText || topic

  const [img1, img2, img3] = await Promise.all([
    generateHookImage(hookText),
    generateContentImage(contentText),
    generateCombinedImage(hookText, contentText),
  ])

  return [img1, img2, img3]
}

// Backward compat
export async function generateFinanceImage(
  topic: string,
  type: 'background' | 'overlay' = 'background'
): Promise<string> {
  const images = await generateReelImages(topic)
  return type === 'background' ? images[0] : images[1]
}
