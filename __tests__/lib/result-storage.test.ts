import { resultStorage } from '@/lib/result-storage'
import type { ConsensusAnalysis } from '@/types/ai'

// Mock console methods to avoid noise in tests
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()

// Mock data
const mockAnalysis: ConsensusAnalysis = {
  unifiedResponse: 'Test unified response',
  alignment: {
    semantic: 0.8,
    surface: 0.6,
    gemini: 'high',
    chatgpt: 'high',
    claude: 'moderate',
    overallAlignment: 'high',
    description: 'Test alignment description',
    methodology: 'semantic-similarity-v2',
    alignedPoints: []
  },
  alignedPoints: [],
  divergentSections: [],
  originalResponses: [
    {
      model: 'openai',
      content: 'Test OpenAI response',
      responseTime: 1000
    }
  ]
}

describe('Result Storage', () => {
  beforeEach(() => {
    // Clear storage before each test
    resultStorage['storage'].clear()
    mockConsoleLog.mockClear()
    mockConsoleError.mockClear()
  })

  afterAll(() => {
    // Cleanup
    resultStorage.destroy()
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
  })

  describe('store()', () => {
    it('should store a result and return an ID', () => {
      const id = resultStorage.store(mockAnalysis)
      
      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
      expect(id).toMatch(/^result_\d+_[a-z0-9]+$/)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`📦 Stored result ${id}`)
      )
    })

    it('should store with custom TTL', () => {
      const customTtl = 60 // 60 minutes
      const id = resultStorage.store(mockAnalysis, customTtl)
      
      expect(id).toBeDefined()
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`(TTL: ${customTtl}m)`)
      )
    })

    it('should generate unique IDs for different results', () => {
      const id1 = resultStorage.store(mockAnalysis)
      const id2 = resultStorage.store(mockAnalysis)
      
      expect(id1).not.toBe(id2)
    })
  })

  describe('retrieve()', () => {
    it('should retrieve a stored result', () => {
      const id = resultStorage.store(mockAnalysis)
      const retrieved = resultStorage.retrieve(id)
      
      expect(retrieved).toEqual(mockAnalysis)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`✅ Retrieved result ${id}`)
      )
    })

    it('should return null for non-existent ID', () => {
      const result = resultStorage.retrieve('non-existent-id')
      
      expect(result).toBeNull()
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('❌ Result non-existent-id not found')
      )
    })

    it('should return null for expired result', () => {
      // Store with very short TTL
      const id = resultStorage.store(mockAnalysis, 0.001) // 0.001 minutes = 0.06 seconds
      
      // Wait for expiry
      return new Promise(resolve => {
        setTimeout(() => {
          const result = resultStorage.retrieve(id)
          
          expect(result).toBeNull()
          expect(mockConsoleLog).toHaveBeenCalledWith(
            expect.stringContaining(`⏰ Result ${id} expired`)
          )
          resolve(undefined)
        }, 100) // Wait 100ms
      })
    })
  })

  describe('delete()', () => {
    it('should delete a stored result', () => {
      const id = resultStorage.store(mockAnalysis)
      const deleted = resultStorage.delete(id)
      
      expect(deleted).toBe(true)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`🗑️ Deleted result ${id}`)
      )
      
      // Verify it's deleted
      const retrieved = resultStorage.retrieve(id)
      expect(retrieved).toBeNull()
    })

    it('should return false for non-existent ID', () => {
      const deleted = resultStorage.delete('non-existent-id')
      expect(deleted).toBe(false)
    })
  })

  describe('getStats()', () => {
    it('should return correct stats', () => {
      // Store multiple results
      const id1 = resultStorage.store(mockAnalysis)
      const id2 = resultStorage.store(mockAnalysis)
      
      const stats = resultStorage.getStats()
      
      expect(stats.count).toBe(2)
      expect(stats.oldestAge).toBeGreaterThanOrEqual(0)
      expect(stats.newestAge).toBeGreaterThanOrEqual(0)
      expect(stats.oldestAge).toBeGreaterThanOrEqual(stats.newestAge)
    })

    it('should handle empty storage', () => {
      const stats = resultStorage.getStats()
      
      expect(stats.count).toBe(0)
      expect(stats.oldestAge).toBe(0)
      expect(stats.newestAge).toBe(0)
    })
  })

  describe('cleanup()', () => {
    it('should clean up expired results', () => {
      // Store result with short TTL
      const id = resultStorage.store(mockAnalysis, 0.001) // Very short TTL
      
      // Manually trigger cleanup after expiry
      return new Promise(resolve => {
        setTimeout(() => {
          resultStorage['cleanup']()
          
          const result = resultStorage.retrieve(id)
          expect(result).toBeNull()
          resolve(undefined)
        }, 100)
      })
    })
  })
})