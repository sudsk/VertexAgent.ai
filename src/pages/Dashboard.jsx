// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listAgents } from '../services/agentEngineService';
import { Cpu, PlayCircle, ChevronRight } from 'lucide-react';

const Dashboard = ({ projectId, region }) => {
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
      <h1 className="text-2xl font-bold mb-6">Agent Engine Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Total Agents</p>
              <h3 className="text-2xl font-semibold mt-1">{isLoading ? '...' : agents.length}</h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Cpu className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link to="/agents" className="text-blue-600 text-sm font-medium hover:text-blue-800 inline-flex items-center">
              View agents
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Get Started</p>
              <h3 className="text-2xl font-semibold mt-1">Create Agent</h3>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/create-agent" className="text-green-600 text-sm font-medium hover:text-green-800 inline-flex items-center">
              Create new agent
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Test Agents</p>
              <h3 className="text-2xl font-semibold mt-1">Playground</h3>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <PlayCircle className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link to="/playground" className="text-purple-600 text-sm font-medium hover:text-purple-800 inline-flex items-center">
              Open playground
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
      
      {/* Recent Agents Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Recent Agents</h2>
        {isLoading ? (
          <div className="py-4 text-center text-gray-500">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p className="mb-4">No agents found in this project.</p>
            <Link to="/create-agent" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Create your first agent
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Framework</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.slice(0, 5).map((agent, index) => (
                  <tr key={agent.name || index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">{agent.displayName || 'Unnamed Agent'}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        agent.state === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                        agent.state === 'CREATING' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {agent.state || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{agent.framework || 'Custom'}</td>
                    <td className="py-3 px-4 text-sm">{new Date(agent.updateTime || Date.now()).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <Link 
                        to={`/agents/${agent.name.split('/').pop()}`} 
                        className="text-blue-600 hover:text-blue-800 mx-1"
                      >
                        View
                      </Link>
                      <Link 
                        to={`/playground/${agent.name.split('/').pop()}`} 
                        className="text-green-600 hover:text-green-800 mx-1"
                      >
                        Test
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {agents.length > 5 && (
              <div className="text-center mt-4">
                <Link to="/agents" className="text-blue-600 hover:text-blue-800">
                  View all agents
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Getting Started Guide */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Getting Started with Agent Engine</h2>
        <div className="space-y-4">
          <div className="flex">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
              1
            </div>
            <div>
              <h3 className="text-md font-medium">Define your agent</h3>
              <p className="text-sm text-gray-600 mt-1">
                Choose a framework (LangChain, LlamaIndex) and define your agent configuration
              </p>
            </div>
          </div>
          
          <div className="flex">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
              2
            </div>
            <div>
              <h3 className="text-md font-medium">Deploy to Agent Engine</h3>
              <p className="text-sm text-gray-600 mt-1">
                Register and deploy your agent on Vertex AI
              </p>
            </div>
          </div>
          
          <div className="flex">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
              3
            </div>
            <div>
              <h3 className="text-md font-medium">Test in the playground</h3>
              <p className="text-sm text-gray-600 mt-1">
                Try out your agent with different inputs to ensure it works as expected
              </p>
            </div>
          </div>
          
          <div className="flex">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
              4
            </div>
            <div>
              <h3 className="text-md font-medium">Monitor and improve</h3>
              <p className="text-sm text-gray-600 mt-1">
                Use observability tools to monitor your agent's performance and make improvements
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
