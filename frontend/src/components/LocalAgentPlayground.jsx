// Update LocalAgentPlayground.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { testAgentLocally, createAgent, deployAgent } from '../services/agentEngineService';
import { MessageCircle, Send, Bot, Save } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const LocalAgentPlayground = ({ projectId, region }) => {
  const navigate = useNavigate();
  const [agentConfig, setAgentConfig] = useState(null);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Check if we have a configuration in localStorage
    const savedConfig = localStorage.getItem('testAgentConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setAgentConfig(config);
        
        // Clear the stored configuration
        localStorage.removeItem('testAgentConfig');
      } catch (error) {
        console.error('Error parsing saved configuration:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleTestQuery = async () => {
    if (!query.trim() || !agentConfig || !projectId) return;
    
    try {
      setIsProcessing(true);
      setError('');
      
      // Add user message
      setMessages(prev => [...prev, { role: 'user', content: query }]);
      
      // Call the testAgentLocally service
      const response = await testAgentLocally(projectId, region, {
        ...agentConfig,
        query: query
      });
      
      // Add agent response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.textResponse || 'No response from agent',
        actions: response.actions || []
      }]);
      
      // Clear the input
      setQuery('');
    } catch (error) {
      console.error('Error testing agent:', error);
      setError(error.response?.data?.detail || 'Failed to process your request');
      
      // Add error message
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: 'Error: ' + (error.response?.data?.detail || 'Failed to process your request')
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeployToVertexAI = async () => {
    if (!agentConfig || !projectId) return;
    
    setIsDeploying(true);
    setError('');
    
    try {
      // Create the agent
      const createdAgent = await createAgent(projectId, region, agentConfig);
      
      // Get the agent ID from the name
      const agentId = createdAgent.name.split('/').pop();
      
      // Deploy the agent
      await deployAgent(projectId, region, agentId);
      
      // Navigate to the deployed playground with this agent
      navigate(`/playground/${agentId}`);
      
      // Show success message as system message
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: 'Agent successfully deployed to Vertex AI! Redirecting...'
      }]);
    } catch (error) {
      console.error('Error deploying agent:', error);
      setError(error.response?.data?.detail || 'Failed to deploy agent');
    } finally {
      setIsDeploying(false);
    }
  };

  // If no agent config is loaded
  if (!agentConfig) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-lg text-center">
          <Bot className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Agent Configuration</h3>
          <p className="text-gray-600 mb-4">
            To test an agent locally, first create a new agent configuration or visit the Create Agent page.
          </p>
          <button
            onClick={() => navigate('/create-agent')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create New Agent
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-medium mb-2">Testing Agent: {agentConfig.displayName}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Framework:</span> {agentConfig.framework || 'CUSTOM'}
          </div>
          <div>
            <span className="font-medium">Model:</span> {agentConfig.modelId || 'gemini-1.5-pro'}
          </div>
          <div>
            <span className="font-medium">Temperature:</span> {agentConfig.temperature || '0.2'}
          </div>
        </div>
      </div>
      
      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-96 flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-2" />
                <p>Send a message to test the agent</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-3/4 p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-100 text-blue-800'
                        : msg.role === 'system'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {msg.content}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs font-medium">Actions:</p>
                        <ul className="text-xs list-disc pl-4">
                          {msg.actions.map((action, actionIdx) => (
                            <li key={actionIdx}>{action.name || 'Unnamed action'}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTestQuery()}
              placeholder="Type your test query here..."
              className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing}
            />
            <button
              onClick={handleTestQuery}
              disabled={isProcessing || !query.trim()}
              className="ml-2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? <LoadingSpinner size="small" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Deployment button */}
      <div className="flex justify-end mt-6">
        <button
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center disabled:opacity-50"
          onClick={handleDeployToVertexAI}
          disabled={isDeploying || messages.length === 0}
        >
          {isDeploying ? (
            <>
              <LoadingSpinner size="small" />
              <span className="ml-2">Deploying...</span>
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Deploy to Vertex AI
            </>
          )}
        </button>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default LocalAgentPlayground;
