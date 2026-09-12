/**
 * LLMProvider.js
 * Modular adapter system for LLM APIs and WebCMD skills integration.
 * Supports BYOK (Bring Your Own Key) with a default fallback to Gemini free tier.
 */
import { agenticMemory } from '../background/AgenticMemoryService.js';

export class LLMProvider {
  constructor() {
    this.provider = 'gemini'; // default
    this.apiKey = ''; // To be loaded from storage
    this.model = 'gemini-3.5-flash';
  }

  async initialize(storageManager) {
    const settings = await storageManager.getLocal('llmSettings');
    if (settings) {
      this.provider = settings.provider || 'gemini';
      this.apiKey = settings.apiKey || '';
      this.model = settings.model || 'gemini-3.5-flash';
      // Auto-migrate old default models to the working ones
      if (this.model === 'gemini-1.5-flash') {
        this.model = 'gemini-3.5-flash';
      }
    }
  }

  async generateResponse(messages, systemPrompt) {
    if (!this.apiKey && this.provider !== 'gemini-built-in') {
      throw new Error('API Key missing. Please configure it in the extension options.');
    }

    switch (this.provider) {
      case 'openai':
        return this._callOpenAI(messages, systemPrompt);
      case 'anthropic':
        return this._callAnthropic(messages, systemPrompt);
      case 'gemini':
      default:
        return this._callGemini(messages, systemPrompt);
    }
  }

