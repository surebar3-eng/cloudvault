import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { FileList } from './components/FileList';
import { Auth } from './components/Auth';
import { FileMetadata, UserProfile } from './types';
import { motion } from 'motion/react';
import { supabase } from './lib/supabase';
import { ArrowLeft, Plus } from 'lucide-react';

// Check if credentials exist
const HAS_SUPABASE_CREDS = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isReady, setIsReady] = useState(!HAS_SUPABASE_CREDS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [newName, setNewName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load session
  useEffect(() => {
    document.title = 'CloudVault';
    if (!HAS_SUPABASE_CREDS) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setIsReady(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setUser(null);
        setFiles([]);
        setIsReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (authUser: any) => {
    const displayName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User';
    
    setUser({
      uid: authUser.id,
      email: authUser.email,
      displayName: displayName,
      storageUsed: 0
    });
    setNewName(displayName);
    fetchFiles(authUser.id);
  };

  const fetchFiles = async (userId: string) => {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('ownerUid', userId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Supabase Setup Missing: The "files" table does not exist or policies are preventing read access.', error);
      // We still mark it as ready so the UI loads
      setIsReady(true);
      return;
    }

    if (data) {
      const mappedFiles = data as FileMetadata[];
      setFiles(mappedFiles);
      const totalSize = mappedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
      setUser(prev => prev ? { ...prev, storageUsed: totalSize } : null);
    }
    setIsReady(true);
  };

  const filteredFiles = useMemo(() => {
    let filtered = files;
    if (activeTab === 'starred') filtered = files.filter(f => f.isStarred);
    else if (activeTab === 'trash') filtered = files.filter(f => f.isTrashed);
    else if (activeTab === 'recent') filtered = [...files].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    else if (activeTab === 'all') filtered = files.filter(f => !f.isTrashed && (f.parentId || f.parentid || null) === currentFolderId);

    if (searchTerm) {
      filtered = filtered.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return filtered;
  }, [files, activeTab, searchTerm, currentFolderId]);

  const handleLogin = async (email: string, pass: string) => {
    if (!HAS_SUPABASE_CREDS) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const handleSignUp = async (email: string, pass: string, name: string) => {
    if (!HAS_SUPABASE_CREDS) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { full_name: name } }
    });
    if (error) throw error;
  };

  const handleLogout = async () => {
    if (HAS_SUPABASE_CREDS) {
      await supabase.auth.signOut();
    }
  };

  const handleUpdateProfile = async () => {
    if (user && HAS_SUPABASE_CREDS) {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: newName }
      });
      if (error) {
        alert('Failed to update profile: ' + error.message);
        return;
      }
      setUser({ ...user, displayName: newName });
      setIsSettingsOpen(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim() || !user || !HAS_SUPABASE_CREDS) return;
    
    try {
      const folderId = `${user.uid}/${Date.now()}_${folderName.trim()}`;
      
      const newFolder: any = {
        id: folderId,
        name: folderName.trim(),
        ownerUid: user.uid,
        size: 0,
        type: 'folder',
        url: '',
        createdAt: Date.now(),
        isStarred: false,
        isTrashed: false
      };
      
      if (currentFolderId) {
        newFolder.parentId = currentFolderId;
      }

      const { error: dbError } = await supabase
        .from('files')
        .insert([newFolder]);

      if (dbError) throw dbError;

      await fetchFiles(user.uid);
      setIsCreateFolderOpen(false);
      setFolderName('');
    } catch (err: any) {
      console.error('Folder creation error:', err);
      alert(`Failed to create folder: ${err.message}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user && HAS_SUPABASE_CREDS) {
      const STORAGE_HARD_LIMIT = 5 * 1024 * 1024 * 1024; // 5 GB
      if (user.storageUsed + file.size > STORAGE_HARD_LIMIT) {
        alert('Security Limit Reached: You cannot exceed 5GB total storage.');
        return;
      }

      setIsUploading(true);
      try {
        const filePath = `${user.uid}/${Date.now()}_${file.name}`;
        
        // Upload to bucket 'vault'
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('vault')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage.from('vault').getPublicUrl(filePath);

        const newFile: any = {
           id: uploadData.path, // Use path as id
           name: file.name,
           ownerUid: user.uid,
           size: file.size,
           type: file.type || 'application/octet-stream',
           url: publicUrl,
           createdAt: Date.now(),
           isStarred: false,
           isTrashed: false
        };
        
        if (currentFolderId) {
            newFile.parentId = currentFolderId;
        }

        const { error: dbError } = await supabase
          .from('files')
          .insert([newFile]);

        if (dbError) throw dbError;

        await fetchFiles(user.uid);
      } catch (err: any) {
        console.error('Upload error:', err);
        alert(`Failed to upload: ${err.message}. Ensure your Supabase has a "vault" storage bucket and a "files" table set up correctly.`);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const toggleStar = async (targetFile: FileMetadata) => {
    const newStatus = !targetFile.isStarred;
    setFiles(prev => prev.map(f => f.id === targetFile.id ? { ...f, isStarred: newStatus } : f));
    
    if (HAS_SUPABASE_CREDS) {
      await supabase.from('files').update({ isStarred: newStatus }).eq('id', targetFile.id);
    }
  };

  const deleteFile = async (targetFile: FileMetadata) => {
    if (!user || !HAS_SUPABASE_CREDS) return;
    
    try {
      if (activeTab === 'trash' || targetFile.isTrashed) {
         setFiles(prev => prev.filter(f => f.id !== targetFile.id));
         setUser(prev => prev ? { ...prev, storageUsed: Math.max(0, prev.storageUsed - targetFile.size) } : null);
         
         await supabase.storage.from('vault').remove([targetFile.id]);
         await supabase.from('files').delete().eq('id', targetFile.id);
      } else {
         setFiles(prev => prev.map(f => f.id === targetFile.id ? { ...f, isTrashed: true } : f));
         await supabase.from('files').update({ isTrashed: true }).eq('id', targetFile.id);
      }
    } catch(err: any) {
       console.error("Delete error", err);
       alert("Error deleting file: " + err.message);
       fetchFiles(user.uid);
    }
  };

  if (!HAS_SUPABASE_CREDS) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-8">
        <div className="max-w-xl w-full bg-white border border-border p-8 rounded-2xl shadow-xl">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Supabase Configuration Required</h1>
          <p className="text-sm text-text-secondary mb-6">
            The app is trying to connect to Supabase, but the environment variables are missing.
            Please set the following secrets in the AI Studio platform to proceed:
          </p>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-2 mb-6">
            <code className="text-xs font-mono font-bold text-amber-800 block">VITE_SUPABASE_URL</code>
            <code className="text-xs font-mono font-bold text-amber-800 block">VITE_SUPABASE_ANON_KEY</code>
          </div>
          <p className="text-xs text-text-secondary">
            You will also need to create a table named <code className="bg-gray-100 px-1 py-0.5 rounded">files</code> and a public storage bucket named <code className="bg-gray-100 px-1 py-0.5 rounded">vault</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!isReady) return <div className="min-h-screen bg-bg flex items-center justify-center font-bold text-text-secondary">Loading CloudVault...</div>;

  if (!user) {
    return <Auth onLogin={handleLogin} onSignUp={handleSignUp} />;
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setCurrentFolderId(null);
        }} 
        storageUsed={user.storageUsed} 
        onUpload={() => {
          fileInputRef.current?.click();
          setIsSidebarOpen(false);
        }}
        onCreateFolder={() => {
          setIsCreateFolderOpen(true);
          setIsSidebarOpen(false);
        }}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileUpload}
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
        <Header 
          user={user} 
          onLogout={handleLogout} 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        
        <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary capitalize flex items-center gap-3">
                {activeTab === 'all' && currentFolderId && (
                  <button 
                    onClick={() => {
                      const currentFolder = files.find(f => f.id === currentFolderId);
                      // Use parentId or parentid fallback safely
                      setCurrentFolderId(currentFolder?.parentId || currentFolder?.parentid || null);
                    }}
                    className="p-1.5 hover:bg-hover rounded-lg transition-colors border border-transparent hover:border-border text-text-secondary hover:text-text-primary"
                    title="Go back up"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                {activeTab === 'all' ? (currentFolderId ? files.find(f => f.id === currentFolderId)?.name || 'Folder' : 'My Files')  : activeTab}
              </h1>
              
              <div className="flex items-center gap-3">
                {activeTab === 'all' && currentFolderId && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-brand text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand/90 transition-all flex items-center gap-2 text-sm shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Upload File
                  </button>
                )}
                <div className="bg-white border border-border px-4 py-2 rounded-full text-xs font-medium text-text-secondary w-fit shadow-sm">
                  {searchTerm ? `Searching: "${searchTerm}"` : `Showing ${filteredFiles.length} items`}
                </div>
              </div>
            </div>

            <FileList 
              files={filteredFiles} 
              searchTerm={searchTerm}
              onFolderClick={(folderId) => {
                if (activeTab === 'all') {
                  setCurrentFolderId(folderId);
                  setSearchTerm('');
                }
              }}
              onDownload={(f) => {
                const link = document.createElement('a');
                // Directly use URL if public or create logic to download via JS
                link.href = f.url;
                link.target = '_blank';
                link.download = f.name;
                link.click();
              }}
              onStar={toggleStar}
              onDelete={deleteFile}
            />
            {isUploading && (
              <div className="mt-4 p-4 bg-brand/5 border border-brand/20 rounded-xl text-center text-sm font-medium text-brand animate-pulse">
                Uploading your file to Supabase securely...
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-border p-8"
          >
            <h2 className="text-xl font-bold text-text-primary mb-6">Account Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5 ml-1">Display Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5 ml-1">Email Address</label>
                <input 
                  type="text" 
                  value={user.email || ''}
                  disabled
                  className="w-full bg-bg border border-border rounded-lg py-2.5 px-4 text-sm opacity-60 cursor-not-allowed"
                />
                <p className="text-[10px] text-text-secondary mt-1 ml-1">Powered by Supabase Auth</p>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-text-secondary hover:bg-hover transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateProfile}
                className="flex-1 bg-brand text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-brand/90 transition-all"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isCreateFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-border p-8"
          >
            <h2 className="text-xl font-bold text-text-primary mb-6">Create New Folder</h2>
            
            <form onSubmit={handleCreateFolder}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5 ml-1">Folder Name</label>
                  <input 
                    type="text" 
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="e.g. Invoices"
                    className="w-full bg-bg border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreateFolderOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-text-secondary hover:bg-hover transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!folderName.trim()}
                  className="flex-1 bg-brand text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-brand/90 transition-all disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
