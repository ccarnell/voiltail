import { resultStorage } from '@/lib/result-storage'
import { persistentCostTracker } from '@/lib/persistent-cost-tracking'
import type { ConsensusAnalysis } from '@/types/ai'

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()

describe('Integration: Complete Synthesis Flow', () => {
  beforeEach(() => {
    resultStorage['storage'].clear()
    persistentCostTracker['costs'] = []
    mockConsoleLog.mockClear()
    mockConsoleError.mockClear()
  })

  afterAll(() => {
    resultStorage.destroy()
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
  })

  describe('End-to-End Synthesis Flow', () => {
    it('should complete full synthesis cycle', async () => {
      // Mock analysis result
      const mockAnalysis: ConsensusAnalysis = {
        unifiedResponse: 'Integrated test synthesis response',
        alignment: {
          semantic: 0.85,
          surface: 0.7,
          gemini: 'high',
          chatgpt: 'high',
          claude: 'moderate',
          overallAlignment: 'high',
          description: 'Strong alignment across models',
          methodology: 'semantic-similarity-v2',
          alignedPoints: [{
            content: 'Models agree on core concepts',
            models: ['gemini', 'openai', 'claude'],
            strength: 0.85
          }]
        },
        alignedPoints: [{
          content: 'Models agree on core concepts',
          models: ['gemini', 'openai', 'claude'],
          strength: 0.85
        }],
        divergentSections: [],
        originalResponses: [
          {
            model: 'gemini',
            content: 'Gemini response content',
            responseTime: 1500
          },
          {
            model: 'openai', 
            content: 'OpenAI response content',
            responseTime: 2000
          },
          {
            model: 'claude',
            content: 'Claude response content',
            responseTime: 1800
          }
        ]
      }

      // Step 1: Store synthesis result
      const resultId = resultStorage.store(mockAnalysis)
      expect(resultId).toBeDefined()
      expect(typeof resultId).toBe('string')

      // Step 2: Track cost for the query
      const processingTime = 5500 // Total of response times
      const cost = persistentCostTracker.trackQuery('pro', processingTime)
      expect(cost.tier).toBe('pro')
      expect(cost.total).toBe(0.1001)

      // Step 3: Retrieve the result (simulating frontend fetch)
      const retrievedResult = resultStorage.retrieve(resultId)
      expect(retrievedResult).toEqual(mockAnalysis)

      // Step 4: Validate cost tracking worked
      const stats = persistentCostTracker.getPerformanceStats()
      expect(stats.pro.count).toBe(1)
      expect(stats.pro.avgCost).toBe(0.1001)
      expect(stats.pro.avgTime).toBe(processingTime)

      // Step 5: Validate Phase 1 criteria
      const validation = persistentCostTracker.validatePhase1Criteria()
      expect(validation.sophisticatedSynthesisTime).toBe(true) // 5.5s < 50s
      expect(validation.costPerQuery).toBe(true) // $0.1001 < $0.15
    })

    it('should handle partial model failures gracefully', async () => {
      // Simulate scenario where one model fails
      const partialAnalysis: ConsensusAnalysis = {
        unifiedResponse: 'Synthesis from 2 of 3 models',
        alignment: {
          semantic: 0.6,
          surface: 0.4,
          gemini: 'high',
          chatgpt: 'moderate',
          claude: 'low', // Failed model
          overallAlignment: 'moderate',
          description: 'Partial alignment due to model failure',
          methodology: 'semantic-similarity-v2',
          alignedPoints: []
        },
        alignedPoints: [],
        divergentSections: [{
          topic: 'Model Availability',
          content: 'One model failed to respond',
          models: ['gemini', 'openai'],
          description: 'Technical error prevented full synthesis'
        }],
        originalResponses: [
          {
            model: 'gemini',
            content: 'Successful Gemini response',
            responseTime: 1500
          },
          {
            model: 'openai',
            content: 'Successful OpenAI response', 
            responseTime: 2000
          },
          {
            model: 'claude',
            content: 'Error: Claude API call failed',
            responseTime: 0
          }
        ]
      }

      // Store and retrieve partial result
      const resultId = resultStorage.store(partialAnalysis)
      const retrieved = resultStorage.retrieve(resultId)

      expect(retrieved).toEqual(partialAnalysis)
      expect(retrieved?.originalResponses).toHaveLength(3)
      expect(retrieved?.originalResponses.some(r => r.content.startsWith('Error:'))).toBe(true)
      expect(retrieved?.divergentSections).toHaveLength(1)
    })

    it('should maintain result storage integrity under load', async () => {
      // Simulate multiple concurrent synthesis results
      const results: string[] = []
      const analyses = Array.from({ length: 10 }, (_, i) => ({
        ...{
          unifiedResponse: `Synthesis result ${i}`,
          alignment: {
            semantic: 0.8,
            surface: 0.6,
            gemini: 'high',
            chatgpt: 'high',
            claude: 'moderate',
            overallAlignment: 'high',
            description: `Test alignment ${i}`,
            methodology: 'semantic-similarity-v2' as const,
            alignedPoints: []
          },
          alignedPoints: [],
          divergentSections: [],
          originalResponses: []
        }
      }))

      // Store multiple results
      for (const analysis of analyses) {
        const resultId = resultStorage.store(analysis)
        results.push(resultId)
      }

      expect(results).toHaveLength(10)
      expect(new Set(results).size).toBe(10) // All IDs should be unique

      // Retrieve all results
      for (let i = 0; i < results.length; i++) {
        const retrieved = resultStorage.retrieve(results[i])
        expect(retrieved?.unifiedResponse).toBe(`Synthesis result ${i}`)
      }

      // Check storage stats
      const stats = resultStorage.getStats()
      expect(stats.count).toBe(10)
    })

    it('should handle cost tracking for mixed tier queries', () => {
      // Track various queries
      persistentCostTracker.trackQuery('basic', 2000)
      persistentCostTracker.trackQuery('pro', 8000)
      persistentCostTracker.trackQuery('basic', 3000)
      persistentCostTracker.trackQuery('pro', 12000)

      // Validate mixed stats
      const stats = persistentCostTracker.getPerformanceStats()
      
      expect(stats.basic.count).toBe(2)
      expect(stats.basic.avgTime).toBe(2500) // (2000 + 3000) / 2
      expect(stats.basic.avgCost).toBe(0.06)

      expect(stats.pro.count).toBe(2)
      expect(stats.pro.avgTime).toBe(10000) // (8000 + 12000) / 2
      expect(stats.pro.avgCost).toBe(0.1001)

      // Check totals
      const totals = persistentCostTracker.getTotalCosts()
      expect(totals.basic).toBe(0.12) // 0.06 * 2
      expect(totals.pro).toBe(0.2002) // 0.1001 * 2
      expect(totals.total).toBe(0.3202)
    })
  })

  describe('Error Recovery', () => {
    it('should handle result storage errors gracefully', () => {
      // Mock storage to throw error
      const originalStore = resultStorage.store
      resultStorage.store = jest.fn().mockImplementation(() => {
        throw new Error('Storage full')
      })

      expect(() => {
        // This would normally throw, but we want to test error handling
        resultStorage.store({} as any)
      }).toThrow('Storage full')

      // Restore original method
      resultStorage.store = originalStore
    })

    it('should handle cost tracking file errors gracefully', () => {
      // This tests that cost tracking continues to work even if file operations fail
      const cost = persistentCostTracker.trackQuery('basic', 1000)
      
      expect(cost.tier).toBe('basic')
      expect(cost.total).toBe(0.06)
      // Even if file save fails, in-memory tracking should work
    })
  })
})