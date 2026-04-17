import React from 'react';
import { 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  Video,
  BarChart2, 
  Download, 
  MoreVertical, 
  Star, 
  Trash2,
  Clock,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { FileMetadata } from '../types';

interface FileListProps {
  files: FileMetadata[];
  onDownload: (file: FileMetadata) => void;
  onStar: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
  searchTerm?: string;
}

const getFileIcon = (type: string) => {
  if (type === 'folder') return <Folder className="w-5 h-5 text-amber-500" />;
  if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (type.startsWith('video/')) return <Video className="w-5 h-5 text-purple-500" />;
  if (type.includes('spreadsheet') || type.includes('excel')) return <BarChart2 className="w-5 h-5 text-green-600" />;
  return <FileText className="w-5 h-5 text-blue-600" />;
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const FileList: React.FC<FileListProps> = ({ files, onDownload, onStar, onDelete, searchTerm }) => {
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-bg/50">
            <th className="px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Owner</th>
            <th className="px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Last Modified</th>
            <th className="px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Size</th>
            <th className="px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {files.map((file) => (
            <motion.tr 
              key={file.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="hover:bg-hover transition-colors group"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${file.type === 'folder' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                    {getFileIcon(file.type)}
                  </div>
                  <span className="font-medium text-sm text-text-primary">{file.name}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-text-secondary">Me</td>
              <td className="px-6 py-4 text-sm text-text-secondary">
                {new Date(file.createdAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-sm text-text-secondary">
                {formatSize(file.size)}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onStar(file)}
                    className={`p-1.5 rounded-lg hover:bg-white transition-colors ${file.isStarred ? 'text-amber-500' : 'text-text-secondary'}`}
                  >
                    <Star className="w-4 h-4" fill={file.isStarred ? 'currentColor' : 'none'} />
                  </button>
                  <button 
                    onClick={() => onDownload(file)}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-brand hover:bg-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDelete(file)}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-red-500 hover:bg-white transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
          {files.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic">
                {searchTerm 
                  ? `No files matching "${searchTerm}" found.` 
                  : "No files found in this section. Upload something to get started!"
                }
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
