// src/components/CustomToolEditor.jsx
import React, { useState } from 'react';
import { Code, Save } from 'lucide-react';

const CustomToolEditor = ({ onSave }) => {
  const [toolName, setToolName] = useState('');
  const [toolDescription, setToolDescription] = useState('');
  const [toolCode, setToolCode] = useState(
    `def my_custom_tool(input_param: str) -> str:
    """
    This is a custom tool function.
    
    Args:
        input_param: The input parameter for the tool
        
    Returns:
        The result of the tool operation
    """
    # Your code here
    return f"Processed: {input_param}"`
  );
  const [error, setError] = useState(null);
  
  const handleSave = async () => {
    if (!toolName || !toolDescription || !toolCode) {
      setError('All fields are required');
      return;
    }
    
    try {
      // Save the custom tool
      await onSave({
        name: toolName,
        description: toolDescription,
        code: toolCode,
        type: 'CUSTOM'
      });
      
      // Reset form
      setToolName('');
      setToolDescription('');
      setToolCode(
        `def my_custom_tool(input_param: str) -> str:
    """
    This is a custom tool function.
    
    Args:
        input_param: The input parameter for the tool
        
    Returns:
        The result of the tool operation
    """
    # Your code here
    return f"Processed: {input_param}"`
      );
      setError(null);
    } catch (err) {
      setError(`Error saving tool: ${err.message}`);
    }
  };
  
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center mb-4">
        <Code className="h-5 w-5 text-blue-600 mr-2" />
        <h3 className="font-medium">Create Custom Tool</h3>
      </div>
      
      {error && (
        <div className="mb-4 p-2 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tool Name
          </label>
          <input
            type="text"
            value={toolName}
            onChange={(e) => setToolName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="my_search_tool"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={toolDescription}
            onChange={(e) => setToolDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Searches for information on a specific topic"
            rows={2}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Python Code
          </label>
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <div className="bg-gray-100 px-3 py-1 border-b border-gray-300 text-xs font-mono">
              Python Function
            </div>
            <textarea
              value={toolCode}
              onChange={(e) => setToolCode(e.target.value)}
              className="w-full px-3 py-2 font-mono text-sm"
              rows={10}
              spellCheck="false"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Define a Python function for your custom tool. The function should take parameters and return a string result.
          </p>
        </div>
        
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save className="h-4 w-4 mr-1.5" />
            Save Custom Tool
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomToolEditor;
