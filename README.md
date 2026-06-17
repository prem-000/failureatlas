<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=32&duration=3000&pause=1000&color=FF4444&center=true&vCenter=true&width=600&lines=Praxis+%F0%9F%97%BA%EF%B8%8F;Turn+Practice+into+Intelligence" alt="Typing SVG" />
</p>

<p align="center">
  <i>Practice Creates Insight.<br/>Insight Creates Growth.<br/>Growth Creates Mastery.</i>
</p>

<p align="center">
  <strong>Turn Practice Into Insight</strong>
</p>

<p align="center">
  AI-powered learning intelligence platform that transforms practice sessions into actionable insights, growth opportunities, and personalized improvement plans.
</p>

<p align="center">
  <a href="https://github.com/prem-000/failureatlas/stargazers">
    <img src="https://img.shields.io/github/stars/prem-000/failureatlas?style=for-the-badge&logo=github&color=FF4444&labelColor=0D1117" alt="Stars"/>
  </a>
  <a href="https://github.com/prem-000/failureatlas/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge&labelColor=0D1117" alt="MIT License"/>
  </a>
  <a href="https://github.com/prem-000/failureatlas/pulls">
    <img src="https://img.shields.io/badge/PRs-Welcome-3B82F6?style=for-the-badge&labelColor=0D1117" alt="PRs Welcome"/>
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/Status-Active%20Development-F59E0B?style=for-the-badge&labelColor=0D1117" alt="Status"/>
  </a>
</p>

<h3 align="center">Built With Modern Engineering Tools</h3>
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/tech-marquee.svg">
    <source media="(prefers-color-scheme: light)" srcset="./public/tech-marquee.svg">
    <img alt="Tech Stack" src="./public/tech-marquee.svg">
  </picture>
</p>

---

## ✨ Features

- 🔍 **Learning Intelligence** — Bayesian inference engine pinpoints exactly *why* your submission failed, not just *that* it failed
- 🧠 **Learning Graph** — PageRank graph algorithm maps your recurring blind spots across all submissions
- 📚 **Growth Analysis** — Groq (LLaMA-3) generates targeted study plans based on your *actual* practice sessions
- 📊 **Practice Insights** — Timeline view, streak analysis, acceptance rates and improvement metrics
- 🔌 **Chrome Extension** — Auto-captures LeetCode submissions in real-time, zero manual input required
- 🗂 **RAG-Powered Chat** — Ask anything about your practice sessions; the AI answers using your embedded submission history
- 🌐 **Multi-language Support** — Works with Python, JavaScript, Java, C++, and more
- ⚡ **Improvement Plans** — Context-aware recommendations with LLM-generated explanations
- 📈 **Knowledge Graph** — Visual React Flow graph of your weakness relationships and dependencies

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, TailwindCSS, React Flow, Framer Motion |
| **Backend** | Next.js API Routes, TypeScript, Prisma ORM |
| **AI / LLM** | Groq Cloud (LLaMA-3 8B), RAG with cosine similarity embeddings |
| **Analysis** | Bayesian Inference, Myers Diff, PageRank Graph Algorithm |
| **Database** | PostgreSQL 16, Prisma Migrations |
| **Extension** | Chrome Extension (Manifest V3), TypeScript |
| **Auth** | JWT + bcrypt, NextAuth adapter |
| **Dev Tools** | Docker Compose, Prisma Studio, TSX |

---

## 🚀 Getting Started

<details>
<summary><b>📋 Prerequisites</b></summary>

- **Node.js** v18+ and **pnpm** / **npm**
- **PostgreSQL** 16 running locally or via Docker
- **Groq API Key** — free at [console.groq.com](https://console.groq.com)
- **Google Chrome** (for the extension)

</details>

<details>
<summary><b>⚙️ Installation</b></summary>

### 1. Clone the repository

```bash
git clone https://github.com/prem-000/failureatlas.git
cd failureatlas
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start PostgreSQL (via Docker)

```bash
docker-compose up -d
```

### 4. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Database
DATABASE_URL=postgresql://failureatlas:yourpassword@localhost:5432/failureatlas_dev

# AI — get your free key at https://console.groq.com
GROQ_API_KEY=gsk_your_key_here

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_at_least_32_characters
JWT_SECRET=your_jwt_secret_at_least_32_characters

# Dev
NODE_ENV=development
USE_MOCK_EMBEDDINGS=true
```

### 5. Run Prisma migrations & seed

```bash
npm run prisma:migrate
npm run prisma:seed
```

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

### 7. Load the Chrome Extension (optional)

```bash
cd apps/extension
npm install && npm run build
```

Go to `chrome://extensions` → **Load unpacked** → select `apps/extension/dist`

</details>

---

## 📸 Screenshots

| Screenshot | Description |
|---|---|
| ![Dashboard](https://via.placeholder.com/600x340/0D1117/FF4444?text=Dashboard) | Main dashboard with submission timeline and weakness heatmap |
| ![Learning Intelligence](https://via.placeholder.com/600x340/0D1117/3B82F6?text=Learning+Intelligence) | AI Practice Analyst chat — ask about your patterns |
| ![Learning Graph](https://via.placeholder.com/600x340/0D1117/22C55E?text=Learning+Graph) | React Flow graph of weakness relationships |
| ![Mastery Journey](https://via.placeholder.com/600x340/0D1117/F59E0B?text=Mastery+Journey) | Personalized learning plan generated by Groq |

---

## 🗺 Roadmap

### ✅ Completed
- [x] Chrome Extension for auto-capturing LeetCode submissions
- [x] Bayesian inference engine for root cause analysis
- [x] PageRank graph for weakness pattern detection
- [x] RAG pipeline with cosine similarity embeddings
- [x] Groq (LLaMA-3) powered AI diagnosis & chat
- [x] Interactive knowledge graph (React Flow)
- [x] JWT authentication with API key support
- [x] Prisma ORM with PostgreSQL migrations
- [x] Progress tracking (streaks, acceptance rate, timelines)

### 🔄 In Progress
- [ ] Codeforces & HackerRank extension support
- [ ] GitHub OAuth login
- [ ] Public profile & shareable weakness reports

### 📌 Planned
- [ ] Mobile app (React Native)
- [ ] Weekly AI digest emails
- [ ] Team / study group mode
- [ ] VS Code extension for local IDE support
- [ ] Fine-tuned model on competitive programming failures
- [ ] Leaderboard & peer comparison

---

## 🤝 Contributing

Contributions are what make open source amazing — every PR, bug report, and idea matters!

1. **Fork** the repository
2. **Create** your feature branch: `git checkout -b feat/amazing-feature`
3. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
4. **Push** to the branch: `git push origin feat/amazing-feature`
5. **Open a Pull Request** — we'll review it ASAP 🚀

Please check our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting.

> 💡 Not sure where to start? Look for issues tagged [`good first issue`](https://github.com/prem-000/failureatlas/issues?q=is%3Aissue+label%3A%22good+first+issue%22)

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

<p align="center">
  <sub>Made with ❤️ by <a href="https://github.com/prem-000">prem-000</a></sub>
  <br/>
  <sub>⭐ Star this repo if Praxis helped you level up!</sub>
</p>
