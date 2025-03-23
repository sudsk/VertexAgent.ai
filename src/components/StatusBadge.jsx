// src/components/StatusBadge.jsx
import React from 'react';

const StatusBadge = ({ status }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'CREATING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getDotColor = (status) => {
    switch(status) {
      case 'ACTIVE':
        return 'bg-green-400';
      case 'CREATING':
        return 'bg-yellow-400';
      case 'FAILED':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      <span className={`h-2 w-2 rounded-full ${getDotColor(status)} mr-1`}></span>
      {status || 'Unknown'}
    </span>
  );
};

export default StatusBadge;
