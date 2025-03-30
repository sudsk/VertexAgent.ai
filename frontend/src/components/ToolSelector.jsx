// src/components/ToolSelector.jsx
import React, { useState, useEffect } from 'react';
import { listAvailableTools, listCustomTools, createCustomTool } from '../services/agentEngineService';
import CustomToolEditor from './CustomToolEditor';
import { Plus, Trash2, Code } from 'lucide-react';

const ToolSelector = ({ selectedTools, onChange }) => {
  const [availableTools, setAvailableTools] = useState([]);
  const [customTools, setCustomTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCustomToolEditor, setShowCustomToolEditor] = useState(false);
  
  useEffect(() => {
    const fetchTools = async () => {
      try {
        setIsLoading(true);
        
        // Fetch both predefined and custom tools
        const [predefinedTools, userCustomTools] = await Promise.all([
          listAvailableTools(),
          listCustomTools()
        ]);
        
        setAvailableTools(predefinedTools);
        setCustomTools(userCustomTools);
      } catch (err) {
        console.error('Error fetching tools:', err);
        setError('Failed to load tools');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTools();
  }, []);
  
  const addTool = (toolName) => {
    // Find the tool details from available tools
    const toolToAdd = availableTools.find(tool => tool.name === toolName);
    if (!toolToAdd) return;
    
    // Check if already added
    if (selectedTools.some(tool => tool.name === toolName)) return;
    
    // Add the tool
    const updatedTools = [...selectedTools, toolToAdd];
    onChange(updatedTools);
  };
  
  const addCustomTool = (toolId) => {
    // Find the tool details from custom tools
    const toolToAdd = customTools.find(tool => tool.id === toolId);
    if (!toolToAdd) return;
    
    // Check if already added
    if (selectedTools.some(tool => tool.id === toolId)) return;
    
    // Add the custom tool with type property
    const customToolToAdd = {
      ...toolToAdd,
      type: 'CUSTOM'
    };
    
    const updatedTools = [...selectedTools, customToolToAdd];
    onChange(updatedTools);
  };
  
  const removeTool = (index) => {
    const updatedTools = [...selectedTools];
    updatedTools.splice(index, 1);
    onChange(updatedTools);
  };
  
  const handleSaveCustomTool = async (toolData) => {
    try {
      const savedTool = await createCustomTool(
        toolData.name,
        toolData.description,
        toolData.code
      );
      
      // Add to custom tools list
      setCustomTools([...customTools, savedTool]);
      
      // Hide the editor
      setShowCustomToolEditor(false);
    } catch (err) {
      setError(`Failed to save custom tool: ${err.message}`);
    }
  };
  
  if (isLoading) {
    return <div className="text-center py-4">Loading available tools...</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Agent Tools</h3>
        <div className="flex space-x-2">
          {/* Predefined tool dropdown */}
          <div className="relative">
            <select 
              className="px-3 py-2 border border-gray-300 rounded-md"
              onChange={(e) => {
                if (e.target.value) {
                  addTool(e.target.value);
                  e.target.value = ""; // Reset selection
                }
              }}
              value=""
            >
              <option value="" disabled>Add predefined tool...</option>
              {availableTools.map(tool => (
                <option key={tool.name} value={tool.name}>
                  {tool.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Custom tool dropdown */}
          {customTools.length > 0 && (
            <div className="relative">
              <select 
                className="px-3 py-2 border border-gray-300 rounded-md"
                onChange={(e) => {
                  if (e.target.value) {
                    addCustomTool(e.target.value);
                    e.target.value = ""; // Reset selection
                  }
                }}
                value=""
              >
                <option value="" disabled>Add custom tool...</option>
                {customTools.map(tool => (
                  <option key={tool.id} value={tool.id}>
                    {tool.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Create custom tool button */}
          <button
            type="button"
            onClick={() => setShowCustomToolEditor(!showCustomToolEditor)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Code className="mr-2 h-4 w-4" />
            {showCustomToolEditor ? 'Hide' : 'Create Custom Tool'}
          </button>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="p-2 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {/* Selected tools */}
      {selectedTools.length === 0 ? (
        <p className="text-gray-500 text-sm">No tools selected. Add tools to enhance your agent's capabilities.</p>
      ) : (
        <div className="space-y-3">
          {selectedTools.map((tool, index) => (
            <div key={index} className="border border-gray-200 p-3 rounded-md">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium flex items-center">
                    {tool.name}
                    {tool.type === 'CUSTOM' && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">{tool.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeTool(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Custom tool editor */}
      {showCustomToolEditor && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <CustomToolEditor onSave={handleSaveCustomTool} />
        </div>
      )}
    </div>
  );
};

export default ToolSelector;
