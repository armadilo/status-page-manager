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
  res.send({
    status: 'ok',
    service: 'status-page-manager',
    timestamp: new Date().toISOString()
  });
});

// Add SSE support for Cursor MCP connection
app.get('/mcp', (req: Request, res: Response) => {
  console.log('Received SSE connection request from Cursor');
  
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // The SSE specification requires an initial comment to be sent
  res.write(':\n\n');
  
  // Send an initial message with proper JSON-RPC format
  const initialMessage = {
    jsonrpc: "2.0",
    method: "mcp.connection_established",
    params: {}
  };
  
  // Write the message and flush the response
  res.write(`data: ${JSON.stringify(initialMessage)}\n\n`);
  // Try to flush if available (TypeScript safe check)
  (res as any).flush?.();
  
  // Keep the connection alive with a ping every 15 seconds (more frequent)
  const pingInterval = setInterval(() => {
    const pingMessage = {
      jsonrpc: "2.0",
      method: "mcp.ping",
      params: { timestamp: new Date().toISOString() }
    };
    
    // Send the ping and flush
    res.write(`data: ${JSON.stringify(pingMessage)}\n\n`);
    // Try to flush if available (TypeScript safe check)
    (res as any).flush?.();
  }, 15000);
  
  // Clean up when client disconnects
  req.on('close', () => {
    console.log('SSE connection closed by client');
    clearInterval(pingInterval);
  });
  
  req.on('error', (err) => {
    console.error('SSE connection error:', err);
    clearInterval(pingInterval);
  });
  
  // If the server closes the connection
  res.on('close', () => {
    console.log('SSE connection closed by server');
    clearInterval(pingInterval);
  });
});

// Handle MCP requests
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    console.log('Received MCP request:', JSON.stringify(req.body, null, 2));
    
    // Update configuration from headers
    updateConfigFromHeaders(req.headers);
    
    // Validate configuration after headers are processed
    if (!validateConfig()) {
      console.error('Missing required configuration in headers');
      return res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32602,
          message: 'Missing required StatusPage API credentials',
          data: 'Please provide x-statuspage-api-key and x-statuspage-page-id headers.'
        },
        id: req.body.id || null
      });
    }
    
    // Check if this is a valid JSON-RPC 2.0 request
    if (!req.body.jsonrpc || req.body.jsonrpc !== "2.0") {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'The request does not conform to the JSON-RPC 2.0 specification'
        },
        id: req.body.id || null
      });
    }
    
    // Get the method and params from the request
    const { method, params, id } = req.body;
    
    if (!method) {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'Missing method parameter in request'
        },
        id: id || null
      });
    }
    
    // Convert MCP method name to our internal tool name
    // Format is typically "mcp.call_tool" or similar
    const methodParts = method.split('.');
    const toolName = methodParts.length > 1 ? methodParts[1] : method;
    
    // Get all registered tools from the server
    const tools = (server as any)._registeredTools;
    
    if (!tools || !tools[toolName]) {
      return res.status(404).json({
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: 'Method not found',
          data: `The requested tool '${toolName}' is not registered`
        },
        id: id || null
      });
    }
    
    // Invoke the tool directly
    const tool = tools[toolName];
    const result = await tool.callback(params || {}, { messageId: id || 'http-request' });
    
    console.log('MCP result:', JSON.stringify(result, null, 2));
    
    // Format the response according to JSON-RPC 2.0
    const response = {
      jsonrpc: "2.0",
      result: result,
      id: id || null
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    
    // Format the error according to JSON-RPC 2.0
    res.status(500).json({ 
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