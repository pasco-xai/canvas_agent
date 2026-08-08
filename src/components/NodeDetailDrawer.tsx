import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Send,
  Image as ImageIcon,
  Edit3,
  Check,
  Tag,
  Link2,
  Trash2,
  Bot,
  Layers,
  Copy,
  ExternalLink,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ConceptNode, ConceptEdge } from '../types';

interface NodeDetailDrawerProps {
  node: ConceptNode;
  allNodes: ConceptNode[];
  edges: ConceptEdge[];
  onClose: () => void;
  onUpdateNode: (updatedNode: ConceptNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onGenerateImage: (node: ConceptNode) => void;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  node,
  allNodes,
  edges,
  onClose,
  onUpdateNode,
  onDeleteNode,
  onGenerateImage,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'ai-chat' | 'connections'>('content');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [editContent, setEditContent] = useState(node.content);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);

  // Find incoming & outgoing connections
  const connectedEdges = edges.filter(
    (e) => e.fromNodeId === node.id || e.toNodeId === node.id
  );

  const handleSave = () => {
    onUpdateNode({
      ...node,
      title: editTitle,
      content: editContent,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatSending) return;
    const userMsg = chatInput;
    setChatInput('');

    const newHistory = [
      ...(node.aiHistory || []),
      {
        id: Date.now().toString(),
        role: 'user' as const,
        text: userMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    onUpdateNode({ ...node, aiHistory: newHistory });
    setIsChatSending(true);

    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Node Context:
Title: "${node.title}"
Content: ${node.content}

User Inquiry: ${userMsg}`,
          systemInstruction:
            'You are Remix Gridscape AI, directly assisting the user with deeper research and refinement on this concept node. Provide actionable markdown.',
        }),
      });

      const data = await res.json();
      if (data.text) {
        onUpdateNode({
          ...node,
          aiHistory: [
            ...newHistory,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant' as const,
              text: data.text,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsChatSending(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-[#080808] border-l border-white/15 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4 bg-[#0a0a0a]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-3 h-3 rounded-full bg-cyan-400 shrink-0" />
          <h2 className="text-base font-bold font-display text-white uppercase tracking-tight truncate">
            {node.title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onDeleteNode(node.id);
              onClose();
            }}
            title="Delete Node"
            className="p-1.5 rounded hover:bg-rose-950/80 text-white/50 hover:text-rose-400 text-xs transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white text-xs transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-[#050505] px-6 font-mono text-xs text-white/50 uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('content')}
          className={`py-3 px-4 border-b-2 font-bold transition-all ${
            activeTab === 'content'
              ? 'border-cyan-400 text-cyan-300 bg-white/5'
              : 'border-transparent hover:text-white'
          }`}
        >
          Node Content
        </button>
        <button
          onClick={() => setActiveTab('ai-chat')}
          className={`py-3 px-4 border-b-2 font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'ai-chat'
              ? 'border-purple-400 text-purple-300 bg-white/5'
              : 'border-transparent hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          AI Research Chat
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          className={`py-3 px-4 border-b-2 font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'connections'
              ? 'border-emerald-400 text-emerald-300 bg-white/5'
              : 'border-transparent hover:text-white'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          Connections ({connectedEdges.length})
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-6 font-sans text-slate-200 space-y-6 no-scrollbar">
        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Image Banner */}
            {node.imageUrl ? (
              <div className="relative rounded border border-white/10 overflow-hidden bg-black">
                <img
                  src={node.imageUrl}
                  alt={node.title}
                  className="w-full h-56 object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <button
                onClick={() => onGenerateImage(node)}
                className="w-full py-4 border border-dashed border-white/20 hover:border-purple-400 rounded bg-[#121212] text-white/60 hover:text-purple-300 text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-purple-400" />
                Generate Context Image Banner via Gemini AI
              </button>
            )}

            {/* Title & Edit Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                MARKDOWN WORKSPACE
              </span>
              <button
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                className="px-3 py-1 rounded bg-white text-black font-mono text-xs font-bold uppercase hover:bg-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isEditing ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Markdown
                  </>
                )}
              </button>
            </div>

            {/* Content Field */}
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#121212] border border-cyan-400 rounded p-2.5 text-sm font-bold text-white font-display uppercase tracking-wide"
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={12}
                  className="w-full bg-[#121212] border border-white/20 rounded p-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            ) : (
              <div className="prose prose-invert max-w-none bg-[#0c0c0c] p-4 rounded border border-white/10 leading-relaxed text-xs">
                <ReactMarkdown>{node.content}</ReactMarkdown>
              </div>
            )}

            {/* Tags */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">
                CONCEPT TAGS
              </div>
              <div className="flex flex-wrap gap-2">
                {node.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-xs font-mono text-cyan-400 uppercase tracking-wider"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI CHAT TAB */}
        {activeTab === 'ai-chat' && (
          <div className="flex flex-col h-full justify-between space-y-4">
            <div className="space-y-4 flex-1">
              <div className="text-xs text-purple-300 bg-purple-950/40 border border-purple-500/40 p-3 rounded font-mono">
                Ask Gemini AI questions specifically grounded in this concept node to refine or expand relationships.
              </div>

              {(node.aiHistory || []).map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3.5 rounded text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#141414] text-white ml-8 border border-white/15'
                      : 'bg-purple-950/40 text-purple-200 mr-8 border border-purple-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] text-white/40 mb-1.5 uppercase">
                    <span>{msg.role === 'user' ? 'YOU' : 'REMIX GEMINI'}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="flex items-center gap-2 pt-3 border-t border-white/10">
              <input
                type="text"
                placeholder="Ask Gemini about this concept..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                className="flex-1 bg-[#121212] border border-white/15 rounded px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
              />
              <button
                onClick={handleSendChatMessage}
                disabled={isChatSending}
                className="p-2.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* CONNECTIONS TAB */}
        {activeTab === 'connections' && (
          <div className="space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">
              INTERCONNECTED GRAPH RELATIONSHIPS
            </div>

            {connectedEdges.length === 0 ? (
              <div className="p-6 text-center text-xs text-white/40 border border-dashed border-white/10 rounded font-mono">
                No active links to other nodes. Drag from node handles on the spatial canvas to create links!
              </div>
            ) : (
              connectedEdges.map((edge) => {
                const targetId =
                  edge.fromNodeId === node.id ? edge.toNodeId : edge.fromNodeId;
                const targetNode = allNodes.find((n) => n.id === targetId);

                return (
                  <div
                    key={edge.id}
                    className="p-3 bg-[#121212] border border-white/10 rounded flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Link2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="font-bold text-white uppercase font-display">
                          {targetNode?.title || 'Unknown Node'}
                        </div>
                        <div className="text-[10px] font-mono text-purple-400 uppercase">
                          {edge.label || 'Connected'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
