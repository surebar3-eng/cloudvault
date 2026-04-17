import React from 'react';
import { 
  Folder, 
  Clock, 
  Star, 
  Trash2, 
  Cloud,
  LayoutGrid,
  Settings,
  Plus
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  storageUsed: number;
  onUpload: () => void;
  onCreateFolder: () => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { id: 'all', label: 'My Files', icon: Folder },
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, storageUsed, onUpload, onCreateFolder, onOpenSettings, isOpen, onClose }) => {
  const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5 GB Security Limit
  const percentage = Math.min((storageUsed / STORAGE_LIMIT) * 100, 100);

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb < 0.1) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <aside className={`w-64 bg-sidebar border-r border-border flex flex-col p-6 h-screen fixed inset-y-0 left-0 z-40 md:relative md:translate-x-0 transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
          <Cloud className="text-white w-5 h-5" />
        </div>
        <span className="font-bold text-xl text-text-primary tracking-tight">CloudVault</span>
      </div>

      <div className="flex gap-2 mb-8">
        <button 
          onClick={onUpload}
          className="flex-1 flex items-center justify-center gap-2 bg-brand text-white py-2.5 rounded-xl font-semibold shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all font-medium text-sm w-full"
          title="Upload File"
        >
          <Plus className="w-4 h-4" />
          <span>File</span>
        </button>
        <button 
          onClick={onCreateFolder}
          className="flex-1 flex items-center justify-center gap-2 bg-white border border-border text-text-primary py-2.5 rounded-xl font-semibold hover:bg-bg transition-all shadow-sm font-medium text-sm w-full"
          title="New Folder"
        >
          <Folder className="w-4 h-4 text-amber-500" />
          <span>Folder</span>
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${
              activeTab === item.id 
                ? 'bg-hover text-brand' 
                : 'text-text-secondary hover:bg-hover hover:text-text-primary'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </button>
        ))}
        
        <div className="pt-4 mt-4 border-t border-border">
          <button 
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-text-secondary hover:bg-hover hover:text-text-primary transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </nav>

      <div className="mt-auto pt-6 px-2">
        <div className="bg-bg rounded-xl p-4">
          <div className="text-xs font-semibold text-text-primary mb-2">Storage Usage</div>
          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-brand rounded-full" 
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="text-[10px] text-text-secondary">
            {formatStorage(storageUsed)} of 5 GB used
          </div>
        </div>
      </div>
    </aside>
  );
};
