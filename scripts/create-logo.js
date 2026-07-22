const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = path.join(__dirname, '../public/email');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Create a high-res 400x100 SVG badge for Praxis logo
const svgLogo = `
<svg width="400" height="100" viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="100" rx="16" fill="#16161a"/>
  <!-- Glowing icon background -->
  <rect x="24" y="20" width="60" height="60" rx="14" fill="url(#purpleGrad)"/>
  <!-- Lightning / P Symbol -->
  <path d="M50 32L40 52H52L48 68L64 46H52L58 32H50Z" fill="#ffffff"/>
  
  <!-- Title Text -->
  <text x="100" y="52" font-family="'Inter', system-ui, sans-serif" font-weight="800" font-size="32" fill="#ffffff" letter-spacing="-0.5">PRAXIS</text>
  <text x="100" y="70" font-family="'Inter', system-ui, sans-serif" font-weight="600" font-size="12" fill="#a855f7" letter-spacing="2">AI LEARNING COMPANION</text>

  <defs>
    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c084fc"/>
      <stop offset="100%" stop-color="#9333ea"/>
    </linearGradient>
  </defs>
</svg>
`;

sharp(Buffer.from(svgLogo))
  .png()
  .toFile(path.join(dir, 'logo.png'))
  .then(() => console.log('Successfully generated public/email/logo.png'))
  .catch(err => console.error('Error generating logo:', err));
