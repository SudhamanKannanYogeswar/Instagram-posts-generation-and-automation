/**
 * Server-side video generation using sharp + system ffmpeg
 * On Vercel (Linux): uses /usr/bin/ffmpeg which is available on all Vercel instances
 * On Windows (local dev): uses the winget-installed ffmpeg
 */

import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/** Find ffmpeg — checks multiple locations for cross-platform support */
async function getFfmpeg(): Promise<string> {
  const candidates = [
    // Linux (Vercel, Railway, Render, etc.)
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    // Windows (winget install)
    `${process.env.LOCALAPPDATA}\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1-full_build\\bin\\ffmpeg.exe`,
    // Windows (chocolatey)
    'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
    // PATH fallback
    'ffmpeg',
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      await execFileAsync(candidate, ['-version'])
      return candidate
    } catch {
      continue
    }
  }

  throw new Error(
    'ffmpeg not found. On Vercel it should be at /usr/bin/ffmpeg. ' +
    'Locally: winget install Gyan.FFmpeg or brew install ffmpeg'
  )
}

const WIDTH = 1080
const HEIGHT = 1920

export interface VideoGenerationParams {
  contentId: string
  hook: string
  script: string
  cta: string
  imageUrls: string[]
  durationSeconds?: number
}

export interface VideoResult {
  videoPath: string
  thumbnailPath: string
  durationSeconds: number
}

