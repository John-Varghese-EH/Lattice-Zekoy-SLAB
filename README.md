<div align="center">
  <br />
  <img src="public/logo-128.png" alt="Lattice" width="100" />
  <br />
  <br />
  <h1>Lattice</h1>
  <h3>Your browser already knows everything. Lattice gives it a brain.</h3>
  <br />

  <a href="#installation"><img src="https://img.shields.io/badge/Install-3_Minutes-00c853?style=for-the-badge&logoColor=white" alt="Install" /></a>
  <img src="https://img.shields.io/badge/Manifest-V3-1a73e8?style=for-the-badge" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/License-GPLv3-444?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/Build-Passing-00c853?style=for-the-badge" alt="Build" />

  <br />
  <br />
</div>

---

## What is Lattice?

Lattice is a browser extension that turns your tabs into a spatial, graph-based workspace with a built-in autonomous AI agent. It watches what you browse, maps your research onto an infinite visual canvas, and gives you a command-line AI copilot that can actually *do things* on the web for you.

It is not a chatbot wrapper. It is not a tab manager. It is the missing operating layer between you and the internet.

**One sentence:** Lattice connects your tabs, your memory, and an AI agent into a single visual workspace that thinks alongside you.

---

## The Problem

Every day, knowledge workers open dozens of tabs, copy-paste between windows, lose track of research threads, and manually feed context into AI tools that forget everything the moment you close them.

The browser was built for documents. It was never built for workflows.

Lattice fixes that.

---

## How It Works

### 1. Spatial Mind-Mapping

Every tab you open becomes a node. Every connection between pages becomes an edge. Lattice automatically builds a visual knowledge graph of your browsing session in real time.

You do not organize anything. Lattice does it for you.

- Tabs are visualized as interactive nodes on a glassmorphic canvas
- Parent-child relationships are inferred automatically from navigation history
- Tab groups are preserved and color-coded
- Nodes persist across sessions with full offline support

### 2. Autonomous Browser Agent

Lattice ships with a built-in AI agent powered by the Gemini API. This is not a simple chatbot. It is a ReAct-style autonomous agent that can reason about your request, break it into steps, and execute them directly in your browser.

**What the agent can do:**

| Capability | Description |
|:---|:---|
| Navigate | Open any URL in the current tab |
| Scroll | Scroll pages up or down programmatically |
| Click | Click buttons, links, and interactive elements |
| Type | Fill inputs, search boxes, and text fields |
| Extract Text | Pull text content from any page or element |
| Fetch Data | Make background API calls to public endpoints |
| Switch Tabs | Find and focus any open tab by URL |
| Wait | Pause between steps for page loads |
| Highlight | Visually outline any element on the page |

**Example commands:**

```
/cmd scroll down
/cmd search for "machine learning papers" on this page
/cmd extract the main content from this article
/cmd navigate to github.com
```

The agent generates a multi-step execution plan, displays it in the sidebar with live progress indicators, and executes each step sequentially. Every step shows a green checkmark on completion.

### 3. WebCMD Execution Engine

WebCMD is the agent's strategy layer. Before executing, it learns the structure of the current website by scanning interactive elements and building a lightweight SiteAdapter schema. This schema maps semantic intents like "search_input" or "login_submit" to stable CSS selectors.

On subsequent visits, the agent skips the learning phase entirely and executes instantly.

**Three execution strategies, chosen automatically:**

| Strategy | When Used | Speed |
|:---|:---|:---|
| PUBLIC | Fetches data from a public API or URL | Fastest |
| INTERCEPT | Monitors background network requests | Fast |
| UI | Clicks and types on DOM elements directly | Reliable |

### 4. Universal Context Injection

Lattice does not just live in its own sidebar. It injects context directly into ChatGPT, Claude, and Gemini interfaces. When you switch to any of these platforms, Lattice automatically provides your active browsing context, giving the AI persistent memory it never had.

