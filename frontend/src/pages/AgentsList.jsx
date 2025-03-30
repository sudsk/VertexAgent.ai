// src/pages/AgentsList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listAgents, deleteAgent } from '../services/agentEngineService';
import { Cpu, Search, Plus, MoreHorizontal, Trash2 } from 'lucide-react';

const AgentsList = ({ projectId, region }) => {
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);  

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
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, [projectId, region]);

  // Also add a click handler to close menus when clicking outside:
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);  
  
  const handleDeleteConfirm = async (agentId) => {
    try {
      await deleteAgent(projectId, region, agentId);
      setAgents(agents.filter(agent => agent.name.split('/').pop() !== agentId));
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const filteredAgents = agents.filter(agent => 
    agent.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Agents</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search agents..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Link 
            to="/create-agent" 
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <Plus size={16} />
            <span>Create Agent</span>
          </Link>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading agents...</div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? (
              <p>No agents found matching "{searchTerm}"</p>
            ) : (
              <>
                <p className="mb-4">No agents found in this project.</p>
                <Link to="/create-agent" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Create your first agent
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 py-3 px-4 border-b border-gray-200 bg-gray-50 text-sm font-medium text-gray-600">
              <div className="col-span-5">Name</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Framework</div>
              <div className="col-span-2">Last Updated</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
            
            {filteredAgents.map((agent, index) => (
              <div 
                key={agent.name || index} 
                className="grid grid-cols-12 py-4 px-4 border-b border-gray-200 hover:bg-gray-50"
              >
                <div className="col-span-5 flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                    <Cpu size={16} />
                  </div>
                  <div>
                    <Link to={`/agents/${agent.name.split('/').pop()}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {agent.displayName || 'Unnamed Agent'}
                    </Link>
                    <p className="text-xs text-gray-500">Created {new Date(agent.createTime).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    agent.state === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                    agent.state === 'CREATING' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${
                      agent.state === 'ACTIVE' ? 'bg-green-400' : 
                      agent.state === 'CREATING' ? 'bg-yellow-400' : 
                      'bg-gray-400'
                    } mr-1`}></span>
                    {agent.state || 'Unknown'}
                  </span>
                </div>
                <div className="col-span-2 flex items-center text-sm text-gray-600">
                  {agent.framework === 'LANGGRAPH' ? (
                    <span className="flex items-center">
                      <span className="inline-block h-4 w-4 bg-blue-100 text-blue-600 rounded mr-1 text-xs font-bold text-center">G</span>
                      LangGraph
                    </span>
                  ) : agent.framework === 'CREWAI' ? (
                    <span className="flex items-center">
                      <span className="inline-block h-4 w-4 bg-purple-100 text-purple-600 rounded mr-1 text-xs font-bold text-center">C</span>
                      CrewAI
                    </span>
                  ) : (
                    agent.framework || 'Custom'
                  )}
                </div>
                <div className="col-span-2 flex items-center text-sm text-gray-600">
                  {new Date(agent.updateTime || Date.now()).toLocaleString()}
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  <div className="relative dropdown">
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === agent.id ? null : agent.id)}
                      className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {openMenuId === agent.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                        <Link
                          to={`/agents/${agent.name.split('/').pop()}`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          View Details
                        </Link>
                        <Link
                          to={`/playground/${agent.name.split('/').pop()}`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Test in Playground
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmation(agent.name.split('/').pop());
                            setOpenMenuId(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Agent</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete this agent? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => handleDeleteConfirm(deleteConfirmation)}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setDeleteConfirmation(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentsList;
