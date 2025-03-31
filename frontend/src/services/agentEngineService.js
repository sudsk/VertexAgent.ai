// src/services/agentEngineService.js
import axios from 'axios';

// API base URL (will point to your backend server)
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// List all agents
export const listAgents = async (projectId, region = 'us-central1', filters = {}) => {
  try {
    const params = {
      ...filters  // Include any filters passed to the function
    };
    
    // Only add projectId to params if it exists
    if (projectId) {
      params.projectId = projectId;
      params.region = region;
    }
    
    // Always include local agents unless explicitly set to false in filters
    if (filters.include_local === undefined) {
      params.include_local = true;
    }
    
    const response = await axios.get(`${API_URL}/agents`, { params });
    return response.data || [];
  } catch (error) {
    console.error('Error listing agents:', error);
    throw error;
  }
};

// List only local agents
export const listLocalAgents = async () => {
  try {
    const response = await axios.get(`${API_URL}/local-agents`);
    return response.data || [];
  } catch (error) {
    console.error('Error listing local agents:', error);
    throw error;
  }
};

// Get test history for an agent
export const getAgentTestHistory = async (agentId) => {
  try {
    const response = await axios.get(`${API_URL}/agents/${agentId}/tests`);
    return response.data || [];
  } catch (error) {
    console.error('Error getting agent test history:', error);
    throw error;
  }
};

// Create agent without deployment (local only)
export const createLocalAgent = async (agentData, projectId, region) => {
  try {
    // Make sure we're not trying to deploy
    const params = {};
    
    if (projectId) {
      params.projectId = projectId;
      params.region = region || 'us-central1';
    }
    
    const response = await axios.post(`${API_URL}/agents`, {
      ...agentData,
      deploy: false  // Explicitly set to not deploy
    }, { params });
    
    return response.data;
  } catch (error) {
    console.error('Error creating local agent:', error);
    throw error;
  }
};

// Deploy an existing agent to specific target
export const deployAgent = async (projectId, region, agentId, target = 'AGENT_ENGINE') => {
  try {
    const response = await axios.post(`${API_URL}/agents/${agentId}/deploy`, {
      deploymentType: target
    }, {
      params: { projectId, region }
    });
    return response.data;
  } catch (error) {
    console.error('Error deploying agent:', error);
    throw error;
  }
};

// Get a specific agent
export const getAgent = async (projectId, region, agentId) => {
  try {
    const response = await axios.get(`${API_URL}/agents/${agentId}`, {
      params: { projectId, region }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting agent:', error);
    throw error;
  }
};

// Create and deploy a new agent (legacy method, kept for backward compatibility)
export const createAgent = async (projectId, region, agentData) => {
  try {
    const response = await axios.post(`${API_URL}/agents`, agentData, {
      params: { projectId, region }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating agent:', error);
    throw error;
  }
};

// Delete an agent
export const deleteAgent = async (projectId, region, agentId) => {
  try {
    const response = await axios.delete(`${API_URL}/agents/${agentId}`, {
      params: { projectId, region }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting agent:', error);
    throw error;
  }
};

// Test an agent
export const queryAgent = async (projectId, region, agentId, query) => {
  try {
    const response = await axios.post(`${API_URL}/agents/${agentId}/query`, {
      query: query,
      maxResponseItems: 10
    }, {
      params: { projectId, region }
    });
    return response.data;
  } catch (error) {
    console.error('Error querying agent:', error);
    throw error;
  }
};

// Get agent metrics (mock for now)
export const getAgentMetrics = async (projectId, region, agentId) => {
  // This is a placeholder until the real API endpoint is available
  return {
    // Sample data
    totalRequests: 1245,
    avgResponseTime: 1.2,
    successRate: 98.5,
    tokensGenerated: 458000,
    requestsOverTime: [
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
    ]
  };
};

// Test an agent locally
export const testAgentLocally = async (projectId, region, testData) => {
  try {
    const response = await axios.post(`${API_URL}/agents/playground`, 
      testData, 
      {
        params: { projectId, region }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error testing agent locally:', error);
    throw error;
  }
};

// Create a custom tool
export const createCustomTool = async (name, description, code) => {
  try {
    const response = await axios.post(`${API_URL}/custom-tools`, {
      name,
      description,
      code
    });
    return response.data;
  } catch (error) {
    console.error('Error creating custom tool:', error);
    throw error;
  }
};

// List custom tools
export const listCustomTools = async () => {
  try {
    const response = await axios.get(`${API_URL}/custom-tools`);
    return response.data || [];
  } catch (error) {
    console.error('Error listing custom tools:', error);
    throw error;
  }
};

// Execute a custom tool
export const executeCustomTool = async (toolId, params) => {
  try {
    const response = await axios.post(`${API_URL}/custom-tools/${toolId}/execute`, params);
    return response.data;
  } catch (error) {
    console.error('Error executing custom tool:', error);
    throw error;
  }
};

// Get available tools (system-provided)
export const listAvailableTools = async () => {
  // This is a placeholder - in a real implementation, this would fetch from an API
  return [
    { name: 'search', description: 'Search for information on a topic', type: 'FUNCTION' },
    { name: 'retrieve', description: 'Retrieve documents from a knowledge base', type: 'RETRIEVAL' }
  ];
};
