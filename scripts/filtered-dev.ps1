# Start the application and filter out vite logs
$job = Start-Job -ScriptBlock { cd $using:PWD; npm run dev:full }

# Display filtered output
while ($true) {
    $output = Receive-Job -Job $job
    if ($output) {
        $output | Where-Object { $_ -notmatch "vite:" } | ForEach-Object { Write-Host $_ }
    }
    
    if ($job.State -ne "Running") {
        break
    }
    
    Start-Sleep -Milliseconds 100
}

# Cleanup job
Remove-Job -Job $job -Force
