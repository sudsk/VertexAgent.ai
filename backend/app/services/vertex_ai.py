import os
from typing import Any, Dict, List, Optional
import json

import google.auth
from google.cloud import aiplatform
import vertexai
from vertexai import agent_engines

class VertexAIService:
    def __init__(self):
        self.credentials, self.project_id = google.auth.default()
        self.location = os.getenv("VERTEX_REGION", "us-central1")
        
        # Initialize Vertex AI client
        vertexai.init(project=self.project_id, location=self.location)
    
    async def list_agents(self, project_id: str, region: str) -> List[Dict[str, Any]]:
        """Lists all agents in a project using agent_engines.list()."""
        vertexai.init(project=project_id, location=region)
        
        try:
            # This follows the pattern in agent-starter-pack
            agents = []
            for agent in agent_engines.list():
                agents.append({
                    "name": agent.resource_name,
                    "displayName": agent.display_name,
                    "state": getattr(agent, "state", "UNKNOWN"),
                    "createTime": getattr(agent, "create_time", ""),
                    "updateTime": getattr(agent, "update_time", "")
                })
            return agents
        except Exception as e:
            print(f"Error listing agents: {str(e)}")
            raise
    
    async def get_agent(self, project_id: str, region: str, agent_id: str) -> Dict[str, Any]:
        """Gets a specific agent using agent_engines.get()."""
        vertexai.init(project=project_id, location=region)
        
        try:
            agent_name = f"projects/{project_id}/locations/{region}/reasoningEngines/{agent_id}"
            agent = agent_engines.get(agent_name)
            
            return {
                "name": agent.resource_name,
                "displayName": agent.display_name,
                "state": getattr(agent, "state", "UNKNOWN"),
                "createTime": getattr(agent, "create_time", ""),
                "updateTime": getattr(agent, "update_time", "")
            }
        except Exception as e:
            print(f"Error getting agent: {str(e)}")
            raise
    
    async def create_agent(self, project_id: str, region: str, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new agent using the agent-starter-pack pattern."""
        vertexai.init(project=project_id, location=region)
        
        try:
            print(f"Creating agent with data: {json.dumps(agent_data, indent=2)}")
            
            # Define a simple agent class similar to examples in agent-starter-pack
            class SimpleAgent:
                def __init__(self):
                    pass
                
                def set_up(self):
                    pass
                
                def query(self, input_text):
                    return {"response": "Placeholder response"}
            
            # Create and deploy using agent_engines.create()
            agent = SimpleAgent()
            remote_agent = agent_engines.create(
                agent,
                requirements=["google-cloud-aiplatform", "requests"],
                display_name=agent_data.get("displayName", "Unnamed Agent"),
                description=agent_data.get("description", "")
            )
            
            return {
                "name": remote_agent.resource_name,
                "displayName": remote_agent.display_name,
                "state": getattr(remote_agent, "state", "UNKNOWN"),
                "createTime": getattr(remote_agent, "create_time", ""),
                "updateTime": getattr(remote_agent, "update_time", "")
            }
        except Exception as e:
            print(f"Error creating agent: {str(e)}")
            raise
    
    async def deploy_agent(self, project_id: str, region: str, agent_id: str) -> Dict[str, Any]:
        """Deploys an agent using the agent-starter-pack pattern."""
        vertexai.init(project=project_id, location=region)
        
        try:
            agent_name = f"projects/{project_id}/locations/{region}/reasoningEngines/{agent_id}"
            agent = agent_engines.get(agent_name)
            agent.deploy()
            
            return {
                "name": agent.resource_name,
                "displayName": agent.display_name,
                "state": "DEPLOYED"
            }
        except Exception as e:
            print(f"Error deploying agent: {str(e)}")
            raise
    
    async def delete_agent(self, project_id: str, region: str, agent_id: str) -> Dict[str, Any]:
        """Deletes an agent using the agent-starter-pack pattern."""
        vertexai.init(project=project_id, location=region)
        
        try:
            agent_name = f"projects/{project_id}/locations/{region}/reasoningEngines/{agent_id}"
            agent = agent_engines.get(agent_name)
            agent.delete()
            
            return {"status": "deleted"}
        except Exception as e:
            print(f"Error deleting agent: {str(e)}")
            raise
    
    async def query_agent(self, project_id: str, region: str, agent_id: str, query: str, max_response_items: int = 10) -> Dict[str, Any]:
        """Queries an agent using the agent-starter-pack pattern."""
        vertexai.init(project=project_id, location=region)
        
        try:
            agent_name = f"projects/{project_id}/locations/{region}/reasoningEngines/{agent_id}"
            agent = agent_engines.get(agent_name)
            response = agent.query(input=query)
            
            return {
                "textResponse": response.get("output", ""),
                "actions": response.get("actions", []),
                "messages": response.get("messages", [])
            }
        except Exception as e:
            print(f"Error querying agent: {str(e)}")
            raise
