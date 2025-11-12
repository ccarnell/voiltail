# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Voiltail is an AI synthesis platform that combines insights from multiple AI models (OpenAI GPT-4, Google Gemini, Anthropic Claude) to provide comprehensive, balanced responses. The platform analyzes alignment and divergence between model responses, providing users with both unified synthesis and individual model perspectives.

## Development Commands

```bash
# Development
npm run dev          # Start development server with turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Testing
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:ci      # Run tests for CI/CD (no watch, with coverage)
```

## Architecture Overview

### Core Components

**Frontend Architecture:**
- Next.js 14 App Router architecture with TypeScript
- Main app entry redirects `/` to `/consensus` for the primary interface
- React components in `/components` using Tailwind CSS and Radix UI primitives
- Theme switching with next-themes (dark/light/system modes)

**AI Synthesis Pipeline:**
- `lib/ai/synthesis.ts` - Core synthesis logic with semantic similarity analysis
- `lib/ai/embeddings.ts` - Semantic similarity calculations using OpenAI embeddings
- `lib/ai/gpt-synthesis.ts` - GPT-4 powered unified response generation
- Two synthesis modes:
  - **Basic Mode**: Fast synthesis (~$0.03/query)
  - **Pro Mode**: Sophisticated synthesis with embeddings and GPT-4 (~$0.09/query)

**API Routes:**
- `/api/ai/synthesize` - Standard synthesis endpoint
- `/api/ai/synthesize-stream` - Streaming synthesis with real-time progress updates
- `/api/ai/synthesis-result/[id]` - Fetch stored synthesis results
- Model-specific routes in `/api/ai/models/` for individual AI providers

**Data Management:**
- Supabase integration for data persistence (client in `lib/supabase/`)
- Cost tracking system (`lib/cost-tracking.ts` and `lib/persistent-cost-tracking.ts`)
- Result storage system (`lib/result-storage.ts`)

### Key Features

**Multi-Model Synthesis:**
- Parallel API calls to GPT-4o, Gemini 1.5 Flash, and Claude Sonnet 4
- Semantic similarity analysis using OpenAI embeddings
- Surface-level similarity using Jaccard index
- Alignment scoring with qualitative levels (high/moderate/low)

**Streaming Architecture:**
- Real-time progress updates for Pro mode synthesis
- Phase-based progress tracking (models → embeddings → GPT-4 synthesis)
- Hybrid approach: streaming progress, final result via API fetch

**Cost Management:**
- Detailed cost tracking per query with model-specific pricing
- Performance metrics and Phase 1 success criteria validation
- Persistent cost data with JSON export capabilities

## Environment Variables

Required API keys:
- `GOOGLE_API_KEY` - Google Gemini API access
- `OPENAI_API_KEY` - OpenAI GPT-4 and embeddings access  
- `ANTHROPIC_API_KEY` - Anthropic Claude access
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## File Organization

```
voiltail/
├── app/
│   ├── consensus/page.tsx          # Main synthesis interface
│   ├── api/ai/                     # AI API endpoints
│   └── layout.tsx                  # Root layout with theme provider
├── lib/
│   ├── ai/                         # Core AI synthesis logic
│   ├── supabase/                   # Database client setup
│   └── [various utilities]        # Cost tracking, result storage, etc.
├── components/
│   ├── ui/                         # Reusable UI components (Radix-based)
│   └── theme-switcher.tsx          # Theme toggle component
├── types/ai.ts                     # TypeScript definitions for AI types
└── docs/                           # Comprehensive project documentation
    ├── phases/                     # Phase-specific implementation guides
    └── architecture/               # Architecture documentation
```

## Development Patterns

**Error Handling:**
- Graceful degradation when AI models fail (synthesis continues with available responses)
- Comprehensive error handling in synthesis pipeline with fallback responses
- User-friendly error messages in UI components
- Retry logic with exponential backoff for result retrieval
- Race condition prevention in result storage/retrieval

**Performance Optimization:**
- Parallel API calls to all three AI models
- Streaming for long-running Pro mode operations
- Progress indicators and real-time status updates
- In-memory result storage with TTL-based cleanup
- Efficient cost tracking with persistent file storage

**Type Safety:**
- Comprehensive TypeScript types in `types/ai.ts`
- Strict type checking for all AI-related data structures
- Type-safe API route handlers

**Security & CSP:**
- Content Security Policy configured for development and production
- Separate CSP rules allowing `unsafe-eval` in development only
- Explicit allowlist for AI provider APIs (OpenAI, Google, Anthropic)
- No sensitive data exposure in client-side code

## Phase-Based Development

This project follows a 4-phase development approach:
- **Phase 1**: Core validation (sophisticated synthesis + streaming)
- **Phase 2**: Enhanced UX (local storage, upgrade prompts)  
- **Phase 3**: Payment integration (Stripe)
- **Phase 4**: Production system (auth, monitoring, rate limiting)

Current implementation focuses on Phase 1 core functionality. See `docs/phases/` for detailed phase guides.

## Authentication & Database

Currently using basic Supabase setup. Full authentication system (BetterAuth) planned for Phase 4. Database schema documented in `docs/technical/DATABASE-SCHEMA.md`.

## Synthesis Algorithm Details

The synthesis process:
1. **Model Querying**: Parallel calls to GPT-4, Gemini, and Claude
2. **Similarity Analysis**: Semantic similarity via embeddings + surface similarity via Jaccard index  
3. **Alignment Scoring**: Combined scoring (70% semantic, 30% surface) with qualitative levels
4. **Divergence Detection**: Identify areas where models differ significantly
5. **Unified Generation**: GPT-4 synthesis incorporating alignment data and individual responses
6. **Result Assembly**: Comprehensive analysis object with unified response, alignment data, and original responses

Cost tracking validates Phase 1 success criteria: sophisticated synthesis <50s and <$0.15 per query.

## Testing Strategy

The project includes comprehensive tests to ensure reliability in both development and production:

### Test Structure
```
__tests__/
├── api/                    # API endpoint tests
│   ├── synthesis-result.test.ts    # Result retrieval API
│   └── synthesize.test.ts         # Main synthesis API
├── lib/                    # Unit tests for core libraries
│   ├── result-storage.test.ts     # In-memory result storage
│   └── cost-tracking.test.ts      # Persistent cost tracking
├── integration/            # End-to-end integration tests
│   └── synthesis-flow.test.ts     # Complete synthesis workflow
├── config/                 # Configuration and environment tests
│   └── environment.test.ts        # Environment variable validation
└── build/                  # Production build validation
    └── production.test.ts         # Build process and deployment readiness
```

### Test Coverage Areas
- **API Endpoints**: Request validation, error handling, response structure
- **Result Storage**: TTL management, concurrent access, cleanup processes
- **Cost Tracking**: Performance metrics, Phase 1 criteria validation, file persistence
- **Integration Flow**: End-to-end synthesis workflow, error recovery
- **Environment**: Required API keys, production/development configuration
- **Build Process**: Production build validation, deployment readiness

### Running Tests
- **Development**: `npm run test:watch` for active development
- **Pre-commit**: `npm run test` to validate all functionality  
- **CI/CD**: `npm run test:ci` for automated deployment validation
- **Coverage**: `npm run test:coverage` for test coverage analysis

### Critical Test Scenarios
1. **Synthesis Flow**: Complete multi-model synthesis with result storage and cost tracking
2. **Partial Failures**: Graceful handling when individual AI models fail
3. **Race Conditions**: Result storage/retrieval timing under concurrent load
4. **Environment Validation**: Required API keys and configuration verification
5. **Production Build**: Successful compilation and deployment readiness

### Deployment Validation
Before deploying to production, ensure:
- All tests pass: `npm run test:ci`
- Build completes: `npm run build`
- Environment variables are properly configured
- No sensitive data in build artifacts

## Recent Bug Fixes & Improvements

### Synthesis Result Retrieval Issue (Fixed)
**Problem**: "Failed to retrieve synthesis result" error preventing synthesis completion.

**Root Causes Identified & Fixed**:
1. **Race Condition in Result Storage** (`synthesis-result/[id]/route.ts:28`)
   - Issue: Results deleted immediately after retrieval
   - Fix: Removed immediate deletion, rely on TTL cleanup to prevent race conditions

2. **Claude Model Version Mismatch**  
   - Issue: Different Claude models in streaming vs non-streaming routes
   - Fix: Standardized to `claude-sonnet-4-20250514` across all routes

3. **CSP Blocking Development Tools**
   - Issue: Content Security Policy blocking eval() in development
   - Fix: Added development-specific CSP allowing `unsafe-eval`, production CSP remains strict

4. **Gemini API Model Name Error**
   - Issue: `gemini-1.5-flash` model not found (404 error)
   - Fix: Updated to correct model name `gemini-1.5-flash-8b`

5. **Insufficient Error Handling**
   - Issue: Frontend single-attempt result fetching without retries
   - Fix: Added retry logic with 3 attempts and 1-second delays

### Performance & Reliability Improvements
- Enhanced logging throughout synthesis pipeline for better debugging
- Implemented TTL-based result storage cleanup preventing memory leaks
- Added comprehensive retry logic in frontend result fetching
- Improved error messages and user feedback during synthesis process
- Fixed build configuration removing erroneous Turbopack rules

### Testing Infrastructure Added
- Complete test suite covering all critical paths
- API endpoint testing with mocked external dependencies
- Integration tests for end-to-end synthesis workflow
- Environment validation ensuring proper deployment setup
- Production build validation preventing deployment failures