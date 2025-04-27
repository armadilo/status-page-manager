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

4. Set environment variables:
   ```
   heroku config:set STATUSPAGE_API_KEY=your_api_key
   heroku config:set STATUSPAGE_PAGE_ID=your_page_id
   ```

5. Deploy to Heroku:
   ```
   git push heroku main
   ```

6. Open your app:
   ```
   heroku open
   ```

## Using with Cursor

1. Open Cursor
2. Go to Settings → MCP Servers
3. Click "Add New MCP Server"
4. Enter:
   - Name: Status Page Manager
   - URL: https://your-app-name.herokuapp.com/mcp
   - Description: Create and manage status page incidents

## Available MCP Tools

- `create-incident`: Create a new status page incident
- `update-incident`: Update an existing incident
- `get-incident`: Get details of an existing incident
- `list-incidents`: List status page incidents with optional filtering
- `list-components`: List available StatusPage components 