
import React, { useCallback } from 'react';
import { Upload, FileSpreadsheet, Image as ImageIcon, CheckCircle, FolderOpen } from 'lucide-react';

interface DropzoneProps {
  label: string;
  accept: string;
  onFileSelect?: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  currentFile: File | string | null;
  fileCount?: number; // New prop to show count for multiple files
  iconType: 'excel' | 'image' | 'folder';
  multiple?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({ 
  label, 
  accept, 
  onFileSelect, 
  onFilesSelect,
  currentFile, 
  fileCount = 0,
  iconType, 
  multiple = false 
}) => {
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (multiple && onFilesSelect) {
        onFilesSelect(Array.from(e.dataTransfer.files));
      } else if (onFileSelect) {
        onFileSelect(e.dataTransfer.files[0]);
      }
    }
  }, [onFileSelect, onFilesSelect, multiple]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (multiple && onFilesSelect) {
        onFilesSelect(Array.from(e.target.files));
      } else if (onFileSelect) {
        onFileSelect(e.target.files[0]);
      }
    }
  };

  const isConfigured = !!currentFile || fileCount > 0;

  const renderIcon = () => {
    if (isConfigured) return <CheckCircle className="w-10 h-10 text-green-400" />;
    switch (iconType) {
      case 'excel': return <FileSpreadsheet className="w-10 h-10 text-gray-400 group-hover:text-purple-400" />;
      case 'folder': return <FolderOpen className="w-10 h-10 text-gray-400 group-hover:text-purple-400" />;
      default: return <ImageIcon className="w-10 h-10 text-gray-400 group-hover:text-purple-400" />;
    }
  };

  return (
    <div 
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer group
        ${isConfigured ? 'border-green-500 bg-green-500/10' : 'border-gray-600 hover:border-purple-500 hover:bg-gray-800'}
      `}
    >
      <input 
        type="file" 
        accept={accept} 
        onChange={handleChange} 
        multiple={multiple}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className="flex flex-col items-center text-center space-y-2">
        {renderIcon()}
        
        <div>
          <p className="font-semibold text-gray-200">{label}</p>
          <p className="text-xs text-gray-500 mt-1">
            {isConfigured 
              ? (fileCount > 0 ? `${fileCount} files loaded` : (typeof currentFile === 'string' ? 'Image Loaded' : currentFile?.name)) 
              : multiple ? 'Drag multiple files or folder' : 'Drag & drop or click'}
          </p>
        </div>
      </div>
    </div>
  );
};
