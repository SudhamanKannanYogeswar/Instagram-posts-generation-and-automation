/**
 * Server-side video generation using sharp (image compositing) + ffmpeg
 * Creates Instagram Reels (9:16, 1080x1920) from images + text overlays
 * sharp has prebuilt Windows binaries - no Visual Studio needed
 */

import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

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

/** Download or decode an image URL into a Buffer */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1]
    return Buffer.from(base64, 'base64')
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/** Build an SVG text overlay for a given message */
function buildTextSvg(
  lines: string[],
  fontSize: number,
  color: string,
  bgColor: string,
  yCenter: number
): Buffer {
  const lineHeight = fontSize * 1.4
  const totalH = lines.length * lineHeight + 40
  const startY = yCenter - totalH / 2

  const rects = lines.map((line, i) => {
    const approxW = Math.min(line.length * fontSize * 0.55 + 60, WIDTH - 80)
    const x = (WIDTH - approxW) / 2
    const y = startY + i * lineHeight
    return `<rect x="${x}" y="${y}" width="${approxW}" height="${fontSize + 24}" rx="12" fill="${bgColor}" />`
  }).join('\n')

  const texts = lines.map((line, i) => {
    const y = startY + i * lineHeight + fontSize
    return `<text x="${WIDTH / 2}" y="${y}" font-family="Arial, sans-serif" font-weight="bold" font-size="${fontSize}" fill="${color}" text-anchor="middle">${escapeXml(line)}</text>`
  }).join('\n')

  return Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${rects}
      ${texts}
    </svg>
  `)
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Wrap text into lines that fit within maxChars per line */
function wrapText(text: string, maxChars = 32): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars && current) {
      lines.push(current.trim())
      current = word
    } else {
      current = current ? current + ' ' + word : word
    }
  }
  if (current) lines.push(current.trim())
  return lines
}

/** Compose a single frame: background image + dark overlay + text */
async function composeFrame(
  bgBuffer: Buffer,
  textLines: string[],
  fontSize: number,
  textColor: string,
  bgColor: string,
  yCenter: number,
  outputPath: string
): Promise<void> {
  // Resize background to 1080x1920
  const bg = await sharp(bgBuffer)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'center' })
    .toBuffer()

  // Dark overlay
  const overlay = await sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } },
  }).png().toBuffer()

  // Text SVG
  const textSvg = buildTextSvg(textLines, fontSize, textColor, bgColor, yCenter)

  await sharp(bg)
    .composite([
      { input: overlay, blend: 'over' },
      { input: textSvg, blend: 'over' },
    ])
    .jpeg({ quality: 90 })
    .toFile(outputPath)
}

/** Find ffmpeg binary */
async function findFfmpeg(): Promise<string> {
  const candidates = [
    'ffmpeg',
    'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
  ]
  for (const p of candidates) {
    try {
      await execFileAsync(p, ['-version'])
      return p
    } catch {}
  }
  throw new Error('ffmpeg not found. Install it: Windows: choco install ffmpeg | Mac: brew install ffmpeg | Linux: sudo apt install ffmpeg')
}

/** Main: generate all frames then assemble into MP4 */
export async function generateReelVideo(params: VideoGenerationParams): Promise<VideoResult> {
  const { contentId, hook, script, cta, imageUrls, durationSeconds = 30 } = params

  const tmpDir = path.join(os.tmpdir(), `reel_${contentId}_${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  // Fetch background images
  const bgBuffer = imageUrls[0]
    ? await fetchImageBuffer(imageUrls[0]).catch(() => null)
    : null

  const overlayBuffer = imageUrls[1]
    ? await fetchImageBuffer(imageUrls[1]).catch(() => null)
    : bgBuffer

  // Fallback gradient if no images
  const fallbackBg = await sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 3, background: { r: 15, g: 12, b: 41 } },
  }).jpeg().toBuffer()

  const bg1 = bgBuffer || fallbackBg
  const bg2 = overlayBuffer || fallbackBg

  // Split script into 3 parts
  const scriptParts = splitIntoChunks(script, 3)

  // Define frames: [bgBuffer, textLines, fontSize, textColor, bgColor, yCenter]
  type FrameDef = [Buffer, string[], number, string, string, number]
  const frameDefs: FrameDef[] = [
    // Frame 1: Hook (4s)
    [bg1, ['💰', ...wrapText(hook, 28)], 72, '#FFFFFF', 'rgba(0,0,0,0.65)', HEIGHT * 0.42],
    [bg1, ['👇 Watch till the end'], 52, '#FFD700', 'rgba(0,0,0,0.5)', HEIGHT * 0.62],
    // Frame 2-4: Script parts
    [bg2, wrapText(scriptParts[0] || '', 30), 56, '#FFFFFF', 'rgba(0,0,0,0.6)', HEIGHT * 0.5],
    [bg2, wrapText(scriptParts[1] || '', 30), 56, '#FFFFFF', 'rgba(0,0,0,0.6)', HEIGHT * 0.5],
    [bg2, wrapText(scriptParts[2] || '', 30), 56, '#FFFFFF', 'rgba(0,0,0,0.6)', HEIGHT * 0.5],
    // Frame 5: CTA
    [bg1, ['✅', ...wrapText(cta, 28)], 64, '#00FF88', 'rgba(0,0,0,0.65)', HEIGHT * 0.42],
    [bg1, ['❤️ Like & Follow for more!'], 52, '#FFD700', 'rgba(0,0,0,0.5)', HEIGHT * 0.62],
  ]

  // Render all frames
  const framePaths: string[] = []
  for (let i = 0; i < frameDefs.length; i++) {
    const [bg, lines, fontSize, color, bgColor, yCenter] = frameDefs[i]
    const framePath = path.join(tmpDir, `frame_${String(i).padStart(3, '0')}.jpg`)
    await composeFrame(bg, lines, fontSize, color, bgColor, yCenter, framePath)
    framePaths.push(framePath)
  }

  // Thumbnail = first frame
  const thumbnailPath = path.join(tmpDir, 'thumbnail.jpg')
  fs.copyFileSync(framePaths[0], thumbnailPath)

  // Build ffmpeg concat file (each frame shown for equal duration)
  const secPerFrame = durationSeconds / framePaths.length
  const concatFile = path.join(tmpDir, 'concat.txt')
  const concatContent = framePaths
    .map(f => `file '${f.replace(/\\/g, '/')}'\nduration ${secPerFrame.toFixed(2)}`)
    .join('\n')
  // ffmpeg needs last file repeated without duration
  const lastFrame = framePaths[framePaths.length - 1]
  fs.writeFileSync(concatFile, concatContent + `\nfile '${lastFrame.replace(/\\/g, '/')}'`)

  // Assemble video
  const videoPath = path.join(tmpDir, 'reel.mp4')
  const ffmpeg = await findFfmpeg()

  await execFileAsync(ffmpeg, [
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFile,
    '-vf', `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
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

function splitIntoChunks(text: string, n: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const size = Math.ceil(sentences.length / n)
  const chunks: string[] = []
  for (let i = 0; i < n; i++) {
    const chunk = sentences.slice(i * size, (i + 1) * size).join(' ').trim()
    chunks.push(chunk || '')
  }
  return chunks
}
