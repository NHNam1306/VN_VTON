export type StoredImage = {
  buffer: Buffer
  mimeType: string
}

export interface ImageStorage {
  save(buffer: Buffer, mimeType: string): Promise<string>
  read(key: string): Promise<StoredImage>
  delete(key: string): Promise<void>
  publicUrl(key: string): string
}
