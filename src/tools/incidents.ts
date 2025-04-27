import { z } from 'zod';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as statuspage from '../services/statuspage.js';
import { ComponentStatus, IncidentStatus, IncidentImpact } from '../types/index.js';

/**
 * Register all incident-related tools with the MCP server
 */
export function registerIncidentTools(server: McpServer): void {
  // Tool for creating a new incident
  server.tool(
    "create-incident",
    "Create a new status page incident",
    {
      name: z.string(),
      status: z.enum(['investigating', 'identified', 'monitoring', 'resolved'] as [IncidentStatus, ...IncidentStatus[]]),
      impact: z.enum(['critical', 'major', 'minor', 'maintenance'] as [IncidentImpact, ...IncidentImpact[]]),
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
          ] as [ComponentStatus, ...ComponentStatus[]]).describe("Component status")
        })
      ).optional().describe("Component statuses to update")
    },
    async (params) => {
      console.error("Received create-incident tool call with params:", params);
      
      // If components parameter is present but empty or undefined, fetch and return the list of components for selection
      if (params.components === undefined) {
        try {
          const components = await statuspage.listComponents();
          
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
        const incident = await statuspage.createIncident(params);
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

  // Tool for updating an existing incident
  server.tool(
    "update-incident",
    "Update an existing status page incident",
    {
      incidentId: z.string().describe("ID of the incident to update"),
      status: z.enum(['investigating', 'identified', 'monitoring', 'resolved'] as [IncidentStatus, ...IncidentStatus[]]).optional().describe("New status for the incident"),
      impact: z.enum(['critical', 'major', 'minor', 'maintenance'] as [IncidentImpact, ...IncidentImpact[]]).optional().describe("New impact level for the incident"),
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
          ] as [ComponentStatus, ...ComponentStatus[]]).describe("Component status")
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
          const incident = await statuspage.getIncident(params.incidentId);
          console.error(`Retrieved incident to update: ${incident.id} - ${incident.name}`);
          
          // Also get available components
          const components = await statuspage.listComponents();
          
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
        
        const incident = await statuspage.updateIncident(
          params.incidentId,
          {
            name: params.name,
            status: params.status,
            impact: params.impact,
            message: params.message,
            components: params.components
          }
        );
        
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

  // Tool for getting incident details
  server.tool(
    "get-incident",
    "Get details of an existing status page incident",
    {
      incidentId: z.string().describe("ID of the incident to retrieve")
    },
    async (params) => {
      console.error("Received get-incident tool call with params:", params);
      try {
        const incident = await statuspage.getIncident(params.incidentId);
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

  // Tool for listing incidents
  server.tool(
    "list-incidents",
    "List status page incidents with optional filtering",
    {
      status: z.enum(['investigating', 'identified', 'monitoring', 'resolved'] as [IncidentStatus, ...IncidentStatus[]]).optional().describe("Filter incidents by status"),
      limit: z.number().min(1).max(100).optional().describe("Maximum number of incidents to return (default: 20)")
    },
    async (params) => {
      console.error("Received list-incidents tool call with params:", params);
      try {
        const incidents = await statuspage.listIncidents(params);
        
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
} 