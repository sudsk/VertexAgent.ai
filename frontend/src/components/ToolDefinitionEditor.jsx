// src/components/ToolDefinitionEditor.jsx
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const ToolDefinitionEditor = ({ tools, onChange }) => {
  const [tools, setTools] = useState(tools || []);
  
  const addTool = () => {
    const newTool = {
      name: '',
      description: '',
      type: 'FUNCTION'
    };
    
    const updatedTools = [...tools, newTool];
    setTools(updatedTools);
    onChange(updatedTools);
  };
  
  const removeTool = (index) => {
    const updatedTools = [...tools];
    updatedTools.splice(index, 1);
    setTools(updatedTools);
    onChange(updatedTools);
  };
  
  const updateTool = (index, field, value) => {
    const updatedTools = [...tools];
    updatedTools[index][field] = value;
    setTools(updatedTools);
    onChange(updatedTools);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Tools</h3>
        <button 
          type="button"
          onClick={addTool}
          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Tool
        </button>
      </div>
      
      {tools.length === 0 ? (
        <p className="text-gray-500 text-sm">No tools defined. Add a tool to enhance your agent.</p>
      ) : (
        <div className="space-y-4">
          {tools.map((tool, index) => (
            <div key={index} className="border border-gray-200 p-4 rounded-md">
              <div className="flex justify-between mb-2">
                <h4 className="font-medium">Tool {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeTool(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={tool.name}
                    onChange={(e) => updateTool(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="weather_lookup"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={tool.description}
                    onChange={(e) => updateTool(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Gets the current weather for a location"
                    rows={2}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={tool.type}
                    onChange={(e) => updateTool(index, 'type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="FUNCTION">Function</option>
                    <option value="RETRIEVAL">Document Retrieval</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToolDefinitionEditor;
