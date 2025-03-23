import axios from 'axios';
import { getAccessToken } from './authService';

const API_VERSION = 'v1';
const BASE_URL = 'https://us-central1-aiplatform.googleapis.com';

// Create an axios instance with authentication
const createAuthenticatedAxios = async () => {
  const token = await getAccessToken();
  return axios.create({
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

// List all agents in a project
export const listAgents = async (projectId, region = 'us-central1') => {
  const http = await createAuthenticatedAxios();
  try {
    const response = await http.get(
      `${BASE_URL}/${API_VERSION}/projects/${projectId}/locations/${region}/agents`
    );
    return response.data.agents || [];
  } catch (error) {
    console.error('Error listing agents:', error);
    throw error;
  }
};

// Get a specific agent
export const getAgent = async (projectId, region, agentId) => {
  const http = await createAuthenticatedAxios();
  try {
    const response = await http.get(
      `${BASE_URL}/${API_VERSION}/projects/${projectId}/locations/${region}/agents/${agentId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error getting agent:', error);
    throw error;
  }
};

// Create a new agent
export const createAgent = async (projectId, region, agentData) => {
  const http = await createAuthenticatedAxios();
  try {
    const response = await http.post(
      `${BASE_URL}/${API_VERSION}/projects/${projectId}/locations/${region}/agents`,
      agentData
    );
    return response.data;
  } catch (error) {
    console.error('Error creating agent:', error);
    throw error;
  }
};

// Deploy an agent
export const deployAgent = async (projectId, region, agentId) => {
  const http = await createAuthenticatedAxios();
  try {
    const response = await http.post(
      `${BASE_URL}/${API_VERSION}/projects/${projectId}/locations/${region}/agents/${agentId}:deploy`,
      {}
    );
    return response.data;
  } catch (error) {
    console.error('Error deploying agent:', error);
    throw error;
  }
};

// Delete an agent
export const deleteAgent = async (projectId, region, agentId) => {
  const http = await createAuthenticatedAxios();
  try {
    const response = await http.delete(
      `${BASE_URL}/${API_VERSION}/projects/${projectId}/locations/${region}/agents/${agentId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting agent:', error);
    throw error;
  }
};

// Test an agent
export const queryAgent = async (projectId, region, agentId, query) => {
  const http = await createAuthenticatedAxios();
  try {
    const response = await http.post(
      `${BASE_URL}/${API_VERSION}/projects/${projectId}/locations/${region}/agents/${agentId}:query`,
      {
        query: query,
        maxResponseItems: 10
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error querying agent:', error);
    throw error;
  }
};

// Get agent metrics
export const getAgentMetrics = async (projectId, region, agentId) => {
  const http = await createAuthenticatedAxios();
  try {
    // This is a placeholder - you would use the appropriate API endpoint
    const response = await http.get(
      `${BASE_URL}/${API_VERSION}/projects/${projectId}/locations/${region}/agents/${agentId}/metrics`
    );
    return response.data;
  } catch (error) {
    console.error('Error getting agent metrics:', error);
    throw error;
  }
};
