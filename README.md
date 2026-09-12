<div align="center">
  <img src="public/logo-128.png" alt="Lattice Logo" width="128" />
  <h1>Lattice</h1>
  <p><strong>The Spatial Browser Infrastructure for Autonomous AI Agents</strong></p>

  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/license-GPLv3-green.svg?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/build-optimized-success.svg?style=for-the-badge" alt="Build Status" />
</div>

<br />

> Lattice transforms the web browser from a linear document viewer into a context-aware, spatial mind-mapping workspace. It is built to seamlessly bridge human intent with autonomous agentic execution.

## The Paradigm Shift

Traditional web browsing relies on isolated tabs and manual context switching. Users are forced to copy data across windows, losing track of research paths and limiting the potential of AI assistants. 

Lattice introduces a fundamentally new model. It maps your active tabs, search queries, and AI conversations onto an infinite visual canvas. By connecting the dots between your actions, Lattice provides a unified, graph-based memory for both human users and AI sidekicks.

## Core Capabilities

### Spatial Mind-Mapping
Watch your research organize itself in real time. Every tab and chat becomes an interactive node on a highly optimized, glassmorphic canvas. Complex workflows are visualized instantly.

### WebCMD Execution Engine
Equip your AI with a built-in, autonomous browser terminal. WebCMD allows agents to execute multi-step workflows, navigate pages, and extract data directly within your active browser session.

### Universal Context Injection
Lattice seamlessly integrates with industry-leading models like ChatGPT, Claude, and Gemini. It injects context from your active workspace directly into your favorite AI platforms, providing persistent memory across sessions.

### Human-in-the-Loop Security
Enterprise-grade safety is woven into the architecture. The agentic system requires explicit human approval before executing any sensitive actions. Payments, data deletions, and external communications are always under your direct control.

## System Architecture

Lattice is engineered for performance and scalability. The interface features a premium aesthetic utilizing backdrop blur physics, fluid layout animations, and high-density typography. 

**Tech Stack:**
*   **Frontend:** React 19, Tailwind CSS, Framer Motion
*   **Graph Engine:** React Flow, ELK.js (for automated, deterministic node layout)
*   **Build System:** Vite (optimized for Chrome Extension Manifest V3)
*   **Data Layer:** Unified Agentic Memory Service

## Installation Guide

Deploying Lattice to your local environment is straightforward.

**1. Clone the repository:**
```bash
git clone https://github.com/your-org/Lattice.git
cd Lattice
```

**2. Install dependencies:**
```bash
npm install
```

**3. Configure environment variables:**
Duplicate the configuration template and append your API credentials.
```bash
cp .env.example .env
```

**4. Build for production:**
```bash
npm run build
```

**5. Load into Chrome:**
Navigate to `chrome://extensions/`, enable Developer Mode, and select **Load unpacked**. Choose the generated `dist/` directory.

<br />

<div align="center">
  <p>Engineered for the next generation of web workflows.</p>
</div>