/** Decode a data URL or fetch a remote URL into a Buffer */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1]
    return Buffer.from(base64, 'base64')
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/** Wrap text into lines of at most maxChars characters */
function wrapText(text: string, maxChars = 30): string[] {
  if (!text) return []
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (test.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
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
 * Build a complete frame as JPEG buffer.
 * Uses the source image as background, adds a semi-transparent dark overlay,
 * then renders text via SVG compositing — all with sharp (no canvas needed).
 */
async function buildFrame(
  bgBuffer: Buffer,
  lines: string[],
  opts: {
    fontSize: number
    textColor: string
    yPercent: number   // 0–1, vertical center of text block
    emoji?: string
  }
): Promise<Buffer> {
  const { fontSize, textColor, yPercent, emoji } = opts

  // 1. Resize background to exact reel dimensions
  const bg = await sharp(bgBuffer)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'center' })
    .toBuffer()

  // 2. Build SVG with text overlay (sharp handles SVG compositing natively)
  const lineHeight = fontSize * 1.45
  const safeLines = lines.slice(0, 6) // max 6 lines
  const blockH = safeLines.length * lineHeight + 40
  const blockY = HEIGHT * yPercent - blockH / 2

  const textElements = safeLines.map((line, i) => {
    const y = blockY + i * lineHeight + fontSize
    const approxW = Math.min(line.length * fontSize * 0.58 + 60, WIDTH - 80)
    const rx = (WIDTH - approxW) / 2
    const ry = blockY + i * lineHeight - 4
    return `
      <rect x="${rx}" y="${ry}" width="${approxW}" height="${fontSize + 20}" rx="10"
        fill="rgba(0,0,0,0.62)"/>
      <text x="${WIDTH / 2}" y="${y}"
        font-family="Arial, Helvetica, sans-serif"
        font-weight="bold"
        font-size="${fontSize}"
        fill="${textColor}"
        text-anchor="middle">${escapeXml(line)}</text>`
  }).join('\n')

  const emojiEl = emoji
    ? `<text x="${WIDTH / 2}" y="${blockY - 20}"
        font-size="${fontSize * 1.4}"
        text-anchor="middle"
        dominant-baseline="auto">${emoji}</text>`
    : ''

  const svg = Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <!-- dark overlay -->
    <rect width="${WIDTH}" height="${HEIGHT}" fill="rgba(0,0,0,0.42)"/>
    ${emojiEl}
    ${textElements}
  </svg>`)

  // 3. Composite SVG over background
  return sharp(bg)
    .composite([{ input: svg, blend: 'over' }])
    .jpeg({ quality: 88 })
    .toBuffer()
}

/** Split text into n roughly equal chunks by sentence */
function splitIntoChunks(text: string, n: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const size = Math.ceil(sentences.length / n)
  return Array.from({ length: n }, (_, i) =>
    sentences.slice(i * size, (i + 1) * size).join(' ').trim()
  )
}

/**
 * Generate a complete Reel video.
 * Returns paths to the MP4 and thumbnail JPEG in the OS temp directory.
 */
export async function generateReelVideo(params: VideoGenerationParams): Promise<VideoResult> {
  const { contentId, hook, script, cta, imageUrls, durationSeconds = 30 } = params

  const tmpDir = path.join(os.tmpdir(), `reel_${contentId}_${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  // --- Load background images ---
  const fallback = await sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 3, background: { r: 15, g: 12, b: 41 } },
  }).jpeg().toBuffer()

  const bg1 = imageUrls[0]
    ? await fetchImageBuffer(imageUrls[0]).catch(() => fallback)
    : fallback

  const bg2 = imageUrls[1]
    ? await fetchImageBuffer(imageUrls[1]).catch(() => bg1)
    : bg1

  // --- Build frames ---
  const scriptParts = splitIntoChunks(script, 3)

  const frameConfigs: Array<{ bg: Buffer; lines: string[]; fontSize: number; color: string; yPct: number; emoji?: string }> = [
    // Hook frame
    { bg: bg1, lines: wrapText(hook, 26), fontSize: 68, color: '#FFFFFF', yPct: 0.44, emoji: '💰' },
    // Watch till end
    { bg: bg1, lines: ['👇 Watch till the end'], fontSize: 52, color: '#FFD700', yPct: 0.62 },
    // Script part 1
    { bg: bg2, lines: wrapText(scriptParts[0] || '', 28), fontSize: 54, color: '#FFFFFF', yPct: 0.50 },
    // Script part 2
    { bg: bg2, lines: wrapText(scriptParts[1] || '', 28), fontSize: 54, color: '#FFFFFF', yPct: 0.50 },
    // Script part 3
    { bg: bg2, lines: wrapText(scriptParts[2] || '', 28), fontSize: 54, color: '#FFFFFF', yPct: 0.50 },
    // CTA frame
    { bg: bg1, lines: wrapText(cta, 26), fontSize: 60, color: '#00FF88', yPct: 0.44, emoji: '✅' },
    // Follow frame
    { bg: bg1, lines: ['❤️ Like & Follow for more!'], fontSize: 52, color: '#FFD700', yPct: 0.62 },
  ]

  const framePaths: string[] = []
  for (let i = 0; i < frameConfigs.length; i++) {
    const cfg = frameConfigs[i]
    const framePath = path.join(tmpDir, `frame_${String(i).padStart(3, '0')}.jpg`)

    const frameBuffer = await buildFrame(cfg.bg, cfg.lines, {
      fontSize: cfg.fontSize,
      textColor: cfg.color,
      yPercent: cfg.yPct,
      emoji: cfg.emoji,
    })

    fs.writeFileSync(framePath, frameBuffer)
    framePaths.push(framePath)
  }

  // Thumbnail = first frame
  const thumbnailPath = path.join(tmpDir, 'thumbnail.jpg')
  fs.copyFileSync(framePaths[0], thumbnailPath)

  // --- Build ffmpeg concat list ---
  const secPerFrame = durationSeconds / framePaths.length
  const lastFrame = framePaths[framePaths.length - 1]
  const concatContent =
    framePaths.map(f => `file '${f.replace(/\\/g, '/')}'\nduration ${secPerFrame.toFixed(2)}`).join('\n') +
    `\nfile '${lastFrame.replace(/\\/g, '/')}'`

  const concatFile = path.join(tmpDir, 'concat.txt')
  fs.writeFileSync(concatFile, concatContent)

  // --- Assemble MP4 ---
  const videoPath = path.join(tmpDir, 'reel.mp4')
  const ffmpeg = await getFfmpeg()

  await execFileAsync(ffmpeg, [
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFile,
    '-vf', `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-r', '25',
    '-y',
    videoPath,
  ])

  return { videoPath, thumbnailPath, durationSeconds }
}
