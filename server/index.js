// server/index.js
const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure authentication
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Helper function to get authenticated client
const getAuthClient = async () => {
  try {
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

// API Routes

// List agents
app.get('/api/agents', async (req, res) => {
  try {
    const { projectId, region = 'us-central1' } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const token = await getAuthClient();
    const response = await axios.get(
      `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/agents`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data.agents || []);
  } catch (error) {
    console.error('Error listing agents:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || 'Failed to list agents' 
    });
  }
});

// Get a specific agent
app.get('/api/agents/:agentId', async (req, res) => {
  try {
    const { projectId, region = 'us-central1' } = req.query;
    const { agentId } = req.params;
    if (!projectId || !agentId) {
      return res.status(400).json({ error: 'Project ID and Agent ID are required' });
    }

    const token = await getAuthClient();
    const response = await axios.get(
      `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/agents/${agentId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error getting agent:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || 'Failed to get agent' 
    });
  }
});

// Create a new agent
app.post('/api/agents', async (req, res) => {
  try {
    const { projectId, region = 'us-central1' } = req.query;
    const agentData = req.body;
    if (!projectId || !agentData) {
      return res.status(400).json({ error: 'Project ID and agent data are required' });
    }

    const token = await getAuthClient();
    const response = await axios.post(
      `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/agents`,
      agentData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error creating agent:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || 'Failed to create agent' 
    });
  }
});

// Deploy an agent
app.post('/api/agents/:agentId/deploy', async (req, res) => {
  try {
    const { projectId, region = 'us-central1' } = req.query;
    const { agentId } = req.params;
    if (!projectId || !agentId) {
      return res.status(400).json({ error: 'Project ID and Agent ID are required' });
    }

    const token = await getAuthClient();
    const response = await axios.post(
      `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/agents/${agentId}:deploy`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error deploying agent:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || 'Failed to deploy agent' 
    });
  }
});

// Delete an agent
app.delete('/api/agents/:agentId', async (req, res) => {
  try {
    const { projectId, region = 'us-central1' } = req.query;
    const { agentId } = req.params;
    if (!projectId || !agentId) {
      return res.status(400).json({ error: 'Project ID and Agent ID are required' });
    }

    const token = await getAuthClient();
    const response = await axios.delete(
      `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/agents/${agentId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error deleting agent:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || 'Failed to delete agent' 
    });
  }
});

// Query an agent
app.post('/api/agents/:agentId/query', async (req, res) => {
  try {
    const { projectId, region = 'us-central1' } = req.query;
    const { agentId } = req.params;
    const { query, maxResponseItems } = req.body;
    if (!projectId || !agentId || !query) {
      return res.status(400).json({ error: 'Project ID, Agent ID, and query are required' });
    }

    const token = await getAuthClient();
    const response = await axios.post(
      `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/agents/${agentId}:query`,
      {
        query,
        maxResponseItems: maxResponseItems || 10
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error querying agent:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || 'Failed to query agent' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Authentication using: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Default credentials'}`);
});
