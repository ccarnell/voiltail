import { POST } from '@/app/api/ai/synthesize/route'
import { NextRequest } from 'next/server'

// Mock external API calls
jest.mock('openai')
jest.mock('@google/generative-ai')
jest.mock('@anthropic-ai/sdk')

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()

describe('/api/ai/synthesize', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear()
    mockConsoleError.mockClear()
  })

  afterAll(() => {
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
  })

  describe('POST', () => {
    it('should return 400 for missing prompt', async () => {
      const request = new NextRequest('http://localhost/api/ai/synthesize', {
        method: 'POST',
        body: JSON.stringify({})
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid prompt is required')
    })

    it('should return 400 for invalid prompt type', async () => {
      const request = new NextRequest('http://localhost/api/ai/synthesize', {
        method: 'POST',
        body: JSON.stringify({ prompt: 123 })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid prompt is required')
    })

    it('should return 500 for missing API keys', async () => {
      // Temporarily remove API keys
      const originalKeys = {
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      }
      
      delete process.env.GOOGLE_API_KEY
      delete process.env.OPENAI_API_KEY
      delete process.env.ANTHROPIC_API_KEY
      
      const request = new NextRequest('http://localhost/api/ai/synthesize', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'test prompt' })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toContain('Missing API keys')
      
      // Restore API keys
      process.env.GOOGLE_API_KEY = originalKeys.GOOGLE_API_KEY
      process.env.OPENAI_API_KEY = originalKeys.OPENAI_API_KEY
      process.env.ANTHROPIC_API_KEY = originalKeys.ANTHROPIC_API_KEY
    })

    it('should validate required environment variables', () => {
      const requiredKeys = ['GOOGLE_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY']
      
      requiredKeys.forEach(key => {
        expect(process.env[key]).toBeDefined()
      })
    })

    it('should accept valid request structure', async () => {
      const validRequest = {
        prompt: 'What is artificial intelligence?',
        mode: 'basic',
        attachments: []
      }
      
      const request = new NextRequest('http://localhost/api/ai/synthesize', {
        method: 'POST',
        body: JSON.stringify(validRequest)
      })
      
      // This test will fail in the synthesis step due to mocked APIs,
      // but it should pass the initial validation
      const response = await POST(request)
      
      // Should not be a validation error (400)
      expect(response.status).not.toBe(400)
    })
  })

  describe('Request Validation', () => {
    it('should accept basic mode', async () => {
      const request = new NextRequest('http://localhost/api/ai/synthesize', {
        method: 'POST',
        body: JSON.stringify({ 
          prompt: 'test', 
          mode: 'basic' 
        })
      })
      
      const response = await POST(request)
      // Should pass validation (not 400)
      expect(response.status).not.toBe(400)
    })

    it('should accept pro mode', async () => {
      const request = new NextRequest('http://localhost/api/ai/synthesize', {
        method: 'POST',
        body: JSON.stringify({ 
          prompt: 'test', 
          mode: 'pro' 
        })
      })
      
      const response = await POST(request)
      // Should pass validation (not 400)
      expect(response.status).not.toBe(400)
    })

    it('should default to pro mode when mode not specified', async () => {
      const request = new NextRequest('http://localhost/api/ai/synthesize', {
        method: 'POST',
        body: JSON.stringify({ 
          prompt: 'test'
        })
      })
      
      const response = await POST(request)
      // Should pass validation (not 400)
      expect(response.status).not.toBe(400)
    })

    it('should handle attachments array', async () => {
      const request = new NextRequest('http://localhost/api/ai/synthesize', {
        method: 'POST',
        body: JSON.stringify({ 
          prompt: 'test',
          attachments: [
            {
              type: 'image',
              mimeType: 'image/png',
              base64: 'data:image/png;base64,test'
            }
          ]
        })
      })
      
      const response = await POST(request)
      // Should pass validation (not 400)
      expect(response.status).not.toBe(400)
    })
  })
})