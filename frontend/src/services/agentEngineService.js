// src/services/agentEngineService.js
import axios from 'axios';

// API base URL (will point to your backend server)
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// List all agents in a project
export const listAgents = async (projectId, region = 'us-central1') => {
  try {
    // For development/testing
    if (process.env.NODE_ENV === 'development' && !projectId) {
      return []; // Return empty array if no project ID in development
    }
    
    const response = await axios.get(`${API_URL}/agents`, {
      params: { projectId, region }
    });
    return response.data || [];
  } catch (error) {
    console.error('Error listing agents:', error);
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

// Create a new agent
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

// Deploy an agent
export const deployAgent = async (projectId, region, agentId) => {
  try {
    const response = await axios.post(`${API_URL}/agents/${agentId}/deploy`, {}, {
      params: { projectId, region }
    });
    return response.data;
  } catch (error) {
    console.error('Error deploying agent:', error);
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

// Add to src/services/agentEngineService.js
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
