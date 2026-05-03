/**
 * Finance image generator — canvas-based, no SVG
 *
 * For Personal Finance category:
 *   - Brand colors: gold #D4AF37 on black #0D1117
 *   - Untold Finance logo watermark at bottom
 *   - Gold accent for first line / headings
 *   - Poppins font (brand typography)
 *
 * For other categories:
 *   - Pure white on black
 *   - No branding
 *   - Roboto font
 *
 * Instagram safe zones:
 *   Top: 220px | Bottom: 360px | Left/Right: 80px
 */

import { createCanvas, SKRSContext2D, GlobalFonts } from '@napi-rs/canvas'
import * as path from 'path'
import * as fs from 'fs'

const W = 1080
const H = 1920

// Instagram safe zone
const SAFE_TOP    = 220
const SAFE_BOTTOM = 360
const SAFE_LEFT   = 80
const SAFE_RIGHT  = 80
const SAFE_H      = H - SAFE_TOP - SAFE_BOTTOM
const TEXT_W      = W - SAFE_LEFT - SAFE_RIGHT

// Brand colors
const GOLD        = '#D4AF37'
const GOLD_DIM    = '#A8892A'
const WHITE       = '#F5F5F0'
const BLACK_BG    = '#0D1117'   // finance brand bg
const PURE_BLACK  = '#000000'   // other categories

// ── Font loading ──────────────────────────────────────────────────────────────

let fontsLoaded = false

function ensureFonts() {
  if (fontsLoaded) return
  const dir = path.join(process.cwd(), 'public', 'fonts')
  const files = [
    ['Poppins-Regular.ttf', 'Poppins'],
    ['Poppins-Bold.ttf',    'Poppins'],
    ['Roboto-Regular.ttf',  'Roboto'],
    ['Roboto-Bold.ttf',     'Roboto'],
  ]
  for (const [file, family] of files) {
    const p = path.join(dir, file)
    if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, family)
  }
  fontsLoaded = true
}

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

