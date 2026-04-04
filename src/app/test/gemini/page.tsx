'use client';

import { useState } from 'react';
import { generateTextAction, generateAudioAction } from '../../actions';

export default function GeminiTester() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (type: 'text' | 'audio') => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setResult('');
    setError(null);

    try {
      let res;
      if (type === 'text') {
        res = await generateTextAction(prompt);
      } else {
        res = await generateAudioAction(prompt);
      }

      if (res.success && res.text) {
        setResult(res.text);
      } else {
        setError(res.error || 'An unexpected error occurred.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with Apollo server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-gray-900 to-black text-white p-8 font-sans transition-colors duration-1000">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[85vh] gap-10">
        
        {/* Header Section */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-1000">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-fuchsia-500 to-indigo-500">
            Gemini Studio
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto text-lg font-medium">
            Experience the power of the next generation multimodal AI.
          </p>
        </div>

        {/* Input Card */}
        <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-500"></div>
            <textarea
              className="relative w-full bg-gray-900/50 text-gray-100 placeholder-gray-500 border border-white/10 rounded-2xl p-6 text-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 resize-none transition-all duration-300"
              rows={4}
              placeholder="What would you like to create today?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleAction('text')}
              disabled={isLoading || !prompt.trim()}
              className="relative px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Generate Text
              </div>
            </button>
            <button
              onClick={() => handleAction('audio')}
              disabled={isLoading || !prompt.trim()}
              className="relative px-8 py-4 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-pink-500/30 transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Generate Audio
              </div>
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="w-full min-h-[200px]">
          {isLoading && (
            <div className="flex flex-col items-center justify-center space-y-4 animate-pulse">
              <div className="w-12 h-12 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 font-medium tracking-widest uppercase text-sm">Processing request...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="w-full bg-red-500/10 border border-red-500/30 text-red-200 p-6 rounded-2xl flex items-start gap-4 animate-in zoom-in-95 duration-300">
              <svg className="w-6 h-6 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="font-medium whitespace-pre-wrap">{error}</p>
            </div>
          )}

          {!isLoading && result && !error && (
            <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-500">
              <h3 className="text-sm font-bold uppercase tracking-widest text-fuchsia-400 mb-6 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Generated Result
              </h3>
              <div className="prose prose-invert max-w-none text-gray-200 leading-relaxed font-light text-lg">
                 {/* For simple text display, rendering lines as paragraphs */}
                 {result.split('\n').map((line, i) => (
                   <p key={i} className="mb-2 min-h-[1.5rem]">{line}</p>
                 ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
