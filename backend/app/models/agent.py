from typing import Any, Dict, List, Optional, Union, Annotated
from pydantic import BaseModel, Field, RootModel

class GenerationConfig(BaseModel):
    temperature: float = 0.2
    maxOutputTokens: int = 1024
    topP: Optional[float] = None
    topK: Optional[int] = None

class SystemInstruction(BaseModel):
    text: str

class SystemInstructionPart(BaseModel):
    text: str

class SystemInstructionRequest(BaseModel):
    parts: List[SystemInstructionPart]

class LangGraphConfig(BaseModel):
    graphType: str
    tools: List[str] = []
    initialState: Dict[str, Any] = {}
    dataStoreId: Optional[str] = None
    dataStoreRegion: Optional[str] = None

class CrewAIAgentConfig(BaseModel):
    role: str
    goal: str
    backstory: str

class CrewAITaskConfig(BaseModel):
    description: str
    expected_output: str
    assigned_agent_index: int

class CrewAIConfig(BaseModel):
    processType: str
    agents: List[CrewAIAgentConfig]
    tasks: List[CrewAITaskConfig]

# Using RootModel instead of __root__ field
class FrameworkConfig(RootModel):
    root: Union[LangGraphConfig, CrewAIConfig]

class CreateAgentRequest(BaseModel):
    displayName: str
    description: Optional[str] = None
    framework: Optional[str] = None
    modelId: str
    temperature: float = 0.2
    maxOutputTokens: int = 1024
    systemInstruction: str
    tools: Optional[List[str]] = None
    
    # LangGraph specific fields
    graphType: Optional[str] = None
    initialState: Optional[str] = None
    dataStoreId: Optional[str] = None
    dataStoreRegion: Optional[str] = None
    
    # CrewAI specific fields
    processType: Optional[str] = None
    agents: Optional[List[CrewAIAgentConfig]] = None
    tasks: Optional[List[CrewAITaskConfig]] = None

class AgentResponse(BaseModel):
    name: str
    displayName: str
    description: Optional[str] = None
    state: str
    createTime: str
    updateTime: str
    framework: Optional[str] = None
    model: Optional[str] = None
    generationConfig: Optional[GenerationConfig] = None
    systemInstruction: Optional[Dict[str, Any]] = None
    frameworkConfig: Optional[Dict[str, Any]] = None
