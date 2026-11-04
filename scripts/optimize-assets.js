import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function optimize() {
  console.log('🖼️  Optimizing Android Splash & Icon Assets...');

  const logoPath = path.resolve('resources/icon.png');
  if (!fs.existsSync(logoPath)) {
    console.error('Logo file resources/icon.png not found!');
    return;
  }

  // 1. Create a lightweight splash.png (512x512 centered logo on #05060a background)
  const splashPath = path.resolve('resources/splash.png');
  const splashDarkPath = path.resolve('resources/splash-dark.png');

  // Load logo metadata
  const logoBuffer = await sharp(logoPath)
    .resize(320, 320, { fit: 'contain' })
    .toBuffer();

  // Composite logo over a dark 600x600 background
  const optimizedSplash = await sharp({
    create: {
      width: 600,
      height: 600,
      channels: 4,
      background: { r: 5, g: 6, b: 10, alpha: 1 },
    },
  })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png({ quality: 80, compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(splashPath, optimizedSplash);
  fs.writeFileSync(splashDarkPath, optimizedSplash);

  console.log(`✅ Optimized resources/splash.png size: ${(optimizedSplash.length / 1024).toFixed(1)} KB`);

  // 2. Find all splash.png files in android/app/src/main/res/drawable* and replace them
  const resDir = path.resolve('android/app/src/main/res');
  if (fs.existsSync(resDir)) {
    const entries = fs.readdirSync(resDir);
    let count = 0;
    for (const entry of entries) {
      if (entry.startsWith('drawable')) {
        const folderPath = path.join(resDir, entry);
        const splashFile = path.join(folderPath, 'splash.png');
        if (fs.existsSync(splashFile)) {
          fs.writeFileSync(splashFile, optimizedSplash);
          count++;
        }
      }
    }
    console.log(`🚀 Replaced ${count} splash images in Android drawable folders with optimized ~40KB asset.`);
  }
}

optimize().catch(console.error);
