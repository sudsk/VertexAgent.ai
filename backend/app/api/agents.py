import json
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
import uuid
from app.models.agent import CreateAgentRequest, AgentResponse
from app.services.vertex_ai import VertexAIService
from app.database import get_db, Agent, Deployment, AgentTest

router = APIRouter()
vertex_service = VertexAIService()

@router.post("/agents/playground")
async def test_agent_locally(
    request_data: Dict[str, Any],
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
        query = request_data.get("query", "")
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
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
        temperature = request_data.get("temperature", 0.2)
        max_output_tokens = request_data.get("maxOutputTokens", 1024)
        
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
    project_id: Optional[str] = Query(None),
    projectId: Optional[str] = Query(None),
    region: str = Query("us-central1"),
    deployment_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)    
) -> List[Dict]:
    """Lists all agents in the database with optional filters."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")

        # Base query
        query = db.query(Agent)
        
        # Apply filters
        if status:
            query = query.filter(Agent.status == status)

        # Get agents from database
        db_agents = query.all()
        
        # If a project ID was provided, filter deployments
        if effective_project_id:
            result_agents = []
            
            for agent in db_agents:
                # Check if agent has a deployment in the specified project
                deployment_query = db.query(Deployment).filter(
                    Deployment.agent_id == agent.id,
                    Deployment.project_id == effective_project_id
                )
                
                if deployment_type:
                    deployment_query = deployment_query.filter(
                        Deployment.deployment_type == deployment_type
                    )
                
                deployment = deployment_query.first()
                
                if deployment or not effective_project_id:
                    # Format the agent data
                    agent_data = {
                        "id": agent.id,
                        "name": deployment.resource_name if deployment else f"local-{agent.id}",
                        "displayName": agent.display_name,
                        "description": agent.description,
                        "state": deployment.status if deployment else agent.status,
                        "createTime": agent.created_at.isoformat(),
                        "updateTime": agent.updated_at.isoformat(),
                        "framework": agent.framework,
                    }
                    
                    result_agents.append(agent_data)
            
            return result_agents
        else:
            # Return all agents if no project ID specified
            return [
                {
                    "id": agent.id,
                    "name": f"local-{agent.id}",
                    "displayName": agent.display_name,
                    "description": agent.description,
                    "state": agent.status,
                    "createTime": agent.created_at.isoformat(),
                    "updateTime": agent.updated_at.isoformat(),
                    "framework": agent.framework,
                }
                for agent in db_agents
            ]
            
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
    project_id: Optional[str] = Query(None),
    projectId: Optional[str] = Query(None),
    region: str = Query("us-central1"),
    db: Session = Depends(get_db)
) -> Dict:
    """Creates a new agent."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")

        # Extract basic agent data
        display_name = request_data.get("displayName")
        if not display_name:
            raise HTTPException(status_code=400, detail="displayName is required")
            
        description = request_data.get("description", "")
        framework = request_data.get("framework", "CUSTOM")
        model_id = request_data.get("modelId", "gemini-1.5-pro")
        temperature = float(request_data.get("temperature", 0.2))
        max_output_tokens = int(request_data.get("maxOutputTokens", 1024))
        
        # Extract system instruction
        system_instruction = ""
        if "systemInstruction" in request_data:
            if isinstance(request_data["systemInstruction"], str):
                system_instruction = request_data["systemInstruction"]
            elif isinstance(request_data["systemInstruction"], dict) and "parts" in request_data["systemInstruction"]:
                parts = request_data["systemInstruction"]["parts"]
                if parts and "text" in parts[0]:
                    system_instruction = parts[0]["text"]
        
        # Extract framework configuration
        framework_config = request_data.get("frameworkConfig", {})

        # Create agent in database
        agent = Agent(
            id=str(uuid.uuid4()),
            display_name=display_name,
            description=description,
            framework=framework,
            model_id=model_id,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            system_instruction=system_instruction,
            framework_config=framework_config,
            status="DRAFT",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        db.add(agent)
        db.commit()
        db.refresh(agent)
        
        # If project ID is provided, deploy to Vertex AI
        if effective_project_id and request_data.get("deploy", False):
            # Prepare agent data for Vertex AI
            agent_data = {
                "displayName": display_name,
                "description": description,
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_output_tokens
                },
                "systemInstruction": {
                    "parts": [
                        {
                            "text": system_instruction
                        }
                    ]
                }
            }
            
            # Add model
            agent_data["model"] = f"projects/{effective_project_id}/locations/{region}/publishers/google/models/{model_id}"
            
            # Add framework-specific configuration
            if framework:
                agent_data["framework"] = framework
                
            if framework_config:
                agent_data["frameworkConfig"] = framework_config
            
            # Deploy to Vertex AI
            response = await vertex_service.create_agent(effective_project_id, region, agent_data)
            
            # Extract agent ID from the name
            vertex_agent_id = response["name"].split("/")[-1]
            
            # Create deployment record
            deployment = Deployment(
                id=str(uuid.uuid4()),
                agent_id=agent.id,
                deployment_type="AGENT_ENGINE",
                version="1.0",
                project_id=effective_project_id,
                region=region,
                resource_name=response["name"],
                status=response.get("state", "CREATING"),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(deployment)
            db.commit()
            
            # Update agent status
            agent.status = "DEPLOYED"
            db.commit()
            
            return {
                "id": agent.id,
                "name": response["name"],
                "displayName": agent.display_name,
                "description": agent.description,
                "state": response.get("state", "CREATING"),
                "createTime": agent.created_at.isoformat(),
                "updateTime": agent.updated_at.isoformat(),
                "framework": agent.framework,
            }
        
        # Return local agent data
        return {
            "id": agent.id,
            "name": f"local-{agent.id}",
            "displayName": agent.display_name,
            "description": agent.description,
            "state": "DRAFT",
            "createTime": agent.created_at.isoformat(),
            "updateTime": agent.updated_at.isoformat(),
            "framework": agent.framework,
        }
        
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
