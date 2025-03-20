# Trunk Integration for BrowserTools MCP

This extension adds Trunk build server integration to the BrowserTools MCP server. It enables AI assistants and developers to monitor build status, access error information, and trigger rebuilds through simple HTTP endpoints.

## Features

### 1. Trunk Status Monitoring
Retrieve the current status of the Trunk build server.

```
GET /api/trunk-status
```

Response:
```json
{
  "status": "ok",
  "trunk_status": {
    // Full status response from Trunk
  }
}
```

### 2. Build Error Retrieval
Get a list of current build errors from the Trunk server.

```
GET /api/trunk/build-errors
```

Response:
```json
{
  "status": "ok",
  "errors": [
    {
      "message": "Error message",
      "location": "file:line:column",
      "severity": "error"
    }
  ],
  "hasErrors": true
}
```

### 3. Trigger Rebuild
Manually trigger a rebuild of the application.

```
POST /api/trunk/rebuild
```

Response:
```json
{
  "status": "ok",
  "message": "Trunk rebuild triggered"
}
```

### 4. Combined Error Reporting
Get both browser console errors and Trunk build errors in a single request.

```
GET /api/combined-errors
```

Response:
```json
{
  "status": "ok",
  "errors": [
    // Browser console errors and build errors combined
  ],
  "total": 5,
  "browserErrors": 2,
  "trunkErrors": 3
}
```

## Usage with AI Assistants

AI assistants can use these endpoints to:

1. Check if there are any build errors after code changes
2. Monitor console logs and build errors in a single request
3. Trigger rebuilds when needed

Example workflow:

1. AI makes code changes
2. AI triggers a rebuild with `POST /api/trunk/rebuild`
3. AI checks for errors with `GET /api/combined-errors`
4. AI analyzes and fixes any detected issues

## Configuration

The Trunk integration assumes Trunk is running on `localhost:8080`. If your Trunk server is on a different host or port, modify the constants in `trunk-integration.ts`:

```typescript
const TRUNK_STATUS_ENDPOINT = 'http://localhost:8080/_trunk/api/v1/status';
const TRUNK_RELOAD_ENDPOINT = 'http://localhost:8080/_trunk/reload';
``` 