import express from 'express';
import cors from 'cors';
import { server } from './index.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Request, Response } from 'express';
import { updateConfigFromHeaders } from './utils/config.js';

const app = express();
const port = process.env.PORT || 6500;

// Initialize the MCP server
async function initMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP Server connected and ready to handle requests");
}

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Add a basic health check endpoint
app.get('/', (req: Request, res: Response) => {
  // Set CORS headers for health check too
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  res.send({
    status: 'ok',
    service: 'status-page-manager',
    timestamp: new Date().toISOString()
  });
});

// Add endpoint to list available tools for debugging
app.get('/tools', (req: Request, res: Response) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  const tools = (server as any)._registeredTools || {};
  const toolNames = Object.keys(tools);
  
  res.send({
    status: 'ok',
    tools: toolNames,
    count: toolNames.length
  });
});

// Add OPTIONS support for CORS preflight requests for all paths
app.options('*', (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-statuspage-api-key, x-statuspage-page-id, x-statuspage-default-components');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.status(204).end();
});

// Add SSE support for Cursor MCP connection
app.get('/mcp', (req: Request, res: Response) => {
  console.log('Received SSE connection request from Cursor with headers:', req.headers);
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-statuspage-api-key, x-statuspage-page-id, x-statuspage-default-components',
    'X-Accel-Buffering': 'no'
  });
  
  // Send initial SSE comment
  res.write(':\n\n');
  
  // Send a proper event to notify that we're ready for connections
  const initialEvent = {
    jsonrpc: "2.0",
    method: "mcp.ready",
    params: {
      version: "1.0"
    }
  };
  
  res.write(`data: ${JSON.stringify(initialEvent)}\n\n`);
  
  // Send tool discovery information
  const tools = [
    {
      "name": "mcp_status_page_manager_local_create_incident",
      "description": "Create a new status page incident",
      "parameters": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "properties": {
          "name": {"type": "string"},
          "status": {"type": "string", "enum": ["investigating", "identified", "monitoring", "resolved"]},
          "impact": {"type": "string", "enum": ["critical", "major", "minor", "maintenance"]},
          "message": {"type": "string"},
          "notify": {"type": "boolean", "default": true},
          "components": {
            "description": "Component statuses to update",
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "id": {"description": "Component ID", "type": "string"},
                "status": {
                  "description": "Component status",
                  "type": "string",
                  "enum": ["operational", "degraded_performance", "partial_outage", "major_outage", "under_maintenance"]
                }
              },
              "required": ["id", "status"]
            }
          }
        },
        "required": ["name", "status", "impact", "message"],
        "type": "object"
      }
    },
    {
      "name": "mcp_status_page_manager_local_update_incident",
      "description": "Update an existing status page incident",
      "parameters": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "properties": {
          "incidentId": {"description": "ID of the incident to update", "type": "string"},
          "status": {
            "description": "New status for the incident",
            "type": "string",
            "enum": ["investigating", "identified", "monitoring", "resolved"]
          },
          "impact": {
            "description": "New impact level for the incident",
            "type": "string",
            "enum": ["critical", "major", "minor", "maintenance"]
          },
          "name": {"description": "New name/title for the incident", "type": "string"},
          "message": {"description": "New message/description for the incident", "type": "string"},
          "components": {
            "description": "Component statuses to update",
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "id": {"description": "Component ID", "type": "string"},
                "status": {
                  "description": "Component status",
                  "type": "string",
                  "enum": ["operational", "degraded_performance", "partial_outage", "major_outage", "under_maintenance"]
                }
              },
              "required": ["id", "status"]
            }
          }
        },
        "required": ["incidentId"],
        "type": "object"
      }
    },
    {
      "name": "mcp_status_page_manager_local_get_incident",
      "description": "Get details of an existing status page incident",
      "parameters": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "properties": {
          "incidentId": {"description": "ID of the incident to retrieve", "type": "string"}
        },
        "required": ["incidentId"],
        "type": "object"
      }
    },
    {
      "name": "mcp_status_page_manager_local_list_incidents",
      "description": "List status page incidents with optional filtering",
      "parameters": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "properties": {
          "status": {
            "description": "Filter incidents by status",
            "type": "string",
            "enum": ["investigating", "identified", "monitoring", "resolved"]
          },
          "limit": {
            "description": "Maximum number of incidents to return (default: 20)",
            "type": "number",
            "minimum": 1,
            "maximum": 100
          }
        },
        "type": "object"
      }
    },
    {
      "name": "mcp_status_page_manager_local_list_components",
      "description": "List available StatusPage components",
      "parameters": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "properties": {
          "random_string": {"description": "Dummy parameter for no-parameter tools", "type": "string"}
        },
        "type": "object"
      }
    }
  ];
  
  const discoverEvent = {
    jsonrpc: "2.0",
    method: "mcp.discover_tools",
    params: {
      tools: tools
    }
  };
  
  // Send tool discovery
  res.write(`data: ${JSON.stringify(discoverEvent)}\n\n`);
  
  // Keep connection alive with regular pings
  const pingInterval = setInterval(() => {
    try {
      res.write(':\n\n');
    } catch (error) {
      console.error('Error sending ping:', error);
      clearInterval(pingInterval);
    }
  }, 15000);
  
  // Clean up when client disconnects
  req.on('close', () => {
    console.log('SSE connection closed by client');
    clearInterval(pingInterval);
  });
});

