# Check Git history for each test file
Write-Host "`nGit history for PostService test files:" -ForegroundColor Cyan
git log --follow --format="%ad %h %s" --date=short -- "src/services/PostService.test.ts"
git log --follow --format="%ad %h %s" --date=short -- "src/services/__tests__/PostService.test.ts"

Write-Host "`nGit history for Posts test files:" -ForegroundColor Cyan
git log --follow --format="%ad %h %s" --date=short -- "src/pages/Posts.test.tsx"
git log --follow --format="%ad %h %s" --date=short -- "src/pages/__tests__/Posts.test.tsx"