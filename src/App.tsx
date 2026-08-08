import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ConceptNode,
  ConceptEdge,
  CanvasState,
  PresetCanvas,
  AccentColor,
} from './types';
import { PRESET_CANVASES } from './data/presets';
import { Header } from './components/Header';
import { Canvas } from './components/Canvas';
import { Minimap } from './components/Minimap';
import { AICommandBar } from './components/AICommandBar';
import { NodeDetailDrawer } from './components/NodeDetailDrawer';
import {
  calculateChildNodePositions,
  autoLayoutNodes,
  snapValue,
} from './utils/canvasMath';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  // Load default preset
  const defaultPreset = PRESET_CANVASES[0];

  const [nodes, setNodes] = useState<ConceptNode[]>(defaultPreset.nodes);
  const [edges, setEdges] = useState<ConceptEdge[]>(defaultPreset.edges);

  // Canvas Viewport State
  const [canvasState, setCanvasState] = useState<CanvasState>({
    pan: { x: 180, y: 100 },
    zoom: 0.9,
    gridType: 'dots',
    snapToGrid: true,
    gridSize: 20,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    connectingFromId: null,
    connectingHoverNodeId: null,
    connectingPoint: null,
    isDraggingCanvas: false,
    activeTool: 'select',
    searchQuery: '',
    filterTag: null,
    showMinimap: true,
    showInspectorNodeId: null,
  });

  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Window dimension tracking for Minimap
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show brief floating toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Keyboard Shortcuts (Delete, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input/textarea
      if (
        ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (canvasState.selectedNodeIds.length > 0) {
          const toDelete = canvasState.selectedNodeIds;
          setNodes((prev) => prev.filter((n) => !toDelete.includes(n.id)));
          setEdges((prev) =>
            prev.filter(
              (edge) =>
                !toDelete.includes(edge.fromNodeId) &&
                !toDelete.includes(edge.toNodeId)
            )
          );
          setCanvasState((prev) => ({ ...prev, selectedNodeIds: [] }));
          showToast(`Deleted ${toDelete.length} node(s)`);
        }
      }

      if (e.key === 'Escape') {
        setCanvasState((prev) => ({
          ...prev,
          selectedNodeIds: [],
          showInspectorNodeId: null,
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasState.selectedNodeIds, showToast]);

  // Available tags across all nodes
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    nodes.forEach((n) => n.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }, [nodes]);

  // Load preset canvas
  const handleSelectPreset = (preset: PresetCanvas) => {
    setNodes(preset.nodes);
    setEdges(preset.edges);
    setCanvasState((prev) => ({
      ...prev,
      pan: { x: 180, y: 100 },
      zoom: 0.9,
      selectedNodeIds: [],
      showInspectorNodeId: null,
    }));
    showToast(`Loaded map template: "${preset.name}"`);
  };

  // Add new single node
  const handleAddNode = () => {
    const viewportCenterX = (-canvasState.pan.x + windowDimensions.width / 2) / canvasState.zoom;
    const viewportCenterY = (-canvasState.pan.y + windowDimensions.height / 2) / canvasState.zoom;

    const newNode: ConceptNode = {
      id: `node-${Date.now()}`,
      title: 'New Concept Node',
      content: 'Double-click to edit markdown content. Add key ideas, notes, or use AI prompts.',
      x: snapValue(viewportCenterX - 160),
      y: snapValue(viewportCenterY - 100),
      width: 320,
      height: 200,
      type: 'concept',
      color: 'cyan',
      tags: ['concept'],
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };

    setNodes((prev) => [...prev, newNode]);
    setCanvasState((prev) => ({ ...prev, selectedNodeIds: [newNode.id] }));
    showToast('Created new concept node');
  };

  // Update single node
  const handleUpdateNode = (updatedNode: ConceptNode) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === updatedNode.id ? updatedNode : n))
    );
  };

  // Delete single node
  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) =>
      prev.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId)
    );
    setCanvasState((prev) => ({
      ...prev,
      selectedNodeIds: prev.selectedNodeIds.filter((id) => id !== nodeId),
      showInspectorNodeId:
        prev.showInspectorNodeId === nodeId ? null : prev.showInspectorNodeId,
    }));
    showToast('Node deleted');
  };

  // Create Edge
  const handleCreateEdge = (fromId: string, toId: string, label?: string) => {
    // Check if edge already exists
    const exists = edges.some(
      (e) =>
        (e.fromNodeId === fromId && e.toNodeId === toId) ||
        (e.fromNodeId === toId && e.toNodeId === fromId)
    );

    if (exists) return;

    const newEdge: ConceptEdge = {
      id: `edge-${Date.now()}`,
      fromNodeId: fromId,
      toNodeId: toId,
      label: label || 'Relates to',
      style: 'curved',
      animated: true,
      color: '#38bdf8',
    };

    setEdges((prev) => [...prev, newEdge]);
    showToast('Connected concept nodes');
  };

  // Delete Edge
  const handleDeleteEdge = (edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    showToast('Connection removed');
  };

  // AI Branch Expansion for a node
  const handleExpandAI = async (node: ConceptNode) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === node.id ? { ...n, isExpanding: true } : n))
    );

    try {
      const res = await fetch('/api/gemini/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: node.title,
          content: node.content,
          tags: node.tags,
        }),
      });

      const data = await res.json();
      if (data.childrenNodes && Array.isArray(data.childrenNodes)) {
        const positions = calculateChildNodePositions(
          node,
          data.childrenNodes.length,
          nodes
        );

        const newChildNodes: ConceptNode[] = [];
        const newChildEdges: ConceptEdge[] = [];

        data.childrenNodes.forEach((child: any, idx: number) => {
          const childId = `node-ai-${Date.now()}-${idx}`;
          const pos = positions[idx] || { x: node.x + 350, y: node.y + idx * 220 };

          newChildNodes.push({
            id: childId,
            title: child.title,
            content: child.summary,
            x: pos.x,
            y: pos.y,
            width: 320,
            height: 200,
            type: 'ai-workspace',
            color: (child.colorAccent as AccentColor) || 'purple',
            tags: child.tags || ['ai-expansion'],
            status: 'exploring',
            parentId: node.id,
            updatedAt: new Date().toISOString(),
          });

          newChildEdges.push({
            id: `edge-ai-${Date.now()}-${idx}`,
            fromNodeId: node.id,
            toNodeId: childId,
            label: child.relationshipLabel || 'Expands into',
            style: 'curved',
            animated: true,
            color: '#a855f7',
          });
        });

        setNodes((prev) => [...prev, ...newChildNodes]);
        setEdges((prev) => [...prev, ...newChildEdges]);
        showToast(`AI expanded concept into ${newChildNodes.length} sub-nodes`);
      }
    } catch (err) {
      console.error('Error expanding node:', err);
      showToast('Failed to expand concept with AI');
    } finally {
      setNodes((prev) =>
        prev.map((n) => (n.id === node.id ? { ...n, isExpanding: false } : n))
      );
    }
  };

  // AI Image Generation for a node
  const handleGenerateImage = async (node: ConceptNode) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === node.id ? { ...n, isGeneratingImage: true } : n))
    );

    try {
      const res = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${node.title}: ${node.content.slice(0, 150)}`,
        }),
      });

      const data = await res.json();
      if (data.imageUrl) {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === node.id
              ? { ...n, imageUrl: data.imageUrl, isGeneratingImage: false }
              : n
          )
        );
        showToast('Generated AI context banner');
      }
    } catch (err) {
      console.error('Failed image generation:', err);
      setNodes((prev) =>
        prev.map((n) => (n.id === node.id ? { ...n, isGeneratingImage: false } : n))
      );
    }
  };

  // Generate full cluster from bottom prompt
  const handleGenerateClusterFromPrompt = async (userPrompt: string) => {
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/gemini/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: userPrompt,
          content: 'User requested concept cluster generation',
        }),
      });

      const data = await res.json();
      if (data.childrenNodes && Array.isArray(data.childrenNodes)) {
        const viewportCenterX =
          (-canvasState.pan.x + windowDimensions.width / 2) / canvasState.zoom;
        const viewportCenterY =
          (-canvasState.pan.y + windowDimensions.height / 2) / canvasState.zoom;

        const centerId = `node-hub-${Date.now()}`;
        const centerNode: ConceptNode = {
          id: centerId,
          title: userPrompt,
          content: `### ${userPrompt}\nCentral hub synthesized by Gemini AI.`,
          x: snapValue(viewportCenterX - 180),
          y: snapValue(viewportCenterY - 110),
          width: 360,
          height: 220,
          type: 'ai-workspace',
          color: 'cyan',
          tags: ['AI Cluster', 'Hub'],
          status: 'verified',
          pinned: true,
          updatedAt: new Date().toISOString(),
        };

        const positions = calculateChildNodePositions(
          centerNode,
          data.childrenNodes.length,
          nodes,
          450
        );

        const newChildNodes: ConceptNode[] = [centerNode];
        const newChildEdges: ConceptEdge[] = [];

        data.childrenNodes.forEach((child: any, idx: number) => {
          const childId = `node-clust-${Date.now()}-${idx}`;
          const pos = positions[idx];

          newChildNodes.push({
            id: childId,
            title: child.title,
            content: child.summary,
            x: pos.x,
            y: pos.y,
            width: 320,
            height: 200,
            type: 'concept',
            color: (child.colorAccent as AccentColor) || 'purple',
            tags: child.tags || ['concept'],
            status: 'exploring',
            updatedAt: new Date().toISOString(),
          });

          newChildEdges.push({
            id: `edge-clust-${Date.now()}-${idx}`,
            fromNodeId: centerId,
            toNodeId: childId,
            label: child.relationshipLabel || 'Pillar',
            style: 'curved',
            animated: true,
            color: '#38bdf8',
          });
        });

        setNodes((prev) => [...prev, ...newChildNodes]);
        setEdges((prev) => [...prev, ...newChildEdges]);
        showToast(`Generated concept cluster with ${newChildNodes.length} nodes`);
      }
    } catch (err) {
      console.error('Failed cluster generation:', err);
      showToast('Error generating concept cluster');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Synthesize selected nodes
  const handleSynthesizeSelected = async () => {
    if (canvasState.selectedNodeIds.length < 2) return;
    const selectedNodes = nodes.filter((n) =>
      canvasState.selectedNodeIds.includes(n.id)
    );

    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/gemini/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: selectedNodes }),
      });

      const data = await res.json();
      if (data.synthesis) {
        // Average coordinates
        const avgX =
          selectedNodes.reduce((acc, n) => acc + n.x, 0) / selectedNodes.length;
        const avgY =
          selectedNodes.reduce((acc, n) => acc + n.y, 0) / selectedNodes.length;

        const synthId = `node-synth-${Date.now()}`;
        const synthNode: ConceptNode = {
          id: synthId,
          title: data.synthesis.title || 'Synthesized Concept Core',
          content: `${data.synthesis.content}\n\n**Key Takeaways:**\n${(
            data.synthesis.keyTakeaways || []
          )
            .map((k: string) => `- ${k}`)
            .join('\n')}`,
          x: snapValue(avgX),
          y: snapValue(avgY + 300),
          width: 380,
          height: 260,
          type: 'synthesis',
          color: 'amber',
          tags: data.synthesis.tags || ['synthesis'],
          status: 'verified',
          updatedAt: new Date().toISOString(),
        };

        const synthEdges: ConceptEdge[] = selectedNodes.map((n) => ({
          id: `edge-synth-${Date.now()}-${n.id}`,
          fromNodeId: n.id,
          toNodeId: synthId,
          label: 'Synthesized in',
          style: 'curved',
          animated: true,
          color: '#f59e0b',
        }));

        setNodes((prev) => [...prev, synthNode]);
        setEdges((prev) => [...prev, ...synthEdges]);
        setCanvasState((prev) => ({ ...prev, selectedNodeIds: [synthId] }));
        showToast('Synthesized selected concept nodes');
      }
    } catch (err) {
      console.error('Synthesis error:', err);
      showToast('Failed to synthesize nodes');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // AI Auto-Relate (Connect unconnected canvas nodes)
  const handleAutoRelateCanvas = async () => {
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/gemini/auto-relate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes }),
      });

      const data = await res.json();
      if (data.relationships && Array.isArray(data.relationships)) {
        let addedCount = 0;
        const newEdges: ConceptEdge[] = [];

        data.relationships.forEach((rel: any) => {
          const exists = edges.some(
            (e) =>
              (e.fromNodeId === rel.fromId && e.toNodeId === rel.toId) ||
              (e.fromNodeId === rel.toId && e.toNodeId === rel.fromId)
          );

          if (!exists && rel.fromId && rel.toId) {
            newEdges.push({
              id: `edge-auto-${Date.now()}-${addedCount}`,
              fromNodeId: rel.fromId,
              toNodeId: rel.toId,
              label: rel.label || 'Relates to',
              style: 'curved',
              animated: true,
              color: '#34d399',
            });
            addedCount++;
          }
        });

        if (newEdges.length > 0) {
          setEdges((prev) => [...prev, ...newEdges]);
          showToast(`AI connected ${newEdges.length} new conceptual relationships`);
        } else {
          showToast('No new connections discovered.');
        }
      }
    } catch (err) {
      console.error('Auto-relate error:', err);
      showToast('Error discovering relationships');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Auto Layout Nodes
  const handleAutoLayout = () => {
    const updated = autoLayoutNodes(nodes, edges);
    setNodes(updated);
    showToast('Applied spatial force-directed layout');
  };

  // Reset Viewport Position
  const handleResetView = () => {
    setCanvasState((prev) => ({
      ...prev,
      pan: { x: 180, y: 100 },
      zoom: 0.9,
    }));
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setCanvasState((prev) => ({
      ...prev,
      selectedNodeIds: [],
      showInspectorNodeId: null,
    }));
    showToast('Cleared spatial canvas');
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ nodes, edges }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'remix-gridscape.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported canvas JSON');
  };

  const inspectorNode = nodes.find(
    (n) => n.id === canvasState.showInspectorNodeId
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050505] flex flex-col font-sans select-none">
      {/* HEADER */}
      <Header
        canvasState={canvasState}
        setCanvasState={setCanvasState}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        selectedNodeCount={canvasState.selectedNodeIds.length}
        onSelectPreset={handleSelectPreset}
        onAddNode={handleAddNode}
        onAutoLayout={handleAutoLayout}
        onSynthesizeSelected={handleSynthesizeSelected}
        onAutoRelateCanvas={handleAutoRelateCanvas}
        onResetView={handleResetView}
        onClearCanvas={handleClearCanvas}
        onExportJSON={handleExportJSON}
        availableTags={availableTags}
      />

      {/* MAIN SPATIAL CANVAS */}
      <main className="flex-1 relative w-full h-full">
        <Canvas
          nodes={nodes}
          edges={edges}
          canvasState={canvasState}
          setCanvasState={setCanvasState}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
          onCreateEdge={handleCreateEdge}
          onExpandAI={handleExpandAI}
          onGenerateImage={handleGenerateImage}
          onOpenInspector={(id) =>
            setCanvasState((prev) => ({ ...prev, showInspectorNodeId: id }))
          }
        />

        {/* MINIMAP */}
        <Minimap
          nodes={nodes}
          canvasState={canvasState}
          setCanvasState={setCanvasState}
          windowWidth={windowDimensions.width}
          windowHeight={windowDimensions.height}
        />

        {/* AI SPARK COMMAND BAR */}
        <AICommandBar
          onGenerateCluster={handleGenerateClusterFromPrompt}
          isGenerating={isAiGenerating}
          selectedCount={canvasState.selectedNodeIds.length}
          onSynthesize={handleSynthesizeSelected}
          onAutoConnect={handleAutoRelateCanvas}
        />

        {/* NODE DETAIL INSPECTOR DRAWER */}
        {inspectorNode && (
          <NodeDetailDrawer
            node={inspectorNode}
            allNodes={nodes}
            edges={edges}
            onClose={() =>
              setCanvasState((prev) => ({ ...prev, showInspectorNodeId: null }))
            }
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onGenerateImage={handleGenerateImage}
          />
        )}

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0c0c0c] border border-white/15 text-white px-4 py-2 rounded shadow-2xl backdrop-blur-md flex items-center gap-2 font-mono text-xs animate-in fade-in slide-in-from-top-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        )}
      </main>

      {/* SOPHISTICATED DARK BOTTOM STATUS BAR */}
      <footer className="h-7 border-t border-white/10 bg-[#050505] flex items-center px-4 justify-between font-mono text-[10px] uppercase tracking-widest text-white/40 z-40 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            SYSTEM ONLINE // GEMINI v2.6
          </span>
          <span className="hidden sm:inline text-white/20">|</span>
          <span className="hidden sm:inline">
            COORDS: X:{Math.round(-canvasState.pan.x)} Y:{Math.round(-canvasState.pan.y)} Z:{Math.round(canvasState.zoom * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline">
            REGION: US-CENTRAL1 // LATENCY: 18ms
          </span>
          <span className="text-white/20 hidden md:inline">|</span>
          <span className="text-white/60">
            REMIX GRIDSCAPE © 2026
          </span>
        </div>
      </footer>
    </div>
  );
}
