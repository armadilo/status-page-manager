import { config } from 'dotenv';

// Load environment variables
config();

// Configuration object with environment variables
export const CONFIG = {
  API_KEY: process.env.STATUSPAGE_API_KEY || '',
  PAGE_ID: process.env.STATUSPAGE_PAGE_ID || '',
  DEFAULT_COMPONENTS: process.env.STATUSPAGE_DEFAULT_COMPONENTS?.split(',') || []
};

// Validate essential environment variables and log their status
export function validateConfig(): boolean {
  const requiredEnv = ['STATUSPAGE_PAGE_ID', 'STATUSPAGE_API_KEY'];
  let valid = true;
  
  for (const envVar of requiredEnv) {
    if (!process.env[envVar]) {
      console.error(`Error: Missing required environment variable: ${envVar}`);
      valid = false;
    }
  }
  
  // Log configuration details (with API key partially hidden)
  console.error('Environment variables:');
  console.error('STATUSPAGE_PAGE_ID:', CONFIG.PAGE_ID);
  if (CONFIG.API_KEY) {
    console.error('STATUSPAGE_API_KEY:', `${CONFIG.API_KEY.substring(0, 4)}...${CONFIG.API_KEY.slice(-4)}`);
  } else {
    console.error('STATUSPAGE_API_KEY: undefined');
  }
  console.error('STATUSPAGE_DEFAULT_COMPONENTS:', CONFIG.DEFAULT_COMPONENTS.join(', ') || 'undefined');
  
  return valid;
} 