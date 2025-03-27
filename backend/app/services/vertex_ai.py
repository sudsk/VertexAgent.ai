import os
import json  # Added this import
from typing import Any, Dict, List, Optional

import google.auth
from google.cloud import aiplatform
import httpx

class VertexAIService:
    def __init__(self):
        self.credentials, self.project_id = google.auth.default()
        self.location = os.getenv("VERTEX_REGION", "us-central1")
        
        # Initialize Vertex AI client
        aiplatform.init(project=self.project_id, location=self.location)
    
    async def list_agents(self, project_id: str, region: str) -> List[Dict[str, Any]]:
        """Lists all agents in a project."""
        url = f"https://{region}-aiplatform.googleapis.com/v1beta1/projects/{project_id}/locations/{region}/agents"
        
        async with httpx.AsyncClient() as client:
            token = await self._get_token()
            response = await client.get(
                url,
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            data = response.json()
            return data.get("agents", [])
    
    async def get_agent(self, project_id: str, region: str, agent_id: str) -> Dict[str, Any]:
        """Gets a specific agent."""
        url = f"https://{region}-aiplatform.googleapis.com/v1beta1/projects/{project_id}/locations/{region}/agents/{agent_id}"
        
        async with httpx.AsyncClient() as client:
            token = await self._get_token()
            response = await client.get(
                url,
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            return response.json()
    
    from google.cloud import aiplatform
    
    async def create_agent(self, project_id: str, region: str, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new agent using the Python SDK instead of direct API calls."""
        
        # Initialize the client for this specific request
        aiplatform.init(project=project_id, location=region)
        
        try:
            # Use the SDK to create a reasoning engine (agent)
            agent = aiplatform.ReasoningEngine.create(
                display_name=agent_data.get("displayName", "Unnamed Agent"),
                model_name=agent_data.get("model"),
            )
            
            # Return the agent details as a dict
            return {
                "name": agent.resource_name,
                "displayName": agent.display_name,
                # Add other fields as needed
            }
        except Exception as e:
            print(f"Error creating agent via SDK: {str(e)}")
            raise
    
    async def deploy_agent(self, project_id: str, region: str, agent_id: str) -> Dict[str, Any]:
        """Deploys an agent."""
        url = f"https://{region}-aiplatform.googleapis.com/v1beta1/projects/{project_id}/locations/{region}/agents/{agent_id}:deploy"
        
        async with httpx.AsyncClient() as client:
            token = await self._get_token()
            response = await client.post(
                url,
                json={},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def delete_agent(self, project_id: str, region: str, agent_id: str) -> Dict[str, Any]:
        """Deletes an agent."""
        url = f"https://{region}-aiplatform.googleapis.com/v1beta1/projects/{project_id}/locations/{region}/agents/{agent_id}"
        
        async with httpx.AsyncClient() as client:
            token = await self._get_token()
            response = await client.delete(
                url,
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            return response.json()
    
    async def query_agent(self, project_id: str, region: str, agent_id: str, query: str, max_response_items: int = 10) -> Dict[str, Any]:
        """Queries an agent."""
        url = f"https://{region}-aiplatform.googleapis.com/v1beta1/projects/{project_id}/locations/{region}/agents/{agent_id}:query"
        
        request_data = {
            "query": query,
            "maxResponseItems": max_response_items
        }
        
        async with httpx.AsyncClient() as client:
            token = await self._get_token()
            response = await client.post(
                url,
                json=request_data,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def _get_token(self) -> str:
        """Gets an OAuth token for API requests."""
        if not self.credentials.valid:
            # Use a request object to refresh credentials
            from google.auth.transport.requests import Request
            self.credentials.refresh(Request())
        return self.credentials.token
