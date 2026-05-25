import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');
const iosDir = join(__dirname, '..', 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
const androidDir = join(__dirname, '..', 'android/app/src/main/res');

const primaryColor = '#4A6FA4';
const textColor = '#FFFFFF';

// Create SVG with "LS" text for LifeStreak
function createSvg(size, text = 'LS', cornerRadius = null) {
  const fontSize = Math.round(size * 0.45);
  const rx = cornerRadius ?? Math.round(size * 0.18);
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${rx}" fill="${primaryColor}"></rect>
      <text
        x="50%"
        y="55%"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="${textColor}"
        text-anchor="middle"
        dominant-baseline="middle"
      >${text}</text>
    </svg>
  `;
}

// Create a maskable version with safe zone padding
function createMaskableSvg(size) {
  const padding = Math.round(size * 0.1);
  const innerSize = size - padding * 2;
  const fontSize = Math.round(innerSize * 0.45);
  const rx = Math.round(innerSize * 0.18);
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${rx}" fill="${primaryColor}"></rect>
      <text
        x="50%"
        y="55%"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="${textColor}"
        text-anchor="middle"
        dominant-baseline="middle"
      >LS</text>
    </svg>
  `;
}

async function generateIcons() {
  // Public icons
  const publicIcons = [
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
  ];

  for (const { name, size } of publicIcons) {
    const svg = createSvg(size);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(join(publicDir, name));
    console.log(`Generated ${name}`);
  }

  // Maskable icon
  const maskableSvg = createMaskableSvg(512);
  await sharp(Buffer.from(maskableSvg))
    .png()
    .toFile(join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Generated pwa-maskable-512x512.png');

  // iOS app icon (1024x1024)
  const iosSvg = createSvg(1024, 'LS', 180);
  await sharp(Buffer.from(iosSvg))
    .png()
    .toFile(join(iosDir, 'AppIcon-512@2x.png'));
  console.log('Generated ios/AppIcon-512@2x.png');

  // Android launcher icons
  const androidSizes = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const { dir, size } of androidSizes) {
    const svg = createSvg(size, 'LS', Math.round(size * 0.2));
    const png = await sharp(Buffer.from(svg)).png().toBuffer();

    await sharp(png)
      .toFile(join(androidDir, dir, 'ic_launcher.png'));
    await sharp(png)
      .toFile(join(androidDir, dir, 'ic_launcher_round.png'));
    await sharp(png)
      .toFile(join(androidDir, dir, 'ic_launcher_foreground.png'));

    console.log(`Generated android/${dir} icons`);
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
