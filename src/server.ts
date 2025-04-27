import express from 'express';
import cors from 'cors';
import { server } from './index.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Request, Response } from 'express';
import { updateConfigFromHeaders, validateConfig } from './utils/config.js';

const app = express();
const port = process.env.PORT || 8080;

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
  console.log('Received SSE connection request from Cursor');
  
  // Explicitly disable any middleware that might interfere with the response
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering if present
  
  // Flush headers immediately
  res.flushHeaders();
  
  // Send an initial comment to establish the connection
  res.write(':\n\n');
  
  // Keep connection open with regular pings
  const pingInterval = setInterval(() => {
    try {
      res.write(':\n\n');
    } catch (error) {
      console.error('Error sending ping:', error);
      clearInterval(pingInterval);
    }
  }, 10000);
  
  // Handle client disconnect
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
          streaming: true,
          version: "1.0"
        },
        id: id || null
      });
    }
    
    // Handle mcp.discover_tools for tool discovery
    if (method === "mcp.discover_tools") {
      console.log("Received tool discovery request");
      
      // Get all registered tools from the server
      const tools = (server as any)._registeredTools || {};
      const formattedTools = Object.keys(tools).map(name => {
        const tool = tools[name];
        return {
          name,
          description: tool.description || '',
          parameters: tool.paramsSchema || {}
        };
      });
      
      return res.status(200).json({
        jsonrpc: "2.0",
        result: {
          tools: formattedTools
        },
        id: id || null
      });
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