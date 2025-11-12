import { persistentCostTracker } from '@/lib/persistent-cost-tracking'
import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()

// Test data file path
const testDataFile = join(process.cwd(), 'test-cost-tracking-data.json')

describe('Persistent Cost Tracker', () => {
  beforeEach(() => {
    // Clear existing data
    persistentCostTracker['costs'] = []
    
    // Clean up test file if it exists
    if (existsSync(testDataFile)) {
      unlinkSync(testDataFile)
    }
    
    mockConsoleLog.mockClear()
    mockConsoleError.mockClear()
  })

  afterEach(() => {
    // Clean up test file
    if (existsSync(testDataFile)) {
      unlinkSync(testDataFile)
    }
  })

  afterAll(() => {
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
  })

  describe('trackQuery()', () => {
    it('should track basic tier query', () => {
      const processingTime = 5000
      const cost = persistentCostTracker.trackQuery('basic', processingTime)
      
      expect(cost.tier).toBe('basic')
      expect(cost.processingTime).toBe(processingTime)
      expect(cost.models.gemini).toBe(0.01)
      expect(cost.models.openai).toBe(0.03)
      expect(cost.models.claude).toBe(0.02)
      expect(cost.synthesis).toEqual({})
      expect(cost.total).toBe(0.06) // 0.01 + 0.03 + 0.02
      expect(cost.timestamp).toBeGreaterThan(0)
    })

    it('should track pro tier query with synthesis costs', () => {
      const processingTime = 10000
      const cost = persistentCostTracker.trackQuery('pro', processingTime)
      
      expect(cost.tier).toBe('pro')
      expect(cost.processingTime).toBe(processingTime)
      expect(cost.models.gemini).toBe(0.01)
      expect(cost.models.openai).toBe(0.03)
      expect(cost.models.claude).toBe(0.02)
      expect(cost.synthesis.embeddings).toBe(0.0001)
      expect(cost.synthesis.gpt4).toBe(0.04)
      expect(cost.total).toBe(0.1001) // 0.01 + 0.03 + 0.02 + 0.0001 + 0.04
    })

    it('should log cost tracking', () => {
      persistentCostTracker.trackQuery('basic', 5000)
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('💰 Query cost tracked: basic tier = $0.0600 (5000ms)')
      )
    })
  })

  describe('getAverageCost()', () => {
    it('should return 0 for no data', () => {
      const avgCost = persistentCostTracker.getAverageCost('basic')
      expect(avgCost).toBe(0)
    })

    it('should calculate average cost correctly', () => {
      persistentCostTracker.trackQuery('basic', 1000)
      persistentCostTracker.trackQuery('basic', 2000)
      
      const avgCost = persistentCostTracker.getAverageCost('basic')
      expect(avgCost).toBe(0.06)
    })

    it('should filter by tier', () => {
      persistentCostTracker.trackQuery('basic', 1000)
      persistentCostTracker.trackQuery('pro', 2000)
      
      const basicAvg = persistentCostTracker.getAverageCost('basic')
      const proAvg = persistentCostTracker.getAverageCost('pro')
      
      expect(basicAvg).toBe(0.06)
      expect(proAvg).toBe(0.1001)
    })
  })

  describe('getAverageProcessingTime()', () => {
    it('should return 0 for no data', () => {
      const avgTime = persistentCostTracker.getAverageProcessingTime('basic')
      expect(avgTime).toBe(0)
    })

    it('should calculate average processing time correctly', () => {
      persistentCostTracker.trackQuery('basic', 1000)
      persistentCostTracker.trackQuery('basic', 3000)
      
      const avgTime = persistentCostTracker.getAverageProcessingTime('basic')
      expect(avgTime).toBe(2000)
    })
  })

  describe('getTotalCosts()', () => {
    it('should return zero totals for no data', () => {
      const totals = persistentCostTracker.getTotalCosts()
      
      expect(totals.basic).toBe(0)
      expect(totals.pro).toBe(0)
      expect(totals.total).toBe(0)
    })

    it('should calculate totals correctly', () => {
      persistentCostTracker.trackQuery('basic', 1000)
      persistentCostTracker.trackQuery('basic', 2000)
      persistentCostTracker.trackQuery('pro', 3000)
      
      const totals = persistentCostTracker.getTotalCosts()
      
      expect(totals.basic).toBe(0.12) // 0.06 * 2
      expect(totals.pro).toBe(0.1001)
      expect(totals.total).toBe(0.2201)
    })
  })

  describe('getPerformanceStats()', () => {
    it('should return stats for both tiers', () => {
      persistentCostTracker.trackQuery('basic', 1000)
      persistentCostTracker.trackQuery('pro', 2000)
      
      const stats = persistentCostTracker.getPerformanceStats()
      
      expect(stats.basic.avgCost).toBe(0.06)
      expect(stats.basic.avgTime).toBe(1000)
      expect(stats.basic.count).toBe(1)
      
      expect(stats.pro.avgCost).toBe(0.1001)
      expect(stats.pro.avgTime).toBe(2000)
      expect(stats.pro.count).toBe(1)
    })
  })

  describe('validatePhase1Criteria()', () => {
    it('should validate Phase 1 success criteria', () => {
      // Add pro queries that meet criteria
      persistentCostTracker.trackQuery('pro', 30000) // 30 seconds
      persistentCostTracker.trackQuery('pro', 40000) // 40 seconds
      
      const validation = persistentCostTracker.validatePhase1Criteria()
      
      expect(validation.sophisticatedSynthesisTime).toBe(true) // <50 seconds
      expect(validation.costPerQuery).toBe(true) // <$0.15
      expect(validation.avgTime).toBe(35) // 35 seconds average
      expect(validation.avgCost).toBe(0.1001)
    })

    it('should fail criteria for slow queries', () => {
      // Add slow pro query
      persistentCostTracker.trackQuery('pro', 60000) // 60 seconds - fails time criteria
      
      const validation = persistentCostTracker.validatePhase1Criteria()
      
      expect(validation.sophisticatedSynthesisTime).toBe(false)
      expect(validation.avgTime).toBe(60)
    })
  })

  describe('getSummary()', () => {
    it('should return comprehensive summary', () => {
      persistentCostTracker.trackQuery('basic', 1000)
      persistentCostTracker.trackQuery('pro', 30000)
      
      const summary = persistentCostTracker.getSummary()
      
      expect(summary.totalQueries).toBe(2)
      expect(summary.totalCost).toBe(0.1601) // 0.06 + 0.1001
      expect(summary.avgCostPerQuery).toBe(0.08005)
      expect(summary.phase1Status).toBe('PASS')
    })

    it('should return FAIL status for failing Phase 1 criteria', () => {
      // Add expensive/slow query
      persistentCostTracker.trackQuery('pro', 60000) // Fails time criteria
      
      const summary = persistentCostTracker.getSummary()
      expect(summary.phase1Status).toBe('FAIL')
    })
  })

  describe('exportCostData()', () => {
    it('should export all cost data', () => {
      persistentCostTracker.trackQuery('basic', 1000)
      persistentCostTracker.trackQuery('pro', 2000)
      
      const exportedData = persistentCostTracker.exportCostData()
      
      expect(exportedData).toHaveLength(2)
      expect(exportedData[0].tier).toBe('basic')
      expect(exportedData[1].tier).toBe('pro')
    })
  })
})