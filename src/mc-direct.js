#!/usr/bin/env node

import express from 'express';
import cors from 'cors';

const app = express();
const port = 8081;

// Enable CORS
app.use(cors());

// Parse JSON requests
app.use(express.json());

// Add OPTIONS handler for CORS
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-statuspage-api-key, x-statuspage-page-id');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

// Handle SSE connection
app.get('/mc', (req, res) => {
  console.log('Received SSE connection request');
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial keep-alive comments
  res.write(':\n\n');
  
  // Keep connection alive
  const interval = setInterval(() => {
    res.write(':\n\n');
  }, 10000);
  
  req.on('close', () => {
    clearInterval(interval);
    console.log('SSE connection closed');
  });
});

// Handle JSON-RPC requests
app.post('/mc', (req, res) => {
  console.log('Received POST request:', JSON.stringify(req.body, null, 2));
  
  // Validate JSON-RPC 2.0 request
  if (!req.body.jsonrpc || req.body.jsonrpc !== '2.0') {
    return res.json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid request' },
      id: req.body.id || null
    });
  }
  
  const { method, params, id } = req.body;
  
  // Handle connection request
  if (method === 'mcp.connect') {
    return res.json({
      jsonrpc: '2.0',
      result: { streaming: false, version: '1.0' },
      id
    });
  }
  
  // Handle tool discovery
  if (method === 'mcp.discover_tools') {
    return res.json({
      jsonrpc: '2.0',
      result: {
        tools: [
          {
            name: 'create_incident',
            description: 'Create a new status page incident',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'The name of the incident' },
                status: { type: 'string', description: 'Status (investigating, identified, monitoring, resolved)' },
                impact: { type: 'string', description: 'Impact level (critical, major, minor, maintenance)' },
                message: { type: 'string', description: 'The incident message/details' }
              },
              required: ['name', 'status', 'impact', 'message']
            }
          },
          {
            name: 'list_incidents',
            description: 'List status page incidents',
            parameters: {
              type: 'object',
              properties: {
                status: { type: 'string', description: 'Filter by status' },
                limit: { type: 'number', description: 'Maximum number of incidents to return' }
              }
            }
          }
        ]
      },
      id
    });
  }
  
  // Handle tool call
  if (method === 'mcp.call_tool') {
    console.log('Tool call params:', params);
    
    if (!params?.name) {
      return res.json({
        jsonrpc: '2.0',
        error: { code: -32602, message: 'Missing tool name' },
        id
      });
    }
    
    // Simulate a tool response
    return res.json({
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: `Successfully executed ${params.name} with parameters: ${JSON.stringify(params.params)}`
          }
        ]
      },
      id
    });
  }
  
  // Unknown method
  return res.json({
    jsonrpc: '2.0',
    error: {
      code: -32601,
      message: 'Method not found',
      data: `The requested method '${method}' is not supported`
    },
    id
  });
});

// Start server
app.listen(port, () => {
  console.log(`MC Direct server listening at http://localhost:${port}/mc`);
}); 