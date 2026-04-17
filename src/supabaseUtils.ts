import { supabase } from './supabase';
import { FileMetadata, UserProfile } from './types';

// Auth
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Profile
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return {
    uid: data.id,
    email: data.email,
    displayName: data.display_name,
    storageUsed: data.storage_used,
    role: data.role,
    createdAt: data.created_at ? { seconds: new Date(data.created_at).getTime() / 1000, nanoseconds: 0 } : undefined
  };
}

export async function createProfile(profile: Partial<UserProfile>) {
  const { error } = await supabase.from('profiles').insert([
    {
      id: profile.uid,
      email: profile.email,
      display_name: profile.displayName,
      storage_used: 0,
      role: profile.role || 'client'
    }
  ]);
  if (error) throw error;
}

export async function updateProfile(userId: string, updates: Partial<UserProfile>) {
  const supabaseUpdates: any = {};
  if (updates.displayName !== undefined) supabaseUpdates.display_name = updates.displayName;
  if (updates.storageUsed !== undefined) supabaseUpdates.storage_used = updates.storageUsed;

  const { error } = await supabase
    .from('profiles')
    .update(supabaseUpdates)
    .eq('id', userId);
    
  if (error) throw error;
}

// Files
export function subscribeToFiles(userId: string, onUpdate: (files: FileMetadata[]) => void) {
  // Initial fetch
  supabase
    .from('files')
    .select('*')
    .eq('owner_id', userId)
    .then(({ data, error }) => {
      if (error) console.error('Error fetching files:', error);
      else if (data) onUpdate(mapFiles(data));
    });

  // Real-time subscription
  const subscription = supabase
    .channel('files_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'files', filter: `owner_id=eq.${userId}` },
      () => {
        supabase
          .from('files')
          .select('*')
          .eq('owner_id', userId)
          .then(({ data }) => {
            if (data) onUpdate(mapFiles(data));
          });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

function mapFiles(data: any[]): FileMetadata[] {
  return data.map(f => ({
    id: f.id,
    name: f.name,
    ownerUid: f.owner_id,
    size: f.size,
    type: f.type,
    url: f.url,
    storagePath: f.storage_path,
    createdAt: new Date(f.created_at).getTime(),
    isStarred: f.is_starred,
    isTrashed: f.is_trashed
  }));
}

export async function uploadFile(file: File, userId: string, onProgress: (progress: number) => void) {
  const fileName = `${userId}/${Date.now()}-${file.name}`;
  
  // Note: Supabase JS library doesn't easily support progress for simple uploads natively in all envs,
  // but we can simulate or use an XMLHttpRequest if needed. For now, we'll do a standard upload.
  onProgress(50); // Hardcoded progress for now

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('vault')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('vault')
    .getPublicUrl(fileName);

  const { error: dbError } = await supabase.from('files').insert([
    {
      name: file.name,
      owner_id: userId,
      size: file.size,
      type: file.type || 'application/octet-stream',
      url: publicUrl,
      storage_path: fileName,
      is_starred: false,
      is_trashed: false
    }
  ]);

  if (dbError) throw dbError;

  // Update total storage (transaction-like update)
  const { data: profile } = await supabase.from('profiles').select('storage_used').eq('id', userId).single();
  if (profile) {
    await supabase.from('profiles').update({ storage_used: (profile.storage_used || 0) + file.size }).eq('id', userId);
  }

  onProgress(100);
}

export async function toggleFileStar(fileId: string, currentState: boolean) {
  const { error } = await supabase
    .from('files')
    .update({ is_starred: !currentState })
    .eq('id', fileId);
  if (error) throw error;
}

export async function moveFileToTrash(fileId: string, isTrashed: boolean) {
  const { error } = await supabase
    .from('files')
    .update({ is_trashed: isTrashed })
    .eq('id', fileId);
  if (error) throw error;
}

export async function deleteFilePermanently(file: FileMetadata) {
  // 1. Delete from Storage
  const { error: storageError } = await supabase.storage
    .from('vault')
    .remove([file.storagePath || '']);
    
  if (storageError) console.warn('Storage delete error:', storageError);

  // 2. Delete from DB
  const { error: dbError } = await supabase.from('files').delete().eq('id', file.id);
  if (dbError) throw dbError;

  // 3. Update profile storage
  const { data: profile } = await supabase.from('profiles').select('storage_used').eq('id', file.ownerUid).single();
  if (profile) {
    await supabase.from('profiles').update({ storage_used: Math.max(0, (profile.storage_used || 0) - file.size) }).eq('id', file.ownerUid);
  }
}
