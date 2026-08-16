import { useState, useEffect } from 'react';
import { ChevronRight, Code } from 'lucide-react';
import { GraphNode, GraphEdge } from '../lib/supabase';
import { reverseParseToText } from '../lib/parser';

interface TextEditorProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSync: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function TextEditor({ nodes, edges, onSync, isOpen, onToggle }: TextEditorProps) {
  const [textContent, setTextContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const text = reverseParseToText(nodes, edges);
    setTextContent(text);
    setIsDirty(false);
  }, [nodes, edges]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextContent(e.target.value);
    setIsDirty(true);
  };

  const handleSync = () => {
    onSync(nodes, edges);
    setIsDirty(false);
  };

  return (
    <div
      className={`fixed right-0 top-0 h-screen bg-white border-l border-gray-200 transition-all duration-300 shadow-lg flex flex-col ${
        isOpen ? 'w-80' : 'w-0'
      }`}
    >
      <button
        onClick={onToggle}
        className="absolute left-0 top-4 transform -translate-x-12 bg-white border border-gray-200 rounded-l-lg p-2 hover:bg-gray-50"
      >
        <ChevronRight className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <Code className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Text View</h3>
          </div>

          <textarea
            value={textContent}
            onChange={handleTextChange}
            className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none border-none"
            placeholder="Your graph structure will appear here..."
          />

          <div className="px-4 py-3 border-t border-gray-200 space-y-2">
            <button
              onClick={handleSync}
              disabled={!isDirty}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isDirty ? 'Sync to Canvas' : 'In Sync'}
            </button>
            <p className="text-xs text-gray-500 text-center">
              Edit text and click Sync to update canvas
            </p>
          </div>
        </>
      )}
    </div>
  );
}
