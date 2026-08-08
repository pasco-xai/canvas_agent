import React, { useState } from 'react';
import { Sparkles, Wand2, Layers, RefreshCw, Send, HelpCircle } from 'lucide-react';

interface AICommandBarProps {
  onGenerateCluster: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  selectedCount: number;
  onSynthesize: () => void;
  onAutoConnect: () => void;
}

export const AICommandBar: React.FC<AICommandBarProps> = ({
  onGenerateCluster,
  isGenerating,
  selectedCount,
  onSynthesize,
  onAutoConnect,
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    const text = prompt;
    setPrompt('');
    await onGenerateCluster(text);
  };

  const suggestions = [
    'Autonomous AI Agent Pipeline',
    'Quantum Encryption Protocol',
    'Deep Sea Submersible Ecosystem',
    'B2B SaaS Micro-frontend Architecture',
  ];

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
      <div className="bg-[#0a0a0a]/95 border border-white/15 rounded-2xl shadow-2xl p-3 backdrop-blur-md flex flex-col gap-2.5">
        {/* Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-[10px]">
          <span className="text-white/40 font-mono text-[10px] uppercase tracking-widest shrink-0 pl-1">
            EXPLORE:
          </span>
          {suggestions.map((sug) => (
            <button
              key={sug}
              onClick={() => setPrompt(sug)}
              className="px-2.5 py-1 rounded bg-[#141414] border border-white/10 text-white/70 hover:text-cyan-400 hover:border-cyan-400/50 font-mono tracking-wider uppercase whitespace-nowrap transition-colors shrink-0"
            >
              + {sug}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="flex items-center gap-2.5 pl-3 flex-1 bg-[#121212] border border-white/15 rounded-lg focus-within:border-cyan-400 transition-all">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <input
              type="text"
              placeholder="Prompt Gemini AI to generate interconnected concept cluster..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              className="w-full bg-transparent py-2.5 text-xs text-white focus:outline-none placeholder:text-white/30 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={!prompt.trim() || isGenerating}
            className="px-5 py-2.5 rounded bg-white text-black font-mono text-xs font-bold uppercase hover:bg-neutral-200 disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-lg active:scale-95"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>GENERATING</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>GENERATE</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
