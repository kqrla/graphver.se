import { useEffect, useRef, useState, useCallback } from 'react';
import rough from 'roughjs';
import type { RoughCanvas } from 'roughjs/bin/canvas';
import { GraphNode, GraphEdge, Viewport } from '../lib/supabase';

interface InfiniteCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  foldedNodes: string[];
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
  onNodesChange: (nodes: GraphNode[]) => void;
  onFoldedNodesChange: (foldedNodes: string[]) => void;
  selectedNode: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onEditNode: (nodeId: string) => void;
  onContextMenu: (nodeId: string, x: number, y: number) => void;
}

export default function InfiniteCanvas({
  nodes,
  edges,
  foldedNodes,
  viewport,
  onViewportChange,
  onNodesChange,
  onFoldedNodesChange,
  selectedNode,
  onSelectNode,
  onEditNode,
  onContextMenu
}: InfiniteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [roughCanvas, setRoughCanvas] = useState<RoughCanvas | null>(null);

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

  const getNodeAtPosition = useCallback((wx: number, wy: number): GraphNode | null => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const nodeWidth = 150;
      const nodeHeight = 60 + (3 - node.depth) * 10;

      if (
        wx >= node.x - nodeWidth / 2 &&
        wx <= node.x + nodeWidth / 2 &&
        wy >= node.y - nodeHeight / 2 &&
        wy <= node.y + nodeHeight / 2
      ) {
        return node;
      }
    }
    return null;
  }, [nodes]);

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

      const from = worldToScreen(fromNode.x, fromNode.y);
      const to = worldToScreen(toNode.x, toNode.y);

      roughCanvas.line(from.x, from.y, to.x, to.y, {
        stroke: '#64748b',
        strokeWidth: 2,
        roughness: 1.5
      });
    });

    visibleNodes.forEach(node => {
      const pos = worldToScreen(node.x, node.y);
      const nodeWidth = 150 * viewport.zoom;
      const nodeHeight = (60 + (3 - node.depth) * 10) * viewport.zoom;
      const fontSize = getFontSize(node.depth) * viewport.zoom;

      const isSelected = node.id === selectedNode;
      const hasFoldedChildren = foldedNodes.includes(node.id);

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
      ctx.font = `${fontSize}px "Segoe Print", "Comic Sans MS", cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const maxWidth = nodeWidth - 20;
      const words = node.text.split(' ');
      let line = '';
      let y = pos.y;
      const lineHeight = fontSize * 1.2;

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

      if (node.children.length > 0) {
        const indicatorSize = 8 * viewport.zoom;
        const indicatorX = pos.x + nodeWidth / 2 - 15 * viewport.zoom;
        const indicatorY = pos.y - nodeHeight / 2 + 15 * viewport.zoom;

        ctx.fillStyle = hasFoldedChildren ? '#3b82f6' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, indicatorSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${indicatorSize * 1.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hasFoldedChildren ? '+' : '−', indicatorX, indicatorY);
      }
    });

    ctx.restore();
  }, [nodes, edges, viewport, roughCanvas, worldToScreen, selectedNode, foldedNodes, isNodeVisible]);

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

    onViewportChange({
      ...viewport,
      zoom: newZoom
    });

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

    const node = getNodeAtPosition(world.x, world.y);

    if (e.button === 2) {
      if (node) {
        onContextMenu(node.id, e.clientX, e.clientY);
      }
      return;
    }

    if (node) {
      const nodeWidth = 150;
      const nodeHeight = 60 + (3 - node.depth) * 10;
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

    if (isPanning) {
      const dx = (e.clientX - dragStart.x) / viewport.zoom;
      const dy = (e.clientY - dragStart.y) / viewport.zoom;

      onViewportChange({
        ...viewport,
        x: viewport.x - dx,
        y: viewport.y - dy
      });

      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDragging && draggedNode) {
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const world = screenToWorld(screenX, screenY);

      const updatedNodes = nodes.map(node =>
        node.id === draggedNode
          ? { ...node, x: world.x - dragStart.x, y: world.y - dragStart.y }
          : node
      );

      onNodesChange(updatedNodes);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDragging(false);
    setDraggedNode(null);
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
      style={{ cursor: isPanning ? 'grabbing' : isDragging ? 'move' : 'grab' }}
      className="w-full h-full"
    />
  );
}
