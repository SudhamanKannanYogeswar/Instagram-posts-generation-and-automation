/**
 * Finance image generator — canvas-based, no SVG
 *
 * Layout:
 * - Pure black background
 * - Text vertically centred on the canvas
 * - Clear paragraph gaps (blank lines = visible space)
 * - First line of each paragraph slightly larger / bolder
 * - Horizontal rule between paragraphs for visual separation
 * - Left-aligned text (like the reference images)
 */

import { createCanvas, SKRSContext2D, GlobalFonts } from '@napi-rs/canvas'
import * as path from 'path'
import * as fs from 'fs'

const W = 1080
const H = 1920
const PAD_X = 80   // left/right margin
const TEXT_W = W - PAD_X * 2

// ── Font loading ──────────────────────────────────────────────────────────────

let fontsLoaded = false

function ensureFonts() {
  if (fontsLoaded) return
  const fontDir = path.join(process.cwd(), 'public', 'fonts')
  const regular = path.join(fontDir, 'Roboto-Regular.ttf')
  const bold    = path.join(fontDir, 'Roboto-Bold.ttf')
  if (fs.existsSync(regular)) GlobalFonts.registerFromPath(regular, 'Roboto')
  if (fs.existsSync(bold))    GlobalFonts.registerFromPath(bold, 'Roboto')
  fontsLoaded = true
}

const FONT = 'Roboto, Arial, sans-serif'

// ── Text utilities ────────────────────────────────────────────────────────────

function sanitise(text: string): string {
  return text
    .replace(/\\n/g, '\n').replace(/\\r/g, '')
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FEFF}]/gu, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2192/g, '->')
    .replace(/\u20B9/g, 'Rs.')
    .replace(/[\u2022\u25C6\u2714]/g, '-')
    .replace(/\u00A0/g, ' ')
}

/** Word-wrap a single line to fit within TEXT_W at given fontSize */
function wrapLine(ctx: SKRSContext2D, text: string, fontSize: number): string[] {
  ctx.font = `${fontSize}px ${FONT}`
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word
    if (ctx.measureText(test).width > TEXT_W && cur) {
      lines.push(cur); cur = word
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)
  return lines.length > 0 ? lines : ['']
}

// ── Paragraph model ───────────────────────────────────────────────────────────

interface Para {
  lines: string[]
  isFirst: boolean   // first paragraph gets slightly larger font
}

function parseParagraphs(raw: string): Para[] {
  const normalised = sanitise(raw)
  const blocks = normalised.split(/\n{2,}/).map(b => b.trim()).filter(b => b.length > 0)
  return blocks.map((block, i) => ({
    lines: block.split('\n').map(l => l.trim()).filter(l => l.length > 0),
    isFirst: i === 0,
  }))
}

// ── Measure total rendered height ────────────────────────────────────────────

interface RenderConfig {
  baseFontSize: number
  lineHeight: number    // multiplier
  paraGap: number       // px between paragraphs
  ruleHeight: number    // px for the separator line + its margins
}

