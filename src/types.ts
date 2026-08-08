export type NodeType = 'concept' | 'ai-workspace' | 'image' | 'code' | 'synthesis' | 'note';
export type NodeStatus = 'draft' | 'verified' | 'exploring' | 'archived';
export type AccentColor = 'cyan' | 'emerald' | 'purple' | 'amber' | 'rose' | 'slate';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ConceptNode {
  id: string;
  title: string;
  content: string; // Markdown supported
  x: number;
  y: number;
  width: number;
  height: number;
  type: NodeType;
  color: AccentColor;
  tags: string[];
  status: NodeStatus;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  isExpanding?: boolean;
  aiPrompt?: string;
  aiHistory?: ChatMessage[];
  pinned?: boolean;
  collapsed?: boolean;
  updatedAt: string;
  parentId?: string;
}

export type EdgeStyle = 'curved' | 'straight' | 'step';

export interface ConceptEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string;
  relationshipType?: string; // e.g. "leads to", "depends on", "contradicts", "refines"
  style: EdgeStyle;
  color?: string;
  animated?: boolean;
  bidirectional?: boolean;
}

export type GridType = 'dots' | 'lines' | 'iso' | 'blank';

export interface CanvasState {
  pan: { x: number; y: number };
  zoom: number; // 0.15 to 3.0
  gridType: GridType;
  snapToGrid: boolean;
  gridSize: number;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  connectingFromId: string | null;
  connectingHoverNodeId: string | null;
  connectingPoint: { x: number; y: number } | null;
  isDraggingCanvas: boolean;
  activeTool: 'select' | 'pan' | 'add-node' | 'connect' | 'ai-prompt';
  searchQuery: string;
  filterTag: string | null;
  showMinimap: boolean;
  showInspectorNodeId: string | null;
}

export interface PresetCanvas {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  iconName: string;
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}
