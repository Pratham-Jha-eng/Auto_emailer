import React, { useState, useCallback } from 'react';
import { UploadIcon } from './Icons';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  onFileError: (message: string) => void;
  isLoading: boolean;
}

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];
const ALLOWED_MIME_TYPES = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, onFileError, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: File): boolean => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(fileExtension) && ALLOWED_MIME_TYPES.includes(file.type)) {
        return true;
    }
    onFileError(`Invalid file type. Please upload a valid Excel file (${ALLOWED_EXTENSIONS.join(', ')}).`);
    return false;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileUpload(file);
      }
    }
    // Reset file input to allow re-uploading the same file name
    e.target.value = '';
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onFileUpload(file);
      }
    }
  }, [onFileUpload, onFileError]);

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 border border-slate-200 dark:border-slate-700">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors duration-200 ${
          isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
        }`}
      >
        <div className="text-center">
          <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">
            Drag & drop your Excel file here
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            or click to select a file
          </p>
          <input
            type="file"
            className="hidden"
            id="file-upload"
            accept={ALLOWED_EXTENSIONS.join(',')}
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <label
            htmlFor="file-upload"
            className={`mt-6 inline-block px-6 py-2 text-sm font-medium text-white rounded-md cursor-pointer transition-colors ${
              isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isLoading ? (
                <div className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                </div>
            ) : 'Select File'}
          </label>
        </div>
      </div>
    </div>
  );
};