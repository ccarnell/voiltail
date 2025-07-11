# Voiltail - Convergence and Divergence Synthesizer

**BETA** - A sophisticated research synthesis platform that combines the collective intelligence of multiple AI models to provide comprehensive, transparent analysis.

## 🚀 Features

### **Enhanced Synthesis Engine**
- **Semantic Similarity Analysis**: Industry-standard OpenAI embeddings with cosine similarity
- **GPT-4 Powered Synthesis**: Intelligent, structured response generation
- **Qualitative Alignment**: Meaningful descriptions instead of misleading percentages
- **Transparent Reasoning**: Full access to individual model responses

### **Multi-Model Intelligence**
- **Gemini 1.5 Flash**: Research methodology emphasis
- **ChatGPT-4**: Technical implementation focus
- **Claude 3.5 Sonnet**: Comprehensive analysis approach

### **Advanced UI/UX**
- **Conversational Flow**: Multiple Q&A pairs with preserved history
- **Visual Alignment Bars**: Model agreement visualization
- **Purple Divergent Sections**: Highlighted areas of model disagreement
- **Responsive Design**: Dark theme, professional layout
- **Real-time Processing**: Live synthesis with progress indicators

## 🛠 Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **AI Integration**: OpenAI, Google Gemini, Anthropic Claude
- **Analysis**: Semantic similarity, Jaccard index, GPT-4 synthesis
- **Deployment**: Vercel-ready

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+
- API keys for OpenAI, Google Gemini, and Anthropic Claude

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ccarnell/voiltail.git
   cd voiltail
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your API keys:
   ```env
   GOOGLE_API_KEY=your-gemini-api-key
   OPENAI_API_KEY=your-openai-api-key
   ANTHROPIC_API_KEY=your-claude-api-key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📊 How It Works

### **1. Multi-Model Query**
When you submit a research question, Voiltail simultaneously queries three leading AI models:
- Gemini 1.5 Flash for research methodology
- ChatGPT-4 for technical implementation
- Claude 3.5 Sonnet for comprehensive analysis

### **2. Semantic Analysis**
The system calculates semantic similarity using:
- **OpenAI Embeddings**: Convert responses to high-dimensional vectors
- **Cosine Similarity**: Measure true conceptual alignment
- **Jaccard Index**: Analyze surface-level word overlap

### **3. Intelligent Synthesis**
GPT-4 creates a unified response that:
- Identifies areas of model agreement
- Highlights divergent perspectives
- Provides structured, comprehensive analysis
- Maintains transparency with individual reasoning access

### **4. Visual Presentation**
Results are displayed with:
- **Alignment Bars**: Visual representation of model agreement
- **Qualitative Descriptions**: Meaningful analysis summaries
- **Purple Divergent Sections**: Areas where models disagree
- **Expandable Details**: Full access to individual model responses

## 🎯 Use Cases

- **Research Analysis**: Compare perspectives on complex topics
- **Technical Decision Making**: Evaluate different implementation approaches
- **Academic Writing**: Gather comprehensive viewpoints for papers
- **Strategic Planning**: Analyze multiple angles of business decisions
- **Learning**: Understand topics from different AI perspectives

## 🔧 API Reference

### Synthesis Endpoint
```typescript
POST /api/ai/synthesize
Content-Type: application/json

{
  "prompt": "Your research question",
  "attachments": [] // Optional file attachments
}
```

### Response Format
```typescript
{
  "analysis": {
    "unifiedResponse": "GPT-4 synthesized response",
    "alignment": {
      "semantic": 0.85,
      "surface": 0.23,
      "description": "Strong semantic alignment with diverse expression styles",
      "methodology": "semantic-similarity-v2"
    },
    "divergentSections": [
      {
        "topic": "Implementation Approach",
        "description": "Models showed varying perspectives on implementation"
      }
    ],
    "originalResponses": [
      {
        "model": "gemini",
        "content": "Original Gemini response",
        "responseTime": 1200
      }
      // ... other models
    ]
  }
}
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm start
```

## 🔒 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_API_KEY` | Google Gemini API key | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | Yes |
| `NEXT_PUBLIC_APP_URL` | Application URL (for production) | No |

## 📈 Performance

- **Synthesis Time**: 5-8 seconds (3 AI models + fast local analysis)
- **Semantic Accuracy**: 85-95% on related topics
- **Error Rate**: <5% with graceful recovery
- **Concurrent Users**: Scales with Vercel serverless functions
- **Vercel Compatible**: Optimized for 10s hobby plan timeout limits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for embeddings and GPT-4 synthesis
- Google for Gemini AI capabilities
- Anthropic for Claude's analytical depth
- Next.js team for the excellent framework
- Vercel for seamless deployment

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ccarnell/voiltail/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ccarnell/voiltail/discussions)
- **Email**: [support@voiltail.com](mailto:support@voiltail.com)

---

**Voiltail** - Where AI models converge and diverge to illuminate truth, hopefully.
