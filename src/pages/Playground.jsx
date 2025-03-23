// src/pages/Playground.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { listAgents, queryAgent } from '../services/agentEngineService';
import { Send, RefreshCw, ChevronDown } from 'lucide-react';

const Playground = ({ projectId, region }) => {
  const { agentId } = useParams();
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(agentId || '');
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchAgents = async () => {
      if (!projectId) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const agentsData = await listAgents(projectId, region);
        setAgents(agentsData);
        
        // If an agentId was provided and it exists, select it
        if (agentId && agentsData.some(agent => agent.name.split('/').pop() === agentId)) {
          setSelectedAgent(agentId);
          // Add a welcome message
          setMessages([{
            role: 'agent',
            content: `Hello! I'm your AI agent powered by Vertex AI Agent Engine. How can I assist you today?`
          }]);
        } else if (agentsData.length > 0) {
          // Otherwise select the first agent
          setSelectedAgent(agentsData[0].name.split('/').pop());
          // Add a welcome message
          setMessages([{
            role: 'agent',
            content: `Hello! I'm your AI agent powered by Vertex AI Agent Engine. How can I assist you today?`
          }]);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, [projectId, region, agentId]);

  useEffect(() => {
    // Scroll to bottom of messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAgentChange = (e) => {
    const newAgentId = e.target.value;
    setSelectedAgent(newAgentId);
    
    // Reset conversation
    setMessages([{
      role: 'agent',
      content: `Hello! I'm your AI agent powered by Vertex AI Agent Engine. How can I assist you today?`
    }]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent || isProcessing) return;
    
    const userMessage = {
      role: 'user',
      content: inputMessage
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);
    
    try {
      // Add a thinking message
      setMessages(prev => [...prev, {
        role: 'agent',
        content: '...',
        isThinking: true
      }]);
      
      const response = await queryAgent(projectId, region, selectedAgent, inputMessage);
      
      // Remove the thinking message
      setMessages(prev => prev.filter(msg => !msg.isThinking));
      
      // Add the real response
      setMessages(prev => [...prev, {
        role: 'agent',
        content: response.textResponse || "I'm sorry, I couldn't process that request."
      }]);
    } catch (error) {
      console.error('Error querying agent:', error);
      
      // Remove the thinking message
      setMessages(prev => prev.filter(msg => !msg.isThinking));
      
      // Add error message
      setMessages(prev => [...prev, {
        role: 'agent',
        content: "I'm sorry, an error occurred while processing your request. Please try again.",
        isError: true
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetConversation = () => {
    setMessages([{
      role: 'agent',
      content: `Hello! I'm your AI agent powered by Vertex AI Agent Engine. How can I assist you today?`
    }]);
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
    <div className="container mx-auto px-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Agent Playground</h1>
        <div className="flex gap-4">
          <div className="relative">
            <select
              value={selectedAgent}
              onChange={handleAgentChange}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              {isLoading ? (
                <option value="">Loading agents...</option>
              ) : agents.length === 0 ? (
                <option value="">No agents available</option>
              ) : (
                agents.map(agent => (
                  <option 
                    key={agent.name} 
                    value={agent.name.split('/').pop()}
                  >
                    {agent.displayName || 'Unnamed Agent'}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
          </div>
          <button
            onClick={handleResetConversation}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isProcessing}
          >
            <RefreshCw size={16} />
            <span>Reset</span>
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
          {messages.map((message, index) => (
            <div key={index} className={`flex mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'agent' && (
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                  AI
                </div>
              )}
              <div 
                className={`px-4 py-2 rounded-lg max-w-3xl ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : message.isError 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                {message.isThinking ? (
                  <div className="flex gap-1 justify-center items-center py-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              {message.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 ml-2">
                  You
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isProcessing || !selectedAgent}
            />
            <button
              onClick={handleSendMessage}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!inputMessage.trim() || isProcessing || !selectedAgent}
            >
              <Send size={16} />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playground;
