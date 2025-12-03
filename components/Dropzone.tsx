import React, { useCallback } from 'react';
import { Upload, FileSpreadsheet, Image as ImageIcon, CheckCircle } from 'lucide-react';

interface DropzoneProps {
  label: string;
  accept: string;
  onFileSelect: (file: File) => void;
  currentFile: File | string | null;
  iconType: 'excel' | 'image';
}

export const Dropzone: React.FC<DropzoneProps> = ({ label, accept, onFileSelect, currentFile, iconType }) => {
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const isConfigured = !!currentFile;

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
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className="flex flex-col items-center text-center space-y-2">
        {isConfigured ? (
          <CheckCircle className="w-10 h-10 text-green-400" />
        ) : (
          iconType === 'excel' ? <FileSpreadsheet className="w-10 h-10 text-gray-400 group-hover:text-purple-400" /> : <ImageIcon className="w-10 h-10 text-gray-400 group-hover:text-purple-400" />
        )}
        
        <div>
          <p className="font-semibold text-gray-200">{label}</p>
          <p className="text-xs text-gray-500 mt-1">
            {isConfigured 
              ? (typeof currentFile === 'string' ? 'Image Loaded' : currentFile?.name) 
              : 'Drag & drop or click'}
          </p>
        </div>
      </div>
    </div>
  );
};