import { GraphNode, GraphEdge } from './supabase';

export type LayoutDirection = 'ltr' | 'ttb';
export type LayoutMode = 'hierarchical' | 'adaptive';

export function parseMermaidLikeText(
  text: string,
  direction: LayoutDirection = 'ltr',
  mode: LayoutMode = 'hierarchical'
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const lines = text.split('\n').filter(line => line.trim());
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();

  let nodeCounter = 0;
  const getNodeId = () => `node-${nodeCounter++}`;
  const getEdgeId = () => `edge-${nodeCounter++}`;

  const createNode = (label: string, parentId?: string): GraphNode => {
    const existing = Array.from(nodeMap.values()).find(n => n.text === label);
    if (existing) return existing;

    const node: GraphNode = {
      id: getNodeId(),
      text: label.trim(),
      x: nodes.length * 200,
      y: (parentId ? nodeMap.get(parentId)?.depth ?? 0 : 0) * 100,
      depth: parentId ? (nodeMap.get(parentId)?.depth ?? 0) + 1 : 0,
      parentId,
      children: []
    };

    nodes.push(node);
    nodeMap.set(node.id, node);

    if (parentId) {
      const parent = nodeMap.get(parentId);
      if (parent) {
        parent.children.push(node.id);
      }
    }

    return node;
  };

  for (const line of lines) {
    if (line.includes('->')) {
      const parts = line.split('->').map(p => p.trim());

      let prevNode: GraphNode | null = null;
      for (const part of parts) {
        const currentNode = createNode(part, prevNode?.id);

        if (prevNode) {
          edges.push({
            id: getEdgeId(),
            from: prevNode.id,
            to: currentNode.id
          });
        }

        prevNode = currentNode;
      }
    } else {
      createNode(line);
    }
  }

  layoutNodes(nodes, direction, mode);

  return { nodes, edges };
}

export function reverseParseToText(nodes: GraphNode[], edges: GraphEdge[]): string {
  const lines: string[] = [];
  const visited = new Set<string>();

  const buildPath = (nodeId: string): string[] => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return [];

    const paths: string[] = [];

    const childEdges = edges.filter(e => e.from === nodeId);
    if (childEdges.length === 0) {
      return [node.text];
    }

    for (const edge of childEdges) {
      const childPaths = buildPath(edge.to);
      for (const childPath of childPaths) {
        paths.push(`${node.text} -> ${childPath}`);
      }
    }

    return paths;
  };

  const rootNodes = nodes.filter(n => !n.parentId);

  for (const root of rootNodes) {
    const paths = buildPath(root.id);
    lines.push(...paths);
    visited.add(root.id);
  }

  const orphanNodes = nodes.filter(n => !visited.has(n.id));
  for (const orphan of orphanNodes) {
    lines.push(orphan.text);
  }

  return lines.join('\n');
}

function layoutNodes(
  nodes: GraphNode[],
  direction: LayoutDirection = 'ltr',
  mode: LayoutMode = 'hierarchical'
): void {
  if (mode === 'adaptive') {
    layoutAdaptive(nodes, direction);
  } else {
    layoutHierarchical(nodes, direction);
  }
}

function layoutHierarchical(nodes: GraphNode[], direction: LayoutDirection): void {
  const depthGroups = new Map<number, GraphNode[]>();

  nodes.forEach(node => {
    if (!depthGroups.has(node.depth)) {
      depthGroups.set(node.depth, []);
    }
    depthGroups.get(node.depth)!.push(node);
  });

  const spacing = { x: 250, y: 150 };
  const offset = { x: 100, y: 100 };

  depthGroups.forEach((nodesAtDepth, depth) => {
    nodesAtDepth.forEach((node, index) => {
      if (direction === 'ltr') {
        node.x = index * spacing.x + offset.x;
        node.y = depth * spacing.y + offset.y;
      } else {
        node.x = depth * spacing.x + offset.x;
        node.y = index * spacing.y + offset.y;
      }
    });
  });
}

function layoutAdaptive(nodes: GraphNode[], direction: LayoutDirection): void {
  const positioned = new Set<string>();
  const roots = nodes.filter(n => !n.parentId);

  const positionSubtree = (node: GraphNode, baseX: number, baseY: number, depth: number) => {
    if (positioned.has(node.id)) return;

    if (direction === 'ltr') {
      node.x = baseX + depth * 250;
      node.y = baseY;
    } else {
      node.x = baseX;
      node.y = baseY + depth * 250;
    }

    positioned.add(node.id);

    const children = nodes.filter(n => n.parentId === node.id);
    children.forEach((child, index) => {
      const childCount = children.length;
      const spacing = 100;
      const totalHeight = (childCount - 1) * spacing;

      if (direction === 'ltr') {
        const childY = baseY - totalHeight / 2 + index * spacing;
        positionSubtree(child, baseX, childY, depth + 1);
      } else {
        const childX = baseX - totalHeight / 2 + index * spacing;
        positionSubtree(child, childX, baseY, depth + 1);
      }
    });
  };

  roots.forEach((root, index) => {
    const spacing = 300;
    if (direction === 'ltr') {
      positionSubtree(root, 100, index * spacing, 0);
    } else {
      positionSubtree(root, index * spacing, 100, 0);
    }
  });
}
