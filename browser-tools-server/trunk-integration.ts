import express from 'express';
import fetch from 'node-fetch';

const TRUNK_STATUS_ENDPOINT = 'http://localhost:8080/_trunk/api/v1/status';
const TRUNK_RELOAD_ENDPOINT = 'http://localhost:8080/_trunk/reload';

/**
 * Set up Trunk integration endpoints
 * @param app Express application instance
 */
export function setupTrunkIntegration(app: express.Application): void {
  console.log('Setting up Trunk integration endpoints...');

  // Get Trunk server status
  app.get('/api/trunk-status', (req, res) => {
    (async () => {
      try {
        console.log('Fetching Trunk server status...');
        const response = await fetch(TRUNK_STATUS_ENDPOINT);
        
        if (!response.ok) {
          console.error(`Error fetching Trunk status: ${response.statusText}`);
          return res.status(response.status).json({
            status: 'error',
            message: `Trunk server returned status: ${response.status} ${response.statusText}`
          });
        }
        
        const data = await response.json();
        console.log('Trunk status:', data);
        
        res.json({
          status: 'ok',
          trunk_status: data
        });
      } catch (error) {
        console.error('Error connecting to Trunk server:', error);
        res.status(500).json({
          status: 'error',
          message: 'Failed to connect to Trunk server',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })();
  });

  // Trigger Trunk build
  app.post('/api/trunk/rebuild', (req, res) => {
    (async () => {
      try {
        console.log('Triggering Trunk rebuild...');
        const response = await fetch(TRUNK_RELOAD_ENDPOINT, { method: 'POST' });
        
        if (!response.ok) {
          console.error(`Error triggering Trunk rebuild: ${response.statusText}`);
          return res.status(response.status).json({
            status: 'error',
            message: `Trunk server returned status: ${response.status} ${response.statusText}`
          });
        }
        
        console.log('Trunk rebuild triggered successfully');
        res.json({
          status: 'ok',
          message: 'Trunk rebuild triggered'
        });
      } catch (error) {
        console.error('Error triggering Trunk rebuild:', error);
        res.status(500).json({
          status: 'error',
          message: 'Failed to trigger Trunk rebuild',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })();
  });

  // Get build errors
  app.get('/api/trunk/build-errors', (req, res) => {
    (async () => {
      try {
        console.log('Fetching Trunk build errors...');
        const response = await fetch(TRUNK_STATUS_ENDPOINT);
        
        if (!response.ok) {
          console.error(`Error fetching Trunk status: ${response.statusText}`);
          return res.status(response.status).json({
            status: 'error',
            message: `Trunk server returned status: ${response.status} ${response.statusText}`
          });
        }
        
        const data = await response.json();
        
        // Extract build errors if available
        const buildErrors = data.buildStatus && data.buildStatus.errors 
          ? data.buildStatus.errors 
          : [];
        
        console.log(`Found ${buildErrors.length} build errors`);
        
        res.json({
          status: 'ok',
          errors: buildErrors,
          hasErrors: buildErrors.length > 0
        });
      } catch (error) {
        console.error('Error fetching Trunk build errors:', error);
        res.status(500).json({
          status: 'error',
          message: 'Failed to fetch Trunk build errors',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })();
  });

  // Combined console errors from both browser and Trunk
  app.get('/api/combined-errors', (req, res) => {
    (async () => {
      try {
        // First get browser console errors
        const browserErrorsResponse = await fetch(`http://localhost:${process.env.PORT || 3030}/console-errors`);
        const browserErrors = await browserErrorsResponse.json();
        
        // Then get Trunk build errors
        const trunkResponse = await fetch(TRUNK_STATUS_ENDPOINT);
        
        let trunkErrors: any[] = [];
        if (trunkResponse.ok) {
          const trunkData = await trunkResponse.json();
          trunkErrors = trunkData.buildStatus && trunkData.buildStatus.errors
            ? trunkData.buildStatus.errors.map((error: any) => ({
                type: 'build-error',
                message: error.message,
                timestamp: new Date().toISOString(),
                source: 'Trunk',
                location: error.location || 'unknown'
              }))
            : [];
        }
        
        // Combine errors
        const combinedErrors = [
          ...browserErrors,
          ...trunkErrors
        ];
        
        res.json({
          status: 'ok',
          errors: combinedErrors,
          total: combinedErrors.length,
          browserErrors: browserErrors.length,
          trunkErrors: trunkErrors.length
        });
      } catch (error) {
        console.error('Error fetching combined errors:', error);
        res.status(500).json({
          status: 'error',
          message: 'Failed to fetch combined errors',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })();
  });

  console.log('Trunk integration endpoints set up successfully');
} 