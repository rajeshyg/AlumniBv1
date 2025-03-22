// This script copies images from /src/img to /public/img during build

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'img');
const destDir = path.join(__dirname, '..', 'public', 'img');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy all files from sourceDir to destDir
fs.readdirSync(sourceDir).forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const destPath = path.join(destDir, file);
  
  // Skip directories
  if (fs.statSync(sourcePath).isDirectory()) return;
  
  // Copy the file
  fs.copyFileSync(sourcePath, destPath);
  console.log(`Copied: ${file}`);
});

console.log('All images copied to public/img!');
