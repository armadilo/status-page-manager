#!/usr/bin/env node

import https from 'https';

async function sendRequest(data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'warm-forest-87740-7343ecfc8c2d.herokuapp.com',
      port: 443,
      path: '/mcp/direct',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-statuspage-api-key': '344ea8ea-ec9c-4c2c-9a21-08a413e14cf4',
        'x-statuspage-page-id': '09mddyczw3m6'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}, data: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function testMcp() {
  try {
    console.log('Testing MCP connection...');
    
    // Test mcp.connect
    const connectResult = await sendRequest({
      jsonrpc: '2.0',
      method: 'mcp.connect',
      id: 'connect-test'
    });
    console.log('Connect result:', JSON.stringify(connectResult, null, 2));
    
    // Test mcp.discover_tools
    const discoverResult = await sendRequest({
      jsonrpc: '2.0',
      method: 'mcp.discover_tools',
      id: 'discover-test'
    });
    console.log('Discover tools result:', JSON.stringify(discoverResult, null, 2));
    
    // Test mcp.call_tool
    const callResult = await sendRequest({
      jsonrpc: '2.0',
      method: 'mcp.call_tool',
      params: {
        name: 'create-incident',
        params: {
          name: 'Test Incident',
          status: 'investigating',
          impact: 'minor',
          message: 'This is a test incident'
        }
      },
      id: 'call-test'
    });
    console.log('Call tool result:', JSON.stringify(callResult, null, 2));
    
    console.log('All tests passed!');
  } catch (error) {
    console.error('Error testing MCP:', error);
  }
}

testMcp(); 