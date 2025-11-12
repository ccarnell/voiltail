'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Paperclip, AlertTriangle, Zap, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { preprocessMarkdown } from '@/lib/markdown-utils';
import type { ConsensusAnalysis, FileAttachment } from '@/types/ai';

interface QueryItem {
  prompt: string;
  analysis: ConsensusAnalysis;
  showDetails: boolean;
}

export default function ConsensusPage() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<QueryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attachments] = useState<FileAttachment[]>([]);
  const [synthesisMode, setSynthesisMode] = useState<'basic' | 'pro'>('pro'); // Default to Pro for testing
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [streamingResults, setStreamingResults] = useState<{
    prompt: string;
    progress: number;
    models: Record<string, string>;
    currentPhase: string;
    showDetails: boolean;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const currentPrompt = prompt;
    setPrompt(''); // Clear input immediately
    setIsLoading(true);
    setError(null);
    
    const startTime = Date.now();

    try {
      if (synthesisMode === 'pro') {
        // Use streaming for Pro mode
        await handleStreamingSynthesis(currentPrompt, startTime);
      } else {
        // Use regular synthesis for Basic mode
        await handleBasicSynthesis(currentPrompt, startTime);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setPrompt(currentPrompt); // Restore prompt on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleBasicSynthesis = async (currentPrompt: string, startTime: number) => {
    const response = await fetch('/api/ai/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: currentPrompt, 
        attachments,
        mode: 'basic'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to synthesize responses');
    }

    // Track performance metrics
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    setProcessingTime(totalTime);
    setEstimatedCost(0.03);

    // Add new conversation to the list
    setConversations(prev => [...prev, {
      prompt: currentPrompt,
      analysis: data.analysis,
      showDetails: false
    }]);
  };

  const handleStreamingSynthesis = async (currentPrompt: string, startTime: number) => {
    const response = await fetch('/api/ai/synthesize-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: currentPrompt, 
        attachments,
        mode: 'pro'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to start streaming synthesis');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    const streamingResult = {
      prompt: currentPrompt,
      progress: 0,
      models: {} as Record<string, string>,
      currentPhase: 'Starting...',
      showDetails: false
    };

    setStreamingResults({ ...streamingResult });

    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                switch (data.type) {
                  case 'started':
                    streamingResult.currentPhase = data.message;
                    streamingResult.progress = data.progress;
                    break;
                    
                  case 'model_complete':
                    streamingResult.models[data.modelName] = `✅ ${data.modelName} (${(data.responseTime / 1000).toFixed(1)}s)`;
                    streamingResult.progress = data.progress;
                    streamingResult.currentPhase = `${data.modelName} completed`;
                    break;
                    
                  case 'model_error':
                    streamingResult.models[data.model] = `❌ ${data.model} failed`;
                    streamingResult.progress = data.progress;
                    break;
                    
                  case 'embeddings_started':
                    streamingResult.currentPhase = data.message;
                    streamingResult.progress = data.progress;
                    break;
                    
                  case 'embeddings_progress':
                    streamingResult.currentPhase = data.message;
                    streamingResult.progress = data.progress;
                    break;
                    
                  case 'synthesis_started':
                    streamingResult.currentPhase = data.message;
                    streamingResult.progress = data.progress;
                    break;
                    
                  case 'synthesis_complete':
                    // Handle hybrid approach - fetch result from storage
                    const endTime = Date.now();
                    const totalTime = endTime - startTime;
                    setProcessingTime(totalTime);
                    setEstimatedCost(data.metadata.estimatedCost || 0.09);

                    // Fetch the actual result with retry logic
                    let retries = 3;
                    let fetchSuccess = false;
                    
                    while (retries > 0 && !fetchSuccess) {
                      try {
                        console.log(`Fetching result ${data.resultId}, attempts remaining: ${retries}`);
                        const resultResponse = await fetch(`/api/ai/synthesis-result/${data.resultId}`);
                        
                        if (!resultResponse.ok) {
                          const errorData = await resultResponse.text();
                          console.error(`Result fetch failed: ${resultResponse.status} - ${errorData}`);
                          throw new Error(`Failed to fetch synthesis result: ${resultResponse.status}`);
                        }
                        
                        const resultData = await resultResponse.json();
                        console.log('Successfully fetched synthesis result');
                        
                        // Add new conversation to the list
                        setConversations(prev => [...prev, {
                          prompt: currentPrompt,
                          analysis: resultData.analysis,
                          showDetails: false
                        }]);
                        
                        fetchSuccess = true;
                      } catch (fetchError) {
                        console.error(`Error fetching result (attempt ${4-retries}):`, fetchError);
                        retries--;
                        
                        if (retries > 0) {
                          // Wait 1 second before retry
                          await new Promise(resolve => setTimeout(resolve, 1000));
                        } else {
                          setError(`Failed to retrieve synthesis result after 3 attempts: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
                        }
                      }
                    }
                    
                    setStreamingResults(null);
                    return;
                    
                  case 'error':
                    throw new Error(data.error);
                }
                
                setStreamingResults({ ...streamingResult });
              } catch (parseError) {
                console.error('Error parsing streaming data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }
  };

  const toggleDetails = (index: number) => {
    setConversations(prev => prev.map((conv, i) => 
      i === index ? { ...conv, showDetails: !conv.showDetails } : conv
    ));
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
              <strong>Each query is analyzed independently</strong> - no conversation context is maintained between queries.
              Model agreement may reflect shared training data limitations. 
              <i> More Aligned</i> does not necessarily mean <b>More True</b>. Always verify 
              important information from primary sources.
            </span>
          </div>
        </Card>

        {/* Query Results */}
        <div className="space-y-8 mb-6">
          {conversations.map((conversation, conversationIndex) => (
            <div key={conversationIndex} className="w-full">
              {/* User Query - Simple, not a chat bubble */}
              <div className="mb-6 text-center">
                <div className="inline-block px-6 py-3 bg-gray-800/30 rounded-lg border border-gray-700">
                  <p className="text-gray-200 font-medium">{conversation.prompt}</p>
                </div>
              </div>

              {/* Consensus Result - Matching updated_design.html */}
              <div className="max-w-4xl mx-auto text-center">
                {/* Agreement Indicator */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/30 rounded-full border border-gray-600 mb-8">
                  <span className="text-sm text-gray-300">Agreement Level</span>
                  <div className="w-30 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
                      style={{ width: `${Math.round(conversation.analysis.alignment.semantic * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-white">
                    {Math.round(conversation.analysis.alignment.semantic * 100)}%
                  </span>
                </div>

                {/* Primary Consensus - Large and Prominent */}
                <h1 className="text-4xl font-light leading-relaxed mb-10 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  {/* Extract first meaningful sentence as primary takeaway */}
                  {(() => {
                    const processed = preprocessMarkdown(conversation.analysis.unifiedResponse);
                    const firstParagraph = processed.split('\n\n')[0];
                    const firstSentence = firstParagraph.split('.')[0];
                    return firstSentence.length > 20 ? firstSentence + '.' : firstParagraph;
                  })()}
                </h1>

                {/* Secondary Points */}
                <div className="flex flex-col gap-4 mb-8">
                  {/* Where Models Agreed */}
                  {conversation.analysis.alignedPoints && conversation.analysis.alignedPoints.length > 0 && (
                    conversation.analysis.alignedPoints.map((point, index) => (
                      <div key={index} className="p-4 bg-gray-800/20 rounded-lg border border-gray-700/50 text-left hover:bg-gray-800/30 transition-colors">
                        <strong className="text-green-400">High Agreement:</strong> <span className="text-gray-300">{point.content}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Full Synthesis Content */}
                <div className="text-left prose prose-invert max-w-none text-gray-300 leading-relaxed mb-6">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      h1: ({children}) => <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>,
                      h2: ({children}) => <h2 className="text-xl font-semibold text-white mb-3 mt-6">{children}</h2>,
                      h3: ({children}) => <h3 className="text-lg font-medium text-white mb-2 mt-4">{children}</h3>,
                      p: ({children}) => <p className="text-gray-300 mb-3 leading-relaxed">{children}</p>,
                      ul: ({children}) => <ul className="list-disc list-inside text-gray-300 mb-3 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal list-inside text-gray-300 mb-3 space-y-1">{children}</ol>,
                      li: ({children}) => <li className="text-gray-300">{children}</li>,
                      strong: ({children}) => <strong className="text-white font-semibold">{children}</strong>,
                      em: ({children}) => <em className="text-cyan-300">{children}</em>,
                      blockquote: ({children}) => <blockquote className="border-l-4 border-cyan-500 pl-4 italic text-gray-400 my-4">{children}</blockquote>,
                      code: ({children}) => <code className="bg-gray-800 text-cyan-300 px-1 py-0.5 rounded text-sm">{children}</code>,
                      pre: ({children}) => <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
                    }}
                  >
                    {preprocessMarkdown(conversation.analysis.unifiedResponse)}
                  </ReactMarkdown>
                </div>

                {/* View Individual Reasoning Toggle */}
                <div className="text-center mb-6">
                  <button 
                    className="text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer text-sm"
                    onClick={() => toggleDetails(conversationIndex)}
                  >
                    {conversation.showDetails ? '▲ Hide individual reasoning' : '▼ View individual reasoning'}
                  </button>
                </div>

                {/* Model Details */}
                {conversation.showDetails && (
                  <div className="space-y-4 text-left">
                    {conversation.analysis.originalResponses.map((response, index: number) => {
                      const modelConfig = {
                        gemini: { color: '#4285F4', name: 'Gemini' },
                        openai: { color: '#10A37F', name: 'ChatGPT' },
                        claude: { color: '#F97316', name: 'Claude' }
                      };
                      const config = modelConfig[response.model as keyof typeof modelConfig];
                      
                      return (
                        <div key={index} className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: config.color }}
                            />
                            <span className="font-medium text-white">{config.name}</span>
                          </div>
                          <div className="text-sm text-gray-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeHighlight]}
                              components={{
                                h1: ({children}) => <h1 className="text-lg font-bold text-white mb-2">{children}</h1>,
                                h2: ({children}) => <h2 className="text-base font-semibold text-white mb-2">{children}</h2>,
                                h3: ({children}) => <h3 className="text-sm font-medium text-white mb-1">{children}</h3>,
                                p: ({children}) => <p className="text-gray-300 mb-2 text-sm">{children}</p>,
                                ul: ({children}) => <ul className="list-disc list-inside text-gray-300 mb-2 space-y-0.5 text-sm">{children}</ul>,
                                ol: ({children}) => <ol className="list-decimal list-inside text-gray-300 mb-2 space-y-0.5 text-sm">{children}</ol>,
                                li: ({children}) => <li className="text-gray-300 text-sm">{children}</li>,
                                strong: ({children}) => <strong className="text-white font-semibold">{children}</strong>,
                                em: ({children}) => <em className="text-cyan-300">{children}</em>,
                                code: ({children}) => <code className="bg-gray-800 text-cyan-300 px-1 py-0.5 rounded text-xs">{children}</code>,
                                pre: ({children}) => <pre className="bg-gray-800 p-2 rounded text-xs overflow-x-auto mb-2">{children}</pre>
                              }}
                            >
                              {response.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Streaming Progress Display */}
          {streamingResults && (
            <div className="w-full mb-6">
              <Card className="bg-gray-900/50 border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  <span className="text-gray-300">Pro Mode: Sophisticated synthesis in progress...</span>
                </div>
                
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-cyan-400 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${streamingResults.progress}%` }}
                    />
                  </div>
                  
                  {/* Current Phase */}
                  <div className="text-sm text-gray-300">
                    <span className="font-medium">Current Phase:</span> {streamingResults.currentPhase}
                  </div>
                  
                  <div className="text-sm text-gray-400">
                    Progress: {streamingResults.progress}%
                  </div>
                  
                  {/* Model Status */}
                  {Object.keys(streamingResults.models).length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-300">Model Status:</div>
                      <div className="grid grid-cols-1 gap-2">
                        {Object.entries(streamingResults.models).map(([model, status]) => (
                          <div key={model} className="text-xs text-gray-400 flex items-center gap-2">
                            <span>{status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Phase Indicators */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className={`flex items-center gap-1 ${streamingResults.progress > 0 ? 'text-cyan-400' : ''}`}>
                      <div className={`w-2 h-2 rounded-full ${streamingResults.progress > 0 ? 'bg-cyan-400' : 'bg-gray-600'}`} />
                      <span>Models</span>
                    </div>
                    <div className={`flex items-center gap-1 ${streamingResults.progress > 60 ? 'text-cyan-400' : ''}`}>
                      <div className={`w-2 h-2 rounded-full ${streamingResults.progress > 60 ? 'bg-cyan-400' : 'bg-gray-600'}`} />
                      <span>Embeddings</span>
                    </div>
                    <div className={`flex items-center gap-1 ${streamingResults.progress > 80 ? 'text-cyan-400' : ''}`}>
                      <div className={`w-2 h-2 rounded-full ${streamingResults.progress > 80 ? 'bg-cyan-400' : 'bg-gray-600'}`} />
                      <span>GPT-4 Synthesis</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !streamingResults && (
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
          {/* Product Owner Testing Controls */}
          <div className="mb-4">
            <Card className="bg-gray-900/50 border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSynthesisMode(synthesisMode === 'basic' ? 'pro' : 'basic')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        synthesisMode === 'pro' ? 'bg-cyan-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          synthesisMode === 'pro' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <label className="text-sm font-medium text-gray-300">
                      {synthesisMode === 'pro' ? 'Pro Mode' : 'Basic Mode'}
                    </label>
                  </div>
                  
                  {synthesisMode === 'pro' && (
                    <div className="flex items-center gap-2 text-xs text-amber-400">
                      <Zap className="w-4 h-4" />
                      <span>Sophisticated synthesis with GPT-4 + embeddings</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  {processingTime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{(processingTime / 1000).toFixed(1)}s</span>
                    </div>
                  )}
                  {estimatedCost && (
                    <div className="flex items-center gap-1">
                      <span>~${estimatedCost.toFixed(3)}</span>
                    </div>
                  )}
                  <div className="text-xs">
                    {synthesisMode === 'basic' 
                      ? 'Fast synthesis • ~$0.03/query' 
                      : 'Advanced synthesis • ~$0.09/query'
                    }
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 focus-within:border-cyan-500 transition-colors">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <textarea
                    value={prompt}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                      setPrompt(e.target.value);
                      // Auto-expand textarea
                      const target = e.target;
                      target.style.height = 'auto';
                      const scrollHeight = target.scrollHeight;
                      const maxHeight = 16 * 24; // 16 rows * ~24px per row
                      target.style.height = Math.min(scrollHeight, maxHeight) + 'px';
                      target.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
                    }}
                    placeholder="Ask a research question..."
                    className="w-full bg-transparent border-none resize-none focus:ring-0 text-gray-200 placeholder-gray-500 outline-none min-h-[60px]"
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
