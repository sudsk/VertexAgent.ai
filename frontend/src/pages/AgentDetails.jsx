// src/pages/AgentDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAgent } from '../services/agentEngineService';
import { Play, Clipboard, Info, ChevronRight, Table, Pencil } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import AgentActions from '../components/AgentActions';

const AgentDetails = ({ projectId, region }) => {
  const { agentId } = useParams();
  const [agent, setAgent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');

  const fetchAgentDetails = async () => {
    if (!projectId || !agentId) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const agentData = await getAgent(projectId, region, agentId);
      setAgent(agentData);
    } catch (error) {
      console.error('Error fetching agent details:', error);
      setError('Failed to load agent details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAgentDetails();
  }, [projectId, region, agentId]);

  const handleDeploySuccess = () => {
    // Refresh agent data after successful deployment
    fetchAgentDetails();
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Not Found: </strong>
          <span className="block sm:inline">The agent you're looking for doesn't exist or you don't have permission to view it.</span>
        </div>
      </div>
    );
  }

  // Sample data for charts (in a real app, this would come from metrics APIs)
  const sampleMetricsData = [
    { name: '00:00', requests: 12 },
    { name: '02:00', requests: 19 },
    { name: '04:00', requests: 3 },
    { name: '06:00', requests: 5 },
    { name: '08:00', requests: 2 },
    { name: '10:00', requests: 3 },
    { name: '12:00', requests: 10 },
    { name: '14:00', requests: 15 },
    { name: '16:00', requests: 21 },
    { name: '18:00', requests: 18 },
    { name: '20:00', requests: 12 },
    { name: '22:00', requests: 5 },
  ];

  return (
    <div className="container mx-auto px-4">
      <div className="flex items-center mb-6">
        <Link to="/agents" className="text-blue-600 hover:text-blue-800 mr-2">
          Agents
        </Link>
        <ChevronRight className="h-4 w-4 text-gray-500 mr-2" />
        <h1 className="text-2xl font-bold">{agent.displayName || 'Unnamed Agent'}</h1>
      </div>

      {/* Add the new AgentActions component */}
      {agent && (
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <AgentActions 
              agent={agent} 
              projectId={projectId} 
              region={region}
              onDeploySuccess={handleDeploySuccess}
            />
            
            {/* Add Edit button */}
            <Link 
              to={`/create-agent/${agentId}`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Agent
            </Link>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Agent Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div className="flex items-center mt-1">
                <span className={`h-2 w-2 rounded-full ${
                  agent.state === 'ACTIVE' ? 'bg-green-400' : 
                  agent.state === 'CREATING' ? 'bg-yellow-400' : 
                  'bg-gray-400'
                } mr-2`}></span>
                <h3 className="text-xl font-semibold text-gray-800">
                  {agent.state || 'Unknown'}
                </h3>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Info className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-sm font-medium">
                {new Date(agent.createTime).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Updated</p>
              <p className="text-sm font-medium">
                {new Date(agent.updateTime).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        
        {/* Quick Actions Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Quick Actions</p>
              <h3 className="text-xl font-semibold mt-1 text-gray-800">Test & Debug</h3>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Play className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link 
              to={`/playground/${agentId}`} 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Open in Playground
            </Link>
          </div>
        </div>
        
        {/* Agent ID Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Agent ID</p>
              <h3 className="text-xl font-semibold mt-1 text-gray-800 truncate" title={agentId}>
                {agentId}
              </h3>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <Clipboard className="h-6 w-6 text-gray-600" />
            </div>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => navigator.clipboard.writeText(agentId)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Copy Agent ID
            </button>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('configuration')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'configuration'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Configuration
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'analytics'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'logs'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Logs
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600">
                  {agent.description || 'No description provided.'}
                </p>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Framework</h3>
                <p className="text-gray-600">
                  {agent.framework || 'Custom'}
                </p>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Model</h3>
                <p className="text-gray-600">
                  {agent.model ? agent.model.split('/').pop() : 'Not specified'}
                </p>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Usage Summary (Last 24 Hours)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sampleMetricsData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="requests" stroke="#4285F4" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'configuration' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Agent Settings</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Display Name</p>
                      <p className="font-medium">{agent.displayName || 'Unnamed Agent'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Project</p>
                      <p className="font-medium">{projectId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Region</p>
                      <p className="font-medium">{region}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Creation Time</p>
                      <p className="font-medium">{new Date(agent.createTime).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Generation Config</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Temperature</p>
                      <p className="font-medium">{agent.generationConfig?.temperature || 'Default'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Max Output Tokens</p>
                      <p className="font-medium">{agent.generationConfig?.maxOutputTokens || 'Default'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Top-P</p>
                      <p className="font-medium">{agent.generationConfig?.topP || 'Default'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Top-K</p>
                      <p className="font-medium">{agent.generationConfig?.topK || 'Default'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Framework</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Framework Type</p>
                      <p className="font-medium">{agent.framework || 'Custom'}</p>
                    </div>
                    
                    {agent.framework === 'LANGGRAPH' && agent.frameworkConfig && (
                      <>
                        <div>
                          <p className="text-sm text-gray-500">Graph Type</p>
                          <p className="font-medium">{agent.frameworkConfig.graphType || 'Sequential'}</p>
                        </div>
                        
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500">State Definition</p>
                          <pre className="bg-gray-100 p-2 rounded font-mono text-sm mt-1 whitespace-pre-wrap">
                            {JSON.stringify(agent.frameworkConfig.stateDefinition || {}, null, 2)}
                          </pre>
                        </div>
                      </>
                    )}
                    
                    {agent.framework === 'CREWAI' && agent.frameworkConfig && (
                      <>
                        <div>
                          <p className="text-sm text-gray-500">Agent Count</p>
                          <p className="font-medium">{agent.frameworkConfig.agentCount || 2}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Coordination Strategy</p>
                          <p className="font-medium">{agent.frameworkConfig.coordinationStrategy || 'Sequential'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {agent.tools && agent.tools.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Tools</h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <ul className="divide-y divide-gray-200">
                      {agent.tools.map((tool, index) => (
                        <li key={index} className="py-3 flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                            <Table className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{tool.functionDeclarations?.displayName || 'Unnamed Tool'}</p>
                            <p className="text-sm text-gray-500">{tool.type || 'Custom Tool'}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">System Instruction</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">
                    {agent.systemInstruction?.parts[0]?.text || 'No system instruction provided.'}
                  </pre>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'analytics' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Usage Analytics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">Total Requests</p>
                    <p className="text-2xl font-semibold mt-1">1,245</p>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      12% from last week
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">Avg. Response Time</p>
                    <p className="text-2xl font-semibold mt-1">1.2s</p>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      5% faster than last week
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">Success Rate</p>
                    <p className="text-2xl font-semibold mt-1">98.5%</p>
                    <p className="text-xs text-red-600 flex items-center mt-1">
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      0.5% from last week
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">Tokens Generated</p>
                    <p className="text-2xl font-semibold mt-1">458K</p>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      18% from last week
                    </p>
                  </div>
                </div>
                
                <div className="h-64 mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-2">Request Volume Over Time</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sampleMetricsData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="requests" stroke="#4285F4" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <p className="text-center text-sm text-gray-500">
                  Analytics data is a sample demonstration. In a production environment, this would be connected to Cloud Monitoring.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'logs' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Recent Logs</h3>
                <div className="flex gap-2">
                  <button className="text-sm px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50">
                    Refresh
                  </button>
                  <button className="text-sm px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50">
                    View in Cloud Logging
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
                <div className="flex items-center mb-2">
                  <span className="h-2 w-2 rounded-full bg-green-400 mr-2"></span>
                  <span className="text-xs text-gray-500">2025-03-23 14:32:05</span>
                  <span className="ml-2 px-2 bg-green-100 text-green-800 text-xs rounded-full">INFO</span>
                </div>
                <p className="text-sm text-gray-700">
                  Agent successfully processed request: "What are the features of Agent Engine?"
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
                <div className="flex items-center mb-2">
                  <span className="h-2 w-2 rounded-full bg-green-400 mr-2"></span>
                  <span className="text-xs text-gray-500">2025-03-23 14:31:18</span>
                  <span className="ml-2 px-2 bg-green-100 text-green-800 text-xs rounded-full">INFO</span>
                </div>
                <p className="text-sm text-gray-700">
                  Agent initialized with model: gemini-1.5-pro
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
                <div className="flex items-center mb-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-400 mr-2"></span>
                  <span className="text-xs text-gray-500">2025-03-23 14:30:55</span>
                  <span className="ml-2 px-2 bg-yellow-100 text-yellow-800 text-xs rounded-full">WARNING</span>
                </div>
                <p className="text-sm text-gray-700">
                  Rate limit approaching: 80% of quota used
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
                <div className="flex items-center mb-2">
                  <span className="h-2 w-2 rounded-full bg-green-400 mr-2"></span>
                  <span className="text-xs text-gray-500">2025-03-23 14:29:30</span>
                  <span className="ml-2 px-2 bg-green-100 text-green-800 text-xs rounded-full">INFO</span>
                </div>
                <p className="text-sm text-gray-700">
                  Agent successfully deployed to Vertex AI Agent Engine
                </p>
              </div>
              
              <p className="text-center text-sm text-gray-500 mt-4">
                Log data is a sample demonstration. In a production environment, this would be connected to Cloud Logging.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentDetails;              
