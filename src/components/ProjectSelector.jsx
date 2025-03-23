// src/components/ProjectSelector.jsx
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const ProjectSelector = ({ projectId, region, updateProjectSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputProjectId, setInputProjectId] = useState(projectId || '');
  const [inputRegion, setInputRegion] = useState(region || 'us-central1');
  
  const regions = [
    'us-central1',
    'us-east1',
    'us-west1',
    'europe-west1',
    'europe-west2',
    'asia-east1',
    'asia-northeast1'
  ];
  
  const handleSubmit = (e) => {
    e.preventDefault();
    updateProjectSettings(inputProjectId, inputRegion);
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md text-sm font-medium"
      >
        <span>{projectId ? `Project: ${projectId}` : 'Select Project'}</span>
        <ChevronDown size={16} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Project Settings</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Cloud Project ID
                </label>
                <input
                  type="text"
                  value={inputProjectId}
                  onChange={(e) => setInputProjectId(e.target.value)}
                  placeholder="my-project-id"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <select
                  value={inputRegion}
                  onChange={(e) => setInputRegion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {regions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;
