/// <reference types="vite/client" />

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  storageUsed: number;
}

export interface FileMetadata {
  id: string;
  name: string;
  ownerUid: string;
  size: number;
  type: string;
  url: string;
  createdAt: number;
  isStarred?: boolean;
  isTrashed?: boolean;
}