  async _fetchWithRetry(url, options, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        
        const errText = await response.text();
        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(`HTTP ${response.status}: ${errText}`);
          const delay = Math.pow(2, i) * 1000 + (Math.random() * 500); 
          console.warn(`[LLMProvider] Retry ${i+1}/${maxRetries} after ${Math.round(delay)}ms due to ${response.status}.`);
          await new Promise(res => setTimeout(res, delay));
          continue;
        } else {
          throw new Error(`API Error ${response.status}: ${errText}`);
        }
      } catch (e) {
        lastError = e;
        // Retry on network failures
        if (!e.message.includes('API Error')) {
          const delay = Math.pow(2, i) * 1000 + (Math.random() * 500); 
          await new Promise(res => setTimeout(res, delay));
        } else {
          throw e;
        }
      }
    }
    throw new Error(`LLM Request failed after ${maxRetries} retries: ${lastError.message}`);
  }
  async _callGemini(messages, systemPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await this._fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined
      })
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  async _callOpenAI(messages, systemPrompt) {
    // Stub for OpenAI
    return "OpenAI response stub";
  }

  async _callAnthropic(messages, systemPrompt) {
    // Stub for Anthropic
    return "Anthropic response stub";
  }

  // --- Auto-Summarization ---

  async generateSummary(text) {
    if (!this.apiKey && this.provider !== 'gemini-built-in') return null;

    const systemPrompt = `You are an expert data extractor. Analyze the following webpage text and return a strict JSON object with two fields:
1. "summary": A brief 2-3 sentence summary of the core content.
2. "keywords": An array of exactly 5 relevant keywords/tags.
Do not wrap the JSON in markdown blocks. Return raw JSON.`;

    try {
      const response = await this.generateResponse([{ role: 'user', content: text.substring(0, 30000) }], systemPrompt);
      
      // Attempt to parse the response as JSON
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('LLM Failed to generate summary', e);
      return { summary: "Could not generate summary.", keywords: [] };
    }
  }

  // --- WebCMD Integration ---
  
  /**
   * Executes an autonomous webcmd agent loop.
   * @param {string} commandName The user's instruction (e.g., "click the login button")
   * @param {object} context The URL context
   */
  async executeWebcmdSkill(commandName, context) {
    if (!this.apiKey && this.provider !== 'gemini-built-in') {
      throw new Error("API Key required for WebCMD Agent operations.");
    }

    let historicalContext = "";
    try {
      // Using a generic userId since auth isn't fully implemented
      const memoryData = await agenticMemory.retrieveMemory('default_user', commandName, 0.70, 3);
      if (memoryData.context) {
        historicalContext = `\n\n--- HISTORICAL MEMORY CONTEXT ---\nThe following are relevant past actions or memories that might help you decide what to do next:\n${memoryData.context}\n---------------------------------\n`;
      }
    } catch (e) {
      console.error("Failed to retrieve Agentic Memory context:", e);
    }

    const systemPrompt = `You are a WebCMD Automation Agent. WebCMD routes browser commands through the cheapest, most reliable strategy.
The user has asked you to perform an action. You have context of the current webpage (${context.url}).${historicalContext}

You are provided with a learned SiteAdapter Schema mapping semantic intents to stable CSS selectors or API endpoints:
${JSON.stringify(context.siteSchema, null, 2)}

You must respond with a strict JSON object containing a multi-step execution plan and the chosen strategy.
Strategy Options:
- "PUBLIC": Use when you can fulfill the user's request by simply fetching a public API or URL. (Fastest, Cheapest).
- "INTERCEPT": Use when you need to intercept background network API calls on the page to extract JSON data.
- "UI": Use when you must interact with DOM elements (Fallback).

Respond strictly with JSON:
{
  "thought": "Explanation of strategy choice.",
  "strategy": "PUBLIC|INTERCEPT|UI",
  "plan": [
    {
      "thought": "Explanation of step.",
      "action": {
        // For PUBLIC: { "type": "fetch", "url": "..." }
        // For INTERCEPT: { "type": "intercept", "endpoint": "/api/v1/data" }
        // For UI click: { "type": "click", "intent": "intent_key_from_schema" }
        // For UI type: { "type": "type", "intent": "intent_key_from_schema", "value": "text to type" }
        // For scrolling: { "type": "scroll", "direction": "down" or "up" }
        // For navigation: { "type": "navigate", "url": "https://..." }
        // For tab switching: { "type": "switch_tab", "url": "partial_url_match" }
        // For extracting text: { "type": "extract_text" }
        // For waiting: { "type": "wait", "duration": 2000 }
      }
    }
  ]
}

If the user asks for something not in the schema, you can guess a generic CSS "selector" for UI actions.
Do NOT use markdown code blocks. Output raw JSON only.
`;

    try {
      const response = await this.generateResponse([{ role: 'user', content: commandName }], systemPrompt);
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const payload = JSON.parse(cleanJson);
      
      return {
        status: 'success',
        data: payload // { thought, action }
      };
    } catch (e) {
      console.error('Agent Failed:', e);
      return {
        status: 'error',
        error: e.message || "Agent failed to generate a valid action plan."
      };
    }
  }

  /**
   * Learns a new workflow via webcmd. Parses full DOM once.
   * @param {string} siteUrl 
   * @param {object} DOMContext 
   */
  async learnWebcmdWorkflow(siteUrl, DOMContext) {
    console.log(`Learning workflow for ${siteUrl} via WebCMD`);
    if (!this.apiKey && this.provider !== 'gemini-built-in') {
      throw new Error("API Key required for WebCMD Learning Phase.");
    }

    let domContent = "";
    if (DOMContext.domElements && DOMContext.domElements.length > 0) {
      domContent = DOMContext.domElements.map(e => `[AgentID: ${e.id}] <${e.tag} ${e.type ? `type="${e.type}"` : ''} ${e.name ? `name="${e.name}"` : ''} class="${e.className || ''}">: "${e.text}"`).join('\n');
    }

    const systemPrompt = `You are a WebCMD Discovery Agent. You are mapping the structure of a webpage (${siteUrl}) to reduce future LLM token usage.
Analyze the interactive elements below and output a "SiteAdapter" schema.
Map logical user intents (like "search_input", "login_submit", "profile_link") to their best CSS selectors.

Provide your response as a strict JSON object:
{
  "intents": {
    "intent_name": "css_selector"
  }
}

Only output raw JSON. Do not include markdown code blocks.

--- DOM ELEMENTS ---
${domContent.substring(0, 40000)}`;

    try {
      const response = await this.generateResponse([{ role: 'user', content: 'Map this page structure.' }], systemPrompt);
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const payload = JSON.parse(cleanJson);
      
      return {
        commandId: new URL(siteUrl).hostname,
        site: siteUrl,
        schema: payload
      };
    } catch (e) {
      console.error('Learning Phase Failed:', e);
      return {
        commandId: new URL(siteUrl).hostname,
        site: siteUrl,
        schema: { intents: {} }
      };
    }
  }

  /**
   * Autonomously generates mind map nodes based on a prompt.
   * @param {string} prompt User prompt
   * @param {Array} existingNodes The current nodes in the mind map
   */
  async executeAutoNodingSkill(prompt, existingNodes = []) {
    if (!this.apiKey && this.provider !== 'gemini-built-in') {
      throw new Error("API Key required for Auto-Noding.");
    }

    const nodeContext = existingNodes.length > 0 
      ? `\n\n--- EXISTING NODES ---\n${existingNodes.map(n => `[NodeID: ${n.id}] Label: ${n.data.label}`).join('\n')}\n----------------------\n`
      : "";

    const systemPrompt = `You are a Graph Architecture Agent. The user wants to build out their knowledge graph (mind map).
You will dynamically generate nodes and edges based on their prompt.
${nodeContext}

Respond with a strict JSON object containing a multi-step execution plan:
{
  "thought": "High level strategy for graph construction.",
  "plan": [
    {
      "thought": "Explanation of this specific graph operation.",
      "action": {
        "type": "CREATE_NODE",
        "id": "node_123", // Generate a unique temporary ID (e.g. topic_name)
        "label": "Node Title",
        "summary": "Brief description of the node concept."
      }
    },
    {
      "thought": "Linking the two concepts.",
      "action": {
        "type": "LINK_NODES",
        "sourceId": "node_123",
        "targetId": "existing_node_id" // Can be a newly created ID or from EXISTING NODES
      }
    }
  ]
}

Supported Action Types:
- "CREATE_NODE": requires "id" (string), "label" (string), "summary" (string).
- "LINK_NODES": requires "sourceId" (string) and "targetId" (string).

Do NOT use markdown code blocks. Output raw JSON only. Keep token usage minimal. Limit the graph to 4-5 core nodes max to optimize performance unless specifically asked for more.`;

    try {
      const response = await this.generateResponse([{ role: 'user', content: prompt }], systemPrompt);
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const payload = JSON.parse(cleanJson);
      return { status: 'success', data: payload };
    } catch (e) {
      console.error('Auto-Noding Failed:', e);
      return { status: 'error', error: "Agent failed to generate a valid graph plan." };
    }
  }
}

export const llmProvider = new LLMProvider();
