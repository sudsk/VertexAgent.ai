// src/components/CustomCodeEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Code, Save, Activity, Play, Wrench, RotateCcw, Check } from 'lucide-react';

// Mock code editor - in production you'd use a component like Monaco Editor or CodeMirror
const CodeEditorField = ({ value, onChange, language, height = "250px" }) => {
  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <div className="bg-gray-100 px-3 py-1 border-b border-gray-300 text-xs font-mono flex justify-between">
        <span>{language}</span>
        <span className="text-green-600">
          <Check size={14} className="inline mr-1" />
          Syntax valid
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 font-mono text-sm bg-gray-50"
        style={{ height, resize: "vertical" }}
        spellCheck="false"
      />
    </div>
  );
};

// Main component
const CustomCodeEditor = ({ framework, onChange, initialCode = {} }) => {
  // Define the code sections based on the selected framework
  const [activeTab, setActiveTab] = useState('tools');
  const [code, setCode] = useState({
    tools: initialCode.tools || getDefaultToolsCode(framework),
    workflow: initialCode.workflow || getDefaultWorkflowCode(framework),
    handlers: initialCode.handlers || getDefaultHandlersCode(framework),
    templates: initialCode.templates || getDefaultTemplatesCode(framework)
  });

  // Define a ref outside the useEffect
  const prevCodeRef = useRef(null);
  
  // Then in your useEffect
  useEffect(() => {
    // Convert current code to string for comparison
    const codeString = JSON.stringify(code);
    
    // Only call onChange if the code has actually changed
    if (JSON.stringify(prevCodeRef.current) !== codeString) {
      onChange(code);
      // Update the ref with current value
      prevCodeRef.current = JSON.parse(codeString);
    }
  }, [code, onChange]);

  const updateCode = (section, newCode) => {
    setCode(prev => ({
      ...prev,
      [section]: newCode
    }));
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center mb-4">
        <Code className="h-5 w-5 text-blue-600 mr-2" />
        <h3 className="font-medium">Custom Code</h3>
        <div className="ml-auto">
          <button
            onClick={() => {
              // Reset to default code
              setCode({
                tools: getDefaultToolsCode(framework),
                workflow: getDefaultWorkflowCode(framework),
                handlers: getDefaultHandlersCode(framework),
                templates: getDefaultTemplatesCode(framework)
              });
            }}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            <RotateCcw size={14} className="mr-1" />
            Reset to defaults
          </button>
        </div>
      </div>
      
      {/* Code section tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('tools')}
            className={`mr-4 py-2 px-1 text-sm font-medium ${
              activeTab === 'tools'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Wrench size={16} className="inline mr-1" />
            Custom Tools
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`mr-4 py-2 px-1 text-sm font-medium ${
              activeTab === 'workflow'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Activity size={16} className="inline mr-1" />
            Workflow Logic
          </button>
          <button
            onClick={() => setActiveTab('handlers')}
            className={`mr-4 py-2 px-1 text-sm font-medium ${
              activeTab === 'handlers'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Play size={16} className="inline mr-1" />
            Node Handlers
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`mr-4 py-2 px-1 text-sm font-medium ${
              activeTab === 'templates'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Code size={16} className="inline mr-1" />
            Templates
          </button>
        </nav>
      </div>
      
      {/* Active code section */}
      <div>
        {activeTab === 'tools' && (
          <div>
            <div className="mb-2 flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-700">Custom Tools</h4>
              <span className="text-xs text-gray-500">Define tools the agent can use</span>
            </div>
            <CodeEditorField
              value={code.tools}
              onChange={(newCode) => updateCode('tools', newCode)}
              language="Python"
              height="300px"
            />
            <div className="mt-1 text-xs text-gray-500">
              Define @tool functions that your agent can use during execution.
            </div>
          </div>
        )}
        
        {activeTab === 'workflow' && (
          <div>
            <div className="mb-2 flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-700">Workflow Logic</h4>
              <span className="text-xs text-gray-500">Define the agent's workflow</span>
            </div>
            <CodeEditorField
              value={code.workflow}
              onChange={(newCode) => updateCode('workflow', newCode)}
              language="Python"
              height="300px"
            />
            <div className="mt-1 text-xs text-gray-500">
              Define workflow logic, including graph structure and routing functions.
            </div>
          </div>
        )}
        
        {activeTab === 'handlers' && (
          <div>
            <div className="mb-2 flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-700">Node Handlers</h4>
              <span className="text-xs text-gray-500">Custom node behavior</span>
            </div>
            <CodeEditorField
              value={code.handlers}
              onChange={(newCode) => updateCode('handlers', newCode)}
              language="Python"
              height="300px"
            />
            <div className="mt-1 text-xs text-gray-500">
              Define handler functions for graph nodes (e.g., call_model, inspect_conversation).
            </div>
          </div>
        )}
        
        {activeTab === 'templates' && (
          <div>
            <div className="mb-2 flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-700">Templates</h4>
              <span className="text-xs text-gray-500">Prompt templates</span>
            </div>
            <CodeEditorField
              value={code.templates}
              onChange={(newCode) => updateCode('templates', newCode)}
              language="Python"
              height="300px"
            />
            <div className="mt-1 text-xs text-gray-500">
              Define templates for prompts and instructions.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions to get default code for each framework
function getDefaultToolsCode(framework) {
  switch (framework) {
    case 'LANGGRAPH':
      return `@tool
def search(query: str) -> str:
    """Simulates a web search. Use it get information on weather"""
    if "sf" in query.lower() or "san francisco" in query.lower():
        return "It's 60 degrees and foggy."
    return "It's 90 degrees and sunny."

# List of tools to be used by the agent
tools = [search]`;
    case 'CREWAI':
      return `@tool
def coding_tool(code_instructions: str) -> str:
    """Use this tool to write a python program given a set of requirements and or instructions."""
    inputs = {"code_instructions": code_instructions}
    return DevCrew().crew().kickoff(inputs=inputs)

# List of tools to be used by the agent
tools = [coding_tool]`;
    case 'LANGCHAIN':
      return `@tool
def retrieve_docs(query: str) -> tuple[str, list[Document]]:
    """
    Useful for retrieving relevant documents based on a query.
    Use this when you need additional information to answer a question.
    """
    # Use the retriever to fetch relevant documents based on the query
    retrieved_docs = retriever.invoke(query)
    # Re-rank docs with Vertex AI Rank for better relevance
    ranked_docs = compressor.compress_documents(documents=retrieved_docs, query=query)
    # Format ranked documents into a consistent structure for LLM consumption
    formatted_docs = format_docs.format(docs=ranked_docs)
    return (formatted_docs, ranked_docs)

@tool
def should_continue() -> None:
    """
    Use this tool if you determine that you have enough context to respond to the questions of the user.
    """
    return None

# List of tools to be used by the agent
tools = [retrieve_docs, should_continue]`;
    default:
      return `# Define your custom tools here
@tool
def example_tool(input_param: str) -> str:
    """Example tool that processes input and returns output"""
    return f"Processed: {input_param}"

# List of tools to be used by the agent
tools = [example_tool]`;
  }
}

function getDefaultWorkflowCode(framework) {
  switch (framework) {
    case 'LANGGRAPH':
      return `# Define workflow components
def should_continue(state: MessagesState) -> str:
    """Determines whether to use tools or end the conversation."""
    last_message = state["messages"][-1]
    return "tools" if last_message.tool_calls else END

# Create the workflow graph
workflow = StateGraph(MessagesState)
workflow.add_node("agent", call_model)
workflow.add_node("tools", ToolNode(tools))
workflow.set_entry_point("agent")

# Define graph edges
workflow.add_conditional_edges("agent", should_continue)
workflow.add_edge("tools", "agent")

# Compile the workflow
agent = workflow.compile()`;
    case 'CREWAI':
      return `# Define workflow components
def should_continue(state: MessagesState) -> str:
    """Determines whether to use the crew or end the conversation."""
    last_message = state["messages"][-1]
    return "dev_crew" if last_message.tool_calls else END

# Create the workflow graph
workflow = StateGraph(MessagesState)
workflow.add_node("agent", call_model)
workflow.add_node("dev_crew", ToolNode(tools))
workflow.set_entry_point("agent")

# Define graph edges
workflow.add_conditional_edges("agent", should_continue)
workflow.add_edge("dev_crew", "agent")

# Compile the workflow
agent = workflow.compile()`;
    case 'LANGCHAIN':
      return `# Flow:
# 1. Start with agent node that inspects conversation using inspect_conversation_node
# 2. Agent node connects to tools node which can either:
#    - Retrieve relevant docs using retrieve_docs tool
#    - End tool usage with should_continue tool
# 3. Tools node connects to generate node which produces final response
# 4. Generate node connects to END to complete the workflow

workflow = StateGraph(MessagesState)
workflow.add_node("agent", inspect_conversation_node)
workflow.add_node("generate", generate_node)
workflow.set_entry_point("agent")

workflow.add_node(
    "tools",
    ToolNode(
        tools=tools,
        handle_tool_errors=True,
    ),
)
workflow.add_edge("agent", "tools")
workflow.add_edge("tools", "generate")
workflow.add_edge("generate", END)

agent = workflow.compile()`;
    default:
      return `# Define the workflow for your agent
workflow = StateGraph(MessagesState)

# Add nodes to your graph
workflow.add_node("agent", call_model)
workflow.set_entry_point("agent")

# Add edges between nodes
workflow.add_edge("agent", END)

# Compile the workflow
agent = workflow.compile()`;
  }
}

function getDefaultHandlersCode(framework) {
  switch (framework) {
    case 'LANGGRAPH':
      return `def call_model(state: MessagesState, config: RunnableConfig) -> dict[str, BaseMessage]:
    """Calls the language model and returns the response."""
    system_message = "You are a helpful AI assistant."
    messages_with_system = [{"type": "system", "content": system_message}] + state[
        "messages"
    ]
    # Forward the RunnableConfig object to ensure the agent is capable of streaming the response.
    response = llm.invoke(messages_with_system, config)
    return {"messages": response}`;
    case 'CREWAI':
      return `def call_model(state: MessagesState, config: RunnableConfig) -> dict[str, BaseMessage]:
    """Calls the language model and returns the response."""
    system_message = (
        "You are an expert Lead Software Engineer Manager.\\n"
        "Your role is to speak to a user and understand what kind of code they need to "
        "build.\\n"
        "Part of your task is therefore to gather requirements and clarifying ambiguity "
        "by asking followup questions. Don't ask all the questions together as the user "
        "has a low attention span, rather ask a question at the time.\\n"
        "Once the problem to solve is clear, you will call your tool for writing the "
        "solution.\\n"
        "Remember, you are an expert in understanding requirements but you cannot code, "
        "use your coding tool to generate a solution. Keep the test cases if any, they "
        "are useful for the user."
    )

    messages_with_system = [{"type": "system", "content": system_message}] + state[
        "messages"
    ]
    # Forward the RunnableConfig object to ensure the agent is capable of streaming the response.
    response = llm.invoke(messages_with_system, config)
    return {"messages": response}`;
    case 'LANGCHAIN':
      return `def inspect_conversation_node(
    state: MessagesState, config: RunnableConfig
) -> dict[str, BaseMessage]:
    """Inspects the conversation state and returns the next message using the conversation inspector."""
    response = inspect_conversation.invoke(state, config)
    return {"messages": response}


def generate_node(
    state: MessagesState, config: RunnableConfig
) -> dict[str, BaseMessage]:
    """Generates a response using the RAG template and returns it as a message."""
    response = response_chain.invoke(state, config)
    return {"messages": response}`;
    default:
      return `def call_model(state: MessagesState, config: RunnableConfig) -> dict[str, BaseMessage]:
    """Default handler function for agent node."""
    system_message = "You are a helpful AI assistant."
    messages_with_system = [{"type": "system", "content": system_message}] + state["messages"]
    response = llm.invoke(messages_with_system, config)
    return {"messages": response}`;
  }
}

function getDefaultTemplatesCode(framework) {
  switch (framework) {
    case 'LANGCHAIN':
      return `# RAG template for generating responses
rag_template = ChatPromptTemplate.from_messages(
    [
        ("system", 
         "You are a helpful assistant answering questions based on provided context. "
         "If the provided context doesn't contain the answer, just say you don't know."),
        ("human", "{input}"),
        ("human", "Here's some relevant context: {context}"),
    ]
)

# Template for inspecting conversation and deciding what to do
inspect_conversation_template = ChatPromptTemplate.from_messages(
    [
        ("system", 
         "You are an assistant that decides whether to retrieve documents or answer directly.\n"
         "If the user is asking for information that might require retrieving documents, use the retrieve_docs tool.\n"
         "If you're confident you can answer without additional information, use the should_continue tool."),
        MessagesPlaceholder(variable_name="messages"),
    ]
)`;
    default:
      return `# Define any prompt templates your agent will use

system_template = """You are a helpful AI assistant with the following capabilities:
{capabilities}

Help the user by responding to their questions thoughtfully and accurately."""

human_template = "{input}"`;
  }
}

export default CustomCodeEditor;
