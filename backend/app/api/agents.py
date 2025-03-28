import json
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.agent import CreateAgentRequest, AgentResponse
from app.services.vertex_ai import VertexAIService

router = APIRouter()
vertex_service = VertexAIService()

@router.post("/agents/playground")
async def test_agent_locally(
    request_data: Dict[str, Any],
    query: str = Body(..., embed=True),
    project_id: Optional[str] = Query(None, description="Google Cloud Project ID"),
    projectId: Optional[str] = Query(None, description="Google Cloud Project ID (alternative param)"),
    region: str = Query("us-central1", description="Region for Vertex AI services")
) -> Dict:
    """Tests an agent configuration locally without deploying."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")
            
        # Extract configuration from request data
        framework = request_data.get("framework", "CUSTOM")
        model_id = request_data.get("modelId", "gemini-1.5-pro")
        
        # Extract system instruction
        system_instruction = ""
        if "systemInstruction" in request_data:
            if isinstance(request_data["systemInstruction"], str):
                system_instruction = request_data["systemInstruction"]
            elif isinstance(request_data["systemInstruction"], dict) and "parts" in request_data["systemInstruction"]:
                parts = request_data["systemInstruction"]["parts"]
                if parts and "text" in parts[0]:
                    system_instruction = parts[0]["text"]
        
        # Get generation config
        gen_config = request_data.get("generationConfig", {})
        temperature = gen_config.get("temperature", 0.2)
        max_output_tokens = gen_config.get("maxOutputTokens", 1024)
        
        # Framework-specific configurations
        framework_config = request_data.get("frameworkConfig", {})
        
        # Create a local agent instance based on framework type
        if framework == "LANGCHAIN":
            from vertexai.preview.reasoning_engines import LangchainAgent
            
            agent = LangchainAgent(
                model=model_id,
                temperature=temperature,
                max_output_tokens=max_output_tokens
            )
            response = agent.query(input=query)
            
        elif framework == "LANGGRAPH":
            # Import specific LangGraph components
            from langchain_core.messages import HumanMessage
            from langchain_google_vertexai import ChatVertexAI
            from langgraph.graph import END, MessageGraph
            from langgraph.prebuilt import ToolNode
            
            # Create a local LangGraph agent
            model = ChatVertexAI(model=model_id, temperature=temperature, max_output_tokens=max_output_tokens)
            builder = MessageGraph()
            
            # Add tools if specified
            tools = framework_config.get("tools", [])
            tool_objects = []  # Convert tool definitions to objects
            
            # Add nodes to the graph
            model_with_tools = model.bind_tools(tool_objects)
            builder.add_node("tools", model_with_tools)
            
            # Add tool node and edges
            tool_node = ToolNode(tool_objects)
            for tool in tool_objects:
                tool_name = tool.__name__
                builder.add_node(tool_name, tool_node)
                builder.add_edge(tool_name, END)
            
            # Set entry point and build the graph
            builder.set_entry_point("tools")
            
            # Define custom router based on graph type
            graph_type = framework_config.get("graphType", "sequential")
            # Simple router example - would need to be customized
            def router(state):
                if len(state) > 0 and hasattr(state[-1], "tool_calls") and state[-1].tool_calls:
                    return state[-1].tool_calls[0].get("name", END)
                return END
            
            builder.add_conditional_edges("tools", router)
            
            # Compile and invoke the graph
            graph = builder.compile()
            result = graph.invoke(HumanMessage(query))
            
            # Format the response
            response = {
                "output": result[-1].content if result else "",
                "messages": [msg.to_dict() for msg in result] if result else []
            }
        
        # Handle other frameworks similarly...
        else:  # CUSTOM or other frameworks
            # Create a simple agent with Vertex AI
            from vertexai.generative_models import GenerativeModel
            
            model = GenerativeModel(model_id)
            generation_config = {
                "temperature": temperature,
                "max_output_tokens": max_output_tokens
            }
            
            result = model.generate_content(
                query,
                generation_config=generation_config,
                system_instruction=system_instruction
            )
            
            response = {
                "output": result.text,
                "messages": [{"content": result.text}]
            }
        
        return {
            "textResponse": response.get("output", ""),
            "actions": response.get("actions", []),
            "messages": response.get("messages", [])
        }
    except Exception as e:
        print(f"Error in local playground: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error testing agent locally: {str(e)}")
        
@router.get("/agents")
async def list_agents(
    project_id: Optional[str] = Query(None, description="Google Cloud Project ID"),
    projectId: Optional[str] = Query(None, description="Google Cloud Project ID (alternative param)"),
    region: str = Query("us-central1", description="Region for Vertex AI services")
) -> List[Dict]:
    """Lists all agents in a project."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")
            
        agents = await vertex_service.list_agents(effective_project_id, region)
        return agents
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing agents: {str(e)}")

