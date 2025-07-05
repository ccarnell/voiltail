'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Paperclip, AlertTriangle } from 'lucide-react';
import type { ConsensusAnalysis, FileAttachment } from '@/types/ai';

interface ConversationItem {
  prompt: string;
  analysis: ConsensusAnalysis;
  showDetails: boolean;
}

export default function ConsensusPage() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attachments] = useState<FileAttachment[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const currentPrompt = prompt;
    setPrompt(''); // Clear input immediately
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt, attachments })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to synthesize responses');
      }

      // Add new conversation to the list
      setConversations(prev => [...prev, {
        prompt: currentPrompt,
        analysis: data.analysis,
        showDetails: false
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setPrompt(currentPrompt); // Restore prompt on error
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDetails = (index: number) => {
    setConversations(prev => prev.map((conv, i) => 
      i === index ? { ...conv, showDetails: !conv.showDetails } : conv
    ));
  };


  const getModelBarWidth = (model: 'gemini' | 'chatgpt' | 'claude', alignment: ConsensusAnalysis['alignment']) => {
    const level = alignment[model];
    switch (level) {
      case 'high': return '85%';
      case 'moderate': return '60%';
      case 'low': return '35%';
      default: return '50%';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 p-6 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Voiltail</h1>
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">BETA</span>
            </div>
            <span className="text-sm text-gray-400 text-center">Convergence and Divergence Synthesizer</span>
          </div>
          <div></div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 pb-32">
        {/* Disclaimer */}
        <Card className="bg-gray-900/50 border-gray-700 p-4 mb-6">
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <span>
              This synthesis combines outputs from multiple AI models for exploratory purposes. 
              Model agreement may reflect shared training data limitations. 
              <i> More Aligned</i> does not necessarily mean <b>More True</b>. Always verify 
              important information from primary sources.
            </span>
          </div>
        </Card>

        {/* Chat Messages */}
        <div className="space-y-6 mb-6">
          {conversations.map((conversation, conversationIndex) => (
            <div key={conversationIndex}>
              {/* User Message */}
              <div className="flex justify-end mb-4">
                <Card className="bg-gray-800 border-gray-700 p-4 max-w-2xl">
                  <p className="text-gray-200">{conversation.prompt}</p>
                </Card>
              </div>

              {/* AI Response */}
              <div className="w-full mb-6">
                <Card className="bg-gray-900/50 border-gray-700 p-6">
                  {/* Alignment Visualization */}
                  <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-300">Model Alignment</span>
                    </div>
                    <div className="space-y-3">
                      {/* Model Bars */}
                      <div className="relative h-7 bg-gray-700 rounded overflow-hidden">
                        <div 
                          className="absolute top-0 h-2 bg-blue-500/70 rounded transition-all duration-300"
                          style={{ width: getModelBarWidth('gemini', conversation.analysis.alignment) }}
                          title="Gemini alignment"
                        />
                        <div 
                          className="absolute top-2.5 h-2 bg-green-500/70 rounded transition-all duration-300"
                          style={{ width: getModelBarWidth('chatgpt', conversation.analysis.alignment) }}
                          title="ChatGPT alignment"
                        />
                        <div 
                          className="absolute top-5 h-2 bg-orange-500/70 rounded transition-all duration-300"
                          style={{ width: getModelBarWidth('claude', conversation.analysis.alignment) }}
                          title="Claude alignment"
                        />
                      </div>
                      
                      {/* Legend */}
                      <div className="flex justify-between text-xs text-gray-500 uppercase tracking-wide">
                        <span>← Divergent</span>
                        <span>Aligned →</span>
                      </div>
                    </div>
                  </div>

                  {/* Synthesis Content */}
                  <div className="prose prose-invert max-w-none">
                    <div 
                      className="whitespace-pre-wrap text-gray-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: conversation.analysis.unifiedResponse.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                      }}
                    />
                  </div>

                  {/* Divergent Sections */}
                  {conversation.analysis.divergentSections.map((section, index: number) => (
                    <div key={index} className="mt-4 border-l-2 border-purple-500 bg-purple-500/5 pl-4 py-2">
                      <div className="flex items-center gap-2 text-purple-400 text-sm mb-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 16l3-8 3 8M18 13h2M6 9l6 6M6 15l6-6"/>
                        </svg>
                        {section.topic}
                      </div>
                      <p className="text-sm text-gray-300">{section.description}</p>
                    </div>
                  ))}

                  {/* Metadata */}
                  <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-700 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <span>{conversation.analysis.alignment.description}</span>
                    </div>
                    <span>•</span>
                    <button 
                      className="text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      onClick={() => toggleDetails(conversationIndex)}
                    >
                      {conversation.showDetails ? 'Hide individual reasoning' : 'View individual reasoning'}
                    </button>
                  </div>

                  {/* Model Details */}
                  {conversation.showDetails && (
                    <div className="mt-6 pt-6 border-t border-gray-700 space-y-4">
                      {conversation.analysis.originalResponses.map((response, index: number) => {
                        const modelConfig = {
                          gemini: { color: '#4285F4', name: 'Gemini', tag: 'Emphasized research methodology' },
                          openai: { color: '#10A37F', name: 'ChatGPT', tag: 'Highlighted technical implementation' },
                          claude: { color: '#F97316', name: 'Claude', tag: 'Focused on comprehensive analysis' }
                        };
                        const config = modelConfig[response.model as keyof typeof modelConfig];
                        
                        return (
                          <div key={index} className="bg-black/30 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: config.color }}
                                />
                                <span className="font-medium text-sm">{config.name}</span>
                              </div>
                              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                                {config.tag}
                              </span>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed">
                              {response.content}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          ))}

          {/* Loading State */}
          {isLoading && (
            <div className="w-full">
              <Card className="bg-gray-900/50 border-gray-700 p-6">
                <div className="flex items-center gap-3 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Synthesizing responses from 3 AI models...</span>
                </div>
              </Card>
            </div>
          )}
        </div>

        </div>
      </div>

      {/* Fixed Input at Bottom */}
      <div className="border-t border-gray-800 bg-black p-6 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 focus-within:border-cyan-500 transition-colors">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <textarea
                    value={prompt}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                    placeholder="Ask a research question..."
                    className="w-full bg-transparent border-none resize-none focus:ring-0 text-gray-200 placeholder-gray-500 outline-none"
                    rows={3}
                    disabled={isLoading}
                  />
                  <div className="flex justify-start mt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white p-1"
                      disabled={isLoading}
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={!prompt.trim() || isLoading}
                  className="bg-cyan-600 hover:bg-cyan-700 text-black font-medium px-4 py-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Synthesizing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Synthesize
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex justify-left gap-3">
              <Badge variant="outline" className="text-blue-400 border-blue-400/30 text-xs">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-1" />
                Gemini 1.5 Flash
              </Badge>
              <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-1" />
                ChatGPT 4o
              </Badge>
              <Badge variant="outline" className="text-orange-400 border-orange-400/30 text-xs">
                <div className="w-2 h-2 bg-orange-400 rounded-full mr-1" />
                Claude Sonnet 4
              </Badge>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
