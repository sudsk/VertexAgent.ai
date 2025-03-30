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
    project_id: Optional[str] = Query(None),
    projectId: Optional[str] = Query(None),
    region: str = Query("us-central1"),
    db: Session = Depends(get_db)
) -> Dict:
    """Tests an agent configuration locally and records the test result."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")
            
        # Get agent ID if provided
        agent_id = request_data.get("id")
        query = request_data.get("query")
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        # Start timer for metrics
        start_time = datetime.utcnow()
        success = True
        
        # Get or create agent
        if agent_id:
            # Find existing agent
            agent = db.query(Agent).filter(Agent.id == agent_id).first()
            if not agent:
                raise HTTPException(status_code=404, detail="Agent not found")
        else:
            # Create temporary agent from request data
            display_name = request_data.get("displayName", "Temporary Agent")
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
            
            # Create agent (if not already exists)
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
        
        # Create a local agent instance based on framework type
        try:
            framework = agent.framework
            model_id = agent.model_id
            temperature = agent.temperature
            max_output_tokens = agent.max_output_tokens
            system_instruction = agent.system_instruction
        
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
                from vertexai.generative_models import GenerativeModel, GenerationConfig
                
                model = GenerativeModel(model_id)
                generation_config = GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_output_tokens
                )

                try:
                    # Create proper message format
                    if system_instruction:
                        # Use the content part structure required by Vertex AI
                        messages = [
                            {"role": "system", "parts": [{"text": system_instruction}]},
                            {"role": "user", "parts": [{"text": query}]}
                        ]
                    else:
                        # If no system instruction, just use the query directly
                        messages = {"role": "user", "parts": [{"text": query}]}
                    
                    # Generate response
                    result = model.generate_content(
                        messages,
                        generation_config=generation_config
                    )
                    
                    # Properly extract text from the response
                    response_text = result.text if hasattr(result, 'text') else ""
                    if not response_text and hasattr(result, 'candidates') and result.candidates:
                        # Try to get text from candidates if available
                        response_text = result.candidates[0].content.parts[0].text
                    
                    response = {
                        "output": response_text,
                        "messages": [{"content": response_text}]
                    }
                except Exception as e:
                    print(f"Error generating content: {str(e)}")
                    raise      
                    
            return {
                "textResponse": response.get("output", ""),
                "actions": response.get("actions", []),
                "messages": response.get("messages", [])
            }
        except Exception as test_error:
            success = False
            response = {
                "textResponse": f"Error: {str(test_error)}",
                "actions": [],
                "messages": [{"content": f"Error: {str(test_error)}"}]
            }
            
        # End timer
        end_time = datetime.utcnow()
        duration_ms = (end_time - start_time).total_seconds() * 1000
        
        # Record test in database
        test = AgentTest(
            id=str(uuid.uuid4()),
            agent_id=agent.id,
            query=query,
            response=response.get("textResponse", ""),
            metrics={
                "duration_ms": duration_ms,
                "success": success
            },
            success=success,
            created_at=datetime.utcnow()
        )
        
        db.add(test)
        
        # Update agent status to TESTED if it was successful
        if success and agent.status == "DRAFT":
            agent.status = "TESTED"
            
        db.commit()
        
        # Return response
        return {
            "agent_id": agent.id,
            "textResponse": response.get("textResponse", ""),
            "actions": response.get("actions", []),
            "messages": response.get("messages", []),
            "metrics": {
                "duration_ms": duration_ms,
                "success": success
            }
        }
        
    except Exception as e:
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
    project_id: Optional[str] = Query(None),
    projectId: Optional[str] = Query(None),
    region: str = Query("us-central1"),
    db: Session = Depends(get_db)
) -> Dict:
    """Gets a specific agent."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")
        
        # First, check if the agent exists in the database
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        
        if agent:
            # Get deployment info if a project ID is specified
            deployment = None
            if effective_project_id:
                deployment = db.query(Deployment).filter(
                    Deployment.agent_id == agent.id,
                    Deployment.project_id == effective_project_id,
                    Deployment.region == region
                ).order_by(Deployment.created_at.desc()).first()
            
            # Return agent data from the database
            return {
                "id": agent.id,
                "name": deployment.resource_name if deployment else f"local-{agent.id}",
                "displayName": agent.display_name,
                "description": agent.description,
                "state": deployment.status if deployment else agent.status,
                "createTime": agent.created_at.isoformat(),
                "updateTime": agent.updated_at.isoformat(),
                "framework": agent.framework,
                "model": f"projects/{deployment.project_id if deployment else effective_project_id}/locations/{deployment.region if deployment else region}/publishers/google/models/{agent.model_id}" if agent.model_id else None,
                "generationConfig": {
                    "temperature": agent.temperature,
                    "maxOutputTokens": agent.max_output_tokens
                },
                "systemInstruction": {
                    "parts": [
                        {
                            "text": agent.system_instruction or ""
                        }
                    ]
                },
                "frameworkConfig": agent.framework_config
            }
        
        # If the agent is not in the database but looks like a Vertex AI resource path,
        # try to get it from Vertex AI
        if agent_id.startswith("projects/") or not agent_id.startswith("local-"):
            try:
                return await vertex_service.get_agent(effective_project_id, region, agent_id)
            except Exception as vertex_error:
                print(f"Error getting agent from Vertex AI: {str(vertex_error)}")
                raise HTTPException(status_code=404, detail="Agent not found in Vertex AI")
        
        # If we get here, the agent was not found
        raise HTTPException(status_code=404, detail="Agent not found")
    except HTTPException:
        raise
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
    project_id: Optional[str] = Query(None),
    projectId: Optional[str] = Query(None),
    region: str = Query("us-central1"),
    db: Session = Depends(get_db)
) -> Dict:
    """Deploys an agent to Vertex AI Agent Engine."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")
        
        # Check if agent exists in database
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Check if already deployed to this project/region
        existing_deployment = db.query(Deployment).filter(
            Deployment.agent_id == agent_id,
            Deployment.project_id == effective_project_id,
            Deployment.region == region,
            Deployment.status == "ACTIVE"
        ).first()
        
        if existing_deployment:
            return {
                "id": agent.id,
                "name": existing_deployment.resource_name,
                "displayName": agent.display_name,
                "state": "ACTIVE",
                "message": "Agent already deployed"
            }
        
        # Prepare agent data for Vertex AI
        agent_data = {
            "displayName": agent.display_name,
            "description": agent.description or "",
            "generationConfig": {
                "temperature": agent.temperature,
                "maxOutputTokens": agent.max_output_tokens
            },
            "systemInstruction": {
                "parts": [
                    {
                        "text": agent.system_instruction or ""
                    }
                ]
            }
        }
        
        # Add model
        agent_data["model"] = f"projects/{effective_project_id}/locations/{region}/publishers/google/models/{agent.model_id}"
        
        # Add framework-specific configuration
        if agent.framework:
            agent_data["framework"] = agent.framework
            
        if agent.framework_config:
            agent_data["frameworkConfig"] = agent.framework_config
        
        # Deploy to Vertex AI
        response = await vertex_service.create_agent(effective_project_id, region, agent_data)
        
        # Create deployment record
        deployment = Deployment(
            id=str(uuid.uuid4()),
            agent_id=agent.id,
            deployment_type="AGENT_ENGINE",
            version="1.0",
            project_id=effective_project_id,
            region=region,
            resource_name=response.get("name"),
            status="ACTIVE",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(deployment)
        
        # Update agent status to DEPLOYED
        agent.status = "DEPLOYED"
        agent.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "id": agent.id,
            "name": response.get("name"),
            "displayName": agent.display_name,
            "state": "ACTIVE",
            "message": "Agent successfully deployed"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deploying agent: {str(e)}")

@router.delete("/agents/{agent_id}")
async def delete_agent(
    agent_id: str,
    project_id: Optional[str] = Query(None),
    projectId: Optional[str] = Query(None),
    region: str = Query("us-central1"),
    db: Session = Depends(get_db)
) -> Dict:
    """Deletes an agent."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")
        
        # Check if agent exists in database
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        
        # If agent is in database
        if agent:
            # Find its deployments
            deployments = db.query(Deployment).filter(
                Deployment.agent_id == agent_id,
                Deployment.project_id == effective_project_id,
                Deployment.region == region
            ).all()
            
            # For each deployment, try to delete it from Vertex AI
            for deployment in deployments:
                try:
                    await vertex_service.delete_agent(effective_project_id, region, deployment.resource_name)
                    # Update deployment status
                    deployment.status = "DELETED"
                    deployment.updated_at = datetime.utcnow()
                except Exception as vertex_error:
                    print(f"Error deleting agent from Vertex AI: {str(vertex_error)}")
            
            # Update the agent status
            agent.status = "DELETED"
            agent.updated_at = datetime.utcnow()
            
            # Commit changes to database
            db.commit()
            
            return {
                "id": agent.id,
                "status": "deleted"
            }
        
        # If agent is not in database but has a Vertex AI resource name format
        if agent_id.startswith("projects/"):
            # Try to delete directly from Vertex AI
            response = await vertex_service.delete_agent(effective_project_id, region, agent_id)
            return response
        
        # If resource name format, try to delete
        try:
            response = await vertex_service.delete_agent(effective_project_id, region, agent_id)
            return response
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Agent not found or could not be deleted: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting agent: {str(e)}")

