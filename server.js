const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
// Define ADMIN_CSV_PATH with absolute path for clarity
const ADMIN_CSV_PATH = path.join(__dirname, 'public', 'admin-emails.csv');
console.log('Admin CSV path is set to:', ADMIN_CSV_PATH);

// Body parsers
app.use(express.json());
app.use(express.text());

// Serve static files - Serve the public directory at root
app.use(express.static(path.join(__dirname, 'public')));

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

async function ensureDirectoryExists() {
  const dir = path.dirname(ADMIN_CSV_PATH);
  try {
    await fs.access(dir);
    console.log(`Directory exists: ${dir}`);
  } catch (error) {
    console.log(`Creating directory: ${dir}`);
    await fs.mkdir(dir, { recursive: true });
  }
}

// Create initial CSV file if it doesn't exist
async function ensureFileExists() {
  try {
    await fs.access(ADMIN_CSV_PATH);
    console.log(`File exists: ${ADMIN_CSV_PATH}`);
  } catch (error) {
    console.log(`Creating initial CSV file: ${ADMIN_CSV_PATH}`);
    await fs.writeFile(ADMIN_CSV_PATH, 'email,role,studentid\n');
  }
}

// Initialize server
async function initServer() {
  await ensureDirectoryExists();
  await ensureFileExists();
  console.log('Server initialized');
}

// Handle PUT request for updating admin-emails.csv
app.put('/admin-emails.csv', async (req, res) => {
  try {
    console.log('Received PUT update request with body:', req.body);
    
    if (!req.body) {
      return res.status(400).send('No data provided');
    }

    await fs.writeFile(ADMIN_CSV_PATH, req.body);
    console.log('Successfully updated CSV file via PUT');
    
    // Verify file was saved
    const savedContent = await fs.readFile(ADMIN_CSV_PATH, 'utf8');
    console.log('Saved CSV content:', savedContent);
    
    res.status(200).send('Updated successfully');
  } catch (error) {
    console.error('Error updating CSV via PUT:', error);
    res.status(500).send(`Error updating CSV: ${error.message}`);
  }
});

// Handle POST request for backward compatibility
app.post('/update-admin-roles', async (req, res) => {
  try {
    console.log('Received POST update request with body:', req.body);
    
    if (!req.body || !req.body.csvContent) {
      return res.status(400).send('No CSV content provided');
    }

    await fs.writeFile(ADMIN_CSV_PATH, req.body.csvContent);
    console.log('Successfully updated CSV file via POST');
    
    // Verify file was saved
    const savedContent = await fs.readFile(ADMIN_CSV_PATH, 'utf8');
    console.log('Saved CSV content:', savedContent);
    
    res.status(200).send('Updated successfully');
  } catch (error) {
    console.error('Error updating CSV via POST:', error);
    res.status(500).send(`Error updating CSV: ${error.message}`);
  }
});

// Start server
initServer().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Admin CSV path: ${ADMIN_CSV_PATH}`);
  });
});
