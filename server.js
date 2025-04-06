import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors());

// Body parsers
app.use(express.json());
app.use(express.text());

// Define the CSV file path
const ADMIN_CSV_PATH = path.resolve(path.join(__dirname, 'public', 'admin-emails.csv'));

// Create public directory and initial CSV if they don't exist
async function ensureCSVExists() {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(ADMIN_CSV_PATH);
    await fs.mkdir(dir, { recursive: true });

    // Create CSV file with headers if it doesn't exist
    try {
      await fs.access(ADMIN_CSV_PATH);
    } catch {
      await fs.writeFile(ADMIN_CSV_PATH, 'email,role,studentid\n');
      console.log('Created initial CSV file at:', ADMIN_CSV_PATH);
    }
  } catch (error) {
    console.error('Error ensuring CSV exists:', error);
  }
}

// Ensure CSV exists on server startup
await ensureCSVExists();

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle PUT request for admin-emails.csv
app.put('/admin-emails.csv', async (req, res) => {
  try {
    console.log('Received PUT request for admin-emails.csv');
    await fs.writeFile(ADMIN_CSV_PATH, req.body);
    console.log('Successfully updated admin-emails.csv');
    res.status(200).send('Updated successfully');
  } catch (error) {
    console.error('Error updating CSV:', error);
    res.status(500).send(error.message);
  }
});

// Get current CSV content
app.get('/admin-emails.csv', async (req, res) => {
  try {
    const content = await fs.readFile(ADMIN_CSV_PATH, 'utf8');
    res.type('text/csv').send(content);
  } catch (error) {
    console.error('Error reading CSV:', error);
    res.status(500).send(error.message);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Admin CSV Path:', ADMIN_CSV_PATH);
});
