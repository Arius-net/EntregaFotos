const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function run() {
  try {
    const fileBuffer = await sharp({
      create: { width: 4000, height: 3000, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } }
    }).jpeg().toBuffer();

    const imageMetadata = await sharp(fileBuffer).metadata();
    const targetWidth = 800;
    
    let sharpPipeline = sharp(fileBuffer)
      .resize({ width: targetWidth, withoutEnlargement: true });

    // Ruta de la marca de agua
    const watermarkPath = path.join(process.cwd(), '../frontend/public/logo_symbol.png');
    console.log('Watermark path:', watermarkPath);
    console.log('Exists?', fs.existsSync(watermarkPath));

    if (fs.existsSync(watermarkPath)) {
      sharpPipeline = sharpPipeline.composite([{
        input: await sharp(watermarkPath).resize({ width: Math.round(targetWidth * 0.4) }).toBuffer(),
        gravity: 'center'
      }]);
    }

    const thumbnailBuffer = await sharpPipeline
      .webp({ quality: 80 })
      .toBuffer();

    console.log('Success! Thumbnail size:', thumbnailBuffer.length);
  } catch (err) {
    console.error('Error during sharp processing:', err);
  }
}

run();