function measureHeight(
  ctx: SKRSContext2D,
  paras: Para[],
  cfg: RenderConfig
): number {
  let h = 0
  for (let pi = 0; pi < paras.length; pi++) {
    const para = paras[pi]
    const fs = para.isFirst ? cfg.baseFontSize + 6 : cfg.baseFontSize
    const lh = fs * cfg.lineHeight
    for (const line of para.lines) {
      const wrapped = wrapLine(ctx, line, fs)
      h += wrapped.length * lh
    }
    if (pi < paras.length - 1) {
      h += cfg.paraGap + cfg.ruleHeight
    }
  }
  return h
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderToCanvas(
  ctx: SKRSContext2D,
  paras: Para[],
  cfg: RenderConfig,
  startY: number
) {
  let curY = startY

  for (let pi = 0; pi < paras.length; pi++) {
    const para = paras[pi]
    const fs = para.isFirst ? cfg.baseFontSize + 6 : cfg.baseFontSize
    const lh = fs * cfg.lineHeight

    for (let li = 0; li < para.lines.length; li++) {
      const line = para.lines[li]
      const wrapped = wrapLine(ctx, line, fs)

      // First line of first paragraph = bold + slightly larger
      const isBold = pi === 0 && li === 0
      ctx.font = isBold ? `bold ${fs + 4}px ${FONT}` : `${fs}px ${FONT}`
      ctx.fillStyle = 'white'
      ctx.textBaseline = 'top'

      for (const wl of wrapped) {
        ctx.fillText(wl, PAD_X, curY)
        curY += lh
      }
    }

    // Paragraph separator
    if (pi < paras.length - 1) {
      curY += cfg.paraGap * 0.5

      // Draw a subtle horizontal rule
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(PAD_X, curY)
      ctx.lineTo(W - PAD_X, curY)
      ctx.stroke()

      curY += cfg.ruleHeight + cfg.paraGap * 0.5
    }
  }
}

// ── Build one image ───────────────────────────────────────────────────────────

async function buildCard(rawText: string, baseFontSize: number): Promise<string> {
  ensureFonts()

  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  // Black background
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)

  const paras = parseParagraphs(rawText)
  if (paras.length === 0) {
    const buf = await canvas.encode('jpeg', 95)
    return `data:image/jpeg;base64,${buf.toString('base64')}`
  }

  // Start with desired font size, shrink until content fits
  let cfg: RenderConfig = {
    baseFontSize,
    lineHeight: 1.65,
    paraGap: 36,
    ruleHeight: 24,
  }

  const MAX_H = H - 160  // 80px top + 80px bottom padding

  while (cfg.baseFontSize > 32) {
    const totalH = measureHeight(ctx, paras, cfg)
    if (totalH <= MAX_H) break
    cfg = { ...cfg, baseFontSize: cfg.baseFontSize - 2 }
  }

  // Vertically centre the text block
  const totalH = measureHeight(ctx, paras, cfg)
  const startY = Math.max(80, (H - totalH) / 2)

  renderToCanvas(ctx, paras, cfg, startY)

  const buf = await canvas.encode('jpeg', 95)
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

// ── Combined image (hook top half + content bottom half) ──────────────────────

async function buildCombined(hookText: string, contentText: string): Promise<string> {
  ensureFonts()

  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)

  const HALF = H / 2

  // ── Top half: hook ──
  const hookParas = parseParagraphs(hookText)
  let hookCfg: RenderConfig = { baseFontSize: 62, lineHeight: 1.65, paraGap: 32, ruleHeight: 22 }
  while (hookCfg.baseFontSize > 28) {
    if (measureHeight(ctx, hookParas, hookCfg) <= HALF - 100) break
    hookCfg = { ...hookCfg, baseFontSize: hookCfg.baseFontSize - 2 }
  }
  const hookH   = measureHeight(ctx, hookParas, hookCfg)
  const hookY   = Math.max(60, (HALF - hookH) / 2)
  renderToCanvas(ctx, hookParas, hookCfg, hookY)

  // ── Divider ──
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(60, HALF)
  ctx.lineTo(W - 60, HALF)
  ctx.stroke()

  // ── Bottom half: content ──
  const contentParas = parseParagraphs(contentText)
  let contentCfg: RenderConfig = { baseFontSize: 54, lineHeight: 1.65, paraGap: 28, ruleHeight: 20 }
  while (contentCfg.baseFontSize > 26) {
    if (measureHeight(ctx, contentParas, contentCfg) <= HALF - 100) break
    contentCfg = { ...contentCfg, baseFontSize: contentCfg.baseFontSize - 2 }
  }
  const contentH = measureHeight(ctx, contentParas, contentCfg)
  const contentY = HALF + Math.max(60, (HALF - contentH) / 2)
  renderToCanvas(ctx, contentParas, contentCfg, contentY)

  const buf = await canvas.encode('jpeg', 95)
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateHookImage(hookImageText: string): Promise<string> {
  return buildCard(hookImageText, 68)
}

export async function generateContentImage(contentImageText: string): Promise<string> {
  return buildCard(contentImageText, 60)
}

export async function generateCombinedImage(
  hookImageText: string,
  contentImageText: string
): Promise<string> {
  return buildCombined(hookImageText, contentImageText)
}

export async function generateReelImages(
  topic: string,
  hookImageText?: string,
  contentImageText?: string
): Promise<string[]> {
  const hookText    = hookImageText    || topic
  const contentText = contentImageText || topic

  const [img1, img2, img3] = await Promise.all([
    generateHookImage(hookText),
    generateContentImage(contentText),
    generateCombinedImage(hookText, contentText),
  ])
  return [img1, img2, img3]
}

export async function generateFinanceImage(
  topic: string,
  type: 'background' | 'overlay' = 'background'
): Promise<string> {
  const images = await generateReelImages(topic)
  return type === 'background' ? images[0] : images[1]
}
