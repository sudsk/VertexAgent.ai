// Add a new component src/components/FrameworkTemplates.jsx

import React from 'react';

const templates = {
  LANGGRAPH: {
    simple: {
      name: "Simple Sequential Graph",
      description: "A basic sequential graph with three nodes - input processing, reasoning, and response generation",
      systemInstruction: "You are an assistant that follows a structured thinking process. First, you'll understand the request, then reason about it, then generate a response.",
      graphType: "sequential",
      stateDefinition: JSON.stringify({
        "messages": [],
        "current_node": "process_input"
      }),
    },
    advanced: {
      name: "Advanced Branching Graph",
      description: "A graph that branches based on query type - factual, creative, or analytical",
      systemInstruction: "You are an assistant that can handle different types of requests by routing them through specialized processing paths.",
      graphType: "branching",
      stateDefinition: JSON.stringify({
        "messages": [],
        "current_node": "classify_query",
        "query_type": "unknown"
      }),
    }
  },
  CREWAI: {
    research: {
      name: "Research Team",
      description: "A team of agents specialized in research tasks: a researcher, a fact-checker, and a summarizer",
      systemInstruction: "You are the coordinator for a research team consisting of multiple specialized agents.",
      crewAgentCount: 3,
      coordinationStrategy: "hierarchical"
    },
    customerService: {
      name: "Customer Service Team",
      description: "A team handling customer queries with first-line support and escalation specialists",
      systemInstruction: "You are coordinating a customer service team that handles incoming requests and escalates when necessary.",
      crewAgentCount: 2,
      coordinationStrategy: "sequential"
    }
  }
};

const FrameworkTemplates = ({ framework, onSelectTemplate }) => {
  if (!templates[framework]) {
    return null;
  }
  
  return (
    <div className="mb-6">
      <h3 className="text-md font-medium mb-2">Templates</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(templates[framework]).map(([key, template]) => (
          <div 
            key={key}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer"
            onClick={() => onSelectTemplate(template)}
          >
            <h4 className="font-medium">{template.name}</h4>
            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FrameworkTemplates;