@router.get("/agents/{agent_id}")
async def get_agent(
    agent_id: str,
    project_id: Optional[str] = Query(None, description="Google Cloud Project ID"),
    projectId: Optional[str] = Query(None, description="Google Cloud Project ID (alternative param)"),
    region: str = Query("us-central1", description="Region for Vertex AI services")
) -> Dict:
    """Gets a specific agent."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")
            
        agent = await vertex_service.get_agent(effective_project_id, region, agent_id)
        return agent
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting agent: {str(e)}")

@router.post("/agents")
async def create_agent(
    request_data: Dict[str, Any],
    project_id: Optional[str] = Query(None, description="Google Cloud Project ID"),
    projectId: Optional[str] = Query(None, description="Google Cloud Project ID (alternative param)"),
    region: str = Query("us-central1", description="Region for Vertex AI services")
) -> Dict:
    """Creates a new agent."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")

        # Extract modelId from model path if it exists
        if "model" in request_data and not "modelId" in request_data:
            model_path = request_data["model"]
            if isinstance(model_path, str) and "models/" in model_path:
                request_data["modelId"] = model_path.split("models/")[-1]
        
        # Handle systemInstruction if it's in the nested format
        if "systemInstruction" in request_data and isinstance(request_data["systemInstruction"], dict):
            if "parts" in request_data["systemInstruction"] and isinstance(request_data["systemInstruction"]["parts"], list):
                parts = request_data["systemInstruction"]["parts"]
                if len(parts) > 0 and "text" in parts[0]:
                    request_data["systemInstruction"] = parts[0]["text"]
        
        # Now validate the request with our Pydantic model
        try:
            agent_request = CreateAgentRequest(**request_data)
        except Exception as validation_error:
            raise HTTPException(status_code=422, detail=f"Validation error: {str(validation_error)}")
            
        # Process the request and create agent data structure
        agent_data = {
            "displayName": agent_request.displayName,
            "description": agent_request.description,
            "generationConfig": {
                "temperature": agent_request.temperature,
                "maxOutputTokens": agent_request.maxOutputTokens
            },
            "systemInstruction": {
                "parts": [
                    {
                        "text": agent_request.systemInstruction
                    }
                ]
            }
        }
        
        # Add model
        agent_data["model"] = f"projects/{effective_project_id}/locations/{region}/publishers/google/models/{agent_request.modelId}"
        
        # Add framework-specific configuration
        if agent_request.framework:
            agent_data["framework"] = agent_request.framework
            
            # LangGraph configuration
            if agent_request.framework == "LANGGRAPH" and agent_request.graphType:
                agent_data["frameworkConfig"] = {
                    "graphType": agent_request.graphType,
                    "tools": agent_request.tools or [],
                    "initialState": json.loads(agent_request.initialState) if agent_request.initialState else {}
                }
                
                # Add Vertex AI Search configuration if needed
                if agent_request.tools and "retrieve_docs" in agent_request.tools:
                    agent_data["frameworkConfig"]["vertexAISearch"] = {
                        "dataStoreId": agent_request.dataStoreId,
                        "dataStoreRegion": agent_request.dataStoreRegion
                    }
            
            # CrewAI configuration
            elif agent_request.framework == "CREWAI" and agent_request.processType:
                agent_data["frameworkConfig"] = {
                    "processType": agent_request.processType,
                    "agents": [agent.dict() for agent in agent_request.agents] if agent_request.agents else [],
                    "tasks": [task.dict() for task in agent_request.tasks] if agent_request.tasks else []
                }
        
        # Create the agent
        response = await vertex_service.create_agent(effective_project_id, region, agent_data)
        return response
    except HTTPException:
        # Re-raise HTTP exceptions as is
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating agent: {str(e)}")

@router.post("/agents/{agent_id}/deploy")
async def deploy_agent(
    agent_id: str,
    project_id: Optional[str] = Query(None, description="Google Cloud Project ID"),
    projectId: Optional[str] = Query(None, description="Google Cloud Project ID (alternative param)"),
    region: str = Query("us-central1", description="Region for Vertex AI services")
) -> Dict:
    """Deploys an agent."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")
            
        response = await vertex_service.deploy_agent(effective_project_id, region, agent_id)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deploying agent: {str(e)}")

@router.delete("/agents/{agent_id}")
async def delete_agent(
    agent_id: str,
    project_id: Optional[str] = Query(None, description="Google Cloud Project ID"),
    projectId: Optional[str] = Query(None, description="Google Cloud Project ID (alternative param)"),
    region: str = Query("us-central1", description="Region for Vertex AI services")
) -> Dict:
    """Deletes an agent."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")
            
        response = await vertex_service.delete_agent(effective_project_id, region, agent_id)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting agent: {str(e)}")

@router.post("/agents/{agent_id}/query")
async def query_agent(
    agent_id: str,
    query: str,
    project_id: Optional[str] = Query(None, description="Google Cloud Project ID"),
    projectId: Optional[str] = Query(None, description="Google Cloud Project ID (alternative param)"),
    region: str = Query("us-central1", description="Region for Vertex AI services"),
    max_response_items: int = Query(10, description="Maximum number of response items")
) -> Dict:
    """Queries an agent."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")
            
        response = await vertex_service.query_agent(
            effective_project_id, region, agent_id, query, max_response_items
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying agent: {str(e)}")
