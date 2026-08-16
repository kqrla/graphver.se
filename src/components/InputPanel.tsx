import { useState } from 'react';
import { FileText, Import } from 'lucide-react';
import { parseMermaidLikeText } from '../lib/parser';
import { GraphNode, GraphEdge } from '../lib/supabase';

interface InputPanelProps {
  onImport: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  onClose: () => void;
}

export default function InputPanel({ onImport, onClose }: InputPanelProps) {
  const [inputText, setInputText] = useState('');

  const handleImport = () => {
    if (!inputText.trim()) return;

    const { nodes, edges } = parseMermaidLikeText(inputText);
    onImport(nodes, edges);
    onClose();
  };

  const exampleText = `Home
Home -> About
Home -> Services -> Web Design
Home -> Services -> Development
Home -> Contact`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Import Graph Text</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Enter your graph structure using Mermaid-like syntax:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 mb-3">
            <li>• Single line: creates a node</li>
            <li>• Arrow syntax: <code className="bg-gray-100 px-1 rounded">A -&gt; B</code> creates an edge</li>
            <li>• Chain: <code className="bg-gray-100 px-1 rounded">A -&gt; B -&gt; C</code> creates connected nodes</li>
          </ul>

          <div className="bg-gray-50 p-3 rounded border border-gray-200 mb-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">Example:</p>
            <pre className="text-xs text-gray-600">{exampleText}</pre>
          </div>
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter your graph structure here..."
          className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleImport}
            disabled={!inputText.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Import className="w-4 h-4" />
            Import Graph
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
