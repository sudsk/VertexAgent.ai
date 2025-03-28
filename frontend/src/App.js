import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import AgentsList from './pages/AgentsList';
import AgentDetails from './pages/AgentDetails';
import CreateAgent from './pages/CreateAgent';
import Playground from './pages/Playground';

function App() {
  const [projectId, setProjectId] = useState(localStorage.getItem('projectId') || '');
  const [region, setRegion] = useState(localStorage.getItem('region') || 'us-central1');

  const updateProjectSettings = (newProjectId, newRegion) => {
    setProjectId(newProjectId);
    setRegion(newRegion);
    localStorage.setItem('projectId', newProjectId);
    localStorage.setItem('region', newRegion);
  };

  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            projectId={projectId} 
            region={region} 
            updateProjectSettings={updateProjectSettings} 
          />
          <main className="flex-1 overflow-auto bg-gray-50 p-4">
            <Routes>
              <Route path="/" element={<Dashboard projectId={projectId} region={region} />} />
              <Route path="/agents" element={<AgentsList projectId={projectId} region={region} />} />
              <Route path="/agents/:agentId" element={<AgentDetails projectId={projectId} region={region} />} />
              <Route path="/create-agent" element={<CreateAgent projectId={projectId} region={region} />} />
              <Route path="/playground" element={<Playground projectId={projectId} region={region} />} />
              <Route path="/playground/:agentId" element={<Playground projectId={projectId} region={region} />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