@router.get("/agents/{agent_id}/tests")
async def get_agent_tests(
    agent_id: str,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
) -> List[Dict]:
    """Gets test history for an agent."""
    try:
        # Query tests for the agent, most recent first
        tests = db.query(AgentTest).filter(
            AgentTest.agent_id == agent_id
        ).order_by(
            AgentTest.created_at.desc()
        ).limit(limit).all()
        
        return [
            {
                "id": test.id,
                "query": test.query,
                "response": test.response,
                "success": test.success,
                "metrics": test.metrics,
                "created_at": test.created_at.isoformat()
            }
            for test in tests
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting agent tests: {str(e)}")

@router.get("/local-agents")
async def list_local_agents(
    db: Session = Depends(get_db)
) -> List[Dict]:
    """Lists all local agents (not deployed to Vertex AI)."""
    try:
        # Query agents that are DRAFT or TESTED but not DEPLOYED
        agents = db.query(Agent).filter(
            Agent.status.in_(["DRAFT", "TESTED"])
        ).order_by(Agent.updated_at.desc()).all()
        
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
                "modelId": agent.model_id
            }
            for agent in agents
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing local agents: {str(e)}")
        
@router.post("/agents/{agent_id}/query")
async def query_agent(
    agent_id: str,
    query: str,
    project_id: Optional[str] = Query(None),
    projectId: Optional[str] = Query(None),
    region: str = Query("us-central1"),
    max_response_items: int = Query(10),
    db: Session = Depends(get_db)
) -> Dict:
    """Queries an agent and records the interaction."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")
        
        # Start timer for performance metrics
        start_time = datetime.utcnow()
        
        # Check if agent exists in database
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        
        if not agent:
            # If not in database but looks like a direct Vertex AI resource path
            if agent_id.startswith("projects/"):
                try:
                    response = await vertex_service.query_agent(
                        effective_project_id, region, agent_id, query, max_response_items
                    )
                    return response
                except Exception as vertex_error:
                    raise HTTPException(
                        status_code=500, 
                        detail=f"Error querying Vertex AI agent: {str(vertex_error)}"
                    )
            else:
                raise HTTPException(status_code=404, detail="Agent not found")
        
        # Find active deployment in the specified project/region
        deployment = db.query(Deployment).filter(
            Deployment.agent_id == agent.id,
            Deployment.project_id == effective_project_id,
            Deployment.region == region,
            Deployment.status == "ACTIVE"
        ).first()
        
        if not deployment:
            raise HTTPException(
                status_code=404, 
                detail=f"No active deployment found for agent in project {effective_project_id}, region {region}"
            )
        
        # Query the agent using the deployment's resource name
        try:
            response = await vertex_service.query_agent(
                effective_project_id, 
                region, 
                deployment.resource_name, 
                query, 
                max_response_items
            )
            
            # Record the successful query
            end_time = datetime.utcnow()
            duration_ms = (end_time - start_time).total_seconds() * 1000
            
            # Store test record (optional - you might want to separate query logs from tests)
            test = AgentTest(
                id=str(uuid.uuid4()),
                agent_id=agent.id,
                query=query,
                response=response.get("textResponse", ""),
                metrics={
                    "duration_ms": duration_ms,
                    "deployment_id": deployment.id,
                    "project_id": effective_project_id,
                    "region": region
                },
                success=True,
                created_at=datetime.utcnow()
            )
            
            db.add(test)
            db.commit()
            
            return response
            
        except Exception as query_error:
            # Record the failed query
            end_time = datetime.utcnow()
            duration_ms = (end_time - start_time).total_seconds() * 1000
            
            test = AgentTest(
                id=str(uuid.uuid4()),
                agent_id=agent.id,
                query=query,
                response=f"Error: {str(query_error)}",
                metrics={
                    "duration_ms": duration_ms,
                    "deployment_id": deployment.id,
                    "project_id": effective_project_id,
                    "region": region,
                    "error": str(query_error)
                },
                success=False,
                created_at=datetime.utcnow()
            )
            
            db.add(test)
            db.commit()
            
            raise HTTPException(
                status_code=500, 
                detail=f"Error querying agent: {str(query_error)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying agent: {str(e)}")
