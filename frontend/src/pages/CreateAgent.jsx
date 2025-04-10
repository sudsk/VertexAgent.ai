// src/pages/CreateAgent.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createLocalAgent, getAgent, updateAgent } from '../services/agentEngineService';
import FrameworkTemplates from '../components/FrameworkTemplates';
import ToolDefinitionEditor from '../components/ToolDefinitionEditor';
import CustomCodeEditor from '../components/CustomCodeEditor';
import LoadingSpinner from '../components/LoadingSpinner';

const CreateAgent = ({ projectId, region }) => {
  const navigate = useNavigate();
  const { agentId } = useParams(); // Get agentId from URL if present (for editing)
  const isEditMode = Boolean(agentId);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAgent, setIsLoadingAgent] = useState(isEditMode);
  const [showCodeView, setShowCodeView] = useState(false);
  const [configYaml, setConfigYaml] = useState('');
  const [showCustomCode, setShowCustomCode] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    description: '',
    framework: 'CUSTOM',
    modelId: 'gemini-1.5-pro',
    maxOutputTokens: 1024,
    temperature: 0.2,
    systemInstruction: '',
    // LangGraph specific fields
    graphType: 'sequential',
    stateDefinition: '{"messages": [], "current_node": ""}',
    tools: [],
    // CrewAI specific fields
    processType: 'sequential',
    crewAgentCount: 2,
    coordinationStrategy: 'sequential',
    agents: [],
    tasks: [],
    // Custom code editor fields
    customCode: {
      tools: '',
      workflow: '',
      handlers: '',
      templates: ''
    }
  });
  const [error, setError] = useState('');
  
  // Fetch agent data if in edit mode
  useEffect(() => {
    if (isEditMode && projectId) {
      setIsLoadingAgent(true);
      getAgent(projectId, region, agentId)
        .then(agentData => {
          // Transform the agent data to match the form structure
          const updatedFormData = {
            displayName: agentData.displayName || '',
            description: agentData.description || '',
            framework: agentData.framework || 'CUSTOM',
            modelId: agentData.model ? agentData.model.split('/').pop() : 'gemini-1.5-pro',
            maxOutputTokens: agentData.generationConfig?.maxOutputTokens || 1024,
            temperature: agentData.generationConfig?.temperature || 0.2,
            systemInstruction: agentData.systemInstruction?.parts?.[0]?.text || '',
            tools: agentData.tools || [],
            // Extract framework-specific fields
            ...extractFrameworkData(agentData),
            // Custom code fields
            customCode: agentData.customCode || {
              tools: '',
              workflow: '',
              handlers: '',
              templates: ''
            }
          };
          
          setFormData(updatedFormData);
          
          if (showCodeView) {
            convertFormToYaml(updatedFormData);
          }
        })
        .catch(err => {
          console.error('Error loading agent for editing:', err);
          setError('Failed to load agent details for editing');
        })
        .finally(() => {
          setIsLoadingAgent(false);
        });
    }
  }, [isEditMode, projectId, region, agentId, showCodeView]);

  // Helper function to extract framework-specific data
  const extractFrameworkData = (agentData) => {
    const frameworkData = {};
    
    if (agentData.framework === 'LANGGRAPH' && agentData.frameworkConfig) {
      frameworkData.graphType = agentData.frameworkConfig.graphType || 'sequential';
      frameworkData.tools = agentData.frameworkConfig.tools || [];
      frameworkData.stateDefinition = typeof agentData.frameworkConfig.stateDefinition === 'object' 
        ? JSON.stringify(agentData.frameworkConfig.stateDefinition, null, 2) 
        : '{}';
      frameworkData.dataStoreId = agentData.frameworkConfig.dataStoreId;
      frameworkData.dataStoreRegion = agentData.frameworkConfig.dataStoreRegion;
    } 
    else if (agentData.framework === 'CREWAI' && agentData.frameworkConfig) {
      frameworkData.processType = agentData.frameworkConfig.processType || 'sequential';
      frameworkData.agents = agentData.frameworkConfig.agents || [];
      frameworkData.tasks = agentData.frameworkConfig.tasks || [];
    }
    
    return frameworkData;
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'maxOutputTokens' ? parseInt(value) : 
              name === 'temperature' ? parseFloat(value) : value
    });
  };

  // Add handler for custom code
  const handleCustomCodeChange = (newCode) => {
    setFormData({
      ...formData,
      customCode: newCode
    });
  };  

  const handleToolsChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setFormData({
        ...formData,
        tools: [...(formData.tools || []), value]
      });
    } else {
      setFormData({
        ...formData,
        tools: (formData.tools || []).filter(tool => tool !== value)
      });
    }
  };

  const handleAddAgent = () => {
    setFormData({
      ...formData,
      agents: [
        ...(formData.agents || []), 
        { role: '', goal: '', backstory: '' }
      ]
    });
  };

  const handleRemoveAgent = (index) => {
    const updatedAgents = [...formData.agents];
    updatedAgents.splice(index, 1);
    setFormData({
      ...formData,
      agents: updatedAgents
    });
  };

  const handleAgentChange = (index, field, value) => {
    const updatedAgents = [...formData.agents];
    updatedAgents[index] = {
      ...updatedAgents[index],
      [field]: value
    };
    setFormData({
      ...formData,
      agents: updatedAgents
    });
  };

  const handleAddTask = () => {
    setFormData({
      ...formData,
      tasks: [
        ...(formData.tasks || []), 
        { description: '', expected_output: '', assigned_agent_index: 0 }
      ]
    });
  };

  const handleRemoveTask = (index) => {
    const updatedTasks = [...formData.tasks];
    updatedTasks.splice(index, 1);
    setFormData({
      ...formData,
      tasks: updatedTasks
    });
  };

  const handleTaskChange = (index, field, value) => {
    const updatedTasks = [...formData.tasks];
    updatedTasks[index] = {
      ...updatedTasks[index],
      [field]: value
    };
    setFormData({
      ...formData,
      tasks: updatedTasks
    });
  };

  const handleSelectTemplate = (template) => {
    setFormData({
      ...formData,
      ...template
    });
  };  

  const convertFormToYaml = useCallback((data = formData) => {
    // Convert current form data to YAML/JSON format
    const yamlData = {
      displayName: data.displayName,
      description: data.description || '',
      framework: data.framework,
      model: `projects/${projectId}/locations/${region}/publishers/google/models/${data.modelId}`,
      generationConfig: {
        temperature: data.temperature,
        maxOutputTokens: data.maxOutputTokens
      },
      systemInstruction: {
        parts: [
          {
            text: data.systemInstruction
          }
        ]
      },
      // Add custom code if present
      customCode: data.customCode
    };

    // Add framework-specific configuration
    if (data.framework === 'LANGGRAPH' && data.graphType) {
      yamlData.frameworkConfig = {
        graphType: data.graphType,
        tools: data.tools || [],
        stateDefinition: data.stateDefinition ? JSON.parse(data.stateDefinition) : {}
      };
      
      if (data.dataStoreId) {
        yamlData.frameworkConfig.dataStoreId = data.dataStoreId;
        yamlData.frameworkConfig.dataStoreRegion = data.dataStoreRegion;
      }
    } 
    else if (data.framework === 'CREWAI') {
      yamlData.frameworkConfig = {
        processType: data.processType,
        agents: data.agents || [],
        tasks: data.tasks || []
      };
    }
    
    // Convert to YAML string (using JSON for simplicity)
    try {
      const yamlString = JSON.stringify(yamlData, null, 2);
      setConfigYaml(yamlString);
    } catch (err) {
      setError('Failed to convert configuration to YAML format');
    }
  }, [formData, projectId, region]);

  const parseConfigFromYaml = () => {
    try {
      // Parse YAML (JSON in this case) back to object
      const parsedConfig = JSON.parse(configYaml);
      
      // Extract form data from parsed config
      const newFormData = {
        displayName: parsedConfig.displayName,
        description: parsedConfig.description || '',
        framework: parsedConfig.framework || 'CUSTOM',
        modelId: parsedConfig.model ? parsedConfig.model.split('/').pop() : 'gemini-1.5-pro',
        maxOutputTokens: parsedConfig.generationConfig?.maxOutputTokens || 1024,
        temperature: parsedConfig.generationConfig?.temperature || 0.2,
        systemInstruction: parsedConfig.systemInstruction?.parts?.[0]?.text || '',
        customCode: parsedConfig.customCode || {
          tools: '',
          workflow: '',
          handlers: '',
          templates: ''
        }
      };
      
      // Extract framework-specific configuration
      if (parsedConfig.framework === 'LANGGRAPH' && parsedConfig.frameworkConfig) {
        newFormData.graphType = parsedConfig.frameworkConfig.graphType;
        newFormData.tools = parsedConfig.frameworkConfig.tools;
        newFormData.stateDefinition = JSON.stringify(parsedConfig.frameworkConfig.stateDefinition || {}, null, 2);
        newFormData.dataStoreId = parsedConfig.frameworkConfig.dataStoreId;
        newFormData.dataStoreRegion = parsedConfig.frameworkConfig.dataStoreRegion;
      } 
      else if (parsedConfig.framework === 'CREWAI' && parsedConfig.frameworkConfig) {
        newFormData.processType = parsedConfig.frameworkConfig.processType;
        newFormData.agents = parsedConfig.frameworkConfig.agents;
        newFormData.tasks = parsedConfig.frameworkConfig.tasks;
      }
      
      setFormData(newFormData);
      setError('');
    } catch (err) {
      setError('Failed to parse configuration: ' + err.message);
    }
  };

  // Update YAML when form data changes
  useEffect(() => {
    if (showCodeView) {
      convertFormToYaml();
    }
  }, [formData, showCodeView, projectId, region, convertFormToYaml]);

  const handleSubmit = async () => {
    if (!projectId) {
      setError('Please set your Google Cloud Project ID first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Prepare agent data for API
      let agentData;
      
      if (showCodeView) {
        // When in code view, parse the YAML/JSON directly
        try {
          agentData = JSON.parse(configYaml);
        } catch (err) {
          setError('Invalid JSON format. Please check your configuration.');
          setIsLoading(false);
          return;
        }
      } else {
        // When in form view, construct the data from form fields
        agentData = {
          displayName: formData.displayName,
          description: formData.description || undefined,
          framework: formData.framework, // Add this line          
          tools: [],
          codeInterpreterSettings: {
            mode: 'DISABLED'
          },
          generationConfig: {
            temperature: formData.temperature,
            maxOutputTokens: formData.maxOutputTokens
          },
          systemInstruction: {
            parts: [
              {
                text: formData.systemInstruction
              }
            ]
          },
          // Include custom code if it's been edited
          customCode: formData.customCode
        };

        // Add model based on the selected framework
        if (formData.framework === 'CUSTOM') {
          agentData.model = `projects/${projectId}/locations/${region}/publishers/google/models/${formData.modelId}`;
        }

        // Add framework-specific configuration
        const frameworkConfig = {};
        
        if (formData.framework === 'LANGGRAPH') {
          frameworkConfig.graphType = formData.graphType;
          try {
            frameworkConfig.stateDefinition = formData.stateDefinition ? 
              JSON.parse(formData.stateDefinition) : {};
          } catch (e) {
            setError('Invalid state definition JSON. Please check the format.');
            setIsLoading(false);
            return;
          }
          
          if (formData.tools && formData.tools.length > 0) {
            frameworkConfig.tools = formData.tools;
          }
        }
        
        if (formData.framework === 'CREWAI') {
          frameworkConfig.processType = formData.processType;
          if (formData.agents && formData.agents.length > 0) {
            frameworkConfig.agents = formData.agents;
          }
          if (formData.tasks && formData.tasks.length > 0) {
            frameworkConfig.tasks = formData.tasks;
          }
        }
        
        // Add framework configuration if not empty
        if (Object.keys(frameworkConfig).length > 0) {
          agentData.frameworkConfig = frameworkConfig;
        }
      }

      let result;
      
      if (isEditMode) {
        // Update existing agent
        result = await updateAgent(projectId, region, agentId, agentData);
        
        // Navigate to the agent details page after successful update
        navigate(`/agents/${agentId}`);
      } else {
        // Create new agent
        result = await createLocalAgent(agentData, projectId, region);
        
        // Set a flag in sessionStorage to indicate this is a newly created agent
        // This will be used by the playground to show a welcome message
        sessionStorage.setItem('newlyCreatedAgent', result.id);
        
        // Navigate directly to the playground to test the newly created agent
        navigate(`/playground/${result.id}`);
      }
      
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} agent:`, error);
      setError(error.response?.data?.error?.message || `Failed to ${isEditMode ? 'update' : 'create'} agent. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!projectId) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-lg">
          <h2 className="text-xl font-semibold mb-4">No Google Cloud Project selected</h2>
          <p className="mb-4">Please set your Google Cloud Project ID in the top navigation to get started.</p>
        </div>
      </div>
    );
  }
  
  if (isLoadingAgent) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <LoadingSpinner />
        <p className="ml-3">Loading agent data...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Agent' : 'Create a New Agent'}</h1>
      
      {/* Top navigation options */}
      <div className="mb-6 flex justify-end">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setShowCustomCode(!showCustomCode)}
            className={`px-3 py-1 rounded-md ${showCustomCode ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {showCustomCode ? 'Hide Custom Code' : 'Show Custom Code'}
          </button>
          <button
            type="button"
            onClick={() => setShowCodeView(!showCodeView)}
            className={`px-3 py-1 rounded-md ${showCodeView ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {showCodeView ? 'Form View' : 'Code View'}
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex mb-2">
            <div className="flex-1 border-t-4 border-blue-500 pt-4 pr-4">
              <h2 className="text-lg font-medium text-blue-600">
                {isEditMode ? 'Edit Agent Configuration' : 'Configure Agent'}
              </h2>
            </div>
          </div>
        </div>
        
        <div>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          {showCodeView ? (
            <div className="mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent Configuration (JSON)
                </label>
                <textarea
                  name="configYaml"
                  value={configYaml}
                  onChange={(e) => setConfigYaml(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                  rows={20}
                />
              </div>
              
              <button
                type="button"
                onClick={parseConfigFromYaml}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2"
              >
                Parse Configuration
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={!configYaml.trim() || isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 inline-flex"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <span>{isEditMode ? 'Update Agent' : 'Create Agent'}</span>
                )}
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent Name *
                </label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="My Vertex AI Agent"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="A helpful AI assistant..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Framework
                </label>
                <select
                  name="framework"
                  value={formData.framework}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="CUSTOM">Custom</option>
                  <option value="LANGCHAIN">LangChain</option>
                  <option value="LLAMAINDEX">LlamaIndex</option>
                  <option value="LANGGRAPH">LangGraph</option>
                  <option value="CREWAI">CrewAI</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Select the framework you want to use for this agent
                </p>
              </div>

              {/* Show Custom Code Editor if enabled */}
              {showCustomCode && (
                <div className="mb-6">
                  <CustomCodeEditor 
                    framework={formData.framework}
                    onChange={handleCustomCodeChange}
                    initialCode={formData.customCode}
                  />
                </div>
              )}
              
              {(formData.framework === 'LANGGRAPH' || formData.framework === 'CREWAI') && (
                <FrameworkTemplates 
                  framework={formData.framework} 
                  onSelectTemplate={handleSelectTemplate} 
                />
              )}
              
              {formData.framework === 'LANGGRAPH' && (
                <div className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <h3 className="text-md font-medium mb-2">LangGraph Configuration</h3>
                  
                  {/* Graph Structure */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Graph Type
                    </label>
                    <select
                      name="graphType"
                      value={formData.graphType || 'sequential'}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="sequential">Sequential</option>
                      <option value="conditional">Conditional</option>
                      <option value="branching">Branching</option>
                    </select>
                  </div>
                  
                  {/* Tool Configuration */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tools
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input type="checkbox" id="tool-search" className="h-4 w-4 text-blue-600" name="tools" value="search" 
                               checked={formData.tools?.includes('search') || false}
                               onChange={handleToolsChange} />
                        <label htmlFor="tool-search" className="ml-2 text-sm text-gray-700">Search</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="tool-retrieve" className="h-4 w-4 text-blue-600" name="tools" value="retrieve" 
                               checked={formData.tools?.includes('retrieve') || false}
                               onChange={handleToolsChange} />
                        <label htmlFor="tool-retrieve" className="ml-2 text-sm text-gray-700">Document Retrieval</label>
                      </div>
                    </div>
                  </div>
                  
                  {/* State Definition */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Initial State
                    </label>
                    <textarea
                      name="stateDefinition"
                      value={formData.stateDefinition || ''}
                      onChange={handleChange}
                      placeholder='{"messages": [], "current_node": ""}'
                      className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                      rows={3}
                    />
                  </div>
              
                  {/* Vertex AI Integration */}
                  {formData.tools?.includes('retrieve') && (
                    <div className="mb-4 border-t border-gray-200 pt-4">
                      <h4 className="text-md font-medium mb-2">Vertex AI Search Configuration</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data Store ID
                          </label>
                          <input
                            type="text"
                            name="dataStoreId"
                            value={formData.dataStoreId || ''}
                            onChange={handleChange}
                            placeholder="sample-datastore"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data Store Region
                          </label>
                          <input
                            type="text"
                            name="dataStoreRegion"
                            value={formData.dataStoreRegion || 'us'}
                            onChange={handleChange}
                            placeholder="us"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {formData.framework === 'LANGCHAIN' && (
                <div className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <h3 className="text-md font-medium mb-2">LangChain Configuration</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Memory
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="memory-enabled"
                        checked={formData.memoryEnabled || false}
                        onChange={(e) => setFormData({...formData, memoryEnabled: e.target.checked})}
                        className="h-4 w-4 text-blue-600 border-gray-300"
                      />
                      <label htmlFor="memory-enabled" className="ml-2 text-sm text-gray-700">
                        Enable conversation memory
                      </label>
                    </div>
                  </div>
                  
                  <ToolDefinitionEditor
                    tools={formData.tools || []}
                    onChange={(tools) => setFormData({...formData, tools})}
                  />
                </div>
              )}
              
              {formData.framework === 'CREWAI' && (
                <div className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <h3 className="text-md font-medium mb-2">CrewAI Configuration</h3>
                  
                  {/* Process Configuration */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Process Type
                    </label>
                    <select
                      name="processType"
                      value={formData.processType || 'sequential'}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="sequential">Sequential</option>
                      <option value="hierarchical">Hierarchical</option>
                    </select>
                  </div>
                  
                  {/* Agents Configuration */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                      <span>Agents</span>
                      <button 
                        type="button" 
                        onClick={handleAddAgent}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        + Add Agent
                      </button>
                    </label>
                    
                    {formData.agents?.map((agent, index) => (
                      <div key={index} className="mb-4 p-3 border border-gray-200 rounded-md bg-white">
                        <div className="flex justify-between mb-2">
                          <h5 className="text-sm font-medium">Agent {index + 1}</h5>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveAgent(index)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">
                              Role
                            </label>
                            <input
                              type="text"
                              name={`agents[${index}].role`}
                              value={agent.role || ''}
                              onChange={(e) => handleAgentChange(index, 'role', e.target.value)}
                              placeholder="Senior Engineer"
                              className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">
                              Goal
                            </label>
                            <input
                              type="text"
                              name={`agents[${index}].goal`}
                              value={agent.goal || ''}
                              onChange={(e) => handleAgentChange(index, 'goal', e.target.value)}
                              placeholder="Write high-quality code"
                              className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">
                              Backstory
                            </label>
                            <textarea
                              name={`agents[${index}].backstory`}
                              value={agent.backstory || ''}
                              onChange={(e) => handleAgentChange(index, 'backstory', e.target.value)}
                              placeholder="You are a Senior Engineer with 10 years of experience..."
                              className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Tasks Configuration */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                      <span>Tasks</span>
                      <button 
                        type="button" 
                        onClick={handleAddTask}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        + Add Task
                      </button>
                    </label>
                    
                    {formData.tasks?.map((task, index) => (
                      <div key={index} className="mb-4 p-3 border border-gray-200 rounded-md bg-white">
                        <div className="flex justify-between mb-2">
                          <h5 className="text-sm font-medium">Task {index + 1}</h5>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveTask(index)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">
                              Description
                            </label>
                            <textarea
                              name={`tasks[${index}].description`}
                              value={task.description || ''}
                              onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                              placeholder="Task description with variables like {input_variable}..."
                              className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                              rows={3}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">
                              Expected Output
                            </label>
                            <textarea
                              name={`tasks[${index}].expected_output`}
                              value={task.expected_output || ''}
                              onChange={(e) => handleTaskChange(index, 'expected_output', e.target.value)}
                              placeholder="Describe the expected format of output..."
                              className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">
                              Assigned Agent
                            </label>
                            <select
                              name={`tasks[${index}].assigned_agent_index`}
                              value={task.assigned_agent_index || 0}
                              onChange={(e) => handleTaskChange(index, 'assigned_agent_index', parseInt(e.target.value))}
                              className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                            >
                              {formData.agents?.map((agent, agentIndex) => (
                                <option key={agentIndex} value={agentIndex}>
                                  {agent.role || `Agent ${agentIndex + 1}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <select
                  name="modelId"
                  value={formData.modelId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="claude-3-haiku">Claude 3 Haiku</option>
                  <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Instruction
                </label>
                <textarea
                  name="systemInstruction"
                  value={formData.systemInstruction}
                  onChange={handleChange}
                  placeholder="You are a helpful AI assistant..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Output Tokens
                  </label>
                  <input
                    type="number"
                    name="maxOutputTokens"
                    value={formData.maxOutputTokens}
                    onChange={handleChange}
                    min="1"
                    max="8192"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature
                  </label>
                  <input
                    type="number"
                    name="temperature"
                    value={formData.temperature}
                    onChange={handleChange}
                    min="0"
                    max="1"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}  
                  disabled={!formData.displayName || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
                    </>
                  ) : (
                    <span>{isEditMode ? 'Update Agent' : 'Create Agent'}</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateAgent;
