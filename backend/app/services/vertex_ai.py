import os
from typing import Any, Dict, List, Optional

import google.auth
from google.cloud import aiplatform
import vertexai
from vertexai.agent_engines import Agent, AgentEngine, PublisherModel

class VertexAIService:
    def __init__(self):
        self.credentials, self.project_id = google.auth.default()
        self.location = os.getenv("VERTEX_REGION", "us-central1")
        
        # Initialize Vertex AI client
        vertexai.init(project=self.project_id, location=self.location)
        aiplatform.init(project=self.project_id, location=self.location)
    
    async def list_agents(self, project_id: str, region: str) -> List[Dict[str, Any]]:
        """Lists all agents in a project."""
        # Set the project and location for this request
        vertexai.init(project=project_id, location=region)
        
        try:
            # Use the SDK to list agents
            agents = AgentEngine.list()
            
            # Convert to dict format for compatibility with existing code
            agent_list = []
            for agent in agents:
                agent_dict = {
                    "name": agent.name,
                    "displayName": agent.display_name,
                    "description": agent.description,
                    "state": agent.state,
                    "createTime": agent.create_time,
                    "updateTime": agent.update_time,
                    "framework": getattr(agent, "framework", None)
                }
                agent_list.append(agent_dict)
                
            return agent_list
        except Exception as e:
            print(f"Error listing agents: {str(e)}")
            raise e
    
    async def get_agent(self, project_id: str, region: str, agent_id: str) -> Dict[str, Any]:
        """Gets a specific agent."""
        # Set the project and location for this request
        vertexai.init(project=project_id, location=region)
        
        try:
            # Get the agent by ID
            agent_name = f"projects/{project_id}/locations/{region}/agents/{agent_id}"
            agent = AgentEngine.get(name=agent_name)
            
            # Convert to dict format
            agent_dict = {
                "name": agent.name,
                "displayName": agent.display_name,
                "description": agent.description,
                "state": agent.state,
                "createTime": agent.create_time,
                "updateTime": agent.update_time,
                "framework": getattr(agent, "framework", None),
                "model": agent.model,
                "generationConfig": {
                    "temperature": agent.temperature,
                    "maxOutputTokens": agent.max_output_tokens
                },
                "systemInstruction": {
                    "parts": [{"text": agent.system_instruction}]
                }
            }
            
            # Add framework config if available
            if hasattr(agent, "framework_config") and agent.framework_config:
                agent_dict["frameworkConfig"] = agent.framework_config
                
            return agent_dict
        except Exception as e:
            print(f"Error getting agent: {str(e)}")
            raise e
    
    async def create_agent(self, project_id: str, region: str, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new agent."""
        # Set the project and location for this request
        vertexai.init(project=project_id, location=region)
        
        try:
            # Extract data from the request
            display_name = agent_data.get("displayName", "Unnamed Agent")
            description = agent_data.get("description", "")
            
            # Get the model path from agent_data
            model_path = agent_data.get("model", "")
            # Extract just the model name (e.g., gemini-1.5-pro)
            model_id = model_path.split("/")[-1] if model_path else "gemini-1.5-pro"
            
            # Get generation config
            generation_config = agent_data.get("generationConfig", {})
            temperature = generation_config.get("temperature", 0.2)
            max_output_tokens = generation_config.get("maxOutputTokens", 1024)
            
            # Get system instruction
            system_instruction_obj = agent_data.get("systemInstruction", {})
            system_instruction = ""
            if isinstance(system_instruction_obj, dict) and "parts" in system_instruction_obj:
                parts = system_instruction_obj.get("parts", [])
                if parts and isinstance(parts, list) and len(parts) > 0:
                    system_instruction = parts[0].get("text", "")
            
            # Create the agent
            agent = Agent.create(
                display_name=display_name,
                description=description,
                model=PublisherModel.from_pretrained(model_id),
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                system_instruction=system_instruction
            )
            
            # Convert to dict format
            agent_dict = {
                "name": agent.name,
                "displayName": agent.display_name,
                "description": agent.description,
                "state": agent.state,
                "createTime": agent.create_time,
                "updateTime": agent.update_time
            }
            
            return agent_dict
        except Exception as e:
            print(f"Error creating agent: {str(e)}")
            raise e
    
    async def deploy_agent(self, project_id: str, region: str, agent_id: str) -> Dict[str, Any]:
        """Deploys an agent."""
        # Set the project and location for this request
        vertexai.init(project=project_id, location=region)
        
        try:
            # Get the agent by ID
            agent_name = f"projects/{project_id}/locations/{region}/agents/{agent_id}"
            agent = AgentEngine.get(name=agent_name)
            
            # Deploy the agent
            agent.deploy()
            
            # Get the updated agent
            updated_agent = AgentEngine.get(name=agent_name)
            
            # Convert to dict format
            agent_dict = {
                "name": updated_agent.name,
                "displayName": updated_agent.display_name,
                "description": updated_agent.description,
                "state": updated_agent.state,
                "createTime": updated_agent.create_time,
                "updateTime": updated_agent.update_time
            }
            
            return agent_dict
        except Exception as e:
            print(f"Error deploying agent: {str(e)}")
            raise e
    
    async def delete_agent(self, project_id: str, region: str, agent_id: str) -> Dict[str, Any]:
        """Deletes an agent."""
        # Set the project and location for this request
        vertexai.init(project=project_id, location=region)
        
        try:
            # Get the agent by ID
            agent_name = f"projects/{project_id}/locations/{region}/agents/{agent_id}"
            agent = AgentEngine.get(name=agent_name)
            
            # Delete the agent
            agent.delete()
            
            return {"status": "success", "message": f"Agent {agent_id} deleted successfully"}
        except Exception as e:
            print(f"Error deleting agent: {str(e)}")
            raise e
    
    async def query_agent(self, project_id: str, region: str, agent_id: str, query: str, max_response_items: int = 10) -> Dict[str, Any]:
        """Queries an agent."""
        # Set the project and location for this request
        vertexai.init(project=project_id, location=region)
        
        try:
            # Get the agent by ID
            agent_name = f"projects/{project_id}/locations/{region}/agents/{agent_id}"
            agent = AgentEngine.get(name=agent_name)
            
            # Query the agent
            response = agent.query(query)
            
            # Format the response
            formatted_response = {
                "textResponse": response.text,
                "citations": []
            }
            
            # Add citations if available
            if hasattr(response, "citations") and response.citations:
                for citation in response.citations[:max_response_items]:
                    formatted_response["citations"].append({
                        "title": getattr(citation, "title", ""),
                        "uri": getattr(citation, "uri", ""),
                        "license": getattr(citation, "license", "")
                    })
            
            return formatted_response
        except Exception as e:
            print(f"Error querying agent: {str(e)}")
            raise e
