# Status Page Manager

An MCP server for managing status page incidents via Cursor.

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Copy `.env.example` to `.env` and add your credentials:
   ```
   cp .env.example .env
   ```

3. Build the TypeScript code:
   ```
   npm run build
   ```

4. Run the server locally:
   ```
   npm start
   ```

5. For development with auto-reload:
   ```
   npm run dev:http
   ```

## Heroku Deployment

### Option 1: One-Click Deploy
Click the "Deploy to Heroku" button above to deploy this app to Heroku in one click.

### Option 2: Manual Deployment

1. Install the Heroku CLI:
   ```
   brew install heroku/brew/heroku
   ```
   or visit: https://devcenter.heroku.com/articles/heroku-cli

2. Login to Heroku:
   ```
   heroku login
   ```

3. Create a new Heroku app:
   ```
   heroku create your-app-name
   ```

4. **⚠️ Important:** Set environment variables securely through the Heroku Dashboard:
   - Go to your app's Settings tab in the Heroku Dashboard
   - Click on "Reveal Config Vars"
   - Add the following environment variables:
     - `STATUSPAGE_API_KEY`: Your StatusPage.io API key
     - `STATUSPAGE_PAGE_ID`: Your StatusPage.io page ID

   Never commit API keys or sensitive data to your repository!

5. Deploy to Heroku:
   ```
   git push heroku main
   ```

6. Open your app:
   ```
   heroku open
   ```

## Using with Cursor

There are two ways to use this MCP server with Cursor:

### Option 1: Connect to Remote Server (Recommended)

This approach uses a remote MCP server deployed on Heroku, with your credentials passed securely via headers:

1. Open Cursor
2. Go to Settings → MCP Servers
3. Click "Add New MCP Server"
4. Enter:
   - Name: Status Page Manager
   - URL: https://your-app-name.herokuapp.com/mcp
   - Description: Create and manage status page incidents
5. Under "Advanced Settings", add these headers:
   - `x-statuspage-api-key`: Your StatusPage API key
   - `x-statuspage-page-id`: Your StatusPage page ID

Sample configuration:

```json
{
  "status-page-manager": {
    "url": "https://your-app-name.herokuapp.com/mcp",
    "description": "Create and manage status page incidents",
    "headers": {
      "x-statuspage-api-key": "your-api-key",
      "x-statuspage-page-id": "your-page-id"
    }
  }
}
```

### Option 2: Run Locally

Alternatively, you can run the MCP server locally:

1. Create a `.env` file with your credentials (see `.env.example`)
2. Use this configuration in Cursor:

```json
{
  "status-page-manager": {
    "command": "/path/to/status-page-manager/run-mcp.sh",
    "args": []
  }
}
```

With this approach, the server runs locally and reads credentials from your `.env` file.

## Available MCP Tools

- `create-incident`: Create a new status page incident
- `update-incident`: Update an existing incident
- `get-incident`: Get details of an existing incident
- `list-incidents`: List status page incidents with optional filtering
- `list-components`: List available StatusPage components 