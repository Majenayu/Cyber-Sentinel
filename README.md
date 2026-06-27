# 🛡️ Cyber Sentinel

**Cyber Sentinel** is a high-performance, monochromatic terminal-themed AI assistant designed specifically for penetration testing, security operations, and HTB Academy studies. It combines a sleek "Cyberpunk" aesthetic with a robust RAG (Retrieval-Augmented Generation) infrastructure powered by **Next.js 15**, **MongoDB**, and **Groq AI**.

## 🚀 Key Modules

- **📊 sys.dashboard**: Real-time telemetry overview of your intelligence vault, tool registry, and session logs.
- **🤖 AI Ops (Terminal)**: A multi-session chat environment that remembers your context. Powered by Llama-3-70b via Groq for unopinionated security guidance.
- **📚 sys.knowledge_vault**: A permanent, searchable archive for your HTB Academy notes and vulnerability research.
- **🛠️ sys.tools**: A pre-loaded registry of expert pentesting cheatsheets for industry-standard tools like Nmap, SQLmap, and Hydra.
- **📜 sys.commands**: A visual payload synthesizer. Save, categorize, and copy your most complex scripts with one click.

## 🛠️ Tech Stack

- **Frontend/Backend**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4 (Alpha/Beta)
- **Database**: MongoDB (Persistence Layer)
- **Intelligence**: Groq AI (Llama-3.3-70b Engine)
- **UI Components**: Lucide-React + Framer Motion

## 💾 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Majenayu/Cyber-Sentinel.git
   cd Cyber-Sentinel
   ```

2. **Configure Environment**:
   Create a `.env.local` file in the root with:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   GROQ_API_KEY=your_groq_api_key
   ```

3. **Install Dependencies**:
   ```bash
   npm install --no-audit --no-fund
   ```

4. **Launch the Terminal**:
   ```bash
   npm run dev
   ```

## 🛡️ License
Distributed under the MIT License. View `LICENSE` for more information.

---
**OPERATIONAL STATUS: [READY]**
