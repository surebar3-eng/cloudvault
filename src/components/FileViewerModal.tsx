import React from 'react';
import { motion } from 'motion/react';
import { X, ExternalLink } from 'lucide-react';

interface FileViewerModalProps {
  fileName: string;
  fileUrl: string;
  fileType: string;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ fileName, fileUrl, fileType, onClose }) => {
  const isImage = fileType.startsWith('image/');
  const isVideo = fileType.startsWith('video/');
  const isAudio = fileType.startsWith('audio/');
  const isPdf = fileType === 'application/pdf';
  const isText = fileType.startsWith('text/') || fileType === 'application/json';

  const renderContent = () => {
    if (isImage) {
      return <img src={fileUrl} alt={fileName} className="max-w-full max-h-[70vh] rounded-lg object-contain" />;
    }
    if (isVideo) {
      return <video src={fileUrl} controls className="max-w-full max-h-[70vh] w-full rounded-lg" />;
    }
    if (isAudio) {
      return (
        <div className="w-full flex items-center justify-center p-8 bg-hover rounded-lg">
           <audio src={fileUrl} controls className="w-full" />
        </div>
      );
    }
    if (isPdf) {
      return <iframe src={fileUrl} title={fileName} className="w-full h-[70vh] rounded-lg bg-white" />;
    }
    if (isText) {
      return <iframe src={fileUrl} title={fileName} className="w-full h-[70vh] rounded-lg bg-white border border-border" />;
    }

    return (
      <div className="flex flex-col items-center justify-center p-12 bg-hover rounded-lg text-center">
        <p className="text-text-primary font-medium mb-2">Detailed preview not available for this file type</p>
        <p className="text-text-secondary text-sm mb-6">You can still download it or open it in a new tab.</p>
        <a 
          href={fileUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="bg-brand text-white px-6 py-2.5 rounded-lg flex items-center gap-2 hover:bg-brand/90 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open in New Tab
        </a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 relative p-4 md:p-8">
      {/* Background click listener */}
      <div className="absolute inset-0 z-0" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl max-h-[90vh] bg-bg rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white">
          <h3 className="font-bold text-lg text-text-primary truncate pr-4">{fileName}</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-hover rounded-lg transition-colors text-text-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-auto flex items-center justify-center bg-zinc-50/50">
          {renderContent()}
        </div>
      </motion.div>
    </div>
  );
};
