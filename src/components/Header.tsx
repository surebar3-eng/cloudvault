import React from 'react';
import { Search, User } from 'lucide-react';

interface HeaderProps {
  user: {
    displayName: string | null;
    email: string | null;
  } | null;
  onLogout: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenSettings: () => void;
  onDiagnostics: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, searchTerm, onSearchChange, onOpenSettings, onDiagnostics }) => {
  return (
    <header className="h-16 px-8 flex items-center justify-between bg-sidebar border-b border-border sticky top-0 z-10">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input 
            type="text" 
            placeholder="Search files by name..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={onDiagnostics}
          className="px-3 py-1.5 border border-border rounded-lg text-xs font-bold text-text-secondary hover:bg-hover transition-colors hidden md:block"
        >
          Check Storage
        </button>

        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold text-text-primary">{user?.displayName || 'User'}</div>
          <div className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Personal Account</div>
        </div>
        
        <div className="group relative">
          <button className="w-10 h-10 rounded-full bg-border flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-brand transition-all ring-offset-2">
            <User className="w-6 h-6 text-text-secondary" />
          </button>
          
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-2 overflow-hidden">
            <button 
              onClick={onOpenSettings}
              className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-hover transition-colors"
            >
              Account Settings
            </button>
            <button 
              onClick={onLogout}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-border"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
