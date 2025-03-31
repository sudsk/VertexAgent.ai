// src/components/AgentActions.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deployAgent } from '../services/agentEngineService';
import { Play, Cloud, Menu, ChevronDown } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const AgentActions = ({ agent, projectId, region, onDeploySuccess }) => {
  const navigate = useNavigate();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentError, setDeploymentError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedDeployTarget, setSelectedDeployTarget] = useState('AGENT_ENGINE');

  const handleTest = () => {
    navigate(`/playground/${agent.id}`);
  };

  const handleDeployClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleDeploy = async (target) => {
    if (!projectId) {
      setDeploymentError('Project ID is required for deployment');
      return;
    }

    setIsDropdownOpen(false);
    setSelectedDeployTarget(target);
    setIsDeploying(true);
    setDeploymentError(null);

    try {
      await deployAgent(projectId, region, agent.id, target);
      if (onDeploySuccess) {
        onDeploySuccess();
      }
    } catch (error) {
      console.error('Deployment error:', error);
      setDeploymentError('Failed to deploy agent: ' + 
        (error.response?.data?.detail || error.message || 'Unknown error'));
    } finally {
      setIsDeploying(false);
    }
  };

  // Don't show deploy option for already deployed agents
  const isDeployed = agent.state === 'ACTIVE' || agent.state === 'DEPLOYED';

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <button
          onClick={handleTest}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Play className="mr-2 h-4 w-4" />
          Test Agent
        </button>
        
        {!isDeployed && (
          <div className="relative">
            <button
              onClick={handleDeployClick}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              disabled={isDeploying}
            >
              {isDeploying ? (
                <>
                  <LoadingSpinner size="small" />
                  <span className="ml-2">Deploying...</span>
                </>
              ) : (
                <>
                  <Cloud className="mr-2 h-4 w-4" />
                  <span>Deploy Agent</span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
            
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <button
                    onClick={() => handleDeploy('AGENT_ENGINE')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    <div className="font-medium">Vertex AI Agent Engine</div>
                    <div className="text-xs text-gray-500">Managed service with auto-scaling</div>
                  </button>
                  <button
                    onClick={() => handleDeploy('CLOUD_RUN')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    <div className="font-medium">Cloud Run</div>
                    <div className="text-xs text-gray-500">Custom container with more flexibility</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {deploymentError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {deploymentError}
        </div>
      )}
    </div>
  );
};

export default AgentActions;
