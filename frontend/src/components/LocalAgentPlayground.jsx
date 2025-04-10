// Update LocalAgentPlayground.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { testAgentLocally, createAgent, deployAgent, getAgent } from '../services/agentEngineService';
import { uploadFiles, deleteSessionFiles } from '../services/fileService';
import { MessageCircle, Send, Bot, Save, PaperclipIcon, FileUp } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import FileUpload from './FileUpload';

const LocalAgentPlayground = ({ projectId, region }) => {
  const navigate = useNavigate();
  const { agentId } = useParams();
  const [agent, setAgent] = useState(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);  
  const messagesEndRef = useRef(null);

  // Effect to fetch agent details if agentId is provided
  useEffect(() => {
    const fetchAgentDetails = async () => {
      if (!agentId || !projectId) return;
      
      try {
        setIsLoadingAgent(true);
        const agentData = await getAgent(projectId, region, agentId);
        setAgent(agentData);
        
        // Add a welcome message for newly created agents
        const isNewlyCreated = sessionStorage.getItem('newlyCreatedAgent') === agentId;
        if (isNewlyCreated) {
          setMessages([
            { 
              role: 'system', 
              content: `Agent "${agentData.displayName}" has been created successfully! You can now test it by sending a message.` 
            }
          ]);
          // Clear the flag
          sessionStorage.removeItem('newlyCreatedAgent');
        }
      } catch (err) {
        console.error('Error fetching agent details:', err);
        setError('Failed to load agent details');
      } finally {
        setIsLoadingAgent(false);
      }
    };
    
    fetchAgentDetails();
  }, [agentId, projectId, region]);    

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle file uploads
  const handleFileUpload = async (files) => {
    try {
      setError('');
      
      // If we already have a session ID, use it, otherwise let the API create one
      const uploadResult = await uploadFiles(files, sessionId);
      
      // Store the session ID for future uploads
      setSessionId(uploadResult.session_id);
      
      // Update the list of uploaded files
      setUploadedFiles(uploadResult.files);
      
      // Notify the user
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: `Uploaded ${files.length} file(s). You can now ask questions about the content.`
      }]);
      
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Failed to upload files: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Clean up uploaded files when component unmounts
  useEffect(() => {
    return () => {
      // Delete session files when component unmounts if we have a session ID
      if (sessionId) {
        deleteSessionFiles(sessionId).catch(err => 
          console.error('Error cleaning up session files:', err)
        );
      }
    };
  }, [sessionId]);
  
  const handleTestQuery = async () => {
    if (!query.trim() || !agent || !projectId) return;
    
    try {
      setIsProcessing(true);
      setError('');
      
      // Add user message
      setMessages(prev => [...prev, { role: 'user', content: query }]);
      
      // Call the testAgentLocally service with uploaded files information
      const response = await testAgentLocally(projectId, region, {
        ...agent,
        query: query,
        sessionId: sessionId,
        files: uploadedFiles
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
    if (!agent || !projectId) return;
    
    setIsDeploying(true);
    setError('');
    
    try {
      // Deploy the agent
      await deployAgent(projectId, region, agentId, 'AGENT_ENGINE');
      
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

  // If no agent is loaded and we're not loading one
  if (!agent && !isLoadingAgent) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-lg text-center">
          <Bot className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Agent Selected</h3>
          <p className="text-gray-600 mb-4">
            Please select an agent from the Agents page or create a new one to test.
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

  // If we're loading the agent
  if (isLoadingAgent) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
        <p className="ml-3 text-gray-600">Loading agent...</p>
      </div>
    );
  }  

  return (
    <div className="space-y-6">
      {/* Agent Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-medium mb-2">Testing Agent: {agent.displayName}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Framework:</span> {agent.framework || 'CUSTOM'}
          </div>
          <div>
            <span className="font-medium">Model:</span> {agent.modelId || agent.model?.split('/').pop() || 'gemini-1.5-pro'}
          </div>
          <div>
            <span className="font-medium">Temperature:</span> {agent.temperature || agent.generationConfig?.temperature || '0.2'}
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
                        <p className="text-xs font-medium text-gray-500">Tool Actions:</p>
                        {msg.actions.map((action, actionIdx) => (
                          <div key={actionIdx} className="mt-1 text-xs bg-gray-50 p-2 rounded">
                            <span className="font-medium">{action.name}: </span>
                            <span>{action.output}</span>
                          </div>
                        ))}
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
          {showFileUpload && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium">Upload Files</h4>
                <button 
                  onClick={() => setShowFileUpload(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Hide
                </button>
              </div>
              <FileUpload onFileUpload={handleFileUpload} />
            </div>
          )}
          
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="p-2 text-gray-500 hover:text-blue-500 rounded-md hover:bg-gray-100 mr-2"
              title="Upload files"
            >
              <FileUp size={18} />
            </button>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTestQuery()}
              placeholder={uploadedFiles.length > 0 
                ? "Ask a question about the uploaded files..." 
                : "Type your test query here or upload files..."}
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
          
          {uploadedFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full mr-2 mt-1 flex items-center">
                  <FileUp size={12} className="mr-1" />
                  {file.filename}
                </div>
              ))}
            </div>
          )}
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
