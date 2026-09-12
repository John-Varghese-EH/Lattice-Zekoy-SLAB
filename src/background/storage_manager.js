import { openDB } from 'idb';
import browser from 'webextension-polyfill';

const DB_NAME = 'LatticeDB';
const DB_VERSION = 2;

/**
 * Initializes the IndexedDB for storing complex data structures.
 */
async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('chatHistory')) {
        db.createObjectStore('chatHistory', { keyPath: 'tabId' });
      }
      if (!db.objectStoreNames.contains('mindMap')) {
        db.createObjectStore('mindMap', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('mindMapEdges')) {
        db.createObjectStore('mindMapEdges', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('webcmdSkills')) {
        db.createObjectStore('webcmdSkills', { keyPath: 'commandId' });
      }
      if (!db.objectStoreNames.contains('enterprise_memory')) {
        const memoryStore = db.createObjectStore('enterprise_memory', { keyPath: 'id' });
        memoryStore.createIndex('tenant_user', ['tenant_id', 'user_id']);
      }
    },
  });
}

const dbPromise = initDB();

export const StorageManager = {
  // --- Lightweight Settings & Tab Registry (browser.storage.local) ---
  
  async getLocal(key) {
    const result = await browser.storage.local.get(key);
    return result[key];
  },
  
  async setLocal(key, value) {
    await browser.storage.local.set({ [key]: value });
  },

  async getTabContext(tabId) {
    const registry = await this.getLocal('tabRegistry') || {};
    return registry[tabId] || null;
  },

  async saveTabContext(tabId, contextData) {
    const registry = await this.getLocal('tabRegistry') || {};
    registry[tabId] = contextData;
    await this.setLocal('tabRegistry', registry);
  },

  async removeTabContext(tabId) {
    const registry = await this.getLocal('tabRegistry') || {};
    delete registry[tabId];
    await this.setLocal('tabRegistry', registry);
  },

  // --- Heavy Data (IndexedDB via idb) ---

  async saveChatHistory(tabId, messages) {
    const db = await dbPromise;
    await db.put('chatHistory', { tabId, messages, updatedAt: Date.now() });
  },

  async getChatHistory(tabId) {
    const db = await dbPromise;
    const result = await db.get('chatHistory', tabId);
    return result ? result.messages : [];
  },

  async saveMindMapNode(node) {
    const db = await dbPromise;
    
    // Auto-assign nodeNumber if new
    if (node.nodeNumber === undefined) {
      const allNodes = await db.getAll('mindMap');
      const maxNum = allNodes.reduce((max, n) => (n.nodeNumber > max ? n.nodeNumber : max), -1);
      node.nodeNumber = maxNum + 1;
    }
    
    // Ensure default fields
    node.type = node.type || 'tab';
    node.parentNodeId = node.parentNodeId || null;
    node.createdAt = node.createdAt || Date.now();
    
    await db.put('mindMap', node);
    return node;
  },

  async getMindMapNodes() {
    const db = await dbPromise;
    return await db.getAll('mindMap');
  },

  async saveMindMapEdge(edge) {
    const db = await dbPromise;
    await db.put('mindMapEdges', edge);
    return edge;
  },

  async getMindMapEdges() {
    const db = await dbPromise;
    return await db.getAll('mindMapEdges');
  },

  async getNodeContextChain(nodeId) {
    const db = await dbPromise;
    const chain = [];
    let currentId = nodeId;
    
    // Trace up to 10 levels deep to prevent infinite loops
    let depth = 0;
    while (currentId && depth < 10) {
      const node = await db.get('mindMap', currentId);
      if (!node) break;
      chain.unshift(node); // Put older context at the beginning
      currentId = node.parentNodeId;
      depth++;
    }
    return chain;
  },

  // --- Utility ---
  async getDB() {
    return await dbPromise;
  },

  // --- WebCMD Memory ---
  async saveWebcmdSkill(siteUrl, schema) {
    const db = await dbPromise;
    const hostname = new URL(siteUrl).hostname;
    await db.put('webcmdSkills', { commandId: hostname, site: hostname, schema, updatedAt: Date.now() });
  },

  async getWebcmdSkill(siteUrl) {
    const db = await dbPromise;
    try {
      const hostname = new URL(siteUrl).hostname;
      return await db.get('webcmdSkills', hostname);
    } catch {
      return null;
    }
  }
};
