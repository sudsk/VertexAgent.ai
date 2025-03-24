// src/components/Header.jsx
import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import ProjectSelector from './ProjectSelector';

const Header = ({ projectId, region, updateProjectSettings }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 flex justify-between items-center">
      <div className="flex items-center">
        <h2 className="text-lg font-semibold text-gray-800 hidden md:block">VertexAgent.ai</h2>
        <button 
          className="md:hidden text-gray-500 hover:text-gray-700"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      <div className="flex items-center">
        <ProjectSelector 
          projectId={projectId}
          region={region}
          updateProjectSettings={updateProjectSettings}
        />
      </div>
    </header>
  );
};

export default Header;
