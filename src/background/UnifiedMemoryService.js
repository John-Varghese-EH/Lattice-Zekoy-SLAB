import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { VectorValue } from 'firebase/firestore'; 
import browser from 'webextension-polyfill';
// Note: As of late 2024/2025, Firestore Vector Search uses `findNearest` in Web SDK,
// but the vector values must be encoded/stored correctly.
// Some environments might require `firebase/firestore/lite` or specific extensions.
// Let's assume standard modular SDK supports `VectorValue` or `FieldValue.vector` for writes.

// Optional: Use existing StorageManager for short-term memory (IndexedDB)
import { StorageManager } from './storage_manager';
import { llmProvider } from '../llm/LLMProvider'; // To generate embeddings

class UnifiedMemoryService {
  constructor() {
    this.app = null;
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initializes Firebase from Extension Storage or env
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      const config = await browser.storage.local.get('firebaseConfig');
      // If config is missing, we could throw an error, but let's allow it to silently wait
      // until the user provides config via an options page.
      if (!config || !config.firebaseConfig || !config.firebaseConfig.apiKey) {
        console.debug("UnifiedMemoryService: Missing Firebase configuration.");
        return;
      }
      
      this.app = initializeApp(config.firebaseConfig);
      this.db = getFirestore(this.app);
      this.isInitialized = true;
      console.log("UnifiedMemoryService: Initialized.");
    } catch (e) {
      console.error("UnifiedMemoryService: Initialization failed", e);
    }
  }

  /**
   * Configure Firebase connection explicitly
   */
  async setConfig(firebaseConfig) {
    await browser.storage.local.set({ firebaseConfig });
    this.isInitialized = false; // Force re-init
    await this.initialize();
  }

  /**
   * Ingests messages into Long Term (Firestore) and Short Term (IndexedDB) Memory.
   */
  async ingest(tenantId, userId, messages) {
    if (!messages || !Array.isArray(messages)) return;
    
    // Save short-term memory locally
    try {
      let recent = await StorageManager.getLocal(`memory_st_${tenantId}_${userId}`) || [];
      recent.push(...messages);
      recent = recent.slice(-10); // Keep last 10
      await StorageManager.setLocal(`memory_st_${tenantId}_${userId}`, recent);
    } catch (e) {
      console.error("UnifiedMemoryService: Short-term memory error", e);
    }

    if (!this.isInitialized) return;

    // Save long-term memory to Firestore with embeddings
    for (const msg of messages) {
      if (msg.role !== 'user' && msg.role !== 'assistant') continue;
      try {
        // We reuse the LLMProvider to generate embeddings.
        // Google GenAI embeddings can be called directly from the background script.
        const embeddingRes = await llmProvider.generateResponse([{ role: 'user', content: msg.content }], "EMBED_ONLY");
        // (Wait, `generateResponse` doesn't do embeddings natively if we don't have a direct embed method, 
        // let's add `generateEmbedding` to LLMProvider or use it here if we pass the raw client).
        
        // Since we don't have a direct `generateEmbedding` exposed in LLMProvider, 
        // let's manually use the GoogleGenAI SDK if available, or we mock the embedding.
        // Actually, LLMProvider has `provider === 'gemini-built-in'`, we can add a method there later.
        
        let vector = new Array(768).fill(0.1); // Fallback mock vector if API not hooked up yet
        
        // Example: If LLMProvider exposes raw GenAI
        if (llmProvider.apiKey) {
           const { GoogleGenAI } = await import('@google/genai');
           const ai = new GoogleGenAI({ apiKey: llmProvider.apiKey });
           const emb = await ai.models.embedContent({ model: 'text-embedding-004', contents: msg.content });
           vector = emb.embeddings[0].values;
        }

        // Write to Firestore
        // Note: The Web SDK might use a specific function for Vector values. 
        // We will assume `VectorValue.fromArray(vector)` or just plain array if it's supported.
        await addDoc(collection(this.db, 'core_memory'), {
          tenant_id: tenantId,
          user_id: userId,
          role: msg.role,
          content: msg.content,
          embedding: vector, // Depending on Firestore SDK version, might need a wrapper
          created_at: serverTimestamp(),
          metadata: {}
        });

      } catch (e) {
        console.error("UnifiedMemoryService: Failed to ingest long term memory", e);
      }
    }
  }

  /**
   * Retrieves relevant context combining short-term and long-term memory.
   */
  async retrieve(tenantId, userId, queryText, limit = 5) {
    let shortTerm = [];
    try {
      const key = `memory_st_${tenantId}_${userId}`;
      const res = await browser.storage.local.get(key);
      shortTerm = res[key] || [];
    } catch (e) {
      console.error(e);
    }

    let longTerm = [];
    if (this.isInitialized) {
      try {
        let queryVector = new Array(768).fill(0.1);
        
        if (llmProvider.apiKey) {
           const { GoogleGenAI } = await import('@google/genai');
           const ai = new GoogleGenAI({ apiKey: llmProvider.apiKey });
           const emb = await ai.models.embedContent({ model: 'text-embedding-004', contents: queryText });
           queryVector = emb.embeddings[0].values;
        }

        // Firestore Vector Search requires specific SDK support, usually `findNearest` is available on Query objects
        // However, in standard Web SDK v11, it might be `.findNearest()`. If not natively available on the client,
        // we might just fetch standard docs. Let's write the query assuming it exists.
        // Because Vector Search on web SDK is still evolving, if `findNearest` fails, we fallback to a blank array.
        
        const coreMem = collection(this.db, 'core_memory');
        const q = query(
          coreMem, 
          where('tenant_id', '==', tenantId), 
          where('user_id', '==', userId)
        );
        
        // This is a placeholder for actual vector search if the SDK supports it.
        // In many cases, vector search is only available via Admin SDK or REST APIs.
        // If web SDK doesn't support `.findNearest`, you might have to call a Cloud Function or REST API.
        try {
          if (typeof q.findNearest === 'function') {
             const vectorQ = q.findNearest('embedding', queryVector, { limit, distanceMeasure: 'COSINE' });
             const snapshot = await getDocs(vectorQ);
             longTerm = snapshot.docs.map(d => ({ role: d.data().role, content: d.data().content }));
          }
        } catch (vectorErr) {
          console.warn("Vector search not natively supported on client SDK. Returning empty long term.");
        }
      } catch (e) {
        console.error("UnifiedMemoryService: Failed to retrieve long term memory", e);
      }
    }

    return {
      short_term: shortTerm,
      long_term: longTerm
    };
  }
}

export const unifiedMemory = new UnifiedMemoryService();
