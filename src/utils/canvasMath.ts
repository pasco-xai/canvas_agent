import { ConceptNode, ConceptEdge } from '../types';

/**
 * Calculates a smooth Cubic Bezier path between two node cards.
 */
export function getBezierPath(
  fromNode: ConceptNode,
  toNode: ConceptNode,
  curvature: number = 0.4
): { pathD: string; midX: number; midY: number; labelAngle: number } {
  // Center coordinates of nodes
  const fromCenterX = fromNode.x + fromNode.width / 2;
  const fromCenterY = fromNode.y + fromNode.height / 2;
  const toCenterX = toNode.x + toNode.width / 2;
  const toCenterY = toNode.y + toNode.height / 2;

  // Determine optimal edge attachment points (left, right, top, bottom handles)
  let startX = fromCenterX;
  let startY = fromCenterY;
  let endX = toCenterX;
  let endY = toCenterY;

  const deltaX = toCenterX - fromCenterX;
  const deltaY = toCenterY - fromCenterY;

  // Horizontal primary direction
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    if (deltaX > 0) {
      // From right edge of fromNode to left edge of toNode
      startX = fromNode.x + fromNode.width;
      endX = toNode.x;
    } else {
      // From left edge of fromNode to right edge of toNode
      startX = fromNode.x;
      endX = toNode.x + toNode.width;
    }
  } else {
    // Vertical primary direction
    if (deltaY > 0) {
      // From bottom edge to top edge
      startY = fromNode.y + fromNode.height;
      endY = toNode.y;
    } else {
      // From top edge to bottom edge
      startY = fromNode.y;
      endY = toNode.y + toNode.height;
    }
  }

  const dx = endX - startX;
  const dy = endY - startY;

  // Control points for cubic bezier
  let cp1X = startX + dx * curvature;
  let cp1Y = startY;
  let cp2X = endX - dx * curvature;
  let cp2Y = endY;

  if (Math.abs(dx) < 80) {
    // Offset control points vertically if nodes are vertically stacked
    cp1X = startX + (dy > 0 ? 60 : -60);
    cp1Y = startY + dy * curvature;
    cp2X = endX + (dy > 0 ? 60 : -60);
    cp2Y = endY - dy * curvature;
  }

  const pathD = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

  // Midpoint at t = 0.5 along cubic bezier
  const midX = 0.125 * startX + 0.375 * cp1X + 0.375 * cp2X + 0.125 * endX;
  const midY = 0.125 * startY + 0.375 * cp1Y + 0.375 * cp2Y + 0.125 * endY;

  const labelAngle = Math.atan2(dy, dx) * (180 / Math.PI);

  return { pathD, midX, midY, labelAngle };
}

/**
 * Snaps a coordinate value to grid.
 */
export function snapValue(val: number, gridSize: number = 20): number {
  return Math.round(val / gridSize) * gridSize;
}

/**
 * Calculates radial coordinates for newly auto-expanded child nodes around a parent node.
 */
export function calculateChildNodePositions(
  parentNode: ConceptNode,
  count: number,
  existingNodes: ConceptNode[],
  radius: number = 420
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const parentCenterX = parentNode.x + parentNode.width / 2;
  const parentCenterY = parentNode.y + parentNode.height / 2;

  // Default arc sweep angles (favor rightwards and radial distribution)
  const baseAngle = -Math.PI / 4; // top-right bias
  const angleStep = (Math.PI * 1.2) / Math.max(count - 1, 1);

  for (let i = 0; i < count; i++) {
    const angle = count === 1 ? 0 : baseAngle + i * angleStep;
    let targetX = parentCenterX + Math.cos(angle) * radius - 160;
    let targetY = parentCenterY + Math.sin(angle) * radius - 100;

    // Avoid overlap with existing nodes
    let iterations = 0;
    while (iterations < 10) {
      const overlap = existingNodes.some(
        (n) => Math.abs(n.x - targetX) < 320 && Math.abs(n.y - targetY) < 220
      );
      if (!overlap) break;
      targetX += 60;
      targetY += (i % 2 === 0 ? 80 : -80);
      iterations++;
    }

    positions.push({ x: snapValue(targetX), y: snapValue(targetY) });
  }

  return positions;
}

/**
 * Force-directed auto-layout to neatly spread out all nodes on canvas.
 */
export function autoLayoutNodes(
  nodes: ConceptNode[],
  edges: ConceptEdge[]
): ConceptNode[] {
  if (nodes.length <= 1) return nodes;

  const updatedNodes = nodes.map((n) => ({ ...n }));
  const k = 450; // Ideal distance
  const iterations = 50;

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsive forces
    for (let i = 0; i < updatedNodes.length; i++) {
      for (let j = i + 1; j < updatedNodes.length; j++) {
        const n1 = updatedNodes[i];
        const n2 = updatedNodes[j];
        if (n1.pinned && n2.pinned) continue;

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (dist < 600) {
          const force = (k * k) / dist;
          const fx = (dx / dist) * force * 0.05;
          const fy = (dy / dist) * force * 0.05;

          if (!n1.pinned) {
            n1.x -= fx;
            n1.y -= fy;
          }
          if (!n2.pinned) {
            n2.x += fx;
            n2.y += fy;
          }
        }
      }
    }

    // Attractive forces along edges
    for (const edge of edges) {
      const n1 = updatedNodes.find((n) => n.id === edge.fromNodeId);
      const n2 = updatedNodes.find((n) => n.id === edge.toNodeId);
      if (!n1 || !n2) continue;

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const force = (dist * dist) / k;
      const fx = (dx / dist) * force * 0.02;
      const fy = (dy / dist) * force * 0.02;

      if (!n1.pinned) {
        n1.x += fx;
        n1.y += fy;
      }
      if (!n2.pinned) {
        n2.x -= fx;
        n2.y -= fy;
      }
    }
  }

  return updatedNodes.map((n) => ({
    ...n,
    x: snapValue(n.x),
    y: snapValue(n.y),
  }));
}
