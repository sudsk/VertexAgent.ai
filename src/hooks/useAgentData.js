// src/hooks/useAgentData.js
import { useState, useEffect } from 'react';
import { listAgents, getAgent } from '../services/agentEngineService';

export const useAgentsList = (projectId, region) => {
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAgents = async () => {
      if (!projectId) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        const agentsData = await listAgents(projectId, region);
        setAgents(agentsData);
      } catch (err) {
        console.error('Error fetching agents:', err);
        setError(err.message || 'Failed to fetch agents');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, [projectId, region]);

  return { agents, isLoading, error, refreshAgents: () => fetchAgents() };
};

export const useAgentDetails = (projectId, region, agentId) => {
  const [agent, setAgent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAgentDetails = async () => {
      if (!projectId || !agentId) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        const agentData = await getAgent(projectId, region, agentId);
        setAgent(agentData);
      } catch (err) {
        console.error('Error fetching agent details:', err);
        setError(err.message || 'Failed to fetch agent details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgentDetails();
  }, [projectId, region, agentId]);

  return { agent, isLoading, error, refreshAgent: () => fetchAgentDetails() };
};
