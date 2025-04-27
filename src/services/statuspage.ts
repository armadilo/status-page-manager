import axios from 'axios';
import { CONFIG } from '../utils/config.js';
import { StatusPageIncident as Incident, StatusPageComponent as Component, UpdateIncidentParams as IncidentUpdate } from '../types/index.js';

const BASE_URL = `https://api.statuspage.io/v1/pages/${CONFIG.PAGE_ID}`;
const API_KEY = CONFIG.API_KEY;

// Standard API request options
const apiOptions = {
  headers: {
    'Authorization': `OAuth ${API_KEY}`,
    'Content-Type': 'application/json'
  }
};

/**
 * Create a new incident on StatusPage
 */
export async function createIncident(incidentData: {
  name: string;
  status: string;
  impact: string;
  message: string;
  components?: { id: string; status: string }[];
  notify?: boolean;
}): Promise<Incident> {
  const url = `${BASE_URL}/incidents`;
  console.log(`Creating incident at ${url}`, incidentData);

  const response = await axios.post(url, {
    incident: {
      name: incidentData.name,
      status: incidentData.status,
      impact: incidentData.impact,
      body: incidentData.message,
      components: incidentData.components ? Object.fromEntries(
        incidentData.components.map(c => [c.id, c.status])
      ) : undefined,
      deliver_notifications: incidentData.notify === false ? false : true,
    }
  }, apiOptions);

  return response.data;
}

/**
 * Update an existing incident on StatusPage
 */
export async function updateIncident(
  incidentId: string,
  updateData: {
    name?: string;
    status?: string;
    impact?: string;
    message?: string;
    components?: { id: string; status: string }[];
    notify?: boolean;
  }
): Promise<Incident> {
  const url = `${BASE_URL}/incidents/${incidentId}`;
  console.log(`Updating incident at ${url}`, updateData);

  const response = await axios.patch(url, {
    incident: {
      name: updateData.name,
      status: updateData.status,
      impact: updateData.impact,
      body: updateData.message,
      components: updateData.components ? Object.fromEntries(
        updateData.components.map(c => [c.id, c.status])
      ) : undefined,
      deliver_notifications: updateData.notify === false ? false : true,
    }
  }, apiOptions);

  return response.data;
}

/**
 * Get details for a specific incident
 */
export async function getIncident(incidentId: string): Promise<Incident> {
  const url = `${BASE_URL}/incidents/${incidentId}`;
  console.log(`Fetching incident from ${url}`);

  const response = await axios.get(url, apiOptions);
  return response.data;
}

/**
 * List incidents with optional status filter
 */
export async function listIncidents(params: {
  status?: string;
  limit?: number;
} = {}): Promise<Incident[]> {
  const url = `${BASE_URL}/incidents`;
  console.log(`Listing incidents from ${url}`, params);
  
  const response = await axios.get(url, {
    ...apiOptions,
    params: {
      status: params.status,
      limit: params.limit || 20
    }
  });
  
  return response.data;
}

/**
 * List all components for the StatusPage
 */
export async function listComponents(): Promise<Component[]> {
  const url = `${BASE_URL}/components`;
  console.log(`Fetching components from ${url}`);
  
  const response = await axios.get(url, apiOptions);
  return response.data;
} 