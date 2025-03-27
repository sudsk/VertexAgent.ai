import json
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.agent import CreateAgentRequest, AgentResponse
from app.services.vertex_ai import VertexAIService

router = APIRouter()
vertex_service = VertexAIService()

@router.get("/agents")
async def list_agents(
    project_id: str = Query(..., description="Google Cloud Project ID"),
    region: str = Query("us-central1", description="Region for Vertex AI services")
) -> List[Dict]:
    """Lists all agents in a project."""
    try:
        agents = await vertex_service.list_agents(project_id, region)
        return agents
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing agents: {str(e)}")

@router.get("/agents/{agent_id}")
async def get_agent(
    agent_id: str,
    project_id: str = Query(..., description="Google Cloud Project ID"),
    region: str = Query("us-central1", description="Region for Vertex AI services")
) -> Dict:
    """Gets a specific agent."""
    try:
        agent = await vertex_service.get_agent(project_id, region, agent_id)
        return agent
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting agent: {str(e)}")

@router.post("/agents")
async def create_agent(
    request: CreateAgentRequest,
    project_id: str = Query(..., description="Google Cloud Project ID"),
    region: str = Query("us-central1", description="Region for Vertex AI services")
) -> Dict:
    """Creates a new agent."""
    try:
        # Debug print
        print("Received request data:", request.dict())     
        
        # Process the request and create agent data structure
        agent_data = {
            "displayName": request.displayName,
            "description": request.description,
            "generationConfig": {
                "temperature": request.temperature,
                "maxOutputTokens": request.maxOutputTokens
            },
            "systemInstruction": {
                "parts": [
                    {
                        "text": request.systemInstruction
                    }
                ]
            }
        }
        
        # Add model
        agent_data["model"] = f"projects/{project_id}/locations/{region}/publishers/google/models/{request.modelId}"
        
        # Add framework-specific configuration
        if request.framework:
            agent_data["framework"] = request.framework
            
            # LangGraph configuration
            if request.framework == "LANGGRAPH" and request.graphType:
                agent_data["frameworkConfig"] = {
                    "graphType": request.graphType,
                    "tools": request.tools or [],
                    "initialState": json.loads(request.initialState) if request.initialState else {}
                }
                
                # Add Vertex AI Search configuration if needed
                if request.tools and "retrieve_docs" in request.tools:
                    agent_data["frameworkConfig"]["vertexAISearch"] = {
                        "dataStoreId": request.dataStoreId,
                        "dataStoreRegion": request.dataStoreRegion
                    }
            
            # CrewAI configuration
            elif request.framework == "CREWAI" and request.processType:
                agent_data["frameworkConfig"] = {
                    "processType": request.processType,
                    "agents": [agent.dict() for agent in request.agents] if request.agents else [],
                    "tasks": [task.dict() for task in request.tasks] if request.tasks else []
                }
        
        # Create the agent
        response = await vertex_service.create_agent(project_id, region, agent_data)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating agent: {str(e)}")

@router.post("/agents/{agent_id}/deploy")
async def deploy_agent(
    agent_id: str,
    project_id: str = Query(..., description="Google Cloud Project ID"),
    region: str = Query("us-central1", description="Region for Vertex AI services")
) -> Dict:
    """Deploys an agent."""
    try:
        response = await vertex_service.deploy_agent(project_id, region, agent_id)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deploying agent: {str(e)}")

@router.delete("/agents/{agent_id}")
async def delete_agent(
    agent_id: str,
    project_id: str = Query(..., description="Google Cloud Project ID"),
    region: str = Query("us-central1", description="Region for Vertex AI services")
) -> Dict:
    """Deletes an agent."""
    try:
        response = await vertex_service.delete_agent(project_id, region, agent_id)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting agent: {str(e)}")

@router.post("/agents/{agent_id}/query")
async def query_agent(
    agent_id: str,
    query: str,
    project_id: str = Query(..., description="Google Cloud Project ID"),
    region: str = Query("us-central1", description="Region for Vertex AI services"),
    max_response_items: int = Query(10, description="Maximum number of response items")
) -> Dict:
    """Queries an agent."""
    try:
        response = await vertex_service.query_agent(
            project_id, region, agent_id, query, max_response_items
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying agent: {str(e)}")
