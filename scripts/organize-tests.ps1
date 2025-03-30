# Script to organize test files into __tests__ folders

# Function to create __tests__ folder and move test files
function Organize-TestFiles {
    param (
        [string]$directory
    )

    Write-Host "`nProcessing directory: $directory" -ForegroundColor Cyan

    # Get all test files in the current directory (not in __tests__)
    $testFiles = Get-ChildItem -Path $directory -Filter "*.test.*" -File |
        Where-Object { $_.DirectoryName -notlike "*\__tests__*" }

    foreach ($file in $testFiles) {
        # Create __tests__ directory if it doesn't exist
        $testsDir = Join-Path $file.Directory.FullName "__tests__"
        if (-not (Test-Path $testsDir)) {
            Write-Host "Creating __tests__ directory in: $($file.Directory.FullName)" -ForegroundColor Yellow
            New-Item -ItemType Directory -Path $testsDir | Out-Null
        }

        # Move file to __tests__ directory
        $destination = Join-Path $testsDir $file.Name
        Write-Host "Moving $($file.Name) to __tests__ folder" -ForegroundColor Green
        Move-Item -Path $file.FullName -Destination $destination -Force
    }

    # Process subdirectories (except node_modules, dist, and __tests__)
    Get-ChildItem -Path $directory -Directory |
        Where-Object { $_.Name -notin @("node_modules", "dist", "__tests__") } |
        ForEach-Object { Organize-TestFiles $_.FullName }
}

# Start processing from src directory
$srcPath = "src"
Write-Host "Starting test files organization..." -ForegroundColor Cyan
Organize-TestFiles $srcPath

# Verify results
Write-Host "`nVerifying test files organization:" -ForegroundColor Cyan
Get-ChildItem -Path $srcPath -Recurse -Filter "*.test.*" | 
    Select-Object FullName, LastWriteTime | 
    Format-Table -AutoSize

Write-Host "`nDone! Please verify the changes and run tests." -ForegroundColor Green
Write-Host "Run 'npm run test:summary' to check if all tests still pass." -ForegroundColor Yellow