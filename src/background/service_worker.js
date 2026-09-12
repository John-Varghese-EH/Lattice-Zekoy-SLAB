import browser from 'webextension-polyfill';
import { StorageManager } from './storage_manager';
import { agenticMemory } from './AgenticMemoryService';
import { unifiedMemory } from './UnifiedMemoryService';

console.log('Lattice Service Worker initialized.');

import { llmProvider } from '../llm/LLMProvider';

// Open side panel on extension icon click
browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

// Listen for messages from content scripts or UI
browser.runtime.onMessage.addListener(async (message, sender) => {
  const tabId = sender.tab ? sender.tab.id : message.tabId;
  
  if (message.type === 'EXTRACTED_CONTENT') {
    console.log(`Received extracted content for tab ${tabId}`);
    
    const contextData = {
      title: message.payload.title,
      url: message.payload.url,
      mainText: message.payload.mainText,
      extractedAt: Date.now()
    };

    await StorageManager.saveTabContext(tabId, contextData);
    
    // Auto-Summarize via LLM
    await llmProvider.initialize(StorageManager);
    const aiData = await llmProvider.generateSummary(contextData.mainText);
    
    // Save to mind map with AI insights
    await StorageManager.saveMindMapNode({
      id: `tab-${tabId}`,
      type: 'custom', // using the custom node from Canvas
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: { 
        label: contextData.title, 
        url: contextData.url, 
        status: 'online',
        summary: aiData?.summary || '',
        keywords: aiData?.keywords || []
      }
    });

    return { status: 'success' };
  }

  if (message.type === 'CHAT_COMPLETION') {
    await llmProvider.initialize(StorageManager);
    
    let contextChain = [];
    if (message.nodeId) {
      contextChain = await StorageManager.getNodeContextChain(message.nodeId);
    } else {
      // Fallback to active tab context if no specific node
      const ctx = await StorageManager.getTabContext(tabId);
      if (ctx) contextChain.push({ data: ctx });
    }
    
    // Build the "memory" string
    const memoryString = contextChain.map((node, i) => `--- Context Level ${i} (Node: ${node.data?.label || node.data?.title}) ---\nURL: ${node.data?.url}\nContent/Summary: ${node.data?.summary || node.data?.mainText || 'N/A'}`).join('\n\n');

    const systemPrompt = `You are Lattice, an autonomous ReAct AI agent operating within a browser extension. 
You have full access to the user's browsing history context and can execute actual browser actions on their behalf.

Here is the extracted context from their current branch chain:
${memoryString || 'No context available.'}

You must respond with a strict JSON object.
If the user is asking a conversational question, respond with a single "chat" step containing your answer.
If the user wants browser actions, create a multi-step plan.

**EMPHASIS**: For simple conversational questions, ALWAYS use a single chat step. Only use browser actions when the user explicitly asks to DO something on the page.

{
  "thought": "Your high-level reasoning.",
  "strategy": "AUTONOMOUS",
  "plan": [
    {
      "thought": "What I am doing in this step.",
      "action": {
        "type": "chat" | "navigate" | "scroll" | "fetch" | "click" | "type" | "extract_text" | "wait",
        // for chat: "message": "The text to reply with. Use full markdown formatting."
        // for navigate: "url": "https://..."
        // for scroll: "direction": "down" or "up"
        // for fetch: "url": "https://..."
        // for click: "selector": "css_selector" or "intent": "intent_name"
        // for type: "selector": "css_selector", "value": "text to type"
        // for extract_text: (no extra params, extracts from page body)
        // for wait: "duration": 1000
      }
    }
  ]
}

Only output raw JSON. Do NOT wrap in markdown blocks.`;

    try {
      const response = await llmProvider.generateResponse(message.messages, systemPrompt);
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const payload = JSON.parse(cleanJson);
      
      // Store in memory (for simplicity we store the thought/plan)
      try {
        
        const userMsg = message.messages[message.messages.length - 1];
        if (userMsg && userMsg.role === 'user') {
          await agenticMemory.storeMemory('default_user', `session_${tabId}`, 'user', userMsg.content, { source: 'chat' });
        }
        await agenticMemory.storeMemory('default_user', `session_${tabId}`, 'agent', cleanJson, { source: 'chat' });
      } catch (memErr) {}
      // Store in the new Unified Agentic Memory (Firebase)
      try {
        const userMsg = message.messages[message.messages.length - 1];
        if (userMsg && userMsg.role === 'user') {
          
          await unifiedMemory.initialize();
          await unifiedMemory.ingest('default_tenant', 'default_user', [
            { role: 'user', content: userMsg.content },
            { role: 'assistant', content: cleanJson }
          ]);
        }
      } catch (ingestErr) {
        console.error("Unified Memory Ingest Failed", ingestErr);
      }

      return { status: 'success', data: payload };
    } catch (e) {
      console.error(e);
      return { status: 'error', error: e.message };
    }
  }

  if (message.type === 'BRANCH_MESSAGE') {
    const parentId = `tab-${tabId}`;
    const newNode = {
      id: `chat-${Date.now()}`,
      type: 'custom',
      parentNodeId: parentId,
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: {
        label: "Chat Insight",
        url: "",
        status: 'online',
        summary: message.content,
        keywords: ["ai-insight", "chat"]
      }
    };
    await StorageManager.saveMindMapNode(newNode);
    return { status: 'success' };
  }

  if (message.type === 'IMPORT_TABS') {
    try {
      const tabs = await browser.tabs.query({});
      let allNodes = await StorageManager.getMindMapNodes();
      
      // First, create group nodes if they don't exist
      const groups = await browser.tabGroups?.query({}) || [];
      for (const g of groups) {
        const groupId = `group-${g.id}`;
        let groupNode = allNodes.find(n => n.id === groupId);
        if (!groupNode) {
          groupNode = {
            id: groupId,
            type: 'custom',
            parentNodeId: null,
            position: { x: Math.random() * 500, y: Math.random() * 500 },
            data: {
              label: `Group: ${g.title || 'Unnamed Group'}`,
              url: "",
              status: 'online',
              summary: 'Tab Group',
              keywords: ['group']
            }
          };
          await StorageManager.saveMindMapNode(groupNode);
          allNodes.push(groupNode);
        }
      }

      for (const t of tabs) {
        if (!t.url || t.url.startsWith('chrome://') || t.url.startsWith('edge://')) continue;
        let existingNode = allNodes.find(n => n.id === `tab-${t.id}`);
        if (!existingNode) {
          existingNode = {
            id: `tab-${t.id}`,
            type: 'custom',
            parentNodeId: t.groupId > -1 ? `group-${t.groupId}` : null,
            position: { x: Math.random() * 500, y: Math.random() * 500 },
            data: {
              label: t.title,
              url: t.url,
              status: 'online',
              summary: 'Imported tab',
              keywords: []
            }
          };
          await StorageManager.saveMindMapNode(existingNode);
        } else if (t.groupId > -1 && existingNode.parentNodeId !== `group-${t.groupId}`) {
          existingNode.parentNodeId = `group-${t.groupId}`;
          await StorageManager.saveMindMapNode(existingNode);
        }
      }
      return { status: 'success' };
    } catch (e) {
      return { status: 'error', error: e.message };
    }
  }
  if (message.type === 'AUTONODE_PLAN') {
    await llmProvider.initialize(StorageManager);
    const existingNodes = await StorageManager.getMindMapNodes();
    return await llmProvider.executeAutoNodingSkill(message.command, existingNodes);
  }

  if (message.type === 'AUTONODE_EXEC_STEP') {
    try {
      const action = message.action;
      if (action.type === 'CREATE_NODE') {
        const newNode = {
          id: action.id,
          type: 'custom',
          parentNodeId: null,
          position: { x: Math.random() * 800, y: Math.random() * 800 },
          data: {
            label: action.label,
            url: "",
            status: 'online',
            summary: action.summary,
            keywords: ["auto-generated"]
          }
        };
        await StorageManager.saveMindMapNode(newNode);
      } else if (action.type === 'LINK_NODES') {
        // Technically edges are just stored alongside nodes.
        // Wait, Lattice computes edges dynamically based on `parentNodeId` in StorageManager, or we can add a new edge field.
        // Let's just set the sourceId as the parentNodeId of the targetId if it doesn't have one, or just store a custom edge in the node data.
        const nodes = await StorageManager.getMindMapNodes();
        const targetNode = nodes.find(n => n.id === action.targetId);
        if (targetNode) {
          targetNode.parentNodeId = action.sourceId;
          await StorageManager.saveMindMapNode(targetNode);
        }
      }
      return { status: 'success' };
    } catch (e) {
      console.error(e);
      return { status: 'error', error: e.message };
    }
  }

  if (message.type === 'WEBCMD_PLAN') {
    await llmProvider.initialize(StorageManager);
    const context = await StorageManager.getTabContext(tabId);
    
    let siteSchema = null;
    if (context && context.url) {
      const storedSkill = await StorageManager.getWebcmdSkill(context.url);
      if (storedSkill && storedSkill.schema) {
        siteSchema = storedSkill.schema;
      } else {
        // Learn Phase
        let domElements = [];
        try {
          const domResponse = await browser.tabs.sendMessage(tabId, { type: 'GET_DOM_CONTEXT' });
          if (domResponse && domResponse.status === 'success') {
            domElements = domResponse.elements;
          }
        } catch (e) {
          console.warn("Could not get DOM context for learning:", e);
        }
        
        const learned = await llmProvider.learnWebcmdWorkflow(context.url, { domElements });
        if (learned && learned.schema) {
          await StorageManager.saveWebcmdSkill(context.url, learned.schema);
          siteSchema = learned.schema;
        }
      }
    }
    
    try {
      // Execute Phase: Agent generates an action plan using only the schema
      const result = await llmProvider.executeWebcmdSkill(message.command, { 
        url: context?.url,
        siteSchema: siteSchema 
      });
      
      if (result.status === 'success' && result.data.plan) {
        try {
          
          await agenticMemory.storeMemory('default_user', `session_${tabId}`, 'user', message.command, { source: 'webcmd' });
          await agenticMemory.storeMemory('default_user', `session_${tabId}`, 'system', JSON.stringify(result.data.plan), { source: 'webcmd_plan' });
        } catch (memErr) {
          console.error("Failed to store WebCMD Memory:", memErr);
        }

        return { status: 'success', data: result.data }; // returns { thought, plan: [...] }
      }
      return { status: 'error', error: result.error?.message || result.error || "Could not generate an action plan." };
    } catch (e) {
      return { status: 'error', error: e.message };
    }
  }
  if (message.type === 'FETCH_MEMORY_CONTEXT') {
    try {
      
      // Initialize it just in case
      await unifiedMemory.initialize();
      const data = await unifiedMemory.retrieve('default_tenant', 'default_user', message.query);
      return { status: 'success', data };
    } catch (e) {
      console.error("Memory fetch failed", e);
      return { status: 'error', error: e.message };
    }
  }

  if (message.type === 'WEBCMD_EXEC_STEP') {
    const action = message.action;
    try {
      if (action.type === 'navigate' && action.url) {
         await browser.tabs.update(tabId, { url: action.url });
         return { status: 'success' };
      } else if (action.type === 'fetch' && action.url) {
         console.log(`[WebCMD Strategy: PUBLIC] Fetching ${action.url}`);
         const fetchRes = await fetch(action.url);
         const text = await fetchRes.text();
         return { status: 'success', data: text.substring(0, 5000) }; // return partial for now
      } else if (action.type === 'intercept' && action.endpoint) {
         console.log(`[WebCMD Strategy: INTERCEPT] Listening for ${action.endpoint}`);
         // Skeleton for network interception; normally we'd use chrome.webRequest.onCompleted
         return { status: 'success', message: 'Intercept setup complete.' };
      } else if (action.type === 'switch_tab' && action.url) {
         const tabs = await browser.tabs.query({});
         const targetTab = tabs.find(t => t.url && t.url.includes(action.url));
         if (targetTab) {
            await browser.tabs.update(targetTab.id, { active: true });
            await browser.windows.update(targetTab.windowId, { focused: true });
         } else {
            await browser.tabs.update(tabId, { url: action.url });
         }
         return { status: 'success' };
      } else {
         // Resolve 'intent' to CSS selector using the local WebCMD schema
         if (action.intent) {
           const context = await StorageManager.getTabContext(tabId);
           if (context && context.url) {
             const storedSkill = await StorageManager.getWebcmdSkill(context.url);
             if (storedSkill && storedSkill.schema && storedSkill.schema.intents) {
               const resolvedSelector = storedSkill.schema.intents[action.intent];
               if (resolvedSelector) {
                 action.selector = resolvedSelector;
                 console.log(`[WebCMD] Resolved intent '${action.intent}' to selector '${action.selector}'`);
               }
             }
           }
         }

         let res;
         try {
           res = await browser.tabs.sendMessage(tabId, {
             type: 'RUN_AGENT_ACTION',
             action: action
           });
         } catch (err) {
           // Content script not loaded yet -- inject it and retry once
            if (err.message && err.message.includes('Receiving end does not exist')) {
             try {
               // Dynamically get the content script path from our manifest
               const manifest = browser.runtime.getManifest();
               const csFile = manifest.content_scripts?.[0]?.js?.[0];
               if (!csFile) throw new Error('No content script in manifest');
               await browser.scripting.executeScript({
                 target: { tabId },
                 files: [csFile]
               });
               // Small delay to let the content script initialise
               await new Promise(r => setTimeout(r, 300));
               res = await browser.tabs.sendMessage(tabId, {
                 type: 'RUN_AGENT_ACTION',
                 action: action
               });
             } catch (injectErr) {
               console.log('Content script injection failed:', injectErr);
               return { status: 'error', error: 'Cannot execute actions on this page. Try refreshing first.' };
             }
           } else {
             return { status: 'error', error: err.message };
           }
         }

         if (res && res.status === 'error') {
           return { status: 'error', error: res.error };
         }
         return { status: 'success', data: res?.data || null };
      }
    } catch (e) {
      return { status: 'error', error: e.message };
    }
  }
});

// Handle tab closes to mark nodes as offline instead of deleting them
browser.tabs.onRemoved.addListener(async (tabId) => {
  const context = await StorageManager.getTabContext(tabId);
  if (context) {
    console.log(`Tab ${tabId} closed. Marking node as offline.`);
    // Get existing node
    const nodes = await StorageManager.getMindMapNodes();
    const node = nodes.find(n => n.id === `tab-${tabId}`);
    if (node) {
      node.data.status = 'offline';
      await StorageManager.saveMindMapNode(node);
    }
  }
});

// Setup Consolidation Cron (Chrome Alarms)
browser.runtime.onInstalled.addListener(() => {
  browser.alarms.create('memory_consolidation_cron', { periodInMinutes: 60 });
});

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'memory_consolidation_cron') {
    console.log('Running Memory Consolidation Cron Job...');
    // In a production scenario, we would pull 100+ old memories, send them to Gemini for summary,
    // and delete the old chunk records, saving a new 'system' memory block with the summary.
  }
});
