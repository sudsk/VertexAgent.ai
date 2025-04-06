# backend/agent_runner.py
import os
import json
import base64
import importlib.util
import sys
from fastapi import FastAPI, Request
import uvicorn
from vertexai.generative_models import GenerativeModel, GenerationConfig

app = FastAPI()

# Parse agent configuration from environment variable
agent_config_b64 = os.environ.get("AGENT_CONFIG", "")
if agent_config_b64:
    agent_config = json.loads(base64.b64decode(agent_config_b64))
else:
    agent_config = {}

# Extract agent parameters
model_id = agent_config.get("modelId", "gemini-1.5-pro")
temperature = agent_config.get("temperature", 0.2)
max_output_tokens = agent_config.get("maxOutputTokens", 1024)
system_instruction = agent_config.get("systemInstruction", "")
framework = agent_config.get("framework", "CUSTOM")
framework_config = agent_config.get("frameworkConfig", {})  # Add this line
custom_code = agent_config.get("customCode", {})

# Custom code loading function
def load_custom_code():
    """Loads custom code provided in the agent config."""
    code_modules = {}
    
    # Only attempt to load code if present
    if not custom_code:
        return code_modules
    
    # Load each section of code into a module
    for section, code in custom_code.items():
        if not code:
            continue
            
        # Create a module for this code section
        module_name = f"custom_{section}"
        spec = importlib.util.spec_from_loader(module_name, loader=None)
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        
        # Execute the code in the module's context
        try:
            exec(code, module.__dict__)
            code_modules[section] = module
        except Exception as e:
            print(f"Error loading custom {section} code: {str(e)}")
    
    return code_modules

# Load custom code
custom_modules = load_custom_code()

# Initialize the model
model = GenerativeModel(model_id)
generation_config = GenerationConfig(
    temperature=temperature,
    max_output_tokens=max_output_tokens
)

# Initialize framework-specific components
if framework == "LANGCHAIN":
    # Import LangChain modules
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_google_vertexai import ChatVertexAI
    from langchain.agents import AgentExecutor, create_react_agent
    
    # Use custom tools if provided
    if 'tools' in custom_modules:
        tools = getattr(custom_modules['tools'], 'tools', [])
    else:
        tools = []
    
    # Create the LLM
    llm = ChatVertexAI(
        model=model_id,
        temperature=temperature,
        max_tokens=max_output_tokens
    )
    
    # Use custom templates if provided
    if 'templates' in custom_modules:
        prompt_template = getattr(custom_modules['templates'], 'prompt_template', None)
    else:
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", system_instruction or "You are a helpful AI assistant."),
            ("human", "{input}")
        ])
    
    # Create the agent
    agent = create_react_agent(llm, tools, prompt_template)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

elif framework == "LANGGRAPH":
    # Import LangGraph modules
    from langchain_core.messages import HumanMessage
    from langchain_google_vertexai import ChatVertexAI
    from langgraph.graph import END, StateGraph, MessagesState
    from langgraph.prebuilt import ToolNode
    
    # Get custom components
    tools = getattr(custom_modules.get('tools', {}), 'tools', [])
    
    # Create the LLM
    llm = ChatVertexAI(
        model=model_id,
        temperature=temperature,
        max_tokens=max_output_tokens
    )
    
    # Use custom node handlers if provided
    if 'handlers' in custom_modules:
        call_model = getattr(custom_modules['handlers'], 'call_model', None)
    else:
        # Default handler
        def call_model(state, config):
            messages_with_system = [{"type": "system", "content": system_instruction or "You are a helpful AI assistant."}] + state["messages"]
            response = llm.invoke(messages_with_system, config)
            return {"messages": response}
    
    # Use custom workflow if provided, otherwise create a simple workflow
    if 'workflow' in custom_modules:
        # The workflow module should define and compile the agent
        agent = getattr(custom_modules['workflow'], 'agent', None)
    else:
        # Create a simple workflow
        workflow = StateGraph(MessagesState)
        workflow.add_node("agent", call_model)
        workflow.set_entry_point("agent")
        
        if tools:
            workflow.add_node("tools", ToolNode(tools))
            
            # Define a router for tools
            def should_continue(state):
                last_message = state["messages"][-1]
                return "tools" if hasattr(last_message, "tool_calls") and last_message.tool_calls else END
                
            workflow.add_conditional_edges("agent", should_continue)
            workflow.add_edge("tools", "agent")
        else:
            workflow.add_edge("agent", END)
            
        agent = workflow.compile()

elif framework == "CREWAI":
    # Similar implementation for CrewAI...
    pass
    
@app.post("/")
async def process_request(request: Request):
    """Process an agent request."""
    try:
        # Get the request data
        data = await request.json()
        query = data.get("query", "")
        
        if not query:
            return {"error": "Query is required"}
        
        # Process with the appropriate framework
        if framework == "CUSTOM":
            # Create messages including system instruction if available
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": query})
            
            # Generate response
            response = model.generate_content(
                messages,
                generation_config=generation_config
            )
            
            return {
                "textResponse": response.text,
                "messages": [{"content": response.text}]
            }
        
        elif framework == "LANGCHAIN":
            # Run the agent
            result = agent_executor.invoke({"input": query})
            return {
                "textResponse": result.get("output", ""),
                "messages": [{"content": result.get("output", "")}]
            }
            
        elif framework == "LANGGRAPH":
            # Run the graph
            messages = [HumanMessage(content=query)]
            result = agent.invoke({"messages": messages})
            
            # Extract the response
            last_message = result["messages"][-1] if result.get("messages") else None
            response_text = last_message.content if last_message else ""
            
            return {
                "textResponse": response_text,
                "messages": [{"content": response_text}]
            }
            
        elif framework == "CREWAI":
            # Process with CrewAI
            pass
            
        else:
            return {"error": f"Unsupported framework: {framework}"}
            
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
