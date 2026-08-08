import React, { useState } from 'react';
import {
  Grid,
  Sparkles,
  Layers,
  Search,
  Plus,
  Compass,
  Download,
  RotateCcw,
  Maximize2,
  Cpu,
  Zap,
  Globe,
  Share2,
  Tag,
  Eye,
  ChevronDown,
  LayoutGrid,
} from 'lucide-react';
import { CanvasState, GridType, PresetCanvas } from '../types';
import { PRESET_CANVASES } from '../data/presets';

interface HeaderProps {
  canvasState: CanvasState;
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>;
  nodeCount: number;
  edgeCount: number;
  selectedNodeCount: number;
  onSelectPreset: (preset: PresetCanvas) => void;
  onAddNode: () => void;
  onAutoLayout: () => void;
  onSynthesizeSelected: () => void;
  onAutoRelateCanvas: () => void;
  onResetView: () => void;
  onClearCanvas: () => void;
  onExportJSON: () => void;
  availableTags: string[];
}

export const Header: React.FC<HeaderProps> = ({
  canvasState,
  setCanvasState,
  nodeCount,
  edgeCount,
  selectedNodeCount,
  onSelectPreset,
  onAddNode,
  onAutoLayout,
  onSynthesizeSelected,
  onAutoRelateCanvas,
  onResetView,
  onClearCanvas,
  onExportJSON,
  availableTags,
}) => {
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);

  const getPresetIcon = (iconName: string) => {
    switch (iconName) {
      case 'Cpu':
        return <Cpu className="w-4 h-4 text-cyan-400" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-purple-400" />;
      case 'Globe':
        return <Globe className="w-4 h-4 text-emerald-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b border-white/10 px-6 py-3 flex items-center justify-between text-slate-100">
      {/* Brand Logo & Preset Selector */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-400/10 border border-cyan-400/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-orbitron font-black text-base tracking-wider text-white uppercase display">
                REMIX <span className="text-cyan-400">GRIDSCAPE</span>
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-cyan-400 border border-white/10 tracking-widest uppercase">
                v2.6 AI
              </span>
            </div>
            <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest hidden sm:block">
              // SPATIAL CONCEPT MAPPER & RECURSIVE GRAPH
            </p>
          </div>
        </div>

        <div className="h-6 w-px bg-white/10 hidden md:block" />

        {/* Preset Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPresetsMenu(!showPresetsMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#121212] hover:bg-[#1a1a1a] border border-white/15 text-xs text-white font-mono uppercase tracking-wider transition-all"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Templates</span>
            <ChevronDown className="w-3.5 h-3.5 text-white/50" />
          </button>

          {showPresetsMenu && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-[#0c0c0c] border border-white/15 rounded-lg shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="text-[10px] font-mono uppercase text-white/40 px-2.5 py-1 tracking-widest">
                Explore Spatial Presets
              </div>
              {PRESET_CANVASES.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onSelectPreset(preset);
                    setShowPresetsMenu(false);
                  }}
                  className="w-full text-left p-2.5 rounded hover:bg-white/5 transition-colors flex items-start gap-3 group"
                >
                  <div className="p-2 rounded bg-white/5 border border-white/10 group-hover:border-cyan-400/50">
                    {getPresetIcon(preset.iconName)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-cyan-400 font-mono uppercase">
                      {preset.name}
                    </div>
                    <div className="text-[11px] text-white/50 line-clamp-1">
                      {preset.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle Tools & Search */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative hidden lg:flex items-center">
          <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search nodes or #tags..."
            value={canvasState.searchQuery}
            onChange={(e) =>
              setCanvasState((prev) => ({ ...prev, searchQuery: e.target.value }))
            }
            className="w-48 xl:w-60 pl-8 pr-3 py-1.5 rounded bg-[#121212] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-cyan-400 transition-all placeholder:text-white/30"
          />
          {canvasState.searchQuery && (
            <button
              onClick={() =>
                setCanvasState((prev) => ({ ...prev, searchQuery: '' }))
              }
              className="absolute right-2.5 text-white/40 hover:text-white text-xs font-mono"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter by Tag Dropdown */}
        {availableTags.length > 0 && (
          <div className="relative hidden xl:block">
            <button
              onClick={() => setShowTagMenu(!showTagMenu)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono uppercase tracking-wider transition-all ${
                canvasState.filterTag
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                  : 'bg-[#121212] border-white/15 text-white/70 hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{canvasState.filterTag || 'All Tags'}</span>
            </button>
            {showTagMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#0c0c0c] border border-white/15 rounded-lg shadow-xl p-1.5 z-50 max-h-56 overflow-y-auto no-scrollbar font-mono text-xs">
                <button
                  onClick={() => {
                    setCanvasState((prev) => ({ ...prev, filterTag: null }));
                    setShowTagMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded text-white/60 hover:bg-white/10"
                >
                  Clear Filter
                </button>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setCanvasState((prev) => ({ ...prev, filterTag: tag }));
                      setShowTagMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                      canvasState.filterTag === tag
                        ? 'bg-cyan-950 text-cyan-300 font-bold'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="h-6 w-px bg-white/10 hidden md:block" />

        {/* Canvas Primary Action: High-contrast + New Concept Button */}
        <button
          onClick={onAddNode}
          className="bg-white text-black hover:bg-neutral-200 px-4 py-2 font-mono text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ New Concept</span>
        </button>

        {/* AI Auto-Connect / Auto-Relate */}
        <button
          onClick={onAutoRelateCanvas}
          title="AI analyzes unconnected nodes and links non-obvious relationships"
          className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#121212] border border-purple-500/50 hover:bg-purple-950/50 text-purple-300 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Auto-Connect</span>
        </button>

        {/* Synthesize Selected (Active if 2+ nodes selected) */}
        {selectedNodeCount >= 2 && (
          <button
            onClick={onSynthesizeSelected}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-amber-950/80 border border-amber-500 text-amber-300 hover:bg-amber-900 text-xs font-mono font-bold uppercase tracking-wider animate-pulse transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Synthesize ({selectedNodeCount})</span>
          </button>
        )}

        {/* Auto Layout */}
        <button
          onClick={onAutoLayout}
          title="Force-directed spatial layout"
          className="p-2 rounded bg-[#121212] border border-white/15 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-all cursor-pointer"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
      </div>

      {/* Right Stats & Export */}
      <div className="flex items-center gap-3">
        {/* Node & Edge Stats */}
        <div className="hidden md:flex items-center gap-3 font-mono text-[11px] text-white/50 bg-[#101010] px-3 py-1.5 rounded border border-white/10">
          <div>
            <span className="text-white/30 uppercase">Nodes:</span>{' '}
            <span className="text-cyan-400 font-bold">{nodeCount}</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div>
            <span className="text-white/30 uppercase">Links:</span>{' '}
            <span className="text-purple-400 font-bold">{edgeCount}</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div>
            <span className="text-white/30 uppercase">Zoom:</span>{' '}
            <span className="text-white font-bold">
              {Math.round(canvasState.zoom * 100)}%
            </span>
          </div>
        </div>

        {/* View Controls & Reset */}
        <button
          onClick={onResetView}
          title="Reset Viewport Position"
          className="p-2 rounded bg-[#121212] border border-white/15 text-white/60 hover:text-white hover:bg-white/10 text-xs transition-all cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Export JSON / Share */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 rounded bg-[#121212] border border-white/15 text-white/60 hover:text-white hover:bg-white/10 text-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>
          {showExportMenu && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-[#0c0c0c] border border-white/15 rounded-lg shadow-2xl p-1.5 z-50 font-mono text-xs">
              <button
                onClick={() => {
                  onExportJSON();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded text-white/80 hover:bg-white/10 hover:text-white flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                Export Canvas (.JSON)
              </button>
              <button
                onClick={() => {
                  onClearCanvas();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 mt-1 border-t border-white/10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear All Nodes
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
