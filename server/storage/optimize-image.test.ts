import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { optimizeImageForStorage } from './optimize-image.js'

describe('optimizeImageForStorage', () => {
  it('chuyển PNG lớn sang WebP khi dung lượng nhỏ hơn', async () => {
    const png = await sharp({
      create: { width: 512, height: 512, channels: 4, background: { r: 80, g: 130, b: 95, alpha: 0.7 } },
    }).png({ compressionLevel: 0 }).toBuffer()

    const result = await optimizeImageForStorage(png, 'image/png')

    expect(result.mimeType).toBe('image/webp')
    expect(result.buffer.length).toBeLessThan(png.length)
    expect((await sharp(result.buffer).metadata()).format).toBe('webp')
  })

  it('không mã hóa lại JPG', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9])
    const result = await optimizeImageForStorage(jpeg, 'image/jpeg')
    expect(result).toEqual({ buffer: jpeg, mimeType: 'image/jpeg' })
  })
})
