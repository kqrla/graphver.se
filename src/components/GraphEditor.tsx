import { useState, useEffect, useCallback } from 'react';
import { Save, FileText } from 'lucide-react';
import AdvancedCanvas from './AdvancedCanvas';
import InputPanel from './InputPanel';
import ContextMenu from './ContextMenu';
import EditNodeModal from './EditNodeModal';
import TextEditor from './TextEditor';
import SettingsPanel from './SettingsPanel';
import ExportModal from './ExportModal';
import { supabase, GraphNode, GraphEdge, Viewport, GraphData } from '../lib/supabase';
import { parseMermaidLikeText, reverseParseToText, LayoutDirection, LayoutMode } from '../lib/parser';

interface GraphEditorProps {
  boardId?: string;
}

export default function GraphEditor({ boardId }: GraphEditorProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [foldedNodes, setFoldedNodes] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [showInputPanel, setShowInputPanel] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ nodeId?: string; edgeId?: string; x: number; y: number } | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [title, setTitle] = useState('Untitled Board');
  const [currentBoardId, setCurrentBoardId] = useState(boardId);
  const [isSaving, setIsSaving] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('ltr');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('hierarchical');
  const [customFont, setCustomFont] = useState<string>();

  useEffect(() => {
    if (currentBoardId) {
      loadBoard(currentBoardId);
    } else if (nodes.length === 0) {
      setShowInputPanel(true);
    }
  }, [currentBoardId]);

  const loadBoard = async (id: string) => {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      console.error('Error loading board:', error);
      return;
    }

    const graphData = data.graph_data as GraphData;
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
    setViewport(graphData.viewport);
    setFoldedNodes(graphData.foldedNodes || []);
    setTitle(data.title);
    setLayoutDirection(graphData.layoutDirection || 'ltr');
    setLayoutMode(graphData.layoutMode || 'hierarchical');
    setCustomFont(graphData.customFont);
  };

  const saveBoard = async () => {
    setIsSaving(true);

    const graphData: GraphData = {
      nodes,
      edges,
      viewport,
      foldedNodes,
      layoutDirection,
      layoutMode,
      customFont
    };

    try {
      if (currentBoardId) {
        const { error } = await supabase
          .from('boards')
          .update({
            title,
            graph_data: graphData,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentBoardId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('boards')
          .insert({
            title,
            graph_data: graphData,
            is_public: true
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setCurrentBoardId(data.id);
          window.history.pushState({}, '', `/?board=${data.id}`);
        }
      }
    } catch (error) {
      console.error('Error saving board:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImport = (importedNodes: GraphNode[], importedEdges: GraphEdge[]) => {
    setNodes(importedNodes);
    setEdges(importedEdges);
  };

  const handleAddChild = useCallback((parentId: string) => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    const newNode: GraphNode = {
      id: `node-${Date.now()}`,
      text: 'New Child',
      x: parent.x,
      y: parent.y + 150,
      depth: parent.depth + 1,
      parentId: parent.id,
      children: []
    };

    const newEdge: GraphEdge = {
      id: `edge-${Date.now()}`,
      from: parent.id,
      to: newNode.id
    };

    setNodes([...nodes.map(n =>
      n.id === parentId ? { ...n, children: [...n.children, newNode.id] } : n
    ), newNode]);
    setEdges([...edges, newEdge]);
    setSelectedNode(newNode.id);
  }, [nodes, edges]);

  const handleAddSibling = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const newNode: GraphNode = {
      id: `node-${Date.now()}`,
      text: 'New Sibling',
      x: node.x + 250,
      y: node.y,
      depth: node.depth,
      parentId: node.parentId,
      children: []
    };

    const newNodes = [...nodes, newNode];

    if (node.parentId) {
      const parent = nodes.find(n => n.id === node.parentId);
      if (parent) {
        const newEdge: GraphEdge = {
          id: `edge-${Date.now()}`,
          from: parent.id,
          to: newNode.id
        };
        setEdges([...edges, newEdge]);
        setNodes(newNodes.map(n =>
          n.id === parent.id ? { ...n, children: [...n.children, newNode.id] } : n
        ));
      }
    } else {
      setNodes(newNodes);
    }

    setSelectedNode(newNode.id);
  }, [nodes, edges]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const nodesToDelete = new Set([nodeId]);
    const collectChildren = (id: string) => {
      const n = nodes.find(n => n.id === id);
      if (n) {
        n.children.forEach(childId => {
          nodesToDelete.add(childId);
          collectChildren(childId);
        });
      }
    };
    collectChildren(nodeId);

    setNodes(nodes.filter(n => !nodesToDelete.has(n.id)).map(n =>
      n.id === node.parentId ? { ...n, children: n.children.filter(id => id !== nodeId) } : n
    ));
    setEdges(edges.filter(e => !nodesToDelete.has(e.from) && !nodesToDelete.has(e.to)));
    setSelectedNode(null);
  }, [nodes, edges]);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const newNode: GraphNode = {
      ...node,
      id: `node-${Date.now()}`,
      x: node.x + 50,
      y: node.y + 50,
      children: []
    };

    setNodes([...nodes, newNode]);

    if (node.parentId) {
      const newEdge: GraphEdge = {
        id: `edge-${Date.now()}`,
        from: node.parentId,
        to: newNode.id
      };
      setEdges([...edges, newEdge]);
    }

    setSelectedNode(newNode.id);
  }, [nodes, edges]);

  const handleEditNode = useCallback((nodeId: string, newText: string) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, text: newText } : n));
  }, [nodes]);

  const handleChangeEdgeType = useCallback((edgeId: string, type: 'line' | 'arrow' | 'double-arrow') => {
    setEdges(edges.map(e => e.id === edgeId ? { ...e, type } : e));
  }, [edges]);

  const handleLayoutChange = (direction: LayoutDirection, mode: LayoutMode) => {
    setLayoutDirection(direction);
    setLayoutMode(mode);

    const { nodes: newNodes } = parseMermaidLikeText(
      reverseParseToText(nodes, edges),
      direction,
      mode
    );
    setNodes(newNodes);
  };

  const handleTextSync = (newNodes: GraphNode[], newEdges: GraphEdge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedNode) return;

      if (e.key === 'Enter' && !e.shiftKey && e.target === document.body) {
        e.preventDefault();
        if (e.metaKey || e.ctrlKey) {
          handleAddSibling(selectedNode);
        } else {
          handleAddChild(selectedNode);
        }
      } else if (e.key === 'Tab' && e.target === document.body) {
        e.preventDefault();
        handleAddChild(selectedNode);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target === document.body) {
          e.preventDefault();
          handleDeleteNode(selectedNode);
        }
      } else if (e.key === 'Escape') {
        setSelectedNode(null);
      } else if (e.key === 'F2' || (e.key === 'Enter' && e.target === document.body)) {
        setEditingNode(selectedNode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, handleAddChild, handleAddSibling, handleDeleteNode]);

  const handleShare = async () => {
    if (!currentBoardId) {
      await saveBoard();
      if (!currentBoardId) return;
    }

    const url = `${window.location.origin}/embed/${currentBoardId}`;
    const iframe = `<iframe src="${url}" style="width:100%;height:600px;border:none;" allowfullscreen></iframe>`;

    await navigator.clipboard.writeText(iframe);
    alert('Embed code copied to clipboard!');
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl font-semibold text-gray-800 border-none outline-none bg-transparent hover:bg-gray-50 px-2 py-1 rounded"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInputPanel(true)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            <FileText className="w-4 h-4" />
            Import
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            ⚙
            Settings
          </button>

          <button
            onClick={() => setShowExport(true)}
            disabled={nodes.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            📤
            Export
          </button>

          <button
            onClick={saveBoard}
            disabled={isSaving || nodes.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex-1 relative flex">
        <SettingsPanel
          layoutDirection={layoutDirection}
          layoutMode={layoutMode}
          onLayoutDirectionChange={(dir) => handleLayoutChange(dir, layoutMode)}
          onLayoutModeChange={(mode) => handleLayoutChange(layoutDirection, mode)}
          onEdgeTypeChange={handleChangeEdgeType}
          selectedEdgeId={selectedEdge}
          isOpen={showSettings}
          onToggle={() => setShowSettings(!showSettings)}
        />

        <div className="flex-1 relative">
          <AdvancedCanvas
            nodes={nodes}
            edges={edges}
            foldedNodes={foldedNodes}
            viewport={viewport}
            onViewportChange={setViewport}
            onNodesChange={setNodes}
            onEdgesChange={setEdges}
            onFoldedNodesChange={setFoldedNodes}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            onEditNode={(nodeId) => setEditingNode(nodeId)}
            onContextMenu={(nodeId, x, y) => setContextMenu({ nodeId, x, y })}
            customFont={customFont}
          />

          {nodes.length > 0 && (
            <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg px-4 py-3 border border-gray-200 text-xs text-gray-600 space-y-1 max-w-48">
              <div><strong>Enter:</strong> Child</div>
              <div><strong>Cmd+Enter:</strong> Sibling</div>
              <div><strong>Ctrl+Drag edge:</strong> Link nodes</div>
              <div><strong>Delete:</strong> Remove</div>
              <div><strong>Double-click:</strong> Edit</div>
            </div>
          )}
        </div>

        <TextEditor
          nodes={nodes}
          edges={edges}
          onSync={handleTextSync}
          isOpen={showTextEditor}
          onToggle={() => setShowTextEditor(!showTextEditor)}
        />
      </div>

      {showInputPanel && (
        <InputPanel
          onImport={handleImport}
          onClose={() => setShowInputPanel(false)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          edgeId={contextMenu.edgeId}
          onEdit={contextMenu.nodeId ? () => setEditingNode(contextMenu.nodeId!) : undefined}
          onDelete={contextMenu.nodeId ? () => handleDeleteNode(contextMenu.nodeId!) : undefined}
          onAddChild={contextMenu.nodeId ? () => handleAddChild(contextMenu.nodeId!) : undefined}
          onAddSibling={contextMenu.nodeId ? () => handleAddSibling(contextMenu.nodeId!) : undefined}
          onDuplicate={contextMenu.nodeId ? () => handleDuplicateNode(contextMenu.nodeId!) : undefined}
          onChangeEdgeType={contextMenu.edgeId ? handleChangeEdgeType : undefined}
          onClose={() => setContextMenu(null)}
        />
      )}

      {editingNode && (
        <EditNodeModal
          nodeText={nodes.find(n => n.id === editingNode)?.text || ''}
          onSave={(newText) => handleEditNode(editingNode, newText)}
          onClose={() => setEditingNode(null)}
        />
      )}

      {showExport && currentBoardId && (
        <ExportModal
          boardId={currentBoardId}
          title={title}
          nodes={nodes}
          edges={edges}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
