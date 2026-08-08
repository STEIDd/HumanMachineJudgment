import React, { useMemo } from 'react';
import styles from './DependencyGraph.module.css';

export interface GraphNode {
  id: string;
  label: string;
  status: string;
  isStale?: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface DependencyGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (id: string) => void;
  className?: string;
}

const statusColors: Record<string, string> = {
  candidate: '#6c757d',
  pending: '#0d6efd',
  investigating: '#6610f2',
  resolved: '#198754',
  delegated: '#fd7e14',
  stale: '#dc3545',
  reopened: '#d63384',
  dismissed: '#adb5bd',
};

const NODE_WIDTH = 140;
const NODE_HEIGHT = 44;
const LEVEL_GAP = 80;
const NODE_GAP = 24;

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  nodes,
  edges,
  onNodeClick,
  className,
}) => {
  const layout = useMemo(() => {
    // Build adjacency
    const incoming = new Map<string, Set<string>>();
    const outgoing = new Map<string, Set<string>>();
    nodes.forEach((n) => {
      incoming.set(n.id, new Set());
      outgoing.set(n.id, new Set());
    });
    edges.forEach((e) => {
      outgoing.get(e.from)?.add(e.to);
      incoming.get(e.to)?.add(e.from);
    });

    // BFS to assign levels
    const levels = new Map<string, number>();
    const roots = nodes.filter((n) => (incoming.get(n.id)?.size || 0) === 0);
    const queue: Array<{ id: string; level: number }> = roots.map((r) => ({ id: r.id, level: 0 }));
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const { id, level } = item;
      if (levels.has(id) && (levels.get(id) ?? 0) >= level) continue;
      levels.set(id, level);
      outgoing.get(id)?.forEach((childId) => {
        queue.push({ id: childId, level: level + 1 });
      });
    }
    // Assign level 0 to any unvisited nodes
    nodes.forEach((n) => {
      if (!levels.has(n.id)) levels.set(n.id, 0);
    });

    // Group by level
    const levelGroups = new Map<number, string[]>();
    levels.forEach((level, id) => {
      if (!levelGroups.has(level)) levelGroups.set(level, []);
      levelGroups.get(level)?.push(id);
    });

    // Position nodes
    const positions = new Map<string, { x: number; y: number }>();
    const maxLevel = Math.max(...Array.from(levelGroups.keys()), 0);
    let maxWidth = 0;

    levelGroups.forEach((ids, _level) => {
      const totalWidth = ids.length * NODE_WIDTH + (ids.length - 1) * NODE_GAP;
      if (totalWidth > maxWidth) maxWidth = totalWidth;
    });

    levelGroups.forEach((ids, level) => {
      const totalWidth = ids.length * NODE_WIDTH + (ids.length - 1) * NODE_GAP;
      const startX = (maxWidth - totalWidth) / 2;
      ids.forEach((id, i) => {
        positions.set(id, {
          x: startX + i * (NODE_WIDTH + NODE_GAP),
          y: level * (NODE_HEIGHT + LEVEL_GAP),
        });
      });
    });

    const svgWidth = maxWidth + 40;
    const svgHeight = (maxLevel + 1) * (NODE_HEIGHT + LEVEL_GAP) + 40;

    return { positions, svgWidth, svgHeight };
  }, [nodes, edges]);

  const classNames = [styles['graph'], className].filter(Boolean).join(' ');

  return (
    <svg
      className={classNames}
      width={layout.svgWidth}
      height={layout.svgHeight}
      viewBox={`0 0 ${layout.svgWidth} ${layout.svgHeight}`}
      role="img"
      aria-label="Dependency graph"
    >
      {/* Edges */}
      {edges.map((edge, i) => {
        const fromPos = layout.positions.get(edge.from);
        const toPos = layout.positions.get(edge.to);
        if (!fromPos || !toPos) return null;
        const x1 = fromPos.x + NODE_WIDTH / 2 + 20;
        const y1 = fromPos.y + NODE_HEIGHT + 20;
        const x2 = toPos.x + NODE_WIDTH / 2 + 20;
        const y2 = toPos.y + 20;
        const midY = (y1 + y2) / 2;
        return (
          <path
            key={`edge-${i}`}
            d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
            className={styles['edge']}
            fill="none"
            markerEnd="url(#arrowhead)"
          />
        );
      })}

      {/* Arrow marker */}
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#adb5bd" />
        </marker>
      </defs>

      {/* Nodes */}
      {nodes.map((node) => {
        const pos = layout.positions.get(node.id);
        if (!pos) return null;
        const color = statusColors[node.status] || '#6c757d';
        return (
          <g
            key={node.id}
            className={styles['node']}
            transform={`translate(${pos.x + 20}, ${pos.y + 20})`}
            tabIndex={0}
            role="button"
            aria-label={`Node: ${node.label}, Status: ${node.status}${node.isStale ? ', Stale' : ''}`}
            onClick={() => onNodeClick?.(node.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNodeClick?.(node.id);
              }
            }}
          >
            <rect
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              rx={6}
              ry={6}
              className={styles['nodeRect']}
              stroke={node.isStale ? '#dc3545' : '#dee2e6'}
              strokeDasharray={node.isStale ? '4 2' : 'none'}
            />
            <circle cx={12} cy={NODE_HEIGHT / 2} r={5} fill={color} />
            <text x={24} y={NODE_HEIGHT / 2 + 4} className={styles['nodeLabel']} fill="#212529">
              {node.label.length > 14 ? node.label.slice(0, 12) + '..' : node.label}
            </text>
            {node.isStale && (
              <text x={NODE_WIDTH - 8} y={12} className={styles['staleIndicator']} textAnchor="end">
                !
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
