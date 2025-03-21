import express from 'express';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

const TRUNK_STATUS_ENDPOINT = 'http://localhost:8080/_trunk/api/v1/status';
const TRUNK_RELOAD_ENDPOINT = 'http://localhost:8080/_trunk/reload';
const BRUSH_LOG_PATH = '/Users/ryanhickman/code/brush/logs/trunk.log';

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
        
        // Get HTML response
        const htmlContent = await response.text();
        
        // Extract WASM module info - this indicates the app is building successfully
        const wasmModuleMatch = htmlContent.match(/import init, \* as bindings from '\/([^']+)'/);
        const wasmModule = wasmModuleMatch ? wasmModuleMatch[1] : 'unknown';
        
        // Extract page title
        const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/);
        const pageTitle = titleMatch ? titleMatch[1] : 'unknown';
        
        console.log('Trunk status parsed from HTML:', { wasmModule, pageTitle });
        
        // Return structured data about the build
        res.json({
          status: 'ok',
          trunkRunning: true,
          buildSuccess: wasmModuleMatch !== null,
          latestBuild: {
            wasmModule,
            pageTitle
          }
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
        console.log('Attempting direct reload via curl...');
        
        // Execute curl command to trigger rebuild
        exec(`curl -s -X POST http://localhost:8080/_trunk/reload`, (error, stdout, stderr) => {
          if (error) {
            console.error(`Error triggering rebuild: ${error.message}`);
            return res.status(500).json({
              status: 'error',
              message: 'Failed to trigger rebuild',
              error: error.message
            });
          }
          
          console.log('Trunk rebuild triggered successfully');
          res.json({
            status: 'ok',
            message: 'Trunk rebuild triggered'
          });
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

  // Get build errors from log file
  app.get('/api/trunk/build-errors', (req, res) => {
    (async () => {
      try {
        console.log('Extracting build errors from Trunk logs...');
        
        // Check if log file exists
        if (!fs.existsSync(BRUSH_LOG_PATH)) {
          return res.json({
            status: 'ok',
            errors: [],
            hasErrors: false,
            message: 'No log file found'
          });
        }
        
        // Read the log file
        const logContent = fs.readFileSync(BRUSH_LOG_PATH, 'utf-8');
        
        // Extract compilation warnings
        const warningMatches = logContent.match(/warning:.*?\n\s+-->\s+(.*?)\n.*?\n.*?\|.*?\n.*?\|(.*?)\n/g) || [];
        
        // Parse warnings into structured format
        const buildErrors = warningMatches.map(warning => {
          const locationMatch = warning.match(/-->\s+(.*?)\n/);
          const messageMatch = warning.match(/warning:(.*?)\n/);
          
          return {
            type: 'warning',
            message: messageMatch ? messageMatch[1].trim() : 'Unknown warning',
            location: locationMatch ? locationMatch[1].trim() : 'Unknown location',
            raw: warning.trim()
          };
        });
        
        console.log(`Found ${buildErrors.length} build warnings in logs`);
        
        res.json({
          status: 'ok',
          errors: buildErrors,
          hasErrors: buildErrors.length > 0,
          warningCount: buildErrors.length
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
        const browserErrorsResponse = await fetch(`http://localhost:${process.env.PORT || 3025}/console-errors`);
        const browserErrors = await browserErrorsResponse.json();
        
        // Then get Trunk build errors from the log file
        const buildErrorsResponse = await fetch(`http://localhost:${process.env.PORT || 3025}/api/trunk/build-errors`);
        const buildErrorsData = await buildErrorsResponse.json();
        
        const trunkErrors = buildErrorsData.status === 'ok' ? buildErrorsData.errors : [];
        
        // Combine errors
        const combinedErrors = [
          ...browserErrors,
          ...trunkErrors.map((error: any) => ({
            type: 'build-warning',
            message: error.message,
            timestamp: new Date().toISOString(),
            source: 'Trunk',
            location: error.location || 'unknown'
          }))
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