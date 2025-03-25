const express = require('express');
const fs = require('fs');
const path = require('path');

// Enhanced server-side logger with timestamps and consistent formatting
const serverLogger = {
  info: (message, context = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [SERVER:INFO] ${message}`, context);
  },
  error: (message, error = null, context = {}) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [SERVER:ERROR] ${message}`, error, context);
  },
  debug: (message, context = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [SERVER:DEBUG] ${message}`, context);
  },
  http: (req, res, duration) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [SERVER:HTTP] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  }
};

const app = express();
const PORT = process.env.PORT || 3000;

// Define the CSV file path - make it absolute and in the project root
const ADMIN_CSV_PATH = path.join(__dirname, 'public', 'admin-emails.csv');
serverLogger.info('Server initializing', { 
  port: PORT,
  adminCsvPath: ADMIN_CSV_PATH,
  environment: process.env.NODE_ENV || 'development'
});

// Body parsers
app.use(express.json());
app.use(express.text());  // Important for plain text handling

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Create public directory and initial CSV if they don't exist
function ensureCSVExists() {
  // Create directory if it doesn't exist
  const dir = path.dirname(ADMIN_CSV_PATH);
  if (!fs.existsSync(dir)) {
    serverLogger.info('Creating directory', { path: dir });
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create CSV file with headers if it doesn't exist
  if (!fs.existsSync(ADMIN_CSV_PATH)) {
    serverLogger.info('Creating initial CSV file', { path: ADMIN_CSV_PATH });
    fs.writeFileSync(ADMIN_CSV_PATH, 'email,role,studentid\n');
  }
}

// Ensure CSV exists on server startup
ensureCSVExists();

// Enhanced request logger middleware with timing
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log request
  serverLogger.debug('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Add response finishing listener
  res.on('finish', () => {
    const duration = Date.now() - start;
    serverLogger.http(req, res, duration);
  });
  
  next();
});

// Handle PUT request for admin-emails.csv - direct file write
app.put('/admin-emails.csv', (req, res) => {
  try {
    serverLogger.debug('Processing PUT request', {
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      bodyPreview: req.body.substring(0, 100) + (req.body.length > 100 ? '...' : '')
    });
    
    if (!req.body) {
      serverLogger.error('Empty request body');
      return res.status(400).send('No data provided');
    }
    
    // Write directly using synchronous API for simplicity
    fs.writeFileSync(ADMIN_CSV_PATH, req.body);
    
    // Verify file was written
    const content = fs.readFileSync(ADMIN_CSV_PATH, 'utf8');
    const lineCount = content.split('\n').length;
    serverLogger.info('CSV file updated successfully', { 
      lineCount,
      byteSize: Buffer.byteLength(content, 'utf8')
    });
    
    res.status(200).send('Updated successfully');
  } catch (error) {
    serverLogger.error('Failed to process PUT request', error, {
      path: ADMIN_CSV_PATH,
      stackTrace: error.stack
    });
    res.status(500).send(`Server error: ${error.message}`);
  }
});

// Handle POST request for backward compatibility
app.post('/update-admin-roles', (req, res) => {
  try {
    serverLogger.debug('Processing POST request', { 
      contentType: req.get('Content-Type'),
      hasContent: !!req.body?.csvContent,
      email: req.body?.email,
      role: req.body?.role
    });
    
    if (!req.body || !req.body.csvContent) {
      serverLogger.error('Invalid POST request - missing csvContent');
      return res.status(400).send('No CSV content provided');
    }
    
    // Write directly using synchronous API for simplicity
    fs.writeFileSync(ADMIN_CSV_PATH, req.body.csvContent);
    
    // Verify file was written
    const content = fs.readFileSync(ADMIN_CSV_PATH, 'utf8');
    const lineCount = content.split('\n').length;
    serverLogger.info('CSV file updated via POST', { 
      lineCount,
      byteSize: Buffer.byteLength(content, 'utf8'),
      updatedEmail: req.body.email
    });
    
    res.status(200).send('Updated successfully');
  } catch (error) {
    serverLogger.error('Failed to process POST request', error, {
      path: ADMIN_CSV_PATH,
      stackTrace: error.stack
    });
    res.status(500).send(`Server error: ${error.message}`);
  }
});

// Create an endpoint to view the current CSV content
app.get('/api/admin-csv-content', (req, res) => {
  try {
    if (fs.existsSync(ADMIN_CSV_PATH)) {
      const content = fs.readFileSync(ADMIN_CSV_PATH, 'utf8');
      serverLogger.debug('Serving CSV content', {
        fileSize: Buffer.byteLength(content, 'utf8'),
        lines: content.split('\n').length - 1 // -1 for header
      });
      res.type('text/plain').send(content);
    } else {
      serverLogger.error('CSV file not found on GET request', null, { path: ADMIN_CSV_PATH });
      res.status(404).send('CSV file not found');
    }
  } catch (error) {
    serverLogger.error('Error reading CSV file', error, { path: ADMIN_CSV_PATH });
    res.status(500).send(`Error reading CSV: ${error.message}`);
  }
});

// Start server
app.listen(PORT, () => {
  serverLogger.info('Server started successfully', {
    url: `http://localhost:${PORT}`,
    adminCsvPath: ADMIN_CSV_PATH,
    apiEndpoint: `http://localhost:${PORT}/api/admin-csv-content`
  });
});
