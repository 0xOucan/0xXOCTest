import axios from 'axios';
import { withRelatedProject } from '@vercel/related-projects';

// Get the API URL using Vercel's Related Projects feature
// Falls back to environment variable if not in a Vercel environment
const apiUrl = withRelatedProject({
  projectName: 'YOUR_BACKEND_PROJECT_NAME', // Update this with your backend project name from Vercel
  defaultHost: import.meta.env.VITE_API_URL || ''
});

// Create axios instance with the base URL
export const api = axios.create({
  baseURL: apiUrl,
  // Add additional config like timeout, headers, etc.
  timeout: 15000,
});

// Helper function to construct API paths
export const getApiUrl = (path: string): string => {
  // For separated deployment, we directly use the backend URL
  // without worrying about /api prefix duplication
  if (path.startsWith('/')) {
    return `${apiUrl}${path}`;
  }
  return `${apiUrl}/${path}`;
};