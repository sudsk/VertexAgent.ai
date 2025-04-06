import json
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Query, Body
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
                from app.services.langchain_service import LangChainService
                
                # Get tool definitions from framework config
                tools = framework_config.get("tools", [])
                
                # Create LangChain service
                langchain_service = LangChainService()
                
                # Run agent
                response = langchain_service.run_agent_with_tools(
                    query=query,
                    model_id=model_id,
                    temperature=temperature,
                    max_tokens=max_output_tokens,
                    system_instruction=system_instruction,
                    tools=tools
                )
                
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
                    # Format the prompt correctly based on agent-starter-pack examples
                    # Option 1: Direct prompt approach (most reliable)
                    if system_instruction:
                        # Include system instructions as part of the prompt
                        prompt = f"{system_instruction}\n\n{query}"
                    else:
                        prompt = query
                        
                    # Generate response with single prompt (most reliable method)
                    result = model.generate_content(prompt, generation_config=generation_config)
                    
                    # Extract text from response
                    response_text = result.text if hasattr(result, "text") else ""
                    
                    response = {
                        "output": response_text,
                        "messages": [{"content": response_text}]
                    }
                    
                except Exception as gen_error:
                    print(f"Generation error details: {str(gen_error)}")
                    # Re-raise to be caught by the outer exception handler
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
    include_local: bool = Query(True, description="Include local agents in results"),
    db: Session = Depends(get_db)    
) -> List[Dict]:
    """Lists all agents in the database with optional filters."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        
        # Base query
        query = db.query(Agent).filter(Agent.status != "DELETED")  # Exclude deleted agents
        
        # Apply filters
        if status:
            query = query.filter(Agent.status == status)

        # Get agents from database
        db_agents = query.all()
        
        result_agents = []
        
        # Process each agent
        for agent in db_agents:
            # If we have a project ID, look for deployments in that project
            deployment = None
            if effective_project_id:
                deployment_query = db.query(Deployment).filter(
                    Deployment.agent_id == agent.id,
                    Deployment.project_id == effective_project_id,
                    Deployment.status != "DELETED"  # Exclude deleted deployments
                )
                
                if deployment_type:
                    deployment_query = deployment_query.filter(
                        Deployment.deployment_type == deployment_type
                    )
                
                deployment = deployment_query.first()
            
            # Include the agent if:
            # 1. It has a deployment in the specified project, OR
            # 2. It's a local agent (no deployment) and include_local is True, OR
            # 3. No project ID was specified
            if deployment or (include_local and agent.status in ["DRAFT", "TESTED"]) or not effective_project_id:
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
                    "isLocal": deployment is None  # Add flag to identify local agents
                }
                
                result_agents.append(agent_data)
        
        return result_agents
            
    except Exception as e:
        print(f"Error listing agents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing agents: {str(e)}")

@router.get("/local-agents")
async def list_local_agents(
    db: Session = Depends(get_db)
) -> List[Dict]:
    """Lists all local agents (not deployed or in DRAFT/TESTED state)."""
    try:
        # Query agents that are in DRAFT or TESTED state
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
                "isLocal": True
            }
            for agent in agents
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing local agents: {str(e)}")
        
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
        
        # Handle local agent IDs (which might start with "local-")
        if agent_id.startswith("local-"):
            agent_id = agent_id[6:]  # Remove "local-" prefix
            
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
                "frameworkConfig": agent.framework_config,
                "tools": agent.tools, 
                "customCode": agent.custom_code  # Make sure custom code is included                
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
        
        # Extract tools
        tools = request_data.get("tools", [])
        
        # Extract memory settings
        memory_enabled = request_data.get("memoryEnabled", False)
        
        # Extract prompt template if available
        prompt_template = request_data.get("promptTemplate", "")

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
            tools=tools,
            memory_enabled=memory_enabled,
            prompt_template=prompt_template,
            status="DRAFT",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        db.add(agent)
        db.commit()
        db.refresh(agent)
        
        # Check if we should deploy immediately - default is False, we've changed the flow
        should_deploy = request_data.get("deploy", False)
        
        # If project ID is provided and deploy flag is true, deploy to Vertex AI
        if effective_project_id and should_deploy:
            # Prepare agent data for Vertex AI (existing code)
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
        
        # Return local agent data - the default flow now
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
    deployment_data: Dict[str, Any] = Body({}),
    project_id: Optional[str] = Query(None),
    projectId: Optional[str] = Query(None),
    region: str = Query("us-central1"),
    db: Session = Depends(get_db)
) -> Dict:
    """Deploys an agent to the specified target."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")
        
        # Extract deployment type from request
        deployment_type = deployment_data.get("deploymentType", "AGENT_ENGINE")
        
        # Check if agent exists in database
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Check if already deployed to this project/region
        existing_deployment = db.query(Deployment).filter(
            Deployment.agent_id == agent_id,
            Deployment.project_id == effective_project_id,
            Deployment.region == region,
            Deployment.status == "ACTIVE",
            Deployment.deployment_type == deployment_type
        ).first()
        
        if existing_deployment:
            return {
                "id": agent.id,
                "name": existing_deployment.resource_name,
                "displayName": agent.display_name,
                "state": "ACTIVE",
                "message": f"Agent already deployed to {deployment_type}"
            }
        
        # Deploy to the selected target
        if deployment_type == "AGENT_ENGINE":
            # Standard deployment to Vertex AI Agent Engine
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
            
        elif deployment_type == "CLOUD_RUN":
            # Deploy to Cloud Run
            from app.services.cloud_run import CloudRunService
            cloud_run_service = CloudRunService()
            
            # Prepare agent data
            agent_data = {
                "displayName": agent.display_name,
                "description": agent.description or "",
                "framework": agent.framework,
                "modelId": agent.model_id,
                "temperature": agent.temperature,
                "maxOutputTokens": agent.max_output_tokens,
                "systemInstruction": agent.system_instruction or "",
                "frameworkConfig": agent.framework_config
            }
            
            # Deploy to Cloud Run
            response = await cloud_run_service.deploy_agent_to_cloud_run(
                effective_project_id,
                region,
                agent_data
            )
            
            # Create deployment record
            deployment = Deployment(
                id=str(uuid.uuid4()),
                agent_id=agent.id,
                deployment_type="CLOUD_RUN",
                version="1.0",
                project_id=effective_project_id,
                region=region,
                resource_name=response.get("name"),
                endpoint_url=response.get("uri"),
                status="ACTIVE",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported deployment type: {deployment_type}")
        
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
            "deploymentType": deployment_type,
            "message": f"Agent successfully deployed to {deployment_type}"
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

        # Check if agent_id has the "local-" prefix, and remove it if present
        if agent_id.startswith("local-"):
            agent_id = agent_id[6:]  # Remove "local-" prefix
            
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
            try:
                response = await vertex_service.delete_agent(effective_project_id, region, agent_id)
                return response
            except Exception as e:
                raise HTTPException(status_code=404, detail=f"Agent not found or could not be deleted: {str(e)}")
                
        # If it's neither a known local agent nor a valid resource name, return an error
        raise HTTPException(status_code=404, detail="Agent not found")
         
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
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

@router.get("/debug/all-agents")
async def debug_all_agents(db: Session = Depends(get_db)) -> List[Dict]:
    """Debug endpoint to list all agents in the database regardless of status."""
    try:
        agents = db.query(Agent).all()
        return [
            {
                "id": agent.id,
                "display_name": agent.display_name,
                "status": agent.status,
                "created_at": agent.created_at.isoformat(),
                "updated_at": agent.updated_at.isoformat()
            }
            for agent in agents
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing debug agents: {str(e)}")

# Add to backend/app/api/agents.py

@router.post("/custom-tools")
async def create_custom_tool(
    name: str,
    description: str,
    code: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Creates a new custom tool."""
    try:
        from app.services.custom_tool_service import CustomToolService
        
        tool = CustomToolService.create_tool(db, name, description, code)
        
        return {
            "id": tool.id,
            "name": tool.name,
            "description": tool.description,
            "created_at": tool.created_at.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating custom tool: {str(e)}")

@router.get("/custom-tools")
async def list_custom_tools(
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Lists all custom tools."""
    try:
        from app.services.custom_tool_service import CustomToolService
        
        tools = CustomToolService.list_tools(db)
        
        return [
            {
                "id": tool.id,
                "name": tool.name,
                "description": tool.description,
                "created_at": tool.created_at.isoformat()
            }
            for tool in tools
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing custom tools: {str(e)}")

@router.post("/custom-tools/{tool_id}/execute")
async def execute_custom_tool(
    tool_id: str,
    params: Dict[str, Any],
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Executes a custom tool with parameters."""
    try:
        from app.services.custom_tool_service import CustomToolService
        
        result = CustomToolService.execute_tool(db, tool_id, params)
        
        return {
            "result": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing custom tool: {str(e)}")

@router.put("/agents/{agent_id}")
async def update_agent(
    agent_id: str,
    request_data: Dict[str, Any],
    project_id: Optional[str] = Query(None),
    projectId: Optional[str] = Query(None),
    region: str = Query("us-central1"),
    db: Session = Depends(get_db)
) -> Dict:
    """Updates an existing agent."""
    try:
        # Use projectId if project_id is not provided
        effective_project_id = project_id or projectId
        if not effective_project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")

        # Handle agent IDs with local- prefix
        actual_agent_id = agent_id
        if agent_id.startswith("local-"):
            actual_agent_id = agent_id[6:]  # Remove "local-" prefix
            print(f"Stripped 'local-' prefix, using agent_id: {actual_agent_id}")

        # Check if agent exists in database
        agent = db.query(Agent).filter(Agent.id == actual_agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found with ID: {actual_agent_id}")
        
        # Extract agent data from request
        display_name = request_data.get("displayName", agent.display_name)
        description = request_data.get("description", agent.description)
        framework = request_data.get("framework", agent.framework)
        model_id = request_data.get("modelId", agent.model_id)
        if not model_id and "model" in request_data:
            # Extract modelId from full model path if present
            model_parts = request_data["model"].split('/')
            if len(model_parts) > 0:
                model_id = model_parts[-1]
        
        # Extract generation config
        temperature = request_data.get("generationConfig", {}).get("temperature", agent.temperature)
        max_output_tokens = request_data.get("generationConfig", {}).get("maxOutputTokens", agent.max_output_tokens)
        
        # Extract system instruction
        system_instruction = agent.system_instruction
        if "systemInstruction" in request_data:
            if isinstance(request_data["systemInstruction"], str):
                system_instruction = request_data["systemInstruction"]
            elif isinstance(request_data["systemInstruction"], dict) and "parts" in request_data["systemInstruction"]:
                parts = request_data["systemInstruction"]["parts"]
                if parts and "text" in parts[0]:
                    system_instruction = parts[0]["text"]
        
        # Extract framework configuration
        framework_config = request_data.get("frameworkConfig", agent.framework_config)
        
        # Extract tools
        tools = request_data.get("tools", agent.tools)
        
        # Extract memory settings
        memory_enabled = request_data.get("memoryEnabled", agent.memory_enabled)
        
        # Extract prompt template if available
        prompt_template = request_data.get("promptTemplate", agent.prompt_template)
        
        # Extract custom code if available
        custom_code = request_data.get("customCode", {})

        # Update agent in database
        agent.display_name = display_name
        agent.description = description
        agent.framework = framework
        agent.model_id = model_id
        agent.temperature = temperature
        agent.max_output_tokens = max_output_tokens
        agent.system_instruction = system_instruction
        agent.framework_config = framework_config
        agent.tools = tools
        agent.memory_enabled = memory_enabled
        agent.prompt_template = prompt_template
        agent.custom_code = custom_code
        agent.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(agent)
        
        # Check if agent is already deployed to Vertex AI
        deployment = db.query(Deployment).filter(
            Deployment.agent_id == actual_agent_id,
            Deployment.project_id == effective_project_id,
            Deployment.region == region,
            Deployment.status == "ACTIVE"
        ).first()
        
        # If agent is deployed and user requested deployment update, update the deployed agent
        should_update_deployment = request_data.get("updateDeployment", False)
        
        if deployment and should_update_deployment:
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
                
            if custom_code:
                agent_data["customCode"] = custom_code
            
            # Update the deployed agent
            try:
                response = await vertex_service.update_agent(
                    effective_project_id, 
                    region, 
                    deployment.resource_name, 
                    agent_data
                )
                
                # Update deployment record
                deployment.updated_at = datetime.utcnow()
                db.commit()
            except Exception as update_error:
                print(f"Error updating deployed agent: {str(update_error)}")
                # Continue without failing - we've updated the local version at least
        
        return {
            "id": agent.id,
            "name": f"local-{agent.id}",
            "displayName": agent.display_name,
            "description": agent.description,
            "state": agent.status,
            "createTime": agent.created_at.isoformat(),
            "updateTime": agent.updated_at.isoformat(),
            "framework": agent.framework,
            "message": "Agent updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating agent: {str(e)}")
