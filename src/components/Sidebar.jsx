// src/components/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Cpu, PlayCircle, LayoutDashboard, PlusCircle, Github, FileText } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100';
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 hidden md:block">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Cpu className="h-6 w-6 mr-2 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-800">VertexAgent.ai</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">Agent Engine Dashboard</p>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          <li>
            <Link 
              to="/" 
              className={`flex items-center py-2 px-4 rounded-md ${isActive('/')}`}
            >
              <LayoutDashboard className="h-5 w-5 mr-3" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link 
              to="/agents" 
              className={`flex items-center py-2 px-4 rounded-md ${isActive('/agents')}`}
            >
              <Cpu className="h-5 w-5 mr-3" />
              <span>Agents</span>
            </Link>
          </li>
          <li>
            <Link 
              to="/create-agent" 
              className={`flex items-center py-2 px-4 rounded-md ${isActive('/create-agent')}`}
            >
              <PlusCircle className="h-5 w-5 mr-3" />
              <span>Create Agent</span>
            </Link>
          </li>
          <li>
            <Link 
              to="/playground" 
              className={`flex items-center py-2 px-4 rounded-md ${isActive('/playground')}`}
            >
              <PlayCircle className="h-5 w-5 mr-3" />
              <span>Playground</span>
            </Link>
          </li>
        </ul>
        
        <div className="border-t border-gray-200 my-4 pt-4">
          <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Resources</h3>
          <ul className="space-y-2">
            <li>
              <a 
                href="https://cloud.google.com/vertex-ai/docs/agent-engine/overview" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center py-2 px-4 rounded-md text-gray-700 hover:bg-gray-100"
              >
                <FileText className="h-5 w-5 mr-3" />
                <span>Documentation</span>
              </a>
            </li>
            <li>
              <a 
                href="https://github.com/yourusername/vertexagent-ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center py-2 px-4 rounded-md text-gray-700 hover:bg-gray-100"
              >
                <Github className="h-5 w-5 mr-3" />
                <span>GitHub</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
