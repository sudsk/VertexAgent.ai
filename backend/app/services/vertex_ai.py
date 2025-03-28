import json
import os
from typing import Any, Dict, List, Optional

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
            agents = []
            for agent in agent_engines.list():
                agents.append({
                    "name": agent.resource_name,
                    "displayName": agent.display_name,
                    "description": getattr(agent, "description", ""),
                    "state": getattr(agent, "state", "UNKNOWN"),
                    "createTime": getattr(agent, "create_time", ""),
                    "updateTime": getattr(agent, "update_time", ""),
                    "framework": getattr(agent, "framework", "CUSTOM")
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
                "description": getattr(agent, "description", ""),
                "state": getattr(agent, "state", "UNKNOWN"),
                "createTime": getattr(agent, "create_time", ""),
                "updateTime": getattr(agent, "update_time", ""),
                "framework": getattr(agent, "framework", "CUSTOM"),
                "model": getattr(agent, "model", ""),
                "generationConfig": {
                    "temperature": getattr(agent, "temperature", 0.2),
                    "maxOutputTokens": getattr(agent, "max_output_tokens", 1024)
                },
                "frameworkConfig": getattr(agent, "framework_config", {})
            }
        except Exception as e:
            print(f"Error getting agent: {str(e)}")
            raise
    
    async def create_agent(self, project_id: str, region: str, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new agent based on the specified framework."""
        vertexai.init(project=project_id, location=region)
        
        try:
            print(f"Creating agent with data: {json.dumps(agent_data, indent=2)}")
            
            framework = agent_data.get("framework", "CUSTOM")
            display_name = agent_data.get("displayName", "Unnamed Agent")
            description = agent_data.get("description", "")
            model_id = agent_data.get("modelId", "gemini-1.5-pro")
            
            # Extract system instruction
            system_instruction = ""
            if "systemInstruction" in agent_data:
                if isinstance(agent_data["systemInstruction"], str):
                    system_instruction = agent_data["systemInstruction"]
                elif isinstance(agent_data["systemInstruction"], dict) and "parts" in agent_data["systemInstruction"]:
                    parts = agent_data["systemInstruction"]["parts"]
                    if parts and "text" in parts[0]:
                        system_instruction = parts[0]["text"]
            
            # Get generation config
            gen_config = agent_data.get("generationConfig", {})
            temperature = gen_config.get("temperature", 0.2)
            max_output_tokens = gen_config.get("maxOutputTokens", 1024)
            
            # Framework-specific configurations
            framework_config = agent_data.get("frameworkConfig", {})
            
            # Create the agent class based on framework
            if framework == "LANGCHAIN":
                from vertexai.preview.reasoning_engines import LangchainAgent
                
                agent = LangchainAgent(
                    model=model_id,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens
                )
                
            elif framework == "LANGGRAPH":
                # For LangGraph, we create a simple wrapper
                class LangGraphAgent:
                    def __init__(self):
                        self.model = model_id
                        self.temperature = temperature
                        self.max_output_tokens = max_output_tokens
                        self.system_instruction = system_instruction
                        self.graph_type = framework_config.get("graphType", "sequential")
                        self.tools = framework_config.get("tools", [])
                    
                    def set_up(self):
                        pass
                    
                    def query(self, input_text):
                        return {"response": "Placeholder LangGraph response"}
                
                agent = LangGraphAgent()
                
            elif framework == "LLAMAINDEX":
                # For LlamaIndex, we create a simple wrapper
                class LlamaIndexAgent:
                    def __init__(self):
                        self.model = model_id
                        self.temperature = temperature
                        self.max_output_tokens = max_output_tokens
                        self.system_instruction = system_instruction
                    
                    def set_up(self):
                        pass
                    
                    def query(self, input_text):
                        return {"response": "Placeholder LlamaIndex response"}
                
                agent = LlamaIndexAgent()
                
            elif framework == "CREWAI":
                # For CrewAI, we create a simple wrapper
                class CrewAIAgent:
                    def __init__(self):
                        self.model = model_id
                        self.temperature = temperature
                        self.max_output_tokens = max_output_tokens
                        self.system_instruction = system_instruction
                        self.process_type = framework_config.get("processType", "sequential")
                        self.agents = framework_config.get("agents", [])
                        self.tasks = framework_config.get("tasks", [])
                    
                    def set_up(self):
                        pass
                    
                    def query(self, input_text):
                        return {"response": "Placeholder CrewAI response"}
                
                agent = CrewAIAgent()
                
            else:  # CUSTOM or any other framework
                class CustomAgent:
                    def __init__(self):
                        self.model = model_id
                        self.temperature = temperature
                        self.max_output_tokens = max_output_tokens
                        self.system_instruction = system_instruction
                    
                    def set_up(self):
                        pass
                    
                    def query(self, input_text):
                        return {"response": "Placeholder response"}
                
                agent = CustomAgent()
            
            # Define common requirements
            requirements = [
                "google-cloud-aiplatform[agent_engines]>=1.36.4",
                "pydantic>=2.10",
                "requests"
            ]
            
            # Add framework-specific requirements
            if framework == "LANGCHAIN":
                requirements.extend([
                    "langchain>=0.0.267",
                    "langchain_google_vertexai"
                ])
            elif framework == "LANGGRAPH":
                requirements.extend([
                    "langgraph",
                    "cloudpickle==3.0.0"
                ])
            elif framework == "LLAMAINDEX":
                requirements.extend([
                    "llama-index",
                    "llama-index-llms-google"
                ])
            elif framework == "CREWAI":
                requirements.extend([
                    "crew-ai[tools]",
                    "cloudpickle==3.0.0"
                ])
            
            # Create and deploy the agent
            remote_agent = agent_engines.create(
                agent,
                requirements=requirements,
                display_name=display_name,
                description=description
            )
            
            return {
                "name": remote_agent.resource_name,
                "displayName": remote_agent.display_name,
                "description": getattr(remote_agent, "description", ""),
                "state": getattr(remote_agent, "state", "UNKNOWN"),
                "createTime": getattr(remote_agent, "create_time", ""),
                "updateTime": getattr(remote_agent, "update_time", ""),
                "framework": framework
            }
        except Exception as e:
            print(f"Error creating agent: {str(e)}")
            raise
    
    async def deploy_agent(self, project_id: str, region: str, agent_id: str) -> Dict[str, Any]:
        """Deploys an agent using agent_engines.deploy()."""
        vertexai.init(project=project_id, location=region)
        
        try:
            agent_name = f"projects/{project_id}/locations/{region}/reasoningEngines/{agent_id}"
            agent = agent_engines.get(agent_name)
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
        """Deletes an agent using agent_engines.delete()."""
        vertexai.init(project=project_id, location=region)
        
        try:
            agent_name = f"projects/{project_id}/locations/{region}/reasoningEngines/{agent_id}"
            agent = agent_engines.get(agent_name)
            agent.delete()
            
            return {
                "name": agent_name,
                "status": "deleted"
            }
        except Exception as e:
            print(f"Error deleting agent: {str(e)}")
            raise
    
    async def query_agent(self, project_id: str, region: str, agent_id: str, query: str, max_response_items: int = 10) -> Dict[str, Any]:
        """Queries an agent using agent_engines.query()."""
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
