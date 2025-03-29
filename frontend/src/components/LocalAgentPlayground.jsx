// src/components/LocalAgentPlayground.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { testAgentLocally, createAgent, deployAgent } from '../services/agentEngineService';

const LocalAgentPlayground = ({ projectId, region }) => {
  const navigate = useNavigate();
  const [agentConfig, setAgentConfig] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState('');
  
  // ... your other local playground code
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

  // Function to deploy the agent and navigate to the deployed playground
  const handleDeployToVertexAI = async () => {
    if (!agentConfig) return;
    
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
      
      // Show success message
      toast.success('Agent successfully deployed to Vertex AI!');
    } catch (error) {
      console.error('Error deploying agent:', error);
      setError(error.response?.data?.detail || 'Failed to deploy agent');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Agent configuration form and testing UI */}
      
      {/* Deployment button */}
      <div className="flex justify-end mt-6">
        <button
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
          onClick={handleDeployToVertexAI}
          disabled={isDeploying || !agentConfig}
        >
          {isDeploying ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Deploying...
            </>
          ) : (
            <>
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
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
