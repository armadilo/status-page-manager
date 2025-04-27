import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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

// Create server instance
const server = new McpServer({
    name: "status-page",
    version: "1.0.0",
});

// --- MCP Tool Definition ---

server.tool(
    "create-incident",
    "Create a new status page incident",
    {
        name: z.string(),
        status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']),
        impact: z.enum(['critical', 'major', 'minor', 'maintenance']),
        message: z.string(),
        notify: z.boolean().default(true),
        components: z.array(
            z.object({
                id: z.string().describe("Component ID"),
                status: z.enum([
                    'operational', 
                    'degraded_performance', 
                    'partial_outage', 
                    'major_outage', 
                    'under_maintenance'
                ]).describe("Component status")
            })
        ).optional().describe("Component statuses to update")
    },
    async (params) => {
        console.error("Received create-incident tool call with params:", params);
        
        // If components parameter is present but empty or undefined, fetch and return the list of components for selection
        if (params.components === undefined) {
            try {
                const components = await listStatusPageComponents();
                
                // Create a simplified version of the components list for easy selection
                const simplifiedComponents = components.map(c => ({
                    id: c.id,
                    name: c.name,
                    current_status: c.status
                }));
                
                // Return a response that indicates components need to be selected
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            needs_component_selection: true,
                            message: "Please select components and their status for this incident.",
                            available_components: simplifiedComponents,
                            available_statuses: [
                                'operational',
                                'degraded_performance',
                                'partial_outage',
                                'major_outage',
                                'under_maintenance'
                            ]
                        })
                    }]
                };
            } catch (error) {
                console.error("Error listing components:", error);
                // Continue with incident creation without components
            }
        }
        
        try {
            const incident = await createStatusPageIncident(params);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        incidentId: incident.id,
                        url: incident.shortlink
                    })
                }]
            };
        } catch (error) {
            console.error('Error processing create-incident tool call:', error);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    })
                }],
                isError: true
            };
        }
    }
);

// MCP Tool for updating incidents
server.tool(
    "update-incident",
    "Update an existing status page incident",
    {
        incidentId: z.string().describe("ID of the incident to update"),
        status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']).optional().describe("New status for the incident"),
        impact: z.enum(['critical', 'major', 'minor', 'maintenance']).optional().describe("New impact level for the incident"),
        message: z.string().optional().describe("New message/description for the incident"),
        name: z.string().optional().describe("New name/title for the incident"),
        components: z.array(
            z.object({
                id: z.string().describe("Component ID"),
                status: z.enum([
                    'operational', 
                    'degraded_performance', 
                    'partial_outage', 
                    'major_outage', 
                    'under_maintenance'
                ]).describe("Component status")
            })
        ).optional().describe("Component statuses to update")
    },
    async (params) => {
        console.error("Received update-incident tool call with params:", params);
        
        // Special handling for when only incidentId is specified - display component selection
        if (params.incidentId && !params.status && !params.impact && !params.message && !params.name && 
            params.components === undefined) {
            try {
                // Get the current incident details
                const incident = await getStatusPageIncident(params.incidentId);
                console.error(`Retrieved incident to update: ${incident.id} - ${incident.name}`);
                
                // Also get available components
                const components = await listStatusPageComponents();
                
                // Create a simplified version of the components list for easy selection
                const simplifiedComponents = components.map(c => ({
                    id: c.id,
                    name: c.name,
                    current_status: c.status
                }));
                
                // Return a response that indicates components need to be selected
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            needs_component_selection: true,
                            incident_details: {
                                id: incident.id,
                                name: incident.name,
                                status: incident.status,
                                impact: incident.impact
                            },
                            message: "Please select what you want to update for this incident. Available components:",
                            available_components: simplifiedComponents,
                            available_statuses: [
                                'operational',
                                'degraded_performance',
                                'partial_outage',
                                'major_outage',
                                'under_maintenance'
                            ]
                        })
                    }]
                };
            } catch (error) {
                console.error("Error retrieving incident details or components:", error);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        })
                    }],
                    isError: true
                };
            }
        }
        
        try {
            // Ensure at least one update parameter is provided
            if (!params.status && !params.impact && !params.message && !params.name && 
                (!params.components || params.components.length === 0)) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: "At least one of status, impact, message, name, or components must be provided for an update"
                        })
                    }],
                    isError: true
                };
            }
            
            const incident = await updateStatusPageIncident(params);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        incidentId: incident.id,
                        url: incident.shortlink,
                        status: incident.status,
                        impact: incident.impact
                    })
                }]
            };
        } catch (error) {
            console.error('Error processing update-incident tool call:', error);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    })
                }],
                isError: true
            };
        }
    }
);

// MCP Tool for getting incident details
server.tool(
    "get-incident",
    "Get details of an existing status page incident",
    {
        incidentId: z.string().describe("ID of the incident to retrieve")
    },
    async (params) => {
        console.error("Received get-incident tool call with params:", params);
        try {
            const incident = await getStatusPageIncident(params.incidentId);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        incident: {
                            id: incident.id,
                            name: incident.name,
                            status: incident.status,
                            impact: incident.impact,
                            created_at: incident.created_at,
                            updated_at: incident.updated_at,
                            shortlink: incident.shortlink
                        }
                    })
                }]
            };
        } catch (error) {
            console.error('Error processing get-incident tool call:', error);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    })
                }],
                isError: true
            };
        }
    }
);

// MCP Tool for listing incidents
server.tool(
    "list-incidents",
    "List status page incidents with optional filtering",
    {
        status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']).optional().describe("Filter incidents by status"),
        limit: z.number().min(1).max(100).optional().describe("Maximum number of incidents to return (default: 20)")
    },
    async (params) => {
        console.error("Received list-incidents tool call with params:", params);
        try {
            const incidents = await listStatusPageIncidents(params);
            
            // Simplify the incident objects for cleaner output
            const simplifiedIncidents = incidents.map(incident => ({
                id: incident.id,
                name: incident.name,
                status: incident.status,
                impact: incident.impact,
                created_at: incident.created_at,
                updated_at: incident.updated_at,
                shortlink: incident.shortlink
            }));
            
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        count: incidents.length,
                        incidents: simplifiedIncidents
                    })
                }]
            };
        } catch (error) {
            console.error('Error processing list-incidents tool call:', error);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    })
                }],
                isError: true
            };
        }
    }
);

// MCP Tool for listing components
server.tool(
    "list-components",
    "List available StatusPage components",
    {
        random_string: z.string().optional().describe("Dummy parameter for no-parameter tools")
    },
    async () => {
        console.error("Received list-components tool call");
        try {
            const components = await listStatusPageComponents();
            
            // Simplify the component objects for cleaner output
            const simplifiedComponents = components.map(component => ({
                id: component.id,
                name: component.name,
                status: component.status,
                description: component.description
            }));
            
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        count: components.length,
                        components: simplifiedComponents
                    })
                }]
            };
        } catch (error) {
            console.error('Error processing list-components tool call:', error);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    })
                }],
                isError: true
            };
        }
    }
);

// Start the server
async function main() {
    console.error("Starting Status Page MCP Server...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Status Page MCP Server running on stdio");
}

// Only run main() if this file is executed directly, not when imported
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error("Fatal error in main():", error);
        process.exit(1);
    });
}

// Export the server for use in other files
export { server };