interface QueryCost {
  timestamp: number;
  tier: 'basic' | 'pro';
  models: {
    gemini: number;
    openai: number;
    claude: number;
  };
  synthesis: {
    embeddings?: number;
    gpt4?: number;
  };
  total: number;
  processingTime: number;
}

class CostTracker {
  private costs: QueryCost[] = [];
  
  // Estimated costs per model (in USD)
  private readonly MODEL_COSTS = {
    gemini: 0.01,
    openai: 0.03,
    claude: 0.02,
    embeddings: 0.0001,
    gpt4_synthesis: 0.04
  };
  
  trackQuery(tier: 'basic' | 'pro', processingTime: number): QueryCost {
    const cost: QueryCost = {
      timestamp: Date.now(),
      tier,
      models: {
        gemini: this.MODEL_COSTS.gemini,
        openai: this.MODEL_COSTS.openai,
        claude: this.MODEL_COSTS.claude,
      },
      synthesis: {},
      total: 0,
      processingTime
    };
    
    // Add synthesis costs for Pro tier
    if (tier === 'pro') {
      cost.synthesis.embeddings = this.MODEL_COSTS.embeddings;
      cost.synthesis.gpt4 = this.MODEL_COSTS.gpt4_synthesis;
    }
    
    // Calculate total
    cost.total = Object.values(cost.models).reduce((sum, cost) => sum + cost, 0) +
                 Object.values(cost.synthesis).reduce((sum, cost) => sum + cost, 0);
    
    this.costs.push(cost);
    
    console.log(`💰 Query cost tracked: ${tier} tier = $${cost.total.toFixed(4)} (${processingTime}ms)`);
    
    return cost;
  }
  
  getAverageCost(tier: 'basic' | 'pro', days: number = 7): number {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentCosts = this.costs.filter(c => c.timestamp > cutoff && c.tier === tier);
    
    if (recentCosts.length === 0) return 0;
    
    const total = recentCosts.reduce((sum, cost) => sum + cost.total, 0);
    return total / recentCosts.length;
  }
  
  getAverageProcessingTime(tier: 'basic' | 'pro', days: number = 7): number {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentCosts = this.costs.filter(c => c.timestamp > cutoff && c.tier === tier);
    
    if (recentCosts.length === 0) return 0;
    
    const total = recentCosts.reduce((sum, cost) => sum + cost.processingTime, 0);
    return total / recentCosts.length;
  }
  
  getTotalCosts(days: number = 30): { basic: number; pro: number; total: number } {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentCosts = this.costs.filter(c => c.timestamp > cutoff);
    
    const basicTotal = recentCosts.filter(c => c.tier === 'basic').reduce((sum, c) => sum + c.total, 0);
    const proTotal = recentCosts.filter(c => c.tier === 'pro').reduce((sum, c) => sum + c.total, 0);
    
    return {
      basic: basicTotal,
      pro: proTotal,
      total: basicTotal + proTotal
    };
  }
  
  getPerformanceStats(days: number = 7): {
    basic: { avgCost: number; avgTime: number; count: number };
    pro: { avgCost: number; avgTime: number; count: number };
  } {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentCosts = this.costs.filter(c => c.timestamp > cutoff);
    
    const basicQueries = recentCosts.filter(c => c.tier === 'basic');
    const proQueries = recentCosts.filter(c => c.tier === 'pro');
    
    return {
      basic: {
        avgCost: basicQueries.length > 0 ? basicQueries.reduce((sum, c) => sum + c.total, 0) / basicQueries.length : 0,
        avgTime: basicQueries.length > 0 ? basicQueries.reduce((sum, c) => sum + c.processingTime, 0) / basicQueries.length : 0,
        count: basicQueries.length
      },
      pro: {
        avgCost: proQueries.length > 0 ? proQueries.reduce((sum, c) => sum + c.total, 0) / proQueries.length : 0,
        avgTime: proQueries.length > 0 ? proQueries.reduce((sum, c) => sum + c.processingTime, 0) / proQueries.length : 0,
        count: proQueries.length
      }
    };
  }
  
  exportCostData(): QueryCost[] {
    return [...this.costs];
  }
  
  // Validate Phase 1 success criteria
  validatePhase1Criteria(): {
    sophisticatedSynthesisTime: boolean; // <50 seconds
    costPerQuery: boolean; // <$0.15
    avgCost: number;
    avgTime: number;
  } {
    const stats = this.getPerformanceStats(7);
    const avgTime = stats.pro.avgTime / 1000; // Convert to seconds
    const avgCost = stats.pro.avgCost;
    
    return {
      sophisticatedSynthesisTime: avgTime < 50,
      costPerQuery: avgCost < 0.15,
      avgCost,
      avgTime
    };
  }
}

export const costTracker = new CostTracker();
