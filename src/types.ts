export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  storageUsed: number;
  role?: 'admin' | 'client';
  createdAt?: { seconds: number; nanoseconds: number };
}

export interface FileMetadata {
  id: string;
  name: string;
  ownerUid: string;
  size: number;
  type: string;
  url: string;
  storagePath?: string;
  createdAt: number;
  isStarred?: boolean;
  isTrashed?: boolean;
}
