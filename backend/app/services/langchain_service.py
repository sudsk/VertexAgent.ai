from typing import Dict, List, Any, Optional
from langchain_google_vertexai import ChatVertexAI
from langchain_core.tools import Tool
from langchain.agents import AgentExecutor, create_react_agent
from langchain.memory import ConversationBufferMemory
from langchain_core.prompts import PromptTemplate
from app.services.tool_registry import ToolRegistry
from app.services.custom_tool_service import CustomToolService

class LangChainService:
    def __init__(self):
        pass
        
    def create_chat_model(self, model_id: str, temperature: float, max_tokens: int):
        """Creates a ChatVertexAI model with the given parameters."""
        return ChatVertexAI(
            model=model_id,
            temperature=temperature,
            max_tokens=max_tokens
        )
    
    def create_tools(self, tool_definitions: List[Dict[str, Any]]) -> List[Tool]:
        """Creates LangChain tools from definitions."""
        tools = []
        for tool_def in tool_definitions:
            # Simple tool creation for now - will expand in later phases
            tool = Tool(
                name=tool_def.get("name", ""),
                description=tool_def.get("description", ""),
                func=lambda x, tool_def=tool_def: f"Mock response for {tool_def.get('name')}: {x}"
            )
            tools.append(tool)
        return tools
    
    def run_agent_with_tools(
        self, 
        query: str, 
        model_id: str,
        temperature: float, 
        max_tokens: int,
        system_instruction: str,
        tools: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Runs a LangChain agent with the given tools."""
        # Create model
        llm = self.create_chat_model(model_id, temperature, max_tokens)
        
        # Create tools
        tool_objects = self.create_tools(tools)
        
        # Create agent with proper system instruction formatting
        prompt = PromptTemplate.from_template(
            system_instruction + "\n\n{chat_history}\n\nHuman: {input}\nAI:"
        )
        
        memory = ConversationBufferMemory(memory_key="chat_history")
        
        # Create agent
        agent = create_react_agent(llm, tool_objects, prompt)
        agent_executor = AgentExecutor(
            agent=agent,
            tools=tool_objects,
            memory=memory,
            verbose=True
        )
        
        # Run agent
        try:
            result = agent_executor.invoke({"input": query})
            return {
                "output": result.get("output", ""),
                "messages": [{"content": result.get("output", "")}],
                "actions": [
                    {"name": action.get("tool"), "output": action.get("tool_output")}
                    for action in result.get("intermediate_steps", [])
                ]
            }
        except Exception as e:
            print(f"Error running LangChain agent: {str(e)}")
            return {
                "output": f"Error: {str(e)}",
                "messages": [{"content": f"Error: {str(e)}"}]
            }

def create_tools(self, tool_definitions: List[Dict[str, Any]], db: Session) -> List[Tool]:
    """Creates LangChain tools from definitions, including custom tools."""
    tools = []
    
    for tool_def in tool_definitions:
        tool_id = tool_def.get("id")
        tool_name = tool_def.get("name")
        tool_type = tool_def.get("type", "PREDEFINED")
        
        if tool_type == "CUSTOM":
            # Handle custom tool
            custom_tool = CustomToolService.get_tool(db, tool_id)
            if custom_tool:
                # Create a function that calls the custom tool executor
                def custom_tool_func(*args, tool_id=tool_id, **kwargs):
                    return CustomToolService.execute_tool(db, tool_id, kwargs)
                
                tool = Tool(
                    name=custom_tool.name,
                    description=custom_tool.description,
                    func=custom_tool_func
                )
                tools.append(tool)
        else:
            # Handle predefined tool
            registered_tool = ToolRegistry.get_tool(tool_name)
            if registered_tool:
                tool = Tool(
                    name=tool_name,
                    description=registered_tool["description"],
                    func=registered_tool["function"]
                )
                tools.append(tool)
    
    return tools
