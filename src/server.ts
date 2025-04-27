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
        error: 'Configuration error',
        message: 'Missing required StatusPage API credentials. Please provide x-statuspage-api-key and x-statuspage-page-id headers.'
      });
    }
    
    // Use a simpler approach - invoke the registered tools directly
    // Extract the tool name and parameters from the request
    const { name, params } = req.body;
    
    if (!name) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Missing tool name in request'
      });
    }
    
    // Get all registered tools from the server
    const tools = (server as any)._registeredTools;
    
    if (!tools || !tools[name]) {
      return res.status(404).json({
        error: 'Tool not found',
        message: `The requested tool '${name}' is not registered`
      });
    }
    
    // Invoke the tool directly
    const tool = tools[name];
    const response = await tool.callback(params || {}, { messageId: 'http-request' });
    
    console.log('MCP response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
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