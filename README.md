# Voiltail - AI Synthesis Platform

A sophisticated AI synthesis platform that combines insights from multiple AI models to provide comprehensive, balanced responses.

## 🚀 Quick Start

1. **Clone and Install**
   ```bash
   git clone https://github.com/ccarnell/voiltail.git
   cd voiltail
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Add your API keys to .env.local
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

## 📋 Implementation Plan

This project is being built in 4 focused phases:

### Phase 1: Core Validation ⚡
**Status**: Ready to implement  
**Goal**: Validate sophisticated synthesis + streaming works reliably

- Restore GPT-4 powered synthesis engine
- Implement real-time streaming architecture
- Add Pro mode toggle to UI
- Cost tracking and validation

**📖 [Phase 1 Guide](docs/phases/PHASE-1-CORE-VALIDATION.md)**

### Phase 2: Enhanced User Experience 🎨
**Goal**: Polish UX with local storage and upgrade prompts

- Local storage for free users
- Usage tracking and billing display
- Enhanced error handling
- Contextual upgrade modals

**📖 [Phase 2 Guide](docs/phases/PHASE-2-USER-EXPERIENCE.md)**

### Phase 3: Payment Integration 💳
**Goal**: Enable monetization with Stripe

- Stripe checkout and billing
- User account creation
- Webhook handling
- Payment success/failure flows

**📖 [Phase 3 Guide](docs/phases/PHASE-3-PAYMENT-INTEGRATION.md)**

### Phase 4: Production System 🏗️
**Goal**: Complete production-ready infrastructure

- BetterAuth authentication
- Supabase database
- Monitoring (Sentry + PostHog)
- Email system (Resend)
- Rate limiting (Upstash Redis)

**📖 [Phase 4 Guide](docs/phases/PHASE-4-PRODUCTION-SYSTEM.md)**

## 🏛️ Architecture

### Current System
- **Basic Tier**: $5 base + $1 per query (fast synthesis)
- **Pro Tier**: $39/month (sophisticated synthesis with GPT-4 + embeddings)

### Tech Stack
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API routes, TypeScript
- **AI Models**: OpenAI GPT-4, Google Gemini, Anthropic Claude
- **Database**: Supabase (PostgreSQL)
- **Authentication**: BetterAuth
- **Payments**: Stripe
- **Email**: Resend
- **Monitoring**: Sentry + PostHog
- **Rate Limiting**: Upstash Redis

## 📚 Documentation

### 📖 Core Documentation
- **[Implementation Overview](docs/IMPLEMENTATION-OVERVIEW.md)** - High-level strategy and approach
- **[Database Schema](docs/technical/DATABASE-SCHEMA.md)** - Complete database reference
- **[Deployment Guide](docs/deployment/DEPLOYMENT-GUIDE.md)** - Production deployment instructions

### 🏗️ Architecture Documentation
- **[Comprehensive Complexity Architecture](docs/architecture/COMPREHENSIVE-COMPLEXITY-ARCHITECTURE.md)** - Enterprise-grade features
- **[Pragmatic Complexity Architecture](docs/architecture/PRAGMATIC-COMPLEXITY-ARCHITECTURE.md)** - Simplified approach
- **[Technical Complexity Concerns](docs/architecture/TECHNICAL-COMPLEXITY-CONCERNS.md)** - Risk analysis

### 🔄 Tripwire System
Each phase begins with a comprehensive analysis checkpoint to ensure we're implementing features in the correct order and considering all consequences.

## 🎯 Current Status

**Phase 1** is ready to begin. The sophisticated synthesis engine needs to be restored and streaming implemented before proceeding with payment infrastructure.

### Key Success Criteria for Phase 1:
- [ ] Sophisticated synthesis completes reliably in <50 seconds
- [ ] Streaming provides smooth real-time updates
- [ ] Cost per sophisticated query is <$0.15
- [ ] Quality improvement over basic synthesis is significant

## 🚦 Getting Started

1. **Review the [Implementation Overview](docs/IMPLEMENTATION-OVERVIEW.md)**
2. **Start with [Phase 1](docs/phases/PHASE-1-CORE-VALIDATION.md)**
3. **Execute the tripwire checkpoint before each phase**
4. **Follow the detailed implementation guides**

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Project Structure
```
voiltail/
├── app/                 # Next.js app directory
├── components/          # React components
├── lib/                 # Utility libraries
├── types/              # TypeScript type definitions
├── docs/               # Documentation
│   ├── phases/         # Phase-specific guides
│   ├── architecture/   # Architecture documents
│   ├── technical/      # Technical references
│   └── deployment/     # Deployment guides
└── README.md           # This file
```

## 🤝 Contributing

This is a private project, but the documentation structure and implementation approach can serve as a reference for similar AI synthesis platforms.

## 📄 License

Private project - All rights reserved.

---

**Ready to begin Phase 1?** Start with the [Core Validation Guide](docs/phases/PHASE-1-CORE-VALIDATION.md)
