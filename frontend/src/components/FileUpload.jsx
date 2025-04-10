// src/components/FileUpload.jsx
import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image, Table } from 'lucide-react';

const FileUpload = ({ onFileUpload, maxSize = 5 }) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  
  // Convert bytes to readable format
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Get file icon based on type
  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
    if (type.includes('spreadsheet') || type.includes('csv')) return <Table className="h-5 w-5 text-green-500" />;
    return <FileText className="h-5 w-5 text-gray-500" />;
  };
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const validateFiles = (fileList) => {
    const newFiles = [];
    let hasError = false;
    
    Array.from(fileList).forEach(file => {
      // Check file size (convert maxSize from MB to bytes)
      if (file.size > maxSize * 1024 * 1024) {
        setError(`"${file.name}" exceeds the maximum size of ${maxSize}MB`);
        hasError = true;
        return;
      }
      
      newFiles.push(file);
    });
    
    if (!hasError) {
      setError('');
      return newFiles;
    }
    
    return null;
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validatedFiles = validateFiles(e.dataTransfer.files);
      if (validatedFiles) {
        setFiles(validatedFiles);
        onFileUpload(validatedFiles);
      }
    }
  };
  
  const handleChange = (e) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files.length > 0) {
      const validatedFiles = validateFiles(e.target.files);
      if (validatedFiles) {
        setFiles(validatedFiles);
        onFileUpload(validatedFiles);
      }
    }
  };
  
  const handleButtonClick = () => {
    fileInputRef.current.click();
  };
  
  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    onFileUpload(newFiles);
  };
  
  return (
    <div className="w-full">
      {error && (
        <div className="mb-2 p-2 bg-red-50 text-red-600 text-sm rounded-md">
          {error}
        </div>
      )}
      
      <div 
        className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleChange}
        />
        
        <Upload className="h-10 w-10 text-gray-400 mb-2" />
        <p className="mb-1 text-sm font-medium text-gray-700">
          Drag & drop files here, or click to select
        </p>
        <p className="text-xs text-gray-500">
          Max file size: {maxSize}MB
        </p>
      </div>
      
      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files:</h4>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li key={index} className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                <div className="flex items-center">
                  {getFileIcon(file.type)}
                  <span className="ml-2 text-sm">{file.name}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="p-1 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-200"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
