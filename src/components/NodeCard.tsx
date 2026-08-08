import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Maximize2,
  Trash2,
  Pin,
  Image as ImageIcon,
  Edit3,
  Check,
  Tag,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Wand2,
  RefreshCw,
  MoreVertical,
  Link2,
  Share2,
  Palette,
  Bot,
  Zap,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ConceptNode, AccentColor, NodeType } from '../types';

interface NodeCardProps {
  node: ConceptNode;
  isSelected: boolean;
  zoom: number;
  onSelect: (e: React.MouseEvent) => void;
  onUpdate: (updatedNode: ConceptNode) => void;
  onDelete: () => void;
  onStartConnect: (nodeId: string, e: React.MouseEvent) => void;
  onExpandAI: (node: ConceptNode) => void;
  onGenerateImage: (node: ConceptNode) => void;
  onOpenInspector: (nodeId: string) => void;
  isHighlighted?: boolean;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  node,
  isSelected,
  zoom,
  onSelect,
  onUpdate,
  onDelete,
  onStartConnect,
  onExpandAI,
  onGenerateImage,
  onOpenInspector,
  isHighlighted,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [editContent, setEditContent] = useState(node.content);
  const [editTagInput, setEditTagInput] = useState('');
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPromptText, setAiPromptText] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 });

  // Sync edits when node changes from outside
  useEffect(() => {
    setEditTitle(node.title);
    setEditContent(node.content);
  }, [node.title, node.content]);

  // Color mappings for accent styles
  const colorStyles: Record<
    AccentColor,
    { border: string; bgHeader: string; textAccent: string; glow: string; dotBg: string }
  > = {
    cyan: {
      border: 'border-cyan-500/60 hover:border-cyan-400',
      bgHeader: 'bg-cyan-950/40',
      textAccent: 'text-cyan-400',
      glow: 'shadow-cyan-500/20',
      dotBg: 'bg-cyan-500',
    },
    emerald: {
      border: 'border-emerald-500/60 hover:border-emerald-400',
      bgHeader: 'bg-emerald-950/40',
      textAccent: 'text-emerald-400',
      glow: 'shadow-emerald-500/20',
      dotBg: 'bg-emerald-500',
    },
    purple: {
      border: 'border-purple-500/60 hover:border-purple-400',
      bgHeader: 'bg-purple-950/40',
      textAccent: 'text-purple-400',
      glow: 'shadow-purple-500/20',
      dotBg: 'bg-purple-500',
    },
    amber: {
      border: 'border-amber-500/60 hover:border-amber-400',
      bgHeader: 'bg-amber-950/40',
      textAccent: 'text-amber-400',
      glow: 'shadow-amber-500/20',
      dotBg: 'bg-amber-500',
    },
    rose: {
      border: 'border-rose-500/60 hover:border-rose-400',
      bgHeader: 'bg-rose-950/40',
      textAccent: 'text-rose-400',
      glow: 'shadow-rose-500/20',
      dotBg: 'bg-rose-500',
    },
    slate: {
      border: 'border-slate-700 hover:border-slate-500',
      bgHeader: 'bg-slate-900/60',
      textAccent: 'text-slate-300',
      glow: 'shadow-slate-500/10',
      dotBg: 'bg-slate-400',
    },
  };

  const accent = colorStyles[node.color || 'cyan'];

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('input') ||
      (e.target as HTMLElement).closest('textarea') ||
      isEditing
    ) {
      return;
    }

    onSelect(e);
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = (moveEvent.clientX - dragStartRef.current.x) / zoom;
      const dy = (moveEvent.clientY - dragStartRef.current.y) / zoom;
      onUpdate({
        ...node,
        x: dragStartRef.current.nodeX + dx,
        y: dragStartRef.current.nodeY + dy,
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Save manual text edit
  const handleSaveEdit = () => {
    onUpdate({
      ...node,
      title: editTitle.trim() || 'Untitled Concept',
      content: editContent,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  // Add tag
  const handleAddTag = () => {
    if (!editTagInput.trim()) return;
    const newTags = Array.from(new Set([...node.tags, editTagInput.trim().toLowerCase()]));
    onUpdate({ ...node, tags: newTags });
    setEditTagInput('');
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate({ ...node, tags: node.tags.filter((t) => t !== tagToRemove) });
  };

  // Inline AI Query (e.g. "Summarize into 3 bullet points")
  const handleExecuteAiPrompt = async () => {
    if (!aiPromptText.trim()) return;
    setIsAiProcessing(true);
    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Target Concept Node: "${node.title}"
Current Content: ${node.content}
User Instruction: ${aiPromptText}`,
          systemInstruction: 'Modify or expand the node text based on the instruction. Output cleanly structured markdown.',
        }),
      });
      const data = await res.json();
      if (data.text) {
        onUpdate({
          ...node,
          content: data.text,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Failed inline AI prompt:', err);
    } finally {
      setIsAiProcessing(false);
      setAiPromptText('');
      setShowAiInput(false);
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      style={{
        transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
        width: `${node.width}px`,
        height: node.collapsed ? 'auto' : `${node.height}px`,
      }}
      className={`absolute top-0 left-0 rounded-xl node-border p-4 shadow-2xl transition-all group select-none flex flex-col ${
        accent.border
      } ${
        isSelected
          ? `ring-2 ring-cyan-400 shadow-[0_0_25px_rgba(56,189,248,0.3)] z-30`
          : isHighlighted
          ? 'ring-2 ring-purple-400 z-20 animate-pulse'
          : 'z-10 hover:border-white/30'
      }`}
    >
      {/* CONNECTION HANDLES (Top, Right, Bottom, Left) */}
      <div
        onClick={(e) => onStartConnect(node.id, e)}
        title="Click or drag to connect"
        className={`absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full ${accent.dotBg} border-2 border-[#050505] shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-crosshair flex items-center justify-center hover:scale-125 z-40`}
      >
        <Link2 className="w-2.5 h-2.5 text-black" />
      </div>
      <div
        onClick={(e) => onStartConnect(node.id, e)}
        title="Click or drag to connect"
        className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full ${accent.dotBg} border-2 border-[#050505] shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-crosshair flex items-center justify-center hover:scale-125 z-40`}
      >
        <Link2 className="w-2.5 h-2.5 text-black" />
      </div>
      <div
        onClick={(e) => onStartConnect(node.id, e)}
        title="Click or drag to connect"
        className={`absolute top-1/2 -left-2.5 -translate-y-1/2 w-5 h-5 rounded-full ${accent.dotBg} border-2 border-[#050505] shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-crosshair flex items-center justify-center hover:scale-125 z-40`}
      >
        <Link2 className="w-2.5 h-2.5 text-black" />
      </div>
      <div
        onClick={(e) => onStartConnect(node.id, e)}
        title="Click or drag to connect"
        className={`absolute top-1/2 -right-2.5 -translate-y-1/2 w-5 h-5 rounded-full ${accent.dotBg} border-2 border-[#050505] shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-crosshair flex items-center justify-center hover:scale-125 z-40`}
      >
        <Link2 className="w-2.5 h-2.5 text-black" />
      </div>

      {/* HEADER BAR */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <span className="mono text-[10px] text-white/40 uppercase tracking-tighter shrink-0">
            ID: {node.id.slice(-6).toUpperCase()}
          </span>
          <div className={`w-2 h-2 rounded-full ${accent.dotBg} shrink-0`} />
        </div>

        {/* Action Tool Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Color Menu Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowColorMenu(!showColorMenu)}
              title="Change Accent Color"
              className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white text-xs"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            {showColorMenu && (
              <div className="absolute top-full right-0 mt-1 bg-[#0c0c0c] border border-white/15 rounded shadow-xl p-1.5 flex gap-1 z-50">
                {(['cyan', 'emerald', 'purple', 'amber', 'rose', 'slate'] as AccentColor[]).map((col) => (
                  <button
                    key={col}
                    onClick={() => {
                      onUpdate({ ...node, color: col });
                      setShowColorMenu(false);
                    }}
                    className={`w-4 h-4 rounded-full ${colorStyles[col].dotBg} hover:scale-125 transition-transform`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* AI Expand Button */}
          <button
            onClick={() => onExpandAI(node)}
            disabled={node.isExpanding}
            title="AI Branch Expansion (Generate linked child concepts)"
            className="p-1 rounded bg-purple-950/60 border border-purple-500/50 hover:bg-purple-900/80 text-purple-300 text-xs transition-colors flex items-center gap-1"
          >
            {node.isExpanding ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-purple-400" />
            )}
          </button>

          {/* Pin Node */}
          <button
            onClick={() => onUpdate({ ...node, pinned: !node.pinned })}
            title={node.pinned ? 'Unpin Position' : 'Pin Position'}
            className={`p-1 rounded hover:bg-white/10 text-xs ${
              node.pinned ? 'text-amber-400 bg-amber-950/50' : 'text-white/50'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          {/* Collapse/Expand */}
          <button
            onClick={() => onUpdate({ ...node, collapsed: !node.collapsed })}
            className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white text-xs"
          >
            {node.collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          {/* Full Inspector */}
          <button
            onClick={() => onOpenInspector(node.id)}
            title="Open Node Inspector"
            className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white text-xs"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete Node */}
          <button
            onClick={onDelete}
            title="Delete Node"
            className="p-1 rounded hover:bg-rose-950/80 text-white/50 hover:text-rose-400 text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* NODE TITLE */}
      <div className="pt-2 pb-1">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="bg-[#121212] border border-cyan-400 rounded px-2 py-1 text-sm font-bold text-white font-display uppercase tracking-wide w-full focus:outline-none"
          />
        ) : (
          <h2
            onDoubleClick={() => setIsEditing(true)}
            className="display text-xl font-bold text-white uppercase tracking-tight cursor-text truncate"
          >
            {node.title}
          </h2>
        )}
      </div>

      {/* NODE BODY CONTENT */}
      {!node.collapsed && (
        <div className="pt-2 flex-1 flex flex-col justify-between overflow-y-auto no-scrollbar text-xs">
          {/* Image Banner if exists */}
          {node.imageUrl && (
            <div className="relative mb-3 rounded border border-white/10 overflow-hidden group/img bg-black">
              <img
                src={node.imageUrl}
                alt={node.title}
                className="w-full h-28 object-cover transition-transform group-hover/img:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {node.isGeneratingImage && (
            <div className="mb-3 h-24 rounded bg-white/5 border border-cyan-400/40 flex flex-col items-center justify-center text-cyan-400 gap-2 animate-pulse font-mono text-[10px]">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>[SYNTHESIZING CONTEXT IMAGE]</span>
            </div>
          )}

          {/* Text Content / Markdown or Edit textarea */}
          {isEditing ? (
            <div className="flex-1 flex flex-col gap-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={5}
                className="w-full flex-1 bg-[#121212] border border-white/20 rounded p-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
              <button
                onClick={handleSaveEdit}
                className="self-end px-3 py-1 bg-white text-black font-mono text-xs font-bold uppercase rounded flex items-center gap-1 hover:bg-neutral-200"
              >
                <Check className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>
          ) : (
            <div
              onDoubleClick={() => setIsEditing(true)}
              className="text-gray-300 font-light leading-relaxed cursor-text prose prose-invert max-w-none text-xs"
            >
              <ReactMarkdown>{node.content}</ReactMarkdown>
            </div>
          )}

          {/* Tags Section */}
          <div className="mt-3 pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5">
            {node.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-400 tracking-wider uppercase group/tag"
              >
                #{tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-rose-400 opacity-50 group-hover/tag:opacity-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* INLINE AI ASSISTANT TOOLBAR */}
          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowAiInput(!showAiInput)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-cyan-400 uppercase tracking-widest transition-colors"
              >
                <Bot className="w-3 h-3 text-cyan-400" />
                <span>Prompt</span>
              </button>

              <button
                onClick={() => onGenerateImage(node)}
                title="Generate AI image visualization for this node"
                className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-purple-300 uppercase tracking-widest transition-colors"
              >
                <ImageIcon className="w-3 h-3 text-purple-400" />
                <span>Render</span>
              </button>
            </div>

            <span className="text-[9px] font-mono text-white/30 uppercase">
              {new Date(node.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* AI Prompt Input Bar */}
          {showAiInput && (
            <div className="mt-2 p-2 bg-[#0a0a0a] border border-cyan-400/50 rounded flex items-center gap-1.5 animate-in fade-in">
              <input
                type="text"
                placeholder="Follow-up prompt for Gemini..."
                value={aiPromptText}
                onChange={(e) => setAiPromptText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExecuteAiPrompt()}
                className="w-full bg-transparent text-xs text-white focus:outline-none placeholder:text-white/30 font-mono"
              />
              <button
                onClick={handleExecuteAiPrompt}
                disabled={isAiProcessing}
                className="p-1 rounded bg-cyan-400 text-black font-bold transition-all shrink-0 hover:bg-cyan-300"
              >
                {isAiProcessing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
