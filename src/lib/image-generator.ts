/**
 * Finance image generator — canvas-based, no SVG
 *
 * Instagram Reels safe zones:
 *   Top:    ~200px (profile info, back button)
 *   Bottom: ~350px (like/comment/share buttons, caption)
 *   Left/Right: 80px
 *
 * Text is vertically centred within the SAFE ZONE (not the full canvas).
 * Paragraph gaps are rendered as visible space + subtle divider line.
 */

import { createCanvas, SKRSContext2D, GlobalFonts } from '@napi-rs/canvas'
import * as path from 'path'
import * as fs from 'fs'

const W = 1080
const H = 1920

// Instagram safe zone — text must stay within this area
const SAFE_TOP    = 220   // avoid profile/back button
const SAFE_BOTTOM = 360   // avoid like/comment/share/caption
const SAFE_LEFT   = 80
const SAFE_RIGHT  = 80
const SAFE_H      = H - SAFE_TOP - SAFE_BOTTOM   // usable height = 1340px
const TEXT_W      = W - SAFE_LEFT - SAFE_RIGHT    // usable width  = 920px

// ── Font loading ──────────────────────────────────────────────────────────────

let fontsLoaded = false

function ensureFonts() {
  if (fontsLoaded) return
  const dir = path.join(process.cwd(), 'public', 'fonts')
  const reg = path.join(dir, 'Roboto-Regular.ttf')
  const bld = path.join(dir, 'Roboto-Bold.ttf')
  if (fs.existsSync(reg)) GlobalFonts.registerFromPath(reg, 'Roboto')
  if (fs.existsSync(bld)) GlobalFonts.registerFromPath(bld, 'Roboto')
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
  lineH: number    // multiplier
  paraGap: number  // px between paragraphs
  ruleH: number    // px for divider line + margins
}

function measureH(ctx: SKRSContext2D, paras: Para[], cfg: Cfg): number {
  let h = 0
  for (let i = 0; i < paras.length; i++) {
    const fs = paras[i].isFirst ? cfg.baseFontSize + 4 : cfg.baseFontSize
    for (const line of paras[i].lines) {
      h += wrapLine(ctx, line, fs).length * (fs * cfg.lineH)
    }
    if (i < paras.length - 1) h += cfg.paraGap + cfg.ruleH
  }
  return h
}

function renderText(
  ctx: SKRSContext2D,
  paras: Para[],
  cfg: Cfg,
  startY: number,
  safeTop: number,
  safeH: number
) {
  let y = startY
  for (let i = 0; i < paras.length; i++) {
    const para = paras[i]
    const fs   = para.isFirst ? cfg.baseFontSize + 4 : cfg.baseFontSize
    const lh   = fs * cfg.lineH

    for (let li = 0; li < para.lines.length; li++) {
      const isBold = i === 0 && li === 0
      ctx.font      = isBold ? `bold ${fs + 2}px ${FONT}` : `${fs}px ${FONT}`
      ctx.fillStyle = 'white'
      ctx.textBaseline = 'top'

      for (const wl of wrapLine(ctx, para.lines[li], fs)) {
        ctx.fillText(wl, SAFE_LEFT, y)
        y += lh
      }
    }

    if (i < paras.length - 1) {
      y += cfg.paraGap * 0.5
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth   = 1.5
      ctx.beginPath()
      ctx.moveTo(SAFE_LEFT, y)
      ctx.lineTo(W - SAFE_RIGHT, y)
      ctx.stroke()
      y += cfg.ruleH + cfg.paraGap * 0.5
    }
  }
}

// ── Build one card ────────────────────────────────────────────────────────────

