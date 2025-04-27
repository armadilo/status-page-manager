import { config } from 'dotenv';

// Load environment variables
config();

interface StatusPageConfig {
  API_KEY: string;
  PAGE_ID: string;
  DEFAULT_COMPONENTS: string[];
}

// Configuration object with environment variables
export const CONFIG: StatusPageConfig = {
  API_KEY: process.env.STATUSPAGE_API_KEY || '',
  PAGE_ID: process.env.STATUSPAGE_PAGE_ID || '',
  DEFAULT_COMPONENTS: process.env.STATUSPAGE_DEFAULT_COMPONENTS?.split(',') || []
};

// Function to update config with values from MCP request headers
export function updateConfigFromHeaders(headers: Record<string, string | string[] | undefined>): void {
  if (headers['x-statuspage-api-key']) {
    CONFIG.API_KEY = headers['x-statuspage-api-key'] as string;
  }
  
  if (headers['x-statuspage-page-id']) {
    CONFIG.PAGE_ID = headers['x-statuspage-page-id'] as string;
  }
  
  if (headers['x-statuspage-default-components']) {
    const componentsHeader = headers['x-statuspage-default-components'];
    CONFIG.DEFAULT_COMPONENTS = typeof componentsHeader === 'string' 
      ? componentsHeader.split(',') 
      : Array.isArray(componentsHeader) ? componentsHeader : [];
  }
  
  console.log('Configuration updated from headers');
}

// Validate essential environment variables and log their status
export function validateConfig(): boolean {
  let valid = true;
  
  // Check if we have the required configuration from either env vars or headers
  if (!CONFIG.API_KEY) {
    console.error('Error: Missing required configuration: API_KEY');
    valid = false;
  }
  
  if (!CONFIG.PAGE_ID) {
    console.error('Error: Missing required configuration: PAGE_ID');
    valid = false;
  }
  
  // Log configuration details (with API key partially hidden)
  console.error('Current configuration:');
  console.error('STATUSPAGE_PAGE_ID:', CONFIG.PAGE_ID || 'Not set');
  if (CONFIG.API_KEY) {
    console.error('STATUSPAGE_API_KEY:', `${CONFIG.API_KEY.substring(0, 4)}...${CONFIG.API_KEY.slice(-4)}`);
  } else {
    console.error('STATUSPAGE_API_KEY: Not set');
  }
  console.error('STATUSPAGE_DEFAULT_COMPONENTS:', CONFIG.DEFAULT_COMPONENTS.join(', ') || 'Not set');
  
  return valid;
} 