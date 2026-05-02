/**
 * Server-side finance image generator using Sharp
 * Creates beautiful, professional finance-themed visuals
 * No external API needed — instant, free, unlimited
 */

import sharp from 'sharp'

const WIDTH = 1080
const HEIGHT = 1920

export interface ImageTheme {
  name: string
  bg1: string   // gradient start (hex)
  bg2: string   // gradient end (hex)
  accent: string
  emoji: string
}

// Finance-themed color palettes
const THEMES: ImageTheme[] = [
  { name: 'midnight_gold',  bg1: '#0f0c29', bg2: '#302b63', accent: '#FFD700', emoji: '💰' },
  { name: 'emerald_wealth', bg1: '#0a3d2e', bg2: '#1a6b4a', accent: '#00FF88', emoji: '📈' },
  { name: 'royal_blue',     bg1: '#0d1b4b', bg2: '#1a3a8f', accent: '#60A5FA', emoji: '💎' },
  { name: 'crimson_power',  bg1: '#1a0a0a', bg2: '#4a0e0e', accent: '#FF6B6B', emoji: '🚀' },
  { name: 'purple_wealth',  bg1: '#1a0a2e', bg2: '#3d1a6b', accent: '#C084FC', emoji: '💸' },
  { name: 'ocean_finance',  bg1: '#0a1628', bg2: '#0e3460', accent: '#38BDF8', emoji: '🏦' },
]

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 }
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

/** Generate a vertical gradient as raw pixel buffer */
function createGradientBuffer(
  w: number, h: number,
  color1: string, color2: string
): Buffer {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  const pixels = Buffer.alloc(w * h * 3)

  for (let y = 0; y < h; y++) {
    const t = y / (h - 1)
    const r = lerp(c1.r, c2.r, t)
    const g = lerp(c1.g, c2.g, t)
    const b = lerp(c1.b, c2.b, t)
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 3
      pixels[idx] = r
      pixels[idx + 1] = g
      pixels[idx + 2] = b
    }
  }
  return pixels
}

/** Build SVG overlay with finance visuals and text */
function buildFinanceSvg(
  theme: ImageTheme,
  topic: string,
  imageType: 'background' | 'overlay',
  index: number
): string {
  const accentRgb = hexToRgb(theme.accent)
  const accentAlpha = `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b}`

  // Truncate topic for display
  const displayTopic = topic.length > 40 ? topic.substring(0, 37) + '...' : topic

  // Different layouts for background vs overlay
  if (imageType === 'background') {
    return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <!-- Decorative circles -->
  <circle cx="900" cy="200" r="300" fill="${accentAlpha},0.05)" />
  <circle cx="150" cy="1700" r="250" fill="${accentAlpha},0.07)" />
  <circle cx="540" cy="960" r="400" fill="${accentAlpha},0.03)" />

  <!-- Grid lines (subtle) -->
  ${Array.from({ length: 8 }, (_, i) => `
  <line x1="0" y1="${240 * i}" x2="${WIDTH}" y2="${240 * i}" stroke="${accentAlpha},0.08)" stroke-width="1"/>
  `).join('')}
  ${Array.from({ length: 5 }, (_, i) => `
  <line x1="${216 * i}" y1="0" x2="${216 * i}" y2="${HEIGHT}" stroke="${accentAlpha},0.08)" stroke-width="1"/>
  `).join('')}

  <!-- Upward trend line -->
  <polyline
    points="80,1600 200,1450 350,1500 500,1300 650,1350 800,1100 950,1000 1000,900"
    fill="none"
    stroke="${accentAlpha},0.25)"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- Bar chart (bottom) -->
  ${[120, 180, 140, 220, 160, 260, 200, 300].map((h, i) => `
  <rect x="${80 + i * 120}" y="${1820 - h}" width="80" height="${h}"
    fill="${accentAlpha},0.15)" rx="4"/>
  `).join('')}

  <!-- Top accent bar -->
  <rect x="0" y="0" width="${WIDTH}" height="6" fill="${theme.accent}"/>

  <!-- Bottom accent bar -->
  <rect x="0" y="${HEIGHT - 6}" width="${WIDTH}" height="6" fill="${theme.accent}"/>

  <!-- Center emoji -->
  <text x="${WIDTH / 2}" y="${HEIGHT * 0.42}" font-size="180" text-anchor="middle" dominant-baseline="middle">${theme.emoji}</text>

  <!-- Topic text -->
  <rect x="60" y="${HEIGHT * 0.52}" width="${WIDTH - 120}" height="160" rx="16"
    fill="rgba(0,0,0,0.5)"/>
  <text x="${WIDTH / 2}" y="${HEIGHT * 0.57}" font-family="Arial, sans-serif" font-weight="bold"
    font-size="52" fill="${theme.accent}" text-anchor="middle" dominant-baseline="middle">
    ${escapeXml(displayTopic)}
  </text>

  <!-- Brand watermark -->
  <text x="${WIDTH / 2}" y="${HEIGHT - 60}" font-family="Arial, sans-serif" font-size="36"
    fill="${accentAlpha},0.4)" text-anchor="middle">Finance Reels AI</text>
</svg>`
  } else {
    // Overlay style — different layout
    return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <!-- Dark vignette overlay -->
  <defs>
    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.6)"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#vignette)"/>

  <!-- Diagonal accent lines -->
  ${Array.from({ length: 6 }, (_, i) => `
  <line x1="${-200 + i * 250}" y1="0" x2="${600 + i * 250}" y2="${HEIGHT}"
    stroke="${accentAlpha},0.12)" stroke-width="2"/>
  `).join('')}

  <!-- Stats boxes -->
  <rect x="60" y="200" width="280" height="120" rx="12" fill="${accentAlpha},0.2)"/>
  <text x="200" y="250" font-family="Arial" font-weight="bold" font-size="48"
    fill="${theme.accent}" text-anchor="middle">+24.5%</text>
  <text x="200" y="295" font-family="Arial" font-size="30"
    fill="rgba(255,255,255,0.7)" text-anchor="middle">Returns</text>

  <rect x="740" y="200" width="280" height="120" rx="12" fill="${accentAlpha},0.2)"/>
  <text x="880" y="250" font-family="Arial" font-weight="bold" font-size="48"
    fill="${theme.accent}" text-anchor="middle">$10K</text>
  <text x="880" y="295" font-family="Arial" font-size="30"
    fill="rgba(255,255,255,0.7)" text-anchor="middle">Saved</text>

  <!-- Center large emoji -->
  <text x="${WIDTH / 2}" y="${HEIGHT * 0.45}" font-size="200" text-anchor="middle"
    dominant-baseline="middle">${theme.emoji}</text>

  <!-- Accent divider -->
  <rect x="120" y="${HEIGHT * 0.55}" width="${WIDTH - 240}" height="4" rx="2" fill="${theme.accent}"/>

  <!-- CTA text -->
  <text x="${WIDTH / 2}" y="${HEIGHT * 0.62}" font-family="Arial, sans-serif" font-weight="bold"
    font-size="56" fill="white" text-anchor="middle">Watch Till End 👇</text>

  <!-- Bottom gradient -->
  <rect x="0" y="${HEIGHT - 200}" width="${WIDTH}" height="200" fill="rgba(0,0,0,0.4)"/>
  <text x="${WIDTH / 2}" y="${HEIGHT - 80}" font-family="Arial, sans-serif" font-size="36"
    fill="${accentAlpha},0.6)" text-anchor="middle">Finance Reels AI</text>
</svg>`
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Generate a finance-themed image as a base64 data URL
 * Completely server-side, no external API, instant generation
 */
export async function generateFinanceImage(
  topic: string,
  imageType: 'background' | 'overlay' = 'background',
  themeIndex?: number
): Promise<string> {
  // Pick theme based on topic hash for consistency
  const idx = themeIndex ?? (topic.length % THEMES.length)
  const theme = THEMES[idx]

  // Create gradient background
  const gradientBuffer = createGradientBuffer(WIDTH, HEIGHT, theme.bg1, theme.bg2)

  // Build SVG overlay
  const svgOverlay = buildFinanceSvg(theme, topic, imageType, idx)
  const svgBuffer = Buffer.from(svgOverlay)

  // Composite: gradient + SVG overlay
  const imageBuffer = await sharp(gradientBuffer, {
    raw: { width: WIDTH, height: HEIGHT, channels: 3 },
  })
    .composite([{ input: svgBuffer, blend: 'over' }])
    .jpeg({ quality: 90 })
    .toBuffer()

  return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
}

/**
 * Generate multiple finance images for a reel
 */
export async function generateReelImages(
  topic: string,
  count: number = 2
): Promise<string[]> {
  const types: Array<'background' | 'overlay'> = ['background', 'overlay']
  const results: string[] = []

  for (let i = 0; i < count; i++) {
    const imageType = types[i % types.length]
    const themeIndex = i % THEMES.length
    const dataUrl = await generateFinanceImage(topic, imageType, themeIndex)
    results.push(dataUrl)
  }

  return results
}
