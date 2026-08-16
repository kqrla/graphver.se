import { useState } from 'react';
import { ChevronLeft, Settings, Palette, LayoutGrid as Layout } from 'lucide-react';
import type { LayoutDirection, LayoutMode } from '../lib/parser';

interface SettingsPanelProps {
  layoutDirection: LayoutDirection;
  layoutMode: LayoutMode;
  onLayoutDirectionChange: (direction: LayoutDirection) => void;
  onLayoutModeChange: (mode: LayoutMode) => void;
  onEdgeTypeChange: (edgeId: string, type: 'line' | 'arrow' | 'double-arrow') => void;
  selectedEdgeId?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function SettingsPanel({
  layoutDirection,
  layoutMode,
  onLayoutDirectionChange,
  onLayoutModeChange,
  onEdgeTypeChange,
  selectedEdgeId,
  isOpen,
  onToggle
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'layout' | 'edges'>('layout');

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 shadow-lg flex flex-col ${
        isOpen ? 'w-72' : 'w-0'
      }`}
    >
      <button
        onClick={onToggle}
        className="absolute right-0 top-4 transform translate-x-12 bg-white border border-gray-200 rounded-r-lg p-2 hover:bg-gray-50"
      >
        <ChevronLeft className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Settings</h3>
          </div>

          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('layout')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'layout'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Layout className="w-4 h-4 inline mr-2" />
              Layout
            </button>
            <button
              onClick={() => setActiveTab('edges')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'edges'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Palette className="w-4 h-4 inline mr-2" />
              Edges
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'layout' && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Layout Mode
                  </label>
                  <select
                    value={layoutMode}
                    onChange={(e) => onLayoutModeChange(e.target.value as LayoutMode)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="hierarchical">Hierarchical</option>
                    <option value="adaptive">Adaptive</option>
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    Hierarchical: Standard tree layout. Adaptive: Balanced child spacing.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Direction
                  </label>
                  <select
                    value={layoutDirection}
                    onChange={(e) => onLayoutDirectionChange(e.target.value as LayoutDirection)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="ltr">Left to Right</option>
                    <option value="ttb">Top to Bottom</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'edges' && (
              <div className="p-4 space-y-4">
                {selectedEdgeId ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Connection Type
                    </label>
                    <div className="space-y-2">
                      <button
                        onClick={() => onEdgeTypeChange(selectedEdgeId, 'line')}
                        className="w-full px-3 py-2 text-left text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-0.5 bg-gray-400"></div>
                          <span>Line</span>
                        </div>
                      </button>
                      <button
                        onClick={() => onEdgeTypeChange(selectedEdgeId, 'arrow')}
                        className="w-full px-3 py-2 text-left text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-0.5 bg-gray-400"></div>
                          <span>▶</span>
                          <span>Arrow</span>
                        </div>
                      </button>
                      <button
                        onClick={() => onEdgeTypeChange(selectedEdgeId, 'double-arrow')}
                        className="w-full px-3 py-2 text-left text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span>◀</span>
                          <div className="w-4 h-0.5 bg-gray-400"></div>
                          <span>▶</span>
                          <span>Bidirectional</span>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                      Select an edge to change its type
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