// Handle MCP requests
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    console.log('Received MCP POST request:', JSON.stringify(req.body, null, 2));
    
    // Basic validation for JSON-RPC 2.0
    if (!req.body.jsonrpc || req.body.jsonrpc !== "2.0") {
      return res.status(200).json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'The request does not conform to the JSON-RPC 2.0 specification'
        },
        id: req.body.id || null
      });
    }
    
    const { method, params, id } = req.body;
    
    // Handle mcp.connect for connection setup
    if (method === "mcp.connect") {
      console.log("Received connection setup request");
      return res.status(200).json({
        jsonrpc: "2.0",
        result: {
          streaming: false,
          version: "1.0",
          name: "Status Page Manager MCP",
          formats: ["json"],
          capabilities: ["tool_discovery", "tool_execution"]
        },
        id: id || null
      });
    }
    
    // Handle mcp.discover_tools for tool discovery
    if (method === "mcp.discover_tools") {
      console.log("Received tool discovery request with headers:", req.headers);
      
      // Use exactly the format Cursor expects
      const tools = [
        {
          "name": "create_incident",
          "description": "Create a new status page incident",
          "parameters": {
            "type": "object",
            "properties": {
              "name": {"type": "string", "description": "The name of the incident"},
              "status": {"type": "string", "description": "Status (investigating, identified, monitoring, resolved)"},
              "impact": {"type": "string", "description": "Impact level (critical, major, minor, maintenance)"},
              "message": {"type": "string", "description": "The incident message/details"}
            },
            "required": ["name", "status", "impact", "message"]
          }
        },
        {
          "name": "update_incident",
          "description": "Update an existing status page incident",
          "parameters": {
            "type": "object",
            "properties": {
              "id": {"type": "string", "description": "The ID of the incident to update"},
              "status": {"type": "string", "description": "The new status of the incident"},
              "message": {"type": "string", "description": "The update message"}
            },
            "required": ["id"]
          }
        },
        {
          "name": "list_incidents",
          "description": "List status page incidents",
          "parameters": {
            "type": "object",
            "properties": {
              "status": {"type": "string", "description": "Filter by status"},
              "limit": {"type": "number", "description": "Maximum number of incidents to return"}
            }
          }
        }
      ];
      
      // Log the full response we're sending
      const response = {
        "jsonrpc": "2.0",
        "result": {
          "tools": tools
        },
        "id": id || null
      };
      
      console.log("Sending tool discovery response:", JSON.stringify(response, null, 2));
      
      return res.status(200).json(response);
    }
    
    // Handle mcp.call_tool method
    if (method === "mcp.call_tool") {
      if (!params || !params.name) {
        return res.status(200).json({
          jsonrpc: "2.0",
          error: {
            code: -32602,
            message: 'Invalid params',
            data: 'Missing tool name in call_tool request'
          },
          id: id || null
        });
      }
      
      const toolName = params.name;
      const toolParams = params.params || {};
      
      // Update configuration from headers
      updateConfigFromHeaders(req.headers);
      
      // Check if tool exists
      const tools = (server as any)._registeredTools || {};
      if (!tools[toolName]) {
        return res.status(200).json({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: 'Method not found',
            data: `The requested tool '${toolName}' is not registered`
          },
          id: id || null
        });
      }
      
      // Invoke the tool
      const tool = tools[toolName];
      const result = await tool.callback(toolParams, { messageId: id || 'http-request' });
      
      return res.status(200).json({
        jsonrpc: "2.0",
        result: result,
        id: id || null
      });
    }
    
    // Handle other methods
    console.log(`Unhandled method: ${method}`);
    return res.status(200).json({
      jsonrpc: "2.0",
      error: {
        code: -32601,
        message: 'Method not found',
        data: `The requested method '${method}' is not supported`
      },
      id: id || null
    });
    
  } catch (error) {
    console.error('Error handling MCP request:', error);
    
    return res.status(200).json({ 
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error'
      },
      id: req.body?.id || null
    });
  }
});

// Add GET endpoint for MCP metadata
app.get('/mcp/metadata', (req: Request, res: Response) => {
  console.log('Received MCP metadata request');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Get the registered tools and format them for the response
  const tools = (server as any)._registeredTools || {};
  const formattedTools = Object.keys(tools).map(name => {
    const tool = tools[name];
    const schema = tool.paramsSchema ? tool.paramsSchema : {};
    
    return {
      name,
      description: tool.description || '',
      schema: schema
    };
  });
  
  // Send the metadata
  res.json({
    status: 'ok',
    server_name: 'Status Page Manager',
    version: '1.0.0',
    tools: formattedTools
  });
});

// Start the Express server
async function startServer() {
  try {
    // First initialize the MCP server
    await initMcpServer();
    
    // Then start the Express HTTP server
    app.listen(port, () => {
      console.log(`Status Page Manager MCP HTTP server listening on port ${port}`);
      console.log(`Use the following URL in Cursor: http://localhost:${port}/mcp`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server when this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(console.error);
}

export { app, startServer }; 