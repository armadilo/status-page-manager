import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createIncident, updateIncident, listIncidents, getIncident, listComponents } from './services/statuspage.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from 'zod';
import { config } from 'dotenv';
import fetch from 'node-fetch';

// --- Configuration & Initialization ---

// Load environment variables
config();

// --- Helper Functions ---

interface StatusPageIncident {
  id: string;
  name: string;
  status: string;
  impact: string;
  shortlink: string;
  created_at: string;
  updated_at: string;
  components?: { id: string; name: string; status: string }[];
}

// Add interface for StatusPage Components
interface StatusPageComponent {
  id: string;
  name: string;
  status: string;
  description?: string;
  position?: number;
}

async function createStatusPageIncident(params: {
  name: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  impact: 'critical' | 'major' | 'minor' | 'maintenance';
  message: string;
  notify: boolean;
  components?: Array<{id: string, status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance'}>
}): Promise<StatusPageIncident> {
    const apiUrl = `https://api.statuspage.io/v1/pages/${process.env.STATUSPAGE_PAGE_ID}/incidents`;
    console.error(`Creating StatusPage incident: ${params.name}`);
    console.error(`Using page ID: ${process.env.STATUSPAGE_PAGE_ID}`);
    
    try {
        // Log full request details for debugging
        const requestBody: any = {
            incident: {
                name: params.name,
                status: params.status,
                impact: params.impact,
                message: params.message,
                notify: params.notify
            }
        };
        
        // Add components if provided
        if (params.components && params.components.length > 0) {
            requestBody.incident.components = {};
            params.components.forEach(comp => {
                requestBody.incident.components[comp.id] = comp.status;
            });
            console.error(`Updating component statuses: ${JSON.stringify(params.components)}`);
        }
        
        console.error("Request Body:", JSON.stringify(requestBody, null, 2));
        console.error("API Key:", process.env.STATUSPAGE_API_KEY?.substring(0, 4) + "..." + process.env.STATUSPAGE_API_KEY?.slice(-4));
        
        // Exactly matching the Postman request as seen in the screenshots
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `OAuth ${process.env.STATUSPAGE_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': '*/*',
                'Postman-Token': Date.now().toString(),
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            },
            body: JSON.stringify(requestBody)
        });

        // Log response details
        console.error(`Response status: ${response.status}`);
        console.error(`Response headers: ${JSON.stringify(Object.fromEntries([...response.headers.entries()]))}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Response body: ${errorText}`);
            
            
            throw new Error(`Failed to create incident: ${errorText}`);
        }

        const responseText = await response.text();
        console.error(`Response body: ${responseText}`);
        const incidentData = JSON.parse(responseText) as StatusPageIncident;
        
        console.error(`Successfully created StatusPage incident: ${incidentData.id}`);
        return incidentData;
    } catch (error) {
        console.error("Error creating incident:", error);
        throw error;
    }
}

// Add new function to update existing incidents
async function updateStatusPageIncident(params: {
  incidentId: string;
  status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  impact?: 'critical' | 'major' | 'minor' | 'maintenance';
  message?: string;
  name?: string;
  components?: Array<{id: string, status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance'}>
}): Promise<StatusPageIncident> {
    const apiUrl = `https://api.statuspage.io/v1/pages/${process.env.STATUSPAGE_PAGE_ID}/incidents/${params.incidentId}`;
    console.error(`Updating StatusPage incident: ${params.incidentId}`);
    console.error(`Using page ID: ${process.env.STATUSPAGE_PAGE_ID}`);
    
    try {
        // Prepare update object with only provided fields
        const updateData: any = {};
        if (params.status) updateData.status = params.status;
        if (params.impact) updateData.impact_override = params.impact;
        if (params.message) updateData.body = params.message;
        if (params.name) updateData.name = params.name;
        
        // Add components if provided
        if (params.components && params.components.length > 0) {
            updateData.components = {};
            params.components.forEach(comp => {
                updateData.components[comp.id] = comp.status;
            });
            console.error(`Updating component statuses: ${JSON.stringify(params.components)}`);
        }
        
        // Log update details
        console.error("Update data:", JSON.stringify(updateData, null, 2));
        console.error("API Key:", process.env.STATUSPAGE_API_KEY?.substring(0, 4) + "..." + process.env.STATUSPAGE_API_KEY?.slice(-4));
        
        const response = await fetch(apiUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `OAuth ${process.env.STATUSPAGE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                incident: updateData
            })
        });

        // Log response details
        console.error(`Response status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Response body: ${errorText}`);
            throw new Error(`Failed to update incident: ${errorText}`);
        }

        const responseText = await response.text();
        console.error(`Response body: ${responseText}`);
        const incidentData = JSON.parse(responseText) as StatusPageIncident;
        
        console.error(`Successfully updated StatusPage incident: ${incidentData.id}`);
        return incidentData;
    } catch (error) {
        console.error("Error updating incident:", error);
        throw error;
    }
}

// Add function to get incident details
async function getStatusPageIncident(incidentId: string): Promise<StatusPageIncident> {
    const apiUrl = `https://api.statuspage.io/v1/pages/${process.env.STATUSPAGE_PAGE_ID}/incidents/${incidentId}`;
    console.error(`Getting StatusPage incident: ${incidentId}`);
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `OAuth ${process.env.STATUSPAGE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.error(`Response status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Response body: ${errorText}`);
            throw new Error(`Failed to get incident: ${errorText}`);
        }

        const responseText = await response.text();
        const incidentData = JSON.parse(responseText) as StatusPageIncident;
        
        console.error(`Successfully retrieved StatusPage incident: ${incidentData.id}`);
        return incidentData;
    } catch (error) {
        console.error("Error getting incident:", error);
        throw error;
    }
}

// Add function to list incidents
async function listStatusPageIncidents(params?: {
    status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
    limit?: number;
}): Promise<StatusPageIncident[]> {
    let apiUrl = `https://api.statuspage.io/v1/pages/${process.env.STATUSPAGE_PAGE_ID}/incidents`;
    
    // Add query parameters if provided
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    if (queryParams.toString()) {
        apiUrl += `?${queryParams.toString()}`;
    }
    
    console.error(`Listing StatusPage incidents with URL: ${apiUrl}`);
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `OAuth ${process.env.STATUSPAGE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.error(`Response status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Response body: ${errorText}`);
            throw new Error(`Failed to list incidents: ${errorText}`);
        }

        const responseText = await response.text();
        const incidents = JSON.parse(responseText) as StatusPageIncident[];
        
        console.error(`Successfully retrieved ${incidents.length} StatusPage incidents`);
        return incidents;
    } catch (error) {
        console.error("Error listing incidents:", error);
        throw error;
    }
}

// Add function to list available components
async function listStatusPageComponents(): Promise<StatusPageComponent[]> {
    const apiUrl = `https://api.statuspage.io/v1/pages/${process.env.STATUSPAGE_PAGE_ID}/components`;
    console.error(`Listing StatusPage components from page: ${process.env.STATUSPAGE_PAGE_ID}`);
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `OAuth ${process.env.STATUSPAGE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.error(`Response status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Response body: ${errorText}`);
            throw new Error(`Failed to list components: ${errorText}`);
        }

        const responseText = await response.text();
        const components = JSON.parse(responseText) as StatusPageComponent[];
        
        console.error(`Successfully retrieved ${components.length} StatusPage components`);
        return components;
    } catch (error) {
        console.error("Error listing components:", error);
        throw error;
    }
}

// Create the MCP server
export const server = new McpServer({
  name: "status-page-manager",
  version: "1.0.0"
});

// Register tools using the tool method
server.tool(
  "create-incident",
  "Create a new status page incident",
  {
    name: z.string().describe("The name of the incident"),
    status: z.string().describe("The status of the incident (investigating, identified, monitoring, resolved)"),
    impact: z.string().describe("The impact of the incident (none, minor, major, critical)"),
    message: z.string().describe("The incident message"),
    components: z.array(
      z.object({
        id: z.string().describe("Component ID"),
        status: z.string().describe("Component status")
      })
    ).optional().describe("Components affected by the incident"),
    notify: z.boolean().optional().describe("Whether to send notifications")
  },
  async (params: any) => {
    console.log("Creating incident with params:", params);
    try {
      const incident = await createIncident(params);
      return {
        content: [
          {
            type: "text",
            text: `Created incident: ${incident.name} with ID: ${incident.id}`
          }
        ]
      };
    } catch (error: any) {
      console.error("Error creating incident:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to create incident: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "update-incident",
  "Update an existing status page incident",
  {
    id: z.string().describe("The ID of the incident to update"),
    name: z.string().optional().describe("The updated name of the incident"),
    status: z.string().optional().describe("The updated status of the incident"),
    impact: z.string().optional().describe("The updated impact of the incident"),
    message: z.string().optional().describe("The update message"),
    components: z.array(
      z.object({
        id: z.string().describe("Component ID"),
        status: z.string().describe("Component status")
      })
    ).optional().describe("Components affected by the incident"),
    notify: z.boolean().optional().describe("Whether to send notifications")
  },
  async (params: any) => {
    console.log("Updating incident with params:", params);
    try {
      const incident = await updateIncident(params.id, params);
      return {
        content: [
          {
            type: "text",
            text: `Updated incident: ${incident.name}`
          }
        ]
      };
    } catch (error: any) {
      console.error("Error updating incident:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to update incident: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "get-incident",
  "Get details of an existing status page incident",
  {
    id: z.string().describe("The ID of the incident to retrieve")
  },
  async (params: any) => {
    console.log("Getting incident with params:", params);
    try {
      const incident = await getIncident(params.id);
      return {
        content: [
          {
            type: "text",
            text: `Incident ${incident.name}: ${incident.status} (${incident.impact})`
          }
        ]
      };
    } catch (error: any) {
      console.error("Error getting incident:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to get incident: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "list-incidents",
  "List status page incidents with optional filtering",
  {
    status: z.string().optional().describe("Filter by status"),
    limit: z.number().optional().describe("Maximum number of incidents to return")
  },
  async (params: any) => {
    console.log("Listing incidents with params:", params);
    try {
      const incidents = await listIncidents(params);
      if (incidents.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No incidents found."
            }
          ]
        };
      }
      
      return {
        content: [
          {
            type: "text",
            text: incidents.map(inc => 
              `- ${inc.name}: ${inc.status} (${inc.impact}) [ID: ${inc.id}]`
            ).join("\n")
          }
        ]
      };
    } catch (error: any) {
      console.error("Error listing incidents:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to list incidents: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "list-components",
  "List available StatusPage components",
  {
    dummy: z.string().optional().describe("Dummy parameter (not used)")
  },
  async () => {
    console.log("Listing components");
    try {
      const components = await listComponents();
      if (components.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No components found."
            }
          ]
        };
      }
      
      return {
        content: [
          {
            type: "text",
            text: components.map(comp => 
              `- ${comp.name}: ${comp.status} [ID: ${comp.id}]`
            ).join("\n")
          }
        ]
      };
    } catch (error: any) {
      console.error("Error listing components:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to list components: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);

console.log("Tools registered:", Object.keys((server as any)._registeredTools || {}));

// Start the server
async function start() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Export for use in other modules
export { start };