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
        """Lists all agents in a project."""
        # Initialize for this request
        vertexai.init(project=project_id, location=region)
        
        try:
            agents = []
            # List reasoning engines (agents)
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
        """Gets a specific agent."""
        # Initialize for this request
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
        """Creates a new agent."""
        # Initialize for this request
        vertexai.init(project=project_id, location=region)
        
        try:
            print(f"Creating agent with data: {json.dumps(agent_data, indent=2)}")
            
            # Create a simple agent class
            class SimpleAgent:
                def __init__(self):
                    self.model = agent_data.get("model", "").split("/")[-1]
                    self.system_instruction = agent_data.get("systemInstruction", {}).get("parts", [{}])[0].get("text", "")
                
                def set_up(self):
                    # Initialize any setup here
                    pass
                
                def query(self, input_text):
                    # This is just a placeholder - actual logic will be handled by Agent Engine
                    return {"response": "Placeholder response"}
            
            # Create an instance of the agent
            agent = SimpleAgent()
            
            # Use agent_engines to create and deploy the agent
            remote_agent = agent_engines.create(
                agent,
                requirements=["google-cloud-aiplatform", "requests"],
                display_name=agent_data.get("displayName", "Unnamed Agent"),
                description=agent_data.get("description", ""),
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
        """Deploys an agent."""
        # Initialize for this request
        vertexai.init(project=project_id, location=region)
        
        try:
            agent_name = f"projects/{project_id}/locations/{region}/reasoningEngines/{agent_id}"
            agent = agent_engines.get(agent_name)
            
            # Deploy the agent
            agent.deploy()
            
            return {
                "name": agent.resource_name,
                "displayName": agent.display_name,
                "state": "DEPLOYED",
                "message": "Agent deployed successfully"
            }
        except Exception as e:
            print(f"Error deploying agent: {str(e)}")
            raise
    
    async def delete_agent(self, project_id: str, region: str, agent_id: str) -> Dict[str, Any]:
        """Deletes an agent."""
        # Initialize for this request
        vertexai.init(project=project_id, location=region)
        
        try:
            agent_name = f"projects/{project_id}/locations/{region}/reasoningEngines/{agent_id}"
            agent = agent_engines.get(agent_name)
            
            # Delete the agent
            agent.delete()
            
            return {
                "name": agent_name,
                "status": "deleted"
            }
        except Exception as e:
            print(f"Error deleting agent: {str(e)}")
            raise
    
    async def query_agent(self, project_id: str, region: str, agent_id: str, query: str, max_response_items: int = 10) -> Dict[str, Any]:
        """Queries an agent."""
        # Initialize for this request
        vertexai.init(project=project_id, location=region)
        
        try:
            agent_name = f"projects/{project_id}/locations/{region}/reasoningEngines/{agent_id}"
            agent = agent_engines.get(agent_name)
            
            # Query the agent
            response = agent.query(input=query)
            
            return {
                "textResponse": response.get("output", ""),
                "actions": response.get("actions", []),
                "messages": response.get("messages", [])
            }
        except Exception as e:
            print(f"Error querying agent: {str(e)}")
            raise
