import { useEffect, useRef, useState, useCallback } from 'react';
import rough from 'roughjs';
import type { RoughCanvas } from 'roughjs/bin/canvas';
import { GraphNode, GraphEdge, Viewport } from '../lib/supabase';

interface ResizeHandle {
  nodeId: string;
  position: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
}

interface LinkingState {
  active: boolean;
  fromNodeId: string | null;
  toX: number;
  toY: number;
}

interface AdvancedCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  foldedNodes: string[];
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
  onNodesChange: (nodes: GraphNode[]) => void;
  onEdgesChange: (edges: GraphEdge[]) => void;
  onFoldedNodesChange: (foldedNodes: string[]) => void;
  selectedNode: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onEditNode: (nodeId: string) => void;
  onContextMenu: (nodeId: string, x: number, y: number) => void;
  customFont?: string;
}

export default function AdvancedCanvas({
  nodes,
  edges,
  foldedNodes,
  viewport,
  onViewportChange,
  onNodesChange,
  onEdgesChange,
  onFoldedNodesChange,
  selectedNode,
  onSelectNode,
  onEditNode,
  onContextMenu,
  customFont
}: AdvancedCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [resizing, setResizing] = useState<ResizeHandle | null>(null);
  const [linking, setLinking] = useState<LinkingState>({ active: false, fromNodeId: null, toX: 0, toY: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [roughCanvas, setRoughCanvas] = useState<RoughCanvas | null>(null);

  const defaultNodeWidth = 150;
  const defaultNodeHeight = 60;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rc = rough.canvas(canvas);
    setRoughCanvas(rc);

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const worldToScreen = useCallback((wx: number, wy: number) => {
    return {
      x: (wx - viewport.x) * viewport.zoom,
      y: (wy - viewport.y) * viewport.zoom
    };
  }, [viewport]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    return {
      x: sx / viewport.zoom + viewport.x,
      y: sy / viewport.zoom + viewport.y
    };
  }, [viewport]);

  const getNodeDimensions = (node: GraphNode) => {
    return {
      width: node.width || defaultNodeWidth,
      height: node.height || defaultNodeHeight
    };
  };

  const getResizeHandleAtPosition = useCallback((wx: number, wy: number): ResizeHandle | null => {
    const handleSize = 8 / viewport.zoom;

    for (const node of nodes) {
      if (!nodes.find(n => n.id === node.id) || foldedNodes.includes(node.id)) continue;

      const dims = getNodeDimensions(node);
      const left = node.x - dims.width / 2;
      const right = node.x + dims.width / 2;
      const top = node.y - dims.height / 2;
      const bottom = node.y + dims.height / 2;

      const positions: (ResizeHandle['position'])[] = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
      const handles = {
        nw: { x: left, y: top },
        ne: { x: right, y: top },
        sw: { x: left, y: bottom },
        se: { x: right, y: bottom },
        n: { x: node.x, y: top },
        s: { x: node.x, y: bottom },
        e: { x: right, y: node.y },
        w: { x: left, y: node.y }
      };

      for (const pos of positions) {
        const handle = handles[pos];
        if (Math.abs(wx - handle.x) < handleSize && Math.abs(wy - handle.y) < handleSize) {
          return { nodeId: node.id, position: pos };
        }
      }
    }

    return null;
  }, [nodes, foldedNodes, viewport.zoom]);

  const getNodeAtPosition = useCallback((wx: number, wy: number): GraphNode | null => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (!nodes.find(n => n.id === node.id)) continue;

      const dims = getNodeDimensions(node);
      if (
        wx >= node.x - dims.width / 2 &&
        wx <= node.x + dims.width / 2 &&
        wy >= node.y - dims.height / 2 &&
        wy <= node.y + dims.height / 2
      ) {
        return node;
      }
    }
    return null;
  }, [nodes]);

  const getNodeEdgeAtPosition = useCallback((wx: number, wy: number): { nodeId: string; side: string } | null => {
    const edgeThreshold = 8 / viewport.zoom;

    for (const node of nodes) {
      const dims = getNodeDimensions(node);
      const left = node.x - dims.width / 2;
      const right = node.x + dims.width / 2;
      const top = node.y - dims.height / 2;
      const bottom = node.y + dims.height / 2;

      if (Math.abs(wx - right) < edgeThreshold && wy >= top && wy <= bottom) {
        return { nodeId: node.id, side: 'right' };
      }
      if (Math.abs(wx - left) < edgeThreshold && wy >= top && wy <= bottom) {
        return { nodeId: node.id, side: 'left' };
      }
      if (Math.abs(wy - bottom) < edgeThreshold && wx >= left && wx <= right) {
        return { nodeId: node.id, side: 'bottom' };
      }
      if (Math.abs(wy - top) < edgeThreshold && wx >= left && wx <= right) {
        return { nodeId: node.id, side: 'top' };
      }
    }

    return null;
  }, [nodes, viewport.zoom]);

  const getFontSize = (depth: number): number => {
    const baseSizes = [32, 24, 18, 14];
    return baseSizes[Math.min(depth, baseSizes.length - 1)];
  };

  const isNodeVisible = useCallback((node: GraphNode): boolean => {
    let current = node;
    while (current.parentId) {
      if (foldedNodes.includes(current.parentId)) {
        return false;
      }
      const parent = nodes.find(n => n.id === current.parentId);
      if (!parent) break;
      current = parent;
    }
    return true;
  }, [nodes, foldedNodes]);

  const drawArrowhead = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    size: number = 10
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size / 2);
    ctx.lineTo(-size, size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawEdge = (
    ctx: CanvasRenderingContext2D,
    fromNode: GraphNode,
    toNode: GraphNode,
    edgeType: 'line' | 'arrow' | 'double-arrow' = 'line'
  ) => {
    const fromDims = getNodeDimensions(fromNode);
    const toDims = getNodeDimensions(toNode);

    const from = worldToScreen(fromNode.x, fromNode.y);
    const to = worldToScreen(toNode.x, toNode.y);

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    if (edgeType === 'arrow' || edgeType === 'double-arrow') {
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      drawArrowhead(ctx, to.x, to.y, angle);

      if (edgeType === 'double-arrow') {
        const reverseAngle = angle + Math.PI;
        drawArrowhead(ctx, from.x, from.y, reverseAngle);
      }
    }
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !roughCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    const visibleNodes = nodes.filter(isNodeVisible);

    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);

      if (!fromNode || !toNode || !isNodeVisible(fromNode) || !isNodeVisible(toNode)) return;

      drawEdge(ctx, fromNode, toNode, edge.type || 'line');
    });

    if (linking.active && linking.fromNodeId) {
      const fromNode = nodes.find(n => n.id === linking.fromNodeId);
      if (fromNode) {
        const from = worldToScreen(fromNode.x, fromNode.y);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(linking.toX, linking.toY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    visibleNodes.forEach(node => {
      const pos = worldToScreen(node.x, node.y);
      const dims = getNodeDimensions(node);
      const nodeWidth = dims.width * viewport.zoom;
      const nodeHeight = dims.height * viewport.zoom;
      const fontSize = getFontSize(node.depth) * viewport.zoom;

      const isSelected = node.id === selectedNode;

      roughCanvas.rectangle(
        pos.x - nodeWidth / 2,
        pos.y - nodeHeight / 2,
        nodeWidth,
        nodeHeight,
        {
          fill: isSelected ? '#dbeafe' : '#ffffff',
          fillStyle: 'solid',
          stroke: isSelected ? '#3b82f6' : '#94a3b8',
          strokeWidth: isSelected ? 3 : 2,
          roughness: 1.5
        }
      );

      ctx.fillStyle = '#1e293b';
      ctx.font = `${fontSize}px "${customFont || 'Segoe Print'}", cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const maxWidth = nodeWidth - 20;
      const words = node.text.split(' ');
      let line = '';
      let y = pos.y - fontSize * 0.5;
      const lineHeight = fontSize * 1.3;

      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line, pos.x, y);
          line = word + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, pos.x, y);

      if (isSelected) {
        const handleSize = 8 * viewport.zoom;
        const handles = [
          { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 },
          { x: pos.x + nodeWidth / 2, y: pos.y - nodeHeight / 2 },
          { x: pos.x - nodeWidth / 2, y: pos.y + nodeHeight / 2 },
          { x: pos.x + nodeWidth / 2, y: pos.y + nodeHeight / 2 },
          { x: pos.x, y: pos.y - nodeHeight / 2 },
          { x: pos.x, y: pos.y + nodeHeight / 2 },
          { x: pos.x + nodeWidth / 2, y: pos.y },
          { x: pos.x - nodeWidth / 2, y: pos.y }
        ];

        ctx.fillStyle = '#3b82f6';
        handles.forEach(handle => {
          ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
        });
      }

      if (node.children.length > 0) {
        const indicatorSize = 8 * viewport.zoom;
        const indicatorX = pos.x + nodeWidth / 2 - 15 * viewport.zoom;
        const indicatorY = pos.y - nodeHeight / 2 + 15 * viewport.zoom;

        ctx.fillStyle = foldedNodes.includes(node.id) ? '#3b82f6' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, indicatorSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${indicatorSize * 1.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(foldedNodes.includes(node.id) ? '+' : '−', indicatorX, indicatorY);
      }
    });

    ctx.restore();
  }, [nodes, edges, viewport, roughCanvas, worldToScreen, selectedNode, foldedNodes, isNodeVisible, linking, customFont]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, viewport.zoom * zoomFactor));

    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const worldBefore = screenToWorld(mouseX, mouseY);

    const worldAfter = {
      x: mouseX / newZoom + viewport.x,
      y: mouseY / newZoom + viewport.y
    };

    onViewportChange({
      x: viewport.x + (worldBefore.x - worldAfter.x),
      y: viewport.y + (worldBefore.y - worldAfter.y),
      zoom: newZoom
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);

    if (e.button === 2) {
      const node = getNodeAtPosition(world.x, world.y);
      if (node) {
        onContextMenu(node.id, e.clientX, e.clientY);
      }
      return;
    }

    const resizeHandle = getResizeHandleAtPosition(world.x, world.y);
    if (resizeHandle && selectedNode === resizeHandle.nodeId) {
      setResizing(resizeHandle);
      setDragStart({ x: world.x, y: world.y });
      return;
    }

    const edgeAtPos = getNodeEdgeAtPosition(world.x, world.y);
    if (edgeAtPos && (e.ctrlKey || e.metaKey)) {
      setLinking({ active: true, fromNodeId: edgeAtPos.nodeId, toX: screenX, toY: screenY });
      return;
    }

    const node = getNodeAtPosition(world.x, world.y);

    if (node) {
      const nodeWidth = (node.width || defaultNodeWidth);
      const nodeHeight = (node.height || defaultNodeHeight);
      const indicatorX = node.x + nodeWidth / 2 - 15;
      const indicatorY = node.y - nodeHeight / 2 + 15;

      if (
        node.children.length > 0 &&
        Math.abs(world.x - indicatorX) < 10 &&
        Math.abs(world.y - indicatorY) < 10
      ) {
        const newFoldedNodes = foldedNodes.includes(node.id)
          ? foldedNodes.filter(id => id !== node.id)
          : [...foldedNodes, node.id];
        onFoldedNodesChange(newFoldedNodes);
        return;
      }

      onSelectNode(node.id);
      setIsDragging(true);
      setDraggedNode(node.id);
      setDragStart({ x: world.x - node.x, y: world.y - node.y });
    } else {
      onSelectNode(null);
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);

    if (linking.active) {
      setLinking(prev => ({ ...prev, toX: screenX, toY: screenY }));
      return;
    }

    if (resizing) {
      const node = nodes.find(n => n.id === resizing.nodeId);
      if (!node) return;

      const dx = world.x - dragStart.x;
      const dy = world.y - dragStart.y;
      const currentWidth = node.width || defaultNodeWidth;
      const currentHeight = node.height || defaultNodeHeight;

      let newWidth = currentWidth;
      let newHeight = currentHeight;

      const { position } = resizing;
      if (position.includes('e')) newWidth = Math.max(50, currentWidth + dx * 2);
      if (position.includes('w')) newWidth = Math.max(50, currentWidth - dx * 2);
      if (position.includes('s')) newHeight = Math.max(30, currentHeight + dy * 2);
      if (position.includes('n')) newHeight = Math.max(30, currentHeight - dy * 2);

      const updatedNodes = nodes.map(n =>
        n.id === resizing.nodeId ? { ...n, width: newWidth, height: newHeight } : n
      );

      onNodesChange(updatedNodes);
      setDragStart({ x: world.x, y: world.y });
    } else if (isPanning) {
      const dx = (e.clientX - dragStart.x) / viewport.zoom;
      const dy = (e.clientY - dragStart.y) / viewport.zoom;

      onViewportChange({
        ...viewport,
        x: viewport.x - dx,
        y: viewport.y - dy
      });

      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDragging && draggedNode) {
      const updatedNodes = nodes.map(node =>
        node.id === draggedNode
          ? { ...node, x: world.x - dragStart.x, y: world.y - dragStart.y }
          : node
      );

      onNodesChange(updatedNodes);
    }

    const resizeHandle = getResizeHandleAtPosition(world.x, world.y);
    if (resizeHandle && selectedNode === resizeHandle.nodeId) {
      canvasRef.current!.style.cursor = getCursorForHandle(resizeHandle.position);
    } else {
      canvasRef.current!.style.cursor = isPanning ? 'grabbing' : isDragging ? 'move' : 'grab';
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (linking.active && linking.fromNodeId) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const world = screenToWorld(screenX, screenY);

        const toNode = getNodeAtPosition(world.x, world.y);
        if (toNode && toNode.id !== linking.fromNodeId) {
          const existingEdge = edges.find(
            edge => edge.from === linking.fromNodeId && edge.to === toNode.id
          );

          if (!existingEdge) {
            const newEdge: GraphEdge = {
              id: `edge-${Date.now()}`,
              from: linking.fromNodeId,
              to: toNode.id,
              type: 'arrow'
            };
            onEdgesChange([...edges, newEdge]);
          }
        }
      }
    }

    setIsPanning(false);
    setIsDragging(false);
    setDraggedNode(null);
    setResizing(null);
    setLinking({ active: false, fromNodeId: null, toX: 0, toY: 0 });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);

    const node = getNodeAtPosition(world.x, world.y);

    if (node) {
      onEditNode(node.id);
    }
  };

  const getCursorForHandle = (position: string): string => {
    if (position === 'nw' || position === 'se') return 'nwse-resize';
    if (position === 'ne' || position === 'sw') return 'nesw-resize';
    if (position === 'n' || position === 's') return 'ns-resize';
    if (position === 'e' || position === 'w') return 'ew-resize';
    return 'grab';
  };

  return (
    <canvas
      ref={canvasRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={e => e.preventDefault()}
      className="w-full h-full"
    />
  );
}