### 5. Agentic Memory System

Every conversation, every command, every result is stored locally in an encrypted vector database (IndexedDB with Gemini embeddings). The agent remembers what you asked last session and uses that context to improve its responses over time.

- Vector-based semantic retrieval using cosine similarity
- Exponential backoff and retry on all API calls
- Optional Firebase sync for cross-device memory

---

## Architecture

```
                    +------------------+
                    |   Side Panel UI  |
                    |  (React + Motion)|
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+         +---------v---------+
     | Chat Completion |         | WebCMD Plan       |
     | (ReAct Agent)   |         | (Strategy Engine)  |
     +--------+--------+         +---------+---------+
              |                             |
              +-------------+---------------+
                            |
                   +--------v--------+
                   | Service Worker  |
                   | (Background)    |
                   +--------+--------+
                            |
              +-------------+---------------+
              |             |               |
     +--------v--+  +------v------+  +-----v-------+
     |  LLM API  |  |   Content   |  |  Agentic    |
     |  Provider  |  |   Script    |  |  Memory     |
     | (Gemini)   |  | (DOM Agent) |  | (Vectors)   |
     +------------+  +-------------+  +-------------+
```

**Stack:**

| Layer | Technology |
|:---|:---|
| Frontend | React 19, Framer Motion |
| Styling | Tailwind CSS, Glassmorphism |
| Graph Engine | React Flow, ELK.js (deterministic layout) |
| Build System | Vite (Manifest V3 optimized) |
| LLM Backend | Gemini API (gemini-3.5-flash) |
| Embeddings | Gemini Embedding API (gemini-embedding-001) |
| Storage | IndexedDB, chrome.storage.local |
| Memory | Custom vector store with cosine similarity |

---

## Installation

Total time: under 3 minutes.

**1. Clone**
```bash
git clone https://github.com/John-Varghese-EH/Lattice.git
cd Lattice
```

**2. Install**
```bash
npm install
```

**3. Build**
```bash
npm run build
```

**4. Load into Chrome**

Open `chrome://extensions`, enable **Developer Mode**, click **Load unpacked**, and select the `dist/` folder.

**5. Configure**

Click the Lattice icon, open Settings, and paste your Gemini API key. Get one free at [aistudio.google.com](https://aistudio.google.com).

---

## Usage

| Action | How |
|:---|:---|
| Open the sidebar | Click the Lattice icon in your toolbar |
| Chat with the agent | Type any question in the input box |
| Execute a command | Type `/cmd` followed by your instruction |
| Toggle agent mode | Click the lightning bolt icon in the input bar |
| View your knowledge graph | Click the Dashboard button |
| Export your research | Use the export button on the dashboard |

---

## What Makes Lattice Different

| Feature | Traditional Extensions | Lattice |
|:---|:---|:---|
| Tab organization | Lists and groups | Spatial knowledge graph |
| AI integration | Copy-paste into chatbots | Autonomous agent with browser control |
| Memory | None | Persistent vector memory across sessions |
| Context | Manual | Auto-injected into ChatGPT, Claude, Gemini |
| Actions | View only | Navigate, click, type, scroll, extract |
| Learning | Static | Learns website structure for instant replay |

---

## Roadmap

- [ ] Firefox and Edge Add-on Store distribution
- [ ] Multi-agent orchestration (parallel agent workers)
- [ ] Cross-device sync via Firebase
- [ ] Plugin system for custom agent skills
- [ ] Voice command interface
- [ ] Screenshot and visual DOM analysis

---

## Contributing

Lattice is open source under GPLv3. Contributions are welcome.

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build

# Load dist/ folder as unpacked extension
```

---

<div align="center">
  <br />
  <img src="public/logo-128.png" alt="Lattice" width="48" />
  <br />
  <br />
  <strong>Lattice</strong>
  <br />
  The browser was built for documents. Lattice rebuilds it for intelligence.
  <br />
  <br />
</div>
