import { GET } from '@/app/api/ai/synthesis-result/[id]/route'
import { resultStorage } from '@/lib/result-storage'
import { NextRequest } from 'next/server'
import type { ConsensusAnalysis } from '@/types/ai'

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()

// Mock data
const mockAnalysis: ConsensusAnalysis = {
  unifiedResponse: 'Test synthesis response',
  alignment: {
    semantic: 0.8,
    surface: 0.6,
    gemini: 'high',
    chatgpt: 'high', 
    claude: 'moderate',
    overallAlignment: 'high',
    description: 'Test alignment',
    methodology: 'semantic-similarity-v2',
    alignedPoints: []
  },
  alignedPoints: [],
  divergentSections: [],
  originalResponses: []
}

describe('/api/ai/synthesis-result/[id]', () => {
  beforeEach(() => {
    resultStorage['storage'].clear()
    mockConsoleLog.mockClear()
    mockConsoleError.mockClear()
  })

  afterAll(() => {
    resultStorage.destroy()
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
  })

  describe('GET', () => {
    it('should retrieve stored result successfully', async () => {
      // Store a result
      const resultId = resultStorage.store(mockAnalysis)
      
      // Create request
      const request = new NextRequest('http://localhost/api/ai/synthesis-result/' + resultId)
      const params = Promise.resolve({ id: resultId })
      
      // Call API
      const response = await GET(request, { params })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.analysis).toEqual(mockAnalysis)
      expect(data.retrieved).toBe(true)
    })

    it('should return 404 for non-existent result', async () => {
      const request = new NextRequest('http://localhost/api/ai/synthesis-result/non-existent')
      const params = Promise.resolve({ id: 'non-existent' })
      
      const response = await GET(request, { params })
      const data = await response.json()
      
      expect(response.status).toBe(404)
      expect(data.error).toBe('Result not found or expired')
    })

    it('should return 400 for missing ID', async () => {
      const request = new NextRequest('http://localhost/api/ai/synthesis-result/')
      const params = Promise.resolve({ id: '' })
      
      const response = await GET(request, { params })
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Result ID is required')
    })

    it('should return 404 for expired result', async () => {
      // Store with very short TTL
      const resultId = resultStorage.store(mockAnalysis, 0.001)
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const request = new NextRequest('http://localhost/api/ai/synthesis-result/' + resultId)
      const params = Promise.resolve({ id: resultId })
      
      const response = await GET(request, { params })
      const data = await response.json()
      
      expect(response.status).toBe(404)
      expect(data.error).toBe('Result not found or expired')
    })

    it('should handle errors gracefully', async () => {
      // Mock resultStorage.retrieve to throw an error
      jest.spyOn(resultStorage, 'retrieve').mockImplementationOnce(() => {
        throw new Error('Storage error')
      })
      
      const request = new NextRequest('http://localhost/api/ai/synthesis-result/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      
      const response = await GET(request, { params })
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to retrieve result')
      
      // Restore mock
      jest.restoreAllMocks()
    })
  })
})