import { CreditCard as Edit, Trash2, Plus, Copy } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId?: string;
  edgeId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddChild?: () => void;
  onAddSibling?: () => void;
  onDuplicate?: () => void;
  onChangeEdgeType?: (type: 'line' | 'arrow' | 'double-arrow') => void;
  onClose: () => void;
}

export default function ContextMenu({
  x,
  y,
  nodeId,
  edgeId,
  onEdit,
  onDelete,
  onAddChild,
  onAddSibling,
  onDuplicate,
  onChangeEdgeType,
  onClose
}: ContextMenuProps) {
  const menuItems = [];

  if (nodeId) {
    if (onEdit) menuItems.push({ icon: Edit, label: 'Edit Node', onClick: onEdit });
    if (onAddChild) menuItems.push({ icon: Plus, label: 'Add Child', onClick: onAddChild });
    if (onAddSibling) menuItems.push({ icon: Plus, label: 'Add Sibling', onClick: onAddSibling });
    if (onDuplicate) menuItems.push({ icon: Copy, label: 'Duplicate', onClick: onDuplicate });
    if (onDelete) menuItems.push({ icon: Trash2, label: 'Delete', onClick: onDelete, danger: true });
  }

  if (edgeId && onChangeEdgeType) {
    menuItems.push(
      { label: 'Line', section: 'edge-type', onClick: () => onChangeEdgeType('line') },
      { label: 'Arrow', section: 'edge-type', onClick: () => onChangeEdgeType('arrow') },
      { label: 'Bidirectional', section: 'edge-type', onClick: () => onChangeEdgeType('double-arrow') }
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]"
        style={{ left: x, top: y }}
      >
        {menuItems.map((item: any, index) => (
          <button
            key={index}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
              item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
            }`}
          >
            {item.icon && <item.icon className="w-4 h-4" />}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
