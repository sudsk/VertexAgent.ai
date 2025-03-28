// src/components/Tabs.jsx

import React from 'react';

export const Tabs = ({ children, activeTab, onChange }) => {
  const tabs = React.Children.toArray(children);
  
  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.props.id}
              onClick={() => onChange(tab.props.id)}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === tab.props.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.props.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="mt-4">
        {tabs.find(tab => tab.props.id === activeTab)}
      </div>
    </div>
  );
};

export const Tab = ({ children, id, label }) => {
  return (
    <div role="tabpanel" id={`tabpanel-${id}`}>
      {children}
    </div>
  );
};
