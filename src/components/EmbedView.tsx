import { useState, useEffect } from 'react';
import InfiniteCanvas from './InfiniteCanvas';
import EditNodeModal from './EditNodeModal';
import { supabase, GraphNode, GraphEdge, Viewport, GraphData } from '../lib/supabase';

interface EmbedViewProps {
  boardId: string;
}

export default function EmbedView({ boardId }: EmbedViewProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [foldedNodes, setFoldedNodes] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBoard();
  }, [boardId]);

  const loadBoard = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .eq('is_public', true)
      .maybeSingle();

    if (error || !data) {
      console.error('Error loading board:', error);
      setLoading(false);
      return;
    }

    const graphData = data.graph_data as GraphData;
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
    setViewport(graphData.viewport);
    setFoldedNodes(graphData.foldedNodes || []);
    setTitle(data.title);
    setLoading(false);
  };

  const handleEditNode = (nodeId: string, newText: string) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, text: newText } : n));
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading board...</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Board not found or empty.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      </header>

      <div className="flex-1 relative">
        <InfiniteCanvas
          nodes={nodes}
          edges={edges}
          foldedNodes={foldedNodes}
          viewport={viewport}
          onViewportChange={setViewport}
          onNodesChange={setNodes}
          onFoldedNodesChange={setFoldedNodes}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
          onEditNode={(nodeId) => setEditingNode(nodeId)}
          onContextMenu={() => {}}
        />
      </div>

      {editingNode && (
        <EditNodeModal
          nodeText={nodes.find(n => n.id === editingNode)?.text || ''}
          onSave={(newText) => handleEditNode(editingNode, newText)}
          onClose={() => setEditingNode(null)}
        />
      )}
    </div>
  );
}
