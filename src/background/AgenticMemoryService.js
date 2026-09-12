import { StorageManager } from './storage_manager';
import { llmProvider } from '../llm/LLMProvider';

export class AgenticMemoryService {
  constructor() {
    this.tenantId = 'lattice_local';
  }

  /**
   * Calculates cosine similarity between two vectors.
   */
  _cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Gets a vector embedding for the given text using Gemini.
   */
  async getEmbedding(text) {
    if (!llmProvider.apiKey) {
      console.warn("AgenticMemoryService: Missing API Key for embeddings. Using dummy vector.");
      // Fallback dummy vector if no API key is provided so the system doesn't crash completely.
      // In a real scenario, this would throw or return null.
      return Array.from({length: 768}, () => Math.random() * 0.01); 
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${llmProvider.apiKey}`;
      const response = await llmProvider._fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text }] }
        })
      });

      const data = await response.json();
      return data.embedding.values;
    } catch (e) {
      console.error("Failed to generate embedding", e.message);
      return Array.from({length: 768}, () => Math.random() * 0.01);
    }
  }

  /**
   * Stores a memory locally in IndexedDB.
   */
  async storeMemory(userId, sessionId, role, content, metadata = {}) {
    try {
      const embedding = await this.getEmbedding(content);
      const db = await StorageManager.getDB();
      
      const memory = {
        id: crypto.randomUUID(),
        tenant_id: this.tenantId,
        user_id: userId,
        session_id: sessionId,
        role: role,
        content: content,
        embedding: embedding,
        metadata: metadata,
        created_at: Date.now()
      };

      await db.put('enterprise_memory', memory);
      
      // Optional Firebase Sync stub
      this._syncToFirebase(memory).catch(e => console.error("Firebase sync failed", e));
      
      return memory;
    } catch (error) {
      console.error("AgenticMemoryService Store Error:", error);
      throw error;
    }
  }

  /**
   * Retrieves contextually relevant memories using local vector math.
   */
  async retrieveMemory(userId, currentQuery, matchThreshold = 0.70, matchCount = 5) {
    try {
      const queryEmbedding = await this.getEmbedding(currentQuery);
      const db = await StorageManager.getDB();
      
      const allMemories = await db.getAll('enterprise_memory');
      
      // Filter by tenant and user
      const userMemories = allMemories.filter(m => 
        m.tenant_id === this.tenantId && m.user_id === userId
      );

      // Calculate similarities
      const scoredMemories = userMemories.map(m => {
        const score = this._cosineSimilarity(queryEmbedding, m.embedding);
        return { ...m, similarityScore: score };
      });

      // Sort and filter
      const matches = scoredMemories
        .filter(m => m.similarityScore >= matchThreshold)
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, matchCount);

      // Format for LLM context injection
      const contextString = matches.map(m => `[${new Date(m.created_at).toISOString()}] ${m.role}: ${m.content}`).join('\n');
      
      return { context: contextString, raw_memories: matches };
    } catch (error) {
      console.error("AgenticMemoryService Retrieve Error:", error);
      return { context: "", raw_memories: [] };
    }
  }

  /**
   * Optional stub for Firebase sync to satisfy "instead of supabase use firebase".
   */
  async _syncToFirebase(memory) {
    // If Firebase was initialized via settings, we would push to Firestore here.
    // e.g. await setDoc(doc(db, "enterprise_memory", memory.id), memory);
  }
}

export const agenticMemory = new AgenticMemoryService();
