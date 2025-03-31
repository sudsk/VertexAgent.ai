// src/pages/Playground.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, Tab } from '../components/Tabs';
import DeployedAgentPlayground from '../components/DeployedAgentPlayground';
import LocalAgentPlayground from '../components/LocalAgentPlayground';

const Playground = ({ projectId, region }) => {
  const { agentId } = useParams();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');  
  const [activeTab, setActiveTab] = useState(tabParam || (agentId ? 'deployed' : 'local'));
  const navigate = useNavigate();

  // Detect if the agentId is from a newly created agent
  useEffect(() => {
    if (agentId) {
      const isNewlyCreatedAgent = sessionStorage.getItem('newlyCreatedAgent') === agentId;
      
      // If it's a newly created agent, switch to local tab
      if (isNewlyCreatedAgent) {
        setActiveTab('local');
      } else {
        // Otherwise default to deployed tab for existing agents
        setActiveTab('deployed');
      }
    }
  }, [agentId]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Clear agentId from URL when switching to local playground without an agent
    if (tab === 'local' && !agentId) {
      navigate('/playground');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Agent Playground</h1>
      
      <Tabs activeTab={activeTab} onChange={handleTabChange}>
        <Tab id="local" label="Local Testing">
          <div className="mt-6">
            <LocalAgentPlayground projectId={projectId} region={region} agentId={agentId} />
          </div>
        </Tab>
        <Tab id="deployed" label="Deployed Agents">
          <div className="mt-6">
            <DeployedAgentPlayground 
              projectId={projectId} 
              region={region}
              agentId={agentId}
            />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
};

export default Playground;