function wrapLine(ctx: SKRSContext2D, text: string, fontSize: number, font: string): string[] {
  ctx.font = `${fontSize}px ${font}`
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

interface Para { lines: string[]; isFirst: boolean }

function parseParagraphs(raw: string): Para[] {
  const blocks = sanitise(raw)
    .split(/\n{2,}/)
    .map(b => b.trim())
    .filter(b => b.length > 0)
  return blocks.map((block, i) => ({
    lines: block.split('\n').map(l => l.trim()).filter(l => l.length > 0),
    isFirst: i === 0,
  }))
}

// ── Measure & render ──────────────────────────────────────────────────────────

interface Cfg {
  baseFontSize: number
  lineH: number
  paraGap: number
  ruleH: number
  font: string
  isFinance: boolean
}

function measureH(ctx: SKRSContext2D, paras: Para[], cfg: Cfg): number {
  let h = 0
  for (let i = 0; i < paras.length; i++) {
    const fs = paras[i].isFirst ? cfg.baseFontSize + 4 : cfg.baseFontSize
    for (const line of paras[i].lines) {
      h += wrapLine(ctx, line, fs, cfg.font).length * (fs * cfg.lineH)
    }
    if (i < paras.length - 1) h += cfg.paraGap + cfg.ruleH
  }
  return h
}

function renderText(ctx: SKRSContext2D, paras: Para[], cfg: Cfg, startY: number) {
  let y = startY
  for (let i = 0; i < paras.length; i++) {
    const para = paras[i]
    const fs   = para.isFirst ? cfg.baseFontSize + 4 : cfg.baseFontSize
    const lh   = fs * cfg.lineH

    for (let li = 0; li < para.lines.length; li++) {
      const isHeadline = i === 0 && li === 0
      const isBold     = isHeadline || (cfg.isFinance && para.lines[li].match(/^Rs\.|^\d|^[A-Z][A-Z]/))

      ctx.font = isBold
        ? `bold ${isHeadline ? fs + 2 : fs}px ${cfg.font}`
        : `${fs}px ${cfg.font}`

      // Finance: first line gold, numbers/Rs. gold, rest white
      if (cfg.isFinance) {
        ctx.fillStyle = isHeadline ? GOLD : WHITE
      } else {
        ctx.fillStyle = WHITE
      }
      ctx.textBaseline = 'top'

      for (const wl of wrapLine(ctx, para.lines[li], fs, cfg.font)) {
        ctx.fillText(wl, SAFE_LEFT, y)
        y += lh
      }
    }

    if (i < paras.length - 1) {
      y += cfg.paraGap * 0.5
      // Finance: gold divider; others: white dim
      ctx.strokeStyle = cfg.isFinance ? `${GOLD}44` : 'rgba(255,255,255,0.18)'
      ctx.lineWidth   = 1.5
      ctx.beginPath()
      ctx.moveTo(SAFE_LEFT, y)
      ctx.lineTo(W - SAFE_RIGHT, y)
      ctx.stroke()
      y += cfg.ruleH + cfg.paraGap * 0.5
    }
  }
}

// ── Brand watermark (finance only) ───────────────────────────────────────────

function drawBrandWatermark(ctx: SKRSContext2D) {
  // Bottom-right watermark area — sits above the Instagram UI safe zone
  const WM_Y = H - SAFE_BOTTOM + 40   // 40px into the safe zone from bottom
  const WM_X = W - SAFE_RIGHT

  // "untold.finance" text
  ctx.font      = `bold 32px Poppins, Arial, sans-serif`
  ctx.fillStyle = GOLD
  ctx.textBaseline = 'middle'
  ctx.textAlign    = 'right'
  ctx.fillText('untold.finance', WM_X, WM_Y)

  // Thin gold line above watermark
  ctx.strokeStyle = `${GOLD}55`
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(SAFE_LEFT, WM_Y - 24)
  ctx.lineTo(W - SAFE_RIGHT, WM_Y - 24)
  ctx.stroke()

  // Reset
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'top'
}

// ── Draw gold accent bar at top (finance only) ────────────────────────────────

function drawTopAccent(ctx: SKRSContext2D) {
  // Thin gold line at very top of safe zone
  ctx.fillStyle = GOLD
  ctx.fillRect(SAFE_LEFT, SAFE_TOP - 16, W - SAFE_LEFT - SAFE_RIGHT, 3)
}

// ── Build one card ────────────────────────────────────────────────────────────

async function buildCard(
  rawText: string,
  baseFontSize: number,
  isFinance: boolean,
  safeTop = SAFE_TOP,
  safeH   = SAFE_H
): Promise<string> {
  ensureFonts()
  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  // Background
  ctx.fillStyle = isFinance ? BLACK_BG : PURE_BLACK
  ctx.fillRect(0, 0, W, H)

  const paras = parseParagraphs(rawText)
  if (paras.length === 0) {
    return `data:image/jpeg;base64,${(await canvas.encode('jpeg', 95)).toString('base64')}`
  }

  const font = isFinance ? 'Poppins, Arial, sans-serif' : 'Roboto, Arial, sans-serif'

  let cfg: Cfg = { baseFontSize, lineH: 1.65, paraGap: 40, ruleH: 28, font, isFinance }
  while (cfg.baseFontSize > 30) {
    if (measureH(ctx, paras, cfg) <= safeH - 40) break
    cfg = { ...cfg, baseFontSize: cfg.baseFontSize - 2 }
  }

  const totalH = measureH(ctx, paras, cfg)
  const startY = safeTop + Math.max(20, (safeH - totalH) / 2)

  if (isFinance) {
    drawTopAccent(ctx)
    drawBrandWatermark(ctx)
  }

  renderText(ctx, paras, cfg, startY)

  return `data:image/jpeg;base64,${(await canvas.encode('jpeg', 95)).toString('base64')}`
}

// ── Combined card ─────────────────────────────────────────────────────────────

async function buildCombined(
  hookText: string,
  contentText: string,
  isFinance: boolean
): Promise<string> {
  ensureFonts()
  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  ctx.fillStyle = isFinance ? BLACK_BG : PURE_BLACK
  ctx.fillRect(0, 0, W, H)

  const font = isFinance ? 'Poppins, Arial, sans-serif' : 'Roboto, Arial, sans-serif'
  const MID  = H / 2

  const topSafeTop = SAFE_TOP
  const topSafeH   = MID - SAFE_TOP - 40
  const botSafeTop = MID + 40
  const botSafeH   = H - botSafeTop - SAFE_BOTTOM

  // Top half — hook
  const hookParas = parseParagraphs(hookText)
  let hookCfg: Cfg = { baseFontSize: 60, lineH: 1.65, paraGap: 36, ruleH: 24, font, isFinance }
  while (hookCfg.baseFontSize > 26) {
    if (measureH(ctx, hookParas, hookCfg) <= topSafeH - 20) break
    hookCfg = { ...hookCfg, baseFontSize: hookCfg.baseFontSize - 2 }
  }
  const hookH = measureH(ctx, hookParas, hookCfg)
  const hookY = topSafeTop + Math.max(10, (topSafeH - hookH) / 2)

  if (isFinance) drawTopAccent(ctx)
  renderText(ctx, hookParas, hookCfg, hookY)

  // Divider
  ctx.strokeStyle = isFinance ? `${GOLD}66` : 'rgba(255,255,255,0.35)'
  ctx.lineWidth   = 2
  ctx.beginPath()
  ctx.moveTo(60, MID)
  ctx.lineTo(W - 60, MID)
  ctx.stroke()

  // Bottom half — content
  const contentParas = parseParagraphs(contentText)
  let contentCfg: Cfg = { baseFontSize: 52, lineH: 1.65, paraGap: 32, ruleH: 22, font, isFinance }
  while (contentCfg.baseFontSize > 24) {
    if (measureH(ctx, contentParas, contentCfg) <= botSafeH - 20) break
    contentCfg = { ...contentCfg, baseFontSize: contentCfg.baseFontSize - 2 }
  }
  const contentH = measureH(ctx, contentParas, contentCfg)
  const contentY = botSafeTop + Math.max(10, (botSafeH - contentH) / 2)
  renderText(ctx, contentParas, contentCfg, contentY)

  if (isFinance) drawBrandWatermark(ctx)

  return `data:image/jpeg;base64,${(await canvas.encode('jpeg', 95)).toString('base64')}`
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateHookImage(text: string, isFinance = false): Promise<string> {
  return buildCard(text, 66, isFinance)
}

export async function generateContentImage(text: string, isFinance = false): Promise<string> {
  return buildCard(text, 58, isFinance)
}

export async function generateCombinedImage(
  hookText: string,
  contentText: string,
  isFinance = false
): Promise<string> {
  return buildCombined(hookText, contentText, isFinance)
}

export async function generateReelImages(
  topic: string,
  hookImageText?: string,
  contentImageText?: string,
  isFinance = false
): Promise<string[]> {
  const h = hookImageText    || topic
  const c = contentImageText || topic
  const [i1, i2, i3] = await Promise.all([
    generateHookImage(h, isFinance),
    generateContentImage(c, isFinance),
    generateCombinedImage(h, c, isFinance),
  ])
  return [i1, i2, i3]
}

export async function generateFinanceImage(
  topic: string,
  type: 'background' | 'overlay' = 'background'
): Promise<string> {
  const imgs = await generateReelImages(topic, undefined, undefined, false)
  return type === 'background' ? imgs[0] : imgs[1]
}
