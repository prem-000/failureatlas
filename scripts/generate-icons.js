const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure sharp is installed
try {
  require.resolve('sharp');
} catch (e) {
  console.log('Installing sharp library for SVG-to-PNG rendering...');
  try {
    execSync('npm install --no-save sharp', { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to install sharp. Ensure Node.js and npm are configured correctly.');
    process.exit(1);
  }
}

const sharp = require('sharp');

const svgPath = path.resolve(__dirname, '../apps/extension/icons/icon.svg');
const outputDir = path.resolve(__dirname, '../apps/extension/icons');

const sizes = [16, 32, 48, 128];

async function generate() {
  if (!fs.existsSync(svgPath)) {
    console.error(`SVG icon not found at: ${svgPath}`);
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(svgPath);
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    console.log(`Generating ${size}x${size} png icon...`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
  }
  console.log('All icons (16px, 32px, 48px, 128px) generated successfully!');
}

generate().catch(err => {
  console.error('Error during icon generation:', err);
  process.exit(1);
});
