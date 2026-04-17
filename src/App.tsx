/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { FileList } from './components/FileList';
import { Auth } from './components/Auth';
import { FileMetadata, UserProfile } from './types';
import { motion } from 'motion/react';
import { Settings } from 'lucide-react';
import { supabase } from './supabase';
import { 
  subscribeToFiles, 
  updateProfile, 
  uploadFile,
  deleteFilePermanently,
  toggleFileStar,
  moveFileToTrash,
  getProfile,
  createProfile,
  signOut
} from './supabaseUtils';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [allFiles, setAllFiles] = useState<FileMetadata[]>([]);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasConfig = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  // Auth and Profile sync
  useEffect(() => {
    document.title = 'CloudVault (Supabase)';
    console.log('🔄 CloudVault: Initializing...');

    if (!hasConfig) {
      console.log('⚠️ CloudVault: No configuration found.');
      setIsReady(true);
      return;
    }

    // Safety timeout: If Supabase doesn't respond in 5s, show the auth screen anyway
    const safetyTimeout = setTimeout(() => {
      if (!isReady) {
        console.warn('🕒 CloudVault: Initialization timed out. Forcing ready state.');
        setIsReady(true);
      }
    }, 5000);

    let unsubscribeFiles: (() => void) | null = null;
    console.log('🔌 CloudVault: Connecting to Auth listener...');

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔑 Auth Event:', event);
      const sbUser = session?.user;
      clearTimeout(safetyTimeout);

      if (sbUser) {
        // Fetch or create profile
        try {
          setSyncError(null);
          let profile = await getProfile(sbUser.id);
          
          if (!profile) {
            const newProfile: Partial<UserProfile> = {
              uid: sbUser.id,
              email: sbUser.email || '',
              displayName: sbUser.user_metadata?.full_name || 'New User',
              role: sbUser.email === 'surebar3@gmail.com' ? 'admin' : 'client'
            };
            await createProfile(newProfile);
            profile = await getProfile(sbUser.id);
          }

          if (profile) {
            setUser(profile);
            setNewName(profile.displayName || '');
            
            // Listen to files
            if (unsubscribeFiles) unsubscribeFiles();
            unsubscribeFiles = subscribeToFiles(sbUser.id, (fetchedFiles) => {
              setAllFiles(fetchedFiles);
            });
          }
        } catch (error: any) {
          console.error('Profile sync error:', error);
          setSyncError(error.message || 'Failed to sync user profile. Check your database tables and RLS policies.');
        }
        setIsReady(true);
      } else {
        setUser(null);
        setAllFiles([]);
        if (unsubscribeFiles) {
          unsubscribeFiles();
          unsubscribeFiles = null;
        }
        setIsReady(true);
      }
    });

    return () => {
      authListener.unsubscribe();
      if (unsubscribeFiles) unsubscribeFiles();
    };
  }, []);

  // Filtering Logic
  useEffect(() => {
    let filtered = allFiles;
    
    if (activeTab === 'starred') filtered = allFiles.filter(f => f.isStarred);
    else if (activeTab === 'trash') filtered = allFiles.filter(f => f.isTrashed);
    else if (activeTab === 'recent') filtered = [...allFiles].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    else if (activeTab === 'all') filtered = allFiles.filter(f => !f.isTrashed);

    if (searchTerm) {
      filtered = filtered.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    setFiles(filtered);
  }, [allFiles, activeTab, searchTerm]);

  const handleDiagnostics = async () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      setDiagnosticResult({
        success: false,
        message: 'Missing Supabase Credentials',
        troubleshooting: 'Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.'
      });
      return;
    }

    try {
      const { error } = await supabase.from('files').select('count', { count: 'exact', head: true }).limit(1);
      if (error) throw error;
      setDiagnosticResult({
        success: true,
        message: 'Supabase connection successful!',
      });
    } catch (err: any) {
      setDiagnosticResult({
        success: false,
        message: 'Supabase Connection Failed',
        details: err.message,
        troubleshooting: 'Check if your Supabase URL and Anon Key are correct. Ensure the "files" table exists in your database.'
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
    setSearchTerm('');
  };

  const handleUpdateProfile = async () => {
    if (user) {
      await updateProfile(user.uid, { displayName: newName });
      setIsSettingsOpen(false);
      // Refresh local state
      setUser({ ...user, displayName: newName });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const STORAGE_HARD_LIMIT = 5 * 1024 * 1024 * 1024; // 5 GB
      if (user.storageUsed + file.size > STORAGE_HARD_LIMIT) {
        alert('Storage Limit Reached: You cannot exceed 5GB of free storage.');
        return;
      }

      setUploadProgress(0);
      try {
        await uploadFile(file, user.uid, (progress) => {
          setUploadProgress(progress);
        });
        setUploadProgress(null);
      } catch (err: any) {
        console.error('Upload failed:', err);
        alert(`Upload failed: ${err.message || 'Unknown error'}\n\nTroubleshooting:\n1. Ensure the "vault" storage bucket exists in Supabase.\n2. Check RLS policies for storage.`);
        setUploadProgress(null);
      }
    }
  };

  const deleteFile = async (targetFile: FileMetadata) => {
    if (!user) return;
    try {
      if (activeTab === 'trash' || targetFile.isTrashed) {
        if (window.confirm('Permanently delete this file? This cannot be undone.')) {
          await deleteFilePermanently(targetFile);
        }
      } else {
        await moveFileToTrash(targetFile.id, true);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Action failed: ' + (err.message || 'Unknown error'));
    }
  };

  if (!hasConfig) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-border p-8 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
            <Settings className="text-amber-600 w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Configuration Required</h2>
          <p className="text-sm text-text-secondary mb-6 leading-relaxed">
            CloudVault is ready to use, but needs your Supabase keys to connect to your storage.
          </p>
          <div className="bg-bg p-4 rounded-xl text-left border border-border mb-6">
            <p className="text-[10px] font-bold text-text-secondary uppercase mb-2 tracking-widest">Setup Steps</p>
            <ol className="text-xs space-y-3 text-text-primary list-decimal pl-4">
              <li>Open <b>Settings → Secrets</b> in AI Studio.</li>
              <li>
                <b>VITE_SUPABASE_URL</b>: 
                <span className="block text-[10px] text-text-secondary mt-1">Example: https://xyz.supabase.co (No trailing slash)</span>
              </li>
              <li>
                <b>VITE_SUPABASE_ANON_KEY</b>: 
                <span className="block text-[10px] text-text-secondary mt-1">Long string starting with "eyJ..." (Found in API Settings)</span>
              </li>
              <li>The app will automatically refresh!</li>
            </ol>
          </div>
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Connection: Waiting for Keys...</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-bold text-text-primary mb-2 tracking-tight">Initializing CloudVault</h2>
        <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
          Establishing a secure connection to your Supabase storage...
        </p>
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] opacity-40">Connecting to Secure Layer</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-[10px] text-brand font-bold uppercase tracking-widest hover:underline"
          >
            Timed out? Reload page
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Auth onLogin={() => {}} />
        {syncError && (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-red-600 text-white text-center text-xs font-bold z-[200] animate-slide-up">
            ⚠️ Profile Sync Error: {syncError}
            <button 
              onClick={() => window.location.reload()}
              className="ml-4 underline hover:text-white/80"
            >
              Retry
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg font-sans">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        storageUsed={user.storageUsed} 
        onUpload={() => fileInputRef.current?.click()}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileUpload}
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header 
          user={user} 
          onLogout={handleLogout} 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onDiagnostics={handleDiagnostics}
        />
        
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-text-primary capitalize tracking-tight">
                {activeTab === 'all' ? 'My Files' : activeTab}
              </h1>
              
              <div className="bg-white border border-border px-4 py-2 rounded-full text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                {searchTerm ? `Searching: "${searchTerm}"` : `Showing ${files.length} items`}
              </div>
            </div>

            <FileList 
              files={files} 
              searchTerm={searchTerm}
              onDownload={(f) => window.open(f.url, '_blank')}
              onStar={(f) => toggleFileStar(f.id, f.isStarred || false)}
              onDelete={deleteFile}
            />
          </div>
        </div>

        {uploadProgress !== null && (
          <div className="fixed bottom-8 right-8 bg-white border border-border p-4 rounded-xl shadow-2xl z-[100] w-64">
            <div className="flex justify-between text-[10px] font-bold text-text-secondary uppercase mb-2">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {diagnosticResult && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-border p-8"
            >
              <h2 className="text-xl font-bold text-text-primary mb-4 tracking-tight">Supabase Connection Test</h2>
              
              <div className={`p-4 rounded-xl mb-6 border ${diagnosticResult.success ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                <p className="font-bold mb-1 text-sm">{diagnosticResult.success ? 'Healthy' : 'Error Detected'}</p>
                <p className="text-xs opacity-90">{diagnosticResult.message || diagnosticResult.details}</p>
              </div>

              {!diagnosticResult.success && (
                <div className="bg-bg p-4 rounded-xl mb-6 border border-border">
                  <p className="text-[10px] font-bold text-text-secondary uppercase mb-2 tracking-wider">Troubleshooting</p>
                  <p className="text-xs font-medium leading-relaxed">{diagnosticResult.troubleshooting}</p>
                </div>
              )}

              <button 
                onClick={() => setDiagnosticResult(null)}
                className="w-full bg-brand text-white px-4 py-3 rounded-lg font-bold text-sm hover:translate-y-[-1px] transition-all shadow-lg shadow-brand/20 active:translate-y-[1px]"
              >
                Continue
              </button>
            </motion.div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-border p-8"
          >
            <h2 className="text-xl font-bold text-text-primary mb-6 tracking-tight">Account Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-2 ml-1 tracking-widest">Display Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-2 ml-1 tracking-widest">Email Address</label>
                <input 
                  type="text" 
                  value={user.email || ''}
                  disabled
                  className="w-full bg-bg border border-border rounded-lg py-2.5 px-4 text-sm opacity-60 cursor-not-allowed font-medium"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg font-bold text-xs text-text-secondary hover:bg-hover transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateProfile}
                className="flex-1 bg-brand text-white px-4 py-3 rounded-lg font-bold text-xs hover:translate-y-[-1px] transition-all shadow-lg shadow-brand/20 active:translate-y-[1px]"
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
