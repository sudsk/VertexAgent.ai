// src/services/fileService.js
import axios from 'axios';

// API base URL (matches your other services)
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Upload files to the server
 * @param {FileList|Array} files - Array of File objects
 * @param {string} sessionId - Optional session ID to group files
 * @returns {Promise<Object>} - Upload result with session ID and file info
 */
export const uploadFiles = async (files, sessionId = null) => {
  try {
    const formData = new FormData();
    
    // Add each file to the formData
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    
    // Add session ID if provided
    if (sessionId) {
      formData.append('session_id', sessionId);
    }
    
    const response = await axios.post(`${API_URL}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading files:', error);
    throw error;
  }
};

/**
 * Get list of files for a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - Session info with files
 */
export const getSessionFiles = async (sessionId) => {
  try {
    const response = await axios.get(`${API_URL}/files/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting session files:', error);
    throw error;
  }
};

/**
 * Delete all files for a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - Deletion result
 */
export const deleteSessionFiles = async (sessionId) => {
  try {
    const response = await axios.delete(`${API_URL}/files/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting session files:', error);
    throw error;
  }
};
