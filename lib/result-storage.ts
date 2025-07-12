// Simple in-memory storage for synthesis results
// In production, this would use Redis or a database

import type { ConsensusAnalysis } from '@/types/ai';

interface StoredResult {
  id: string;
  result: ConsensusAnalysis;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ResultStorage {
  private storage = new Map<string, StoredResult>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired results every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  store(result: ConsensusAnalysis, ttlMinutes: number = 30): string {
    const id = this.generateId();
    const ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
    
    this.storage.set(id, {
      id,
      result,
      timestamp: Date.now(),
      ttl
    });

    console.log(`📦 Stored result ${id} (TTL: ${ttlMinutes}m)`);
    return id;
  }

  retrieve(id: string): ConsensusAnalysis | null {
    const stored = this.storage.get(id);
    
    if (!stored) {
      console.log(`❌ Result ${id} not found`);
      return null;
    }

    // Check if expired
    if (Date.now() - stored.timestamp > stored.ttl) {
      console.log(`⏰ Result ${id} expired`);
      this.storage.delete(id);
      return null;
    }

    console.log(`✅ Retrieved result ${id}`);
    return stored.result;
  }

  delete(id: string): boolean {
    const deleted = this.storage.delete(id);
    if (deleted) {
      console.log(`🗑️ Deleted result ${id}`);
    }
    return deleted;
  }

  private generateId(): string {
    return `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, stored] of this.storage.entries()) {
      if (now - stored.timestamp > stored.ttl) {
        this.storage.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired results`);
    }
  }

  // Get storage stats for monitoring
  getStats(): { count: number; oldestAge: number; newestAge: number } {
    const now = Date.now();
    const timestamps = Array.from(this.storage.values()).map(s => s.timestamp);
    
    return {
      count: this.storage.size,
      oldestAge: timestamps.length > 0 ? now - Math.min(...timestamps) : 0,
      newestAge: timestamps.length > 0 ? now - Math.max(...timestamps) : 0
    };
  }

  // Cleanup method for graceful shutdown
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.storage.clear();
  }
}

export const resultStorage = new ResultStorage();
