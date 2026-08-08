import React, { useRef, useState, useEffect } from 'react';
import { ConceptNode, ConceptEdge, CanvasState } from '../types';
import { NodeCard } from './NodeCard';
import { getBezierPath } from '../utils/canvasMath';
import { Sparkles, Trash2, Link2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface CanvasProps {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  canvasState: CanvasState;
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>;
  onUpdateNode: (node: ConceptNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onCreateEdge: (fromId: string, toId: string, label?: string) => void;
  onExpandAI: (node: ConceptNode) => void;
  onGenerateImage: (node: ConceptNode) => void;
  onOpenInspector: (nodeId: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  nodes,
  edges,
  canvasState,
  setCanvasState,
  onUpdateNode,
  onDeleteNode,
  onDeleteEdge,
  onCreateEdge,
  onExpandAI,
  onGenerateImage,
  onOpenInspector,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Rubber-band linking state during handle drag
  const [dragLinkTarget, setDragLinkTarget] = useState<{ x: number; y: number } | null>(null);

  // Pan canvas dragging state
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Handle Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(canvasState.zoom * zoomFactor, 0.2), 2.5);

    // Zoom towards mouse cursor
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newPanX = mouseX - (mouseX - canvasState.pan.x) * (newZoom / canvasState.zoom);
    const newPanY = mouseY - (mouseY - canvasState.pan.y) * (newZoom / canvasState.zoom);

    setCanvasState((prev) => ({
      ...prev,
      zoom: newZoom,
      pan: { x: newPanX, y: newPanY },
    }));
  };

  // Canvas Mouse Down for Panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only pan if middle click or clicked directly on background
    if (
      e.button === 1 ||
      e.target === containerRef.current ||
      (e.target as HTMLElement).classList.contains('canvas-bg')
    ) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: canvasState.pan.x,
        panY: canvasState.pan.y,
      };

      setCanvasState((prev) => ({ ...prev, selectedNodeIds: [] }));

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isPanningRef.current) return;
        const dx = moveEvent.clientX - panStartRef.current.x;
        const dy = moveEvent.clientY - panStartRef.current.y;
        setCanvasState((prev) => ({
          ...prev,
          pan: {
            x: panStartRef.current.panX + dx,
            y: panStartRef.current.panY + dy,
          },
        }));
      };

      const handleMouseUp = () => {
        isPanningRef.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  };

  // Handle Rubber-band connection drag
  const handleStartConnect = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCanvasState((prev) => ({ ...prev, connectingFromId: nodeId }));

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const worldX = (moveEvent.clientX - rect.left - canvasState.pan.x) / canvasState.zoom;
      const worldY = (moveEvent.clientY - rect.top - canvasState.pan.y) / canvasState.zoom;
      setDragLinkTarget({ x: worldX, y: worldY });
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      // Check if dropped onto a node
      const element = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      const cardElem = element?.closest('[data-node-id]');
      if (cardElem) {
        const targetId = cardElem.getAttribute('data-node-id');
        if (targetId && targetId !== nodeId) {
          onCreateEdge(nodeId, targetId, 'Related to');
        }
      }

      setCanvasState((prev) => ({ ...prev, connectingFromId: null }));
      setDragLinkTarget(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Grid background class based on selection
  const gridClass =
    canvasState.gridType === 'dots'
      ? 'bg-grid-dots'
      : canvasState.gridType === 'lines'
      ? 'bg-grid-lines'
      : canvasState.gridType === 'iso'
      ? 'bg-grid-iso'
      : '';

  // Filter nodes if search query or tag active
  const filteredNodes = nodes.filter((node) => {
    if (canvasState.filterTag && !node.tags.includes(canvasState.filterTag)) {
      return false;
    }
    if (canvasState.searchQuery) {
      const q = canvasState.searchQuery.toLowerCase();
      const matchTitle = node.title.toLowerCase().includes(q);
      const matchContent = node.content.toLowerCase().includes(q);
      const matchTag = node.tags.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchContent || matchTag;
    }
    return true;
  });

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      className={`relative w-full h-screen overflow-hidden bg-[#050505] cursor-grab active:cursor-grabbing select-none ${gridClass}`}
    >
      {/* SPATIAL WORLD TRANSFORM CONTAINER */}
      <div
        style={{
          transform: `translate3d(${canvasState.pan.x}px, ${canvasState.pan.y}px, 0) scale(${canvasState.zoom})`,
          transformOrigin: '0 0',
        }}
        className="absolute inset-0 w-full h-full pointer-events-none canvas-bg"
      >
        {/* SVG LAYER FOR CONNECTIONS */}
        <svg className="absolute inset-0 w-[10000px] h-[10000px] pointer-events-none z-0 overflow-visible">
          <defs>
            {/* Arrowhead markers */}
            <marker
              id="arrow-cyan"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
            <marker
              id="arrow-purple"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#a855f7" />
            </marker>
          </defs>

          {/* Render Active Edges */}
          {edges.map((edge) => {
            const fromNode = nodes.find((n) => n.id === edge.fromNodeId);
            const toNode = nodes.find((n) => n.id === edge.toNodeId);
            if (!fromNode || !toNode) return null;

            const { pathD, midX, midY } = getBezierPath(fromNode, toNode);

            return (
              <g key={edge.id} className="group pointer-events-auto cursor-pointer">
                {/* Wide invisible path for easy clicking */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="20"
                  onDoubleClick={() => onDeleteEdge(edge.id)}
                />

                {/* Base connection curve */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={edge.color || '#38bdf8'}
                  strokeWidth="2"
                  strokeOpacity="0.8"
                  markerEnd="url(#arrow-cyan)"
                  className="transition-all group-hover:stroke-cyan-300 group-hover:stroke-width-3"
                />

                {/* Animated pulse line */}
                {edge.animated && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="6 12"
                    className="animate-dash-flow opacity-80"
                  />
                )}

                {/* Midpoint Relationship Label */}
                <foreignObject
                  x={midX - 70}
                  y={midY - 14}
                  width="140"
                  height="28"
                  className="overflow-visible"
                >
                  <div
                    onDoubleClick={() => onDeleteEdge(edge.id)}
                    className="px-2.5 py-0.5 rounded bg-[#0a0a0a] border border-white/20 text-[10px] font-mono text-cyan-300 text-center shadow-2xl truncate uppercase hover:scale-110 transition-transform"
                  >
                    {edge.label || 'Link'}
                  </div>
                </foreignObject>
              </g>
            );
          })}

          {/* Render Rubber-band Link creation line */}
          {canvasState.connectingFromId && dragLinkTarget && (
            (() => {
              const fromNode = nodes.find((n) => n.id === canvasState.connectingFromId);
              if (!fromNode) return null;
              const startX = fromNode.x + fromNode.width / 2;
              const startY = fromNode.y + fromNode.height / 2;
              const pathD = `M ${startX} ${startY} L ${dragLinkTarget.x} ${dragLinkTarget.y}`;

              return (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                  className="animate-pulse"
                />
              );
            })()
          )}
        </svg>

        {/* NODES LAYER */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {nodes.map((node) => {
            const isMatch = filteredNodes.some((fn) => fn.id === node.id);
            const isSelected = canvasState.selectedNodeIds.includes(node.id);

            return (
              <div key={node.id} data-node-id={node.id} className="pointer-events-auto">
                <NodeCard
                  node={node}
                  isSelected={isSelected}
                  zoom={canvasState.zoom}
                  isHighlighted={!isMatch && (Boolean(canvasState.searchQuery) || Boolean(canvasState.filterTag))}
                  onSelect={(e) => {
                    e.stopPropagation();
                    if (e.shiftKey) {
                      setCanvasState((prev) => ({
                        ...prev,
                        selectedNodeIds: prev.selectedNodeIds.includes(node.id)
                          ? prev.selectedNodeIds.filter((id) => id !== node.id)
                          : [...prev.selectedNodeIds, node.id],
                      }));
                    } else {
                      setCanvasState((prev) => ({ ...prev, selectedNodeIds: [node.id] }));
                    }
                  }}
                  onUpdate={onUpdateNode}
                  onDelete={() => onDeleteNode(node.id)}
                  onStartConnect={handleStartConnect}
                  onExpandAI={onExpandAI}
                  onGenerateImage={onGenerateImage}
                  onOpenInspector={onOpenInspector}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* FLOATING CANVAS CONTROLS (Bottom-left) */}
      <div className="absolute bottom-12 left-6 z-40 flex items-center gap-2 bg-[#0a0a0a]/90 border border-white/15 p-1.5 rounded-lg shadow-2xl backdrop-blur-md font-mono text-xs">
        <button
          onClick={() =>
            setCanvasState((prev) => ({
              ...prev,
              zoom: Math.min(prev.zoom * 1.2, 2.5),
            }))
          }
          className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-white/80 px-1 font-bold">
          {Math.round(canvasState.zoom * 100)}%
        </span>
        <button
          onClick={() =>
            setCanvasState((prev) => ({
              ...prev,
              zoom: Math.max(prev.zoom / 1.2, 0.2),
            }))
          }
          className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-white/15 my-auto" />

        {/* Grid pattern toggles */}
        <button
          onClick={() =>
            setCanvasState((prev) => ({
              ...prev,
              gridType:
                prev.gridType === 'dots'
                  ? 'lines'
                  : prev.gridType === 'lines'
                  ? 'iso'
                  : prev.gridType === 'iso'
                  ? 'blank'
                  : 'dots',
            }))
          }
          className="px-2.5 py-1 rounded text-[11px] font-mono text-cyan-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors uppercase font-bold cursor-pointer"
        >
          GRID: {canvasState.gridType}
        </button>
      </div>
    </div>
  );
};
