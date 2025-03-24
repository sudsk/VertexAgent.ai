// Add a new component src/components/FrameworkResources.jsx

import React from 'react';
import { ExternalLink } from 'lucide-react';

const FrameworkResources = ({ framework }) => {
  const resources = {
    LANGGRAPH: [
      {
        title: "LangGraph Documentation",
        url: "https://langchain-ai.github.io/langgraph/",
        description: "Official documentation for LangGraph"
      },
      {
        title: "LangGraph Quickstart",
        url: "https://langchain-ai.github.io/langgraph/tutorials/quickstart/",
        description: "Get started with LangGraph quickly"
      }
    ],
    CREWAI: [
      {
        title: "CrewAI Documentation",
        url: "https://docs.crewai.com/",
        description: "Official documentation for CrewAI"
      },
      {
        title: "CrewAI GitHub",
        url: "https://github.com/joaomdmoura/crewAI",
        description: "CrewAI source code and examples"
      }
    ]
  };
  
  const frameworkLinks = resources[framework];
  
  if (!frameworkLinks) {
    return null;
  }
  
  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Resources</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {frameworkLinks.map((link, index) => (
          <a 
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 flex items-start"
          >
            <ExternalLink className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <div className="font-medium text-sm">{link.title}</div>
              <div className="text-xs text-gray-500">{link.description}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default FrameworkResources;
