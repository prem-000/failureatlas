'use client';

import { motion } from 'framer-motion';

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

export function TechMarquee() {
  return (
    <section className="w-full overflow-hidden py-16 bg-background relative mt-8 sm:mt-12 border-t border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">Built With Modern Engineering Tools</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Powered by industry-standard technologies used to analyze, understand, and accelerate learning.
        </p>
      </div>

      <div className="relative flex items-center overflow-hidden w-full whitespace-nowrap">
        {/* Gradients for smooth fade in/out */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 sm:w-32 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 sm:w-32 bg-gradient-to-l from-background to-transparent" />

        <div className="flex w-max hover-pause-container">
          {[0, 1].map((setIndex) => (
            <div
              key={setIndex}
              className="flex gap-4 sm:gap-6 py-4 px-4 w-max animate-marquee"
            >
              {stack.map((tech, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-3 px-6 py-4 rounded-xl bg-[#111111]/80 backdrop-blur-md border border-white/5 hover:border-primary/50 shadow-sm transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-white/5 p-1.5 flex items-center justify-center">
                    <img 
                      src={tech.icon} 
                      alt={tech.name} 
                      className="w-full h-full object-contain" 
                      onError={(e) => { 
                        e.currentTarget.src = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/devicon/devicon-original.svg' 
                      }} 
                    />
                  </div>
                  <span className="font-medium text-foreground/90">
                    {tech.name}
                  </span>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .hover-pause-container:hover .animate-marquee {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
