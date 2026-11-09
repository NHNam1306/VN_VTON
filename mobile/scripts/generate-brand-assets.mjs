import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const logo = await readFile(path.resolve(root, '../public/fitsy-mark.svg'));
const images = path.resolve(root, 'assets/images');
const centeredLogo = (size, markSize) => ({
  create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  composite: [{ input: logo, width: markSize, height: markSize, left: (size - markSize) / 2, top: (size - markSize) / 2 }],
});

await sharp(logo).resize(1024, 1024).png().toFile(path.join(images, 'icon.png'));
await sharp(centeredLogo(1024, 620)).png().toFile(path.join(images, 'android-icon-foreground.png'));
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#17211D' } }).png().toFile(path.join(images, 'android-icon-background.png'));
await sharp(centeredLogo(512, 284)).png().toFile(path.join(images, 'splash-icon.png'));
await sharp(logo).resize(64, 64).png().toFile(path.join(images, 'favicon.png'));

const monochrome = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><g fill="none" stroke="#fff" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"><path d="M503 330c0-90 62-160 152-160 79 0 141 55 141 130 0 99-103 141-183 187"/><path d="m507 405-306 284c-47 44-15 123 50 123h522c65 0 97-79 50-123L615 497"/><path d="M319 800h386"/><path d="M842 145v113M786 201h113"/></g></svg>`);
await sharp(monochrome).png().toFile(path.join(images, 'android-icon-monochrome.png'));