async function buildCard(
  rawText: string,
  baseFontSize: number,
  safeTop = SAFE_TOP,
  safeH   = SAFE_H
): Promise<string> {
  ensureFonts()
  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)

  const paras = parseParagraphs(rawText)
  if (paras.length === 0) {
    return `data:image/jpeg;base64,${(await canvas.encode('jpeg', 95)).toString('base64')}`
  }

  // Auto-scale font to fit within safe zone
  let cfg: Cfg = { baseFontSize, lineH: 1.65, paraGap: 40, ruleH: 28 }
  while (cfg.baseFontSize > 30) {
    if (measureH(ctx, paras, cfg) <= safeH - 40) break
    cfg = { ...cfg, baseFontSize: cfg.baseFontSize - 2 }
  }

  // Vertically centre within safe zone
  const totalH = measureH(ctx, paras, cfg)
  const startY = safeTop + Math.max(20, (safeH - totalH) / 2)

  renderText(ctx, paras, cfg, startY, safeTop, safeH)

  return `data:image/jpeg;base64,${(await canvas.encode('jpeg', 95)).toString('base64')}`
}

// ── Combined card (hook top half + content bottom half) ───────────────────────

async function buildCombined(hookText: string, contentText: string): Promise<string> {
  ensureFonts()
  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)

  const MID = H / 2

  // Top half safe zone
  const topSafeTop = SAFE_TOP
  const topSafeH   = MID - SAFE_TOP - 40   // 40px buffer above divider

  // Bottom half safe zone
  const botSafeTop = MID + 40              // 40px buffer below divider
  const botSafeH   = H - botSafeTop - SAFE_BOTTOM

  // Render hook in top half
  const hookParas = parseParagraphs(hookText)
  let hookCfg: Cfg = { baseFontSize: 60, lineH: 1.65, paraGap: 36, ruleH: 24 }
  while (hookCfg.baseFontSize > 26) {
    if (measureH(ctx, hookParas, hookCfg) <= topSafeH - 20) break
    hookCfg = { ...hookCfg, baseFontSize: hookCfg.baseFontSize - 2 }
  }
  const hookH  = measureH(ctx, hookParas, hookCfg)
  const hookY  = topSafeTop + Math.max(10, (topSafeH - hookH) / 2)
  renderText(ctx, hookParas, hookCfg, hookY, topSafeTop, topSafeH)

  // Divider line
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth   = 2
  ctx.beginPath()
  ctx.moveTo(60, MID)
  ctx.lineTo(W - 60, MID)
  ctx.stroke()

  // Render content in bottom half
  const contentParas = parseParagraphs(contentText)
  let contentCfg: Cfg = { baseFontSize: 52, lineH: 1.65, paraGap: 32, ruleH: 22 }
  while (contentCfg.baseFontSize > 24) {
    if (measureH(ctx, contentParas, contentCfg) <= botSafeH - 20) break
    contentCfg = { ...contentCfg, baseFontSize: contentCfg.baseFontSize - 2 }
  }
  const contentH = measureH(ctx, contentParas, contentCfg)
  const contentY = botSafeTop + Math.max(10, (botSafeH - contentH) / 2)
  renderText(ctx, contentParas, contentCfg, contentY, botSafeTop, botSafeH)

  return `data:image/jpeg;base64,${(await canvas.encode('jpeg', 95)).toString('base64')}`
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateHookImage(text: string): Promise<string> {
  return buildCard(text, 66)
}

export async function generateContentImage(text: string): Promise<string> {
  return buildCard(text, 58)
}

export async function generateCombinedImage(hookText: string, contentText: string): Promise<string> {
  return buildCombined(hookText, contentText)
}

export async function generateReelImages(
  topic: string,
  hookImageText?: string,
  contentImageText?: string
): Promise<string[]> {
  const h = hookImageText    || topic
  const c = contentImageText || topic
  const [i1, i2, i3] = await Promise.all([
    generateHookImage(h),
    generateContentImage(c),
    generateCombinedImage(h, c),
  ])
  return [i1, i2, i3]
}

export async function generateFinanceImage(
  topic: string,
  type: 'background' | 'overlay' = 'background'
): Promise<string> {
  const imgs = await generateReelImages(topic)
  return type === 'background' ? imgs[0] : imgs[1]
}
