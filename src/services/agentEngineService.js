// src/services/agentEngineService.js
import axios from 'axios';

// Backend API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// List all agents in a project
export const listAgents = async (projectId, region = 'us-central1') => {
  try {
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
