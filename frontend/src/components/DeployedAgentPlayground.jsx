// src/components/DeployedAgentPlayground.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listAgents, queryAgent } from '../services/agentEngineService';
import { MessageCircle, Send, PlusCircle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import StatusBadge from './StatusBadge';

const DeployedAgentPlayground = ({ projectId, region, agentId }) => {
  const navigate = useNavigate();
  const [selectedAgentId, setSelectedAgentId] = useState(agentId || null);
  const [agents, setAgents] = useState([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Fetch agents list
  useEffect(() => {
    const fetchAgents = async () => {
      if (!projectId) {
        setIsLoadingAgents(false);
        return;
      }
      
      try {
        setIsLoadingAgents(true);
        const agentsData = await listAgents(projectId, region);
        
        // Filter to active agents only
        const activeAgents = agentsData.filter(agent => agent.state === 'ACTIVE');
        setAgents(activeAgents);
        
        // If there's an agentId in the URL but it's not selected yet
        if (agentId && !selectedAgentId) {
          setSelectedAgentId(agentId);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
        setError('Failed to load agents. Please check your project settings.');
      } finally {
        setIsLoadingAgents(false);
      }
    };

    fetchAgents();
  }, [projectId, region, agentId, selectedAgentId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleAgentSelection = (id) => {
    setSelectedAgentId(id);
    setMessages([]);
    setError('');
    navigate(`/playground/${id}`);
  };

  const handleSendQuery = async () => {
    if (!query.trim() || !selectedAgentId || !projectId) return;
    
    try {
      setIsProcessing(true);
      setError('');
      
      // Add user message
      setMessages(prev => [...prev, { role: 'user', content: query }]);
      
      // Call the agent
      const response = await queryAgent(projectId, region, selectedAgentId, query);
      
      // Add agent response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.textResponse || 'No response from agent',
        actions: response.actions || []
      }]);
      
      // Clear the input
      setQuery('');
    } catch (error) {
      console.error('Error querying agent:', error);
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

  const getSelectedAgent = () => {
    return agents.find(agent => agent.name.includes(selectedAgentId));
  };

  // If no project is selected
  if (!projectId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-lg">
        <h3 className="text-lg font-medium mb-2">No Google Cloud Project Selected</h3>
        <p>Please set your Google Cloud Project ID in the top navigation to use the playground.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Agent selection UI */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Select a Deployed Agent</h2>
        <div className="flex space-x-2">
          <Link
            to="/create-agent"
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Agent
          </Link>
        </div>
      </div>
      
      {isLoadingAgents ? (
        <div className="text-center py-8">
          <LoadingSpinner />
          <p className="mt-2 text-gray-500">Loading agents...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h3 className="text-lg font-medium mb-4">No Deployed Agents Found</h3>
          <p className="text-gray-600 mb-6">
            You don't have any agents deployed yet. Create a new agent to get started.
          </p>
          <Link
            to="/create-agent"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Create New Agent
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Agent Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {agents.map((agent) => {
              const agentId = agent.name.split('/').pop();
              const isSelected = selectedAgentId === agentId;
              
              return (
                <div
                  key={agent.name}
                  className={`p-4 border rounded-lg cursor-pointer transition ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                  onClick={() => handleAgentSelection(agentId)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{agent.displayName || 'Unnamed Agent'}</h3>
                      <p className="text-sm text-gray-500">
                        {agent.framework || 'Custom'}{' • '}
                        Created {new Date(agent.createTime).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={agent.state} />
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Chat Interface */}
          {selectedAgentId ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Agent Info */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium">
                  {getSelectedAgent()?.displayName || 'Selected Agent'}
                </h3>
                <p className="text-sm text-gray-500">
                  {getSelectedAgent()?.framework || 'Custom Framework'}
                </p>
              </div>
              
              {/* Chat Area */}
              <div className="h-80 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2" />
                      <p>Send a message to interact with the agent</p>
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
                    onKeyPress={(e) => e.key === 'Enter' && handleSendQuery()}
                    placeholder="Type your message here..."
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isProcessing}
                  />
                  <button
                    onClick={handleSendQuery}
                    disabled={isProcessing || !query.trim()}
                    className="ml-2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">Select an agent to start chatting</p>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeployedAgentPlayground;
