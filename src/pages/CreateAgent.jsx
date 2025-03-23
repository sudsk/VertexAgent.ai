// src/pages/CreateAgent.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAgent, deployAgent } from '../services/agentEngineService';

const CreateAgent = ({ projectId, region }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    description: '',
    framework: 'CUSTOM',
    modelId: 'gemini-1.5-pro',
    maxOutputTokens: 1024,
    temperature: 0.2,
    systemInstruction: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'maxOutputTokens' ? parseInt(value) : 
              name === 'temperature' ? parseFloat(value) : value
    });
  };

  const handleCreateAgent = async () => {
    if (!projectId) {
      setError('Please set your Google Cloud Project ID first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Prepare agent data for API
      const agentData = {
        displayName: formData.displayName,
        description: formData.description || undefined,
        tools: [],
        codeInterpreterSettings: {
          mode: 'DISABLED'
        },
        generationConfig: {
          temperature: formData.temperature,
          maxOutputTokens: formData.maxOutputTokens
        },
        systemInstruction: {
          parts: [
            {
              text: formData.systemInstruction
            }
          ]
        }
      };

      // Add model based on the selected framework
      if (formData.framework === 'CUSTOM') {
        agentData.model = `projects/${projectId}/locations/${region}/publishers/google/models/${formData.modelId}`;
      }

      // Create the agent
      const createdAgent = await createAgent(projectId, region, agentData);
      
      // Get the agent ID from the name (last part of the path)
      const agentId = createdAgent.name.split('/').pop();
      
      // Move to deployment step
      setStep(2);
      
      // Deploy the agent
      await deployAgent(projectId, region, agentId);
      
      // Navigate to the agent details
      navigate(`/agents/${agentId}`);
    } catch (error) {
      console.error('Error creating agent:', error);
      setError(error.response?.data?.error?.message || 'Failed to create agent. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!projectId) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-lg">
          <h2 className="text-xl font-semibold mb-4">No Google Cloud Project selected</h2>
          <p className="mb-4">Please set your Google Cloud Project ID in the top navigation to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Create a New Agent</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex mb-2">
            <div className={`flex-1 border-t-4 ${step >= 1 ? 'border-blue-500' : 'border-gray-200'} pt-4 pr-4`}>
              <h2 className={`text-lg font-medium ${step >= 1 ? 'text-blue-600' : 'text-gray-500'}`}>
                1. Configure Agent
              </h2>
            </div>
            <div className={`flex-1 border-t-4 ${step >= 2 ? 'border-blue-500' : 'border-gray-200'} pt-4 pl-4`}>
              <h2 className={`text-lg font-medium ${step >= 2 ? 'text-blue-600' : 'text-gray-500'}`}>
                2. Deploy Agent
              </h2>
            </div>
          </div>
        </div>
        
        {step === 1 && (
          <div>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent Name *
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="My Vertex AI Agent"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="A helpful AI assistant..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Framework
              </label>
              <select
                name="framework"
                value={formData.framework}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="CUSTOM">Custom</option>
                <option value="LANGCHAIN">LangChain</option>
                <option value="LLAMAINDEX">LlamaIndex</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select the framework you want to use for this agent
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                name="modelId"
                value={formData.modelId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Instruction
              </label>
              <textarea
                name="systemInstruction"
                value={formData.systemInstruction}
                onChange={handleChange}
                placeholder="You are a helpful AI assistant..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Output Tokens
                </label>
                <input
                  type="number"
                  name="maxOutputTokens"
                  value={formData.maxOutputTokens}
                  onChange={handleChange}
                  min="1"
                  max="8192"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature
                </label>
                <input
                  type="number"
                  name="temperature"
                  value={formData.temperature}
                  onChange={handleChange}
                  min="0"
                  max="1"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleCreateAgent}
                disabled={!formData.displayName || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create and Deploy</span>
                )}
              </button>
            </div>
          </div>
        )}
        
        {step === 2 && (
          <div className="text-center py-8">
            <svg className="animate-spin mx-auto h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Deploying your agent...</h3>
            <p className="mt-2 text-sm text-gray-500">
              This may take a few moments. You'll be redirected when it's complete.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateAgent;
