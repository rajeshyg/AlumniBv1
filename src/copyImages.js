// This script copies images from /src/img to /public/img during build

const fs = require('fs');
const path = require('path');

// Create a consistent logger similar to our other utilities
const buildLogger = {
  info: (message, context = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [BUILD:INFO] ${message}`, Object.keys(context).length ? context : '');
  },
  error: (message, error = null, context = {}) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [BUILD:ERROR] ${message}`, error || '', Object.keys(context).length ? context : '');
  },
  success: (message, context = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [BUILD:SUCCESS] ${message}`, Object.keys(context).length ? context : '');
  }
};

const sourceDir = path.join(__dirname, 'img');
const destDir = path.join(__dirname, '..', 'public', 'img');

// Track performance
const startTime = Date.now();
let copiedCount = 0;
let skippedCount = 0;
let errorCount = 0;

buildLogger.info('Starting image copy process', {
  sourceDir,
  destDir
});

try {
  // Check if source directory exists
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory does not exist: ${sourceDir}`);
  }

  // Create destination directory if it doesn't exist
  if (!fs.existsSync(destDir)) {
    buildLogger.info(`Creating destination directory: ${destDir}`);
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Get list of files to copy
  const files = fs.readdirSync(sourceDir);
  buildLogger.info(`Found ${files.length} files in source directory`);

  // Copy all files from sourceDir to destDir
  files.forEach(file => {
    try {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(destDir, file);
      
      // Get file stats for logging and checks
      const stats = fs.statSync(sourcePath);
      
      // Skip directories
      if (stats.isDirectory()) {
        buildLogger.info(`Skipping directory: ${file}`);
        skippedCount++;
        return;
      }
      
      // Copy the file
      fs.copyFileSync(sourcePath, destPath);
      copiedCount++;
      buildLogger.info(`Copied: ${file}`, {
        size: `${(stats.size / 1024).toFixed(2)} KB`,
        type: path.extname(file)
      });
    } catch (fileError) {
      errorCount++;
      buildLogger.error(`Failed to copy file: ${file}`, fileError);
    }
  });

  // Log summary
  const duration = Date.now() - startTime;
  buildLogger.success('Image copy process completed', {
    duration: `${duration}ms`,
    copied: copiedCount,
    skipped: skippedCount,
    errors: errorCount
  });
} catch (error) {
  buildLogger.error('Image copy process failed', error, {
    duration: `${Date.now() - startTime}ms`
  });
  // Indicate build failure with non-zero exit code
  process.exit(1);
}
