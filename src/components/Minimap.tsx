import React, { useRef } from 'react';
import { Compass, Eye, EyeOff } from 'lucide-react';
import { ConceptNode, CanvasState } from '../types';

interface MinimapProps {
  nodes: ConceptNode[];
  canvasState: CanvasState;
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>;
  windowWidth: number;
  windowHeight: number;
}

export const Minimap: React.FC<MinimapProps> = ({
  nodes,
  canvasState,
  setCanvasState,
  windowWidth,
  windowHeight,
}) => {
  const minimapRef = useRef<HTMLDivElement>(null);

  if (!canvasState.showMinimap) {
    return (
      <button
        onClick={() => setCanvasState((prev) => ({ ...prev, showMinimap: true }))}
        className="absolute bottom-12 right-6 z-40 p-2.5 rounded-lg bg-[#0a0a0a]/90 border border-white/15 text-white/70 hover:text-white hover:bg-white/10 transition-all shadow-2xl backdrop-blur-md font-mono text-xs cursor-pointer flex items-center gap-2"
        title="Open Spatial Map"
      >
        <Compass className="w-4 h-4 text-cyan-400" />
        <span className="text-[11px] font-bold tracking-widest uppercase">MAP</span>
      </button>
    );
  }

  // Calculate canvas bounding box containing all nodes
  const minimapWidth = 200;
  const minimapHeight = 130;

  let minX = -1000;
  let maxX = 2000;
  let minY = -800;
  let maxY = 1500;

  if (nodes.length > 0) {
    minX = Math.min(...nodes.map((n) => n.x)) - 300;
    maxX = Math.max(...nodes.map((n) => n.x + n.width)) + 300;
    minY = Math.min(...nodes.map((n) => n.y)) - 300;
    maxY = Math.max(...nodes.map((n) => n.y + n.height)) + 300;
  }

  const boundsWidth = Math.max(maxX - minX, 1000);
  const boundsHeight = Math.max(maxY - minY, 800);

  // Scale factors
  const scaleX = minimapWidth / boundsWidth;
  const scaleY = minimapHeight / boundsHeight;

  // Viewport box dimensions
  const viewX = (-canvasState.pan.x - minX) * scaleX;
  const viewY = (-canvasState.pan.y - minY) * scaleY;
  const viewW = (windowWidth / canvasState.zoom) * scaleX;
  const viewH = (windowHeight / canvasState.zoom) * scaleY;

  const handleMinimapClick = (e: React.MouseEvent) => {
    if (!minimapRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert minimap click position back to world coordinates
    const worldX = clickX / scaleX + minX;
    const worldY = clickY / scaleY + minY;

    setCanvasState((prev) => ({
      ...prev,
      pan: {
        x: -(worldX - (windowWidth / prev.zoom) / 2),
        y: -(worldY - (windowHeight / prev.zoom) / 2),
      },
    }));
  };

  return (
    <div className="absolute bottom-12 right-6 z-40 bg-[#0a0a0a]/95 border border-white/15 rounded-xl p-2.5 shadow-2xl backdrop-blur-md flex flex-col gap-2 w-[220px]">
      <div className="flex items-center justify-between text-[10px] font-mono text-white/50 px-1 tracking-widest uppercase">
        <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
          <Compass className="w-3.5 h-3.5" />
          SPATIAL MAP
        </span>
        <button
          onClick={() => setCanvasState((prev) => ({ ...prev, showMinimap: false }))}
          className="hover:text-white transition-colors"
          title="Minimize Minimap"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        ref={minimapRef}
        onClick={handleMinimapClick}
        style={{ width: `${minimapWidth}px`, height: `${minimapHeight}px` }}
        className="relative bg-black rounded border border-white/10 overflow-hidden cursor-crosshair shadow-inner"
      >
        {/* Render node boxes on minimap */}
        {nodes.map((node) => {
          const nx = (node.x - minX) * scaleX;
          const ny = (node.y - minY) * scaleY;
          const nw = Math.max(node.width * scaleX, 4);
          const nh = Math.max(node.height * scaleY, 4);

          return (
            <div
              key={node.id}
              style={{
                left: `${nx}px`,
                top: `${ny}px`,
                width: `${nw}px`,
                height: `${nh}px`,
              }}
              className={`absolute rounded-xs ${
                node.color === 'emerald'
                  ? 'bg-emerald-400'
                  : node.color === 'purple'
                  ? 'bg-purple-400'
                  : node.color === 'amber'
                  ? 'bg-amber-400'
                  : node.color === 'rose'
                  ? 'bg-rose-400'
                  : 'bg-cyan-400'
              } opacity-80`}
            />
          );
        })}

        {/* Viewport Box */}
        <div
          style={{
            left: `${viewX}px`,
            top: `${viewY}px`,
            width: `${viewW}px`,
            height: `${viewH}px`,
          }}
          className="absolute border border-white bg-white/10 rounded-xs pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.4)]"
        />
      </div>
    </div>
  );
};
