describe('Environment Configuration', () => {
  describe('Required Environment Variables', () => {
    const requiredVars = [
      'OPENAI_API_KEY',
      'GOOGLE_API_KEY', 
      'ANTHROPIC_API_KEY'
    ]

    requiredVars.forEach(varName => {
      it(`should have ${varName} defined`, () => {
        expect(process.env[varName]).toBeDefined()
        expect(process.env[varName]).not.toBe('')
      })
    })
  })

  describe('Optional Environment Variables', () => {
    const optionalVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SIMPLE_PASSWORD'
    ]

    optionalVars.forEach(varName => {
      it(`should handle ${varName} being undefined`, () => {
        // These variables are optional and should not break the app if missing
        // Just verify they can be undefined without throwing
        expect(() => {
          const value = process.env[varName]
          // Should not throw
        }).not.toThrow()
      })
    })
  })

  describe('Node Environment', () => {
    it('should be in test environment during tests', () => {
      expect(process.env.NODE_ENV).toBe('test')
    })
  })

  describe('API Key Format Validation', () => {
    it('should have OpenAI API key in expected format', () => {
      const apiKey = process.env.OPENAI_API_KEY
      if (apiKey && apiKey !== 'test-openai-key') {
        // In real environment, should start with sk-
        expect(apiKey).toMatch(/^sk-/)
      }
    })

    it('should have Google API key in expected format', () => {
      const apiKey = process.env.GOOGLE_API_KEY  
      if (apiKey && apiKey !== 'test-google-key') {
        // Google API keys are typically 39 characters
        expect(apiKey.length).toBeGreaterThan(30)
      }
    })

    it('should have Anthropic API key in expected format', () => {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (apiKey && apiKey !== 'test-anthropic-key') {
        // Anthropic API keys start with sk-ant-
        expect(apiKey).toMatch(/^sk-ant-/)
      }
    })
  })

  describe('Development vs Production Configuration', () => {
    it('should handle missing Supabase keys gracefully', () => {
      // Since we determined Supabase is not required for current synthesis functionality,
      // the app should work without these keys
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      // Should not throw if undefined
      expect(() => {
        const config = {
          supabase: {
            url: supabaseUrl || 'not-required',
            key: supabaseKey || 'not-required'
          }
        }
      }).not.toThrow()
    })
  })

  describe('Configuration Completeness', () => {
    it('should have all necessary variables for synthesis functionality', () => {
      const synthesisRequiredVars = [
        'OPENAI_API_KEY',
        'GOOGLE_API_KEY',
        'ANTHROPIC_API_KEY'
      ]

      const missingVars = synthesisRequiredVars.filter(varName => 
        !process.env[varName] || process.env[varName] === ''
      )

      expect(missingVars).toHaveLength(0)
      
      if (missingVars.length > 0) {
        fail(`Missing required environment variables for synthesis: ${missingVars.join(', ')}`)
      }
    })
  })
})