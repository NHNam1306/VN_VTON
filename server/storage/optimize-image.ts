import sharp from 'sharp'

export type PreparedImage = {
  buffer: Buffer
  mimeType: string
}

const MAX_INPUT_PIXELS = 24_000_000

export async function optimizeImageForStorage(buffer: Buffer, mimeType: string): Promise<PreparedImage> {
  if (mimeType !== 'image/png') return { buffer, mimeType }

  const image = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
  const metadata = await image.metadata()
  const webp = await image.webp({
    quality: metadata.hasAlpha ? 92 : 86,
    alphaQuality: 100,
    nearLossless: Boolean(metadata.hasAlpha),
    smartSubsample: true,
    effort: 4,
  }).toBuffer()

  return webp.length < buffer.length
    ? { buffer: webp, mimeType: 'image/webp' }
    : { buffer, mimeType }
}
