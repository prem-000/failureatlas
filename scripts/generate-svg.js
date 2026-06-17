const fs = require('fs');

const stack = [
  { name: 'Next.js', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nextjs/nextjs-original.svg' },
  { name: 'React', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg' },
  { name: 'TypeScript', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg' },
  { name: 'Tailwind CSS', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg' },
  { name: 'Framer Motion', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/framermotion/framermotion-original.svg' },
  { name: 'Next.js API Routes', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nextjs/nextjs-original.svg' },
  { name: 'Prisma', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/prisma/prisma-original.svg' },
  { name: 'PostgreSQL', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg' },
  { name: 'Groq', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/google/google-original.svg' },
  { name: 'Llama 3', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/meta/meta-original.svg' },
  { name: 'RAG', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg' },
  { name: 'Embeddings', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/numpy/numpy-original.svg' },
  { name: 'Chrome Extension', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/chrome/chrome-original.svg' },
  { name: 'Vercel', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vercel/vercel-original.svg' },
  { name: 'GitHub', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/github/github-original.svg' },
  { name: 'Bayesian Inference', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jupyter/jupyter-original.svg' },
  { name: 'Myers Diff', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg' },
  { name: 'PageRank', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/google/google-original.svg' },
  { name: 'Graph Intelligence', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/neo4j/neo4j-original.svg' }
];

const ITEM_WIDTH = 250;
const HEIGHT = 60;
const SPACING = 20;

let itemsHTML = '';
stack.forEach((tech, i) => {
  const x = i * ITEM_WIDTH;
  itemsHTML += `
    <g transform="translate(${x}, 10)">
      <rect width="230" height="40" rx="8" fill="#111111" stroke="#ffffff" stroke-opacity="0.1" />
      <image href="${tech.icon}" x="15" y="10" width="20" height="20" />
      <text x="45" y="25" fill="#ffffff" font-family="Arial, sans-serif" font-size="14" alignment-baseline="middle">${tech.name}</text>
    </g>
  `;
});

const totalWidth = stack.length * ITEM_WIDTH;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${HEIGHT}">
  <style>
    .marquee {
      animation: scroll 30s linear infinite;
    }
    @keyframes scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-${totalWidth}px); }
    }
    text {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  </style>
  <rect width="100%" height="100%" fill="transparent" />
  
  <!-- Group that animates -->
  <g class="marquee">
    ${itemsHTML}
    <!-- Duplicate for seamless scroll -->
    <g transform="translate(${totalWidth}, 0)">
      ${itemsHTML}
    </g>
  </g>
  
  <!-- Gradient overlays for smooth fade (Optional, might look weird depending on background) -->
</svg>`;

fs.writeFileSync('public/tech-marquee.svg', svg);
console.log("SVG generated!");
