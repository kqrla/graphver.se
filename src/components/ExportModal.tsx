import { Download, Copy, X } from 'lucide-react';
import { GraphNode, GraphEdge } from '../lib/supabase';

interface ExportModalProps {
  boardId: string;
  title: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onClose: () => void;
}

export default function ExportModal({ boardId, title, nodes, edges, onClose }: ExportModalProps) {
  const baseUrl = window.location.origin;
  const embedUrl = `${baseUrl}/embed/${boardId}`;

  const exportModes = [
    {
      name: 'Light Mode',
      mode: 'light',
      description: 'Clean white background with dark text'
    },
    {
      name: 'Dark Mode',
      mode: 'dark',
      description: 'Dark background with light text'
    },
    {
      name: 'Read-Only',
      mode: 'readonly',
      description: 'Embed with pan/zoom only, no editing'
    }
  ];

  const generateIframe = (mode: string) => {
    const url = new URL(embedUrl);
    url.searchParams.set('mode', mode);
    return `<iframe
  src="${url.toString()}"
  style="width:100%;height:600px;border:none;border-radius:8px;"
  allowfullscreen
  loading="lazy">
</iframe>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleExportJSON = () => {
    const data = {
      title,
      nodes,
      edges,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #1e293b; margin-bottom: 20px; }
        iframe { width: 100%; height: 700px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <iframe src="${embedUrl}" allowfullscreen loading="lazy"></iframe>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Export Board</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Embed Codes</h3>
            <div className="space-y-3">
              {exportModes.map(mode => (
                <div key={mode.mode} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-800">{mode.name}</h4>
                      <p className="text-sm text-gray-600">{mode.description}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-2 mb-2">
                    <code className="text-xs text-gray-700 block overflow-x-auto whitespace-pre-wrap break-words">
                      {generateIframe(mode.mode).substring(0, 100)}...
                    </code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(generateIframe(mode.mode))}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Embed Code
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Download Files</h3>
            <div className="space-y-2">
              <button
                onClick={handleExportJSON}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-700 font-medium">Export as JSON</span>
                <Download className="w-5 h-5 text-gray-400" />
              </button>
              <button
                onClick={handleExportHTML}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-700 font-medium">Export as HTML</span>
                <Download className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Direct Link</h3>
            <div className="bg-gray-50 rounded p-3 mb-2">
              <code className="text-sm text-gray-700 break-all">{embedUrl}</code>
            </div>
            <button
              onClick={() => copyToClipboard(embedUrl)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
