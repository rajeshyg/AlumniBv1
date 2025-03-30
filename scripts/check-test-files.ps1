# Get timestamps for PostService test files
Write-Host "`nChecking PostService test files:" -ForegroundColor Cyan
Get-Item "src\services\PostService.test.ts", "src\services\__tests__\PostService.test.ts" -ErrorAction SilentlyContinue | 
    Select-Object Name, LastWriteTime, Directory | 
    Format-Table -AutoSize

# Get timestamps for Posts test files
Write-Host "`nChecking Posts test files:" -ForegroundColor Cyan
Get-Item "src\pages\Posts.test.tsx", "src\pages\__tests__\Posts.test.tsx" -ErrorAction SilentlyContinue | 
    Select-Object Name, LastWriteTime, Directory | 
    Format-Table -AutoSize

# Get timestamp for PostsPage test file (marked for deletion)
Write-Host "`nChecking PostsPage test file:" -ForegroundColor Cyan
Get-Item "src\components\Posts\PostsPage.test.tsx" -ErrorAction SilentlyContinue | 
    Select-Object Name, LastWriteTime, Directory | 
    Format-Table -AutoSize
