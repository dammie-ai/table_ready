# TableReady Database Backup Script for Windows Task Scheduler
# This script runs the database backup and logs the result

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$logFile = Join-Path $projectRoot "backups\backup-log.txt"
$backupScript = Join-Path $projectRoot "src\scripts\backup-db.js"

function Write-Log {
    param([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $message"
    Add-Content -Path $logFile -Value $logEntry
    Write-Host $logEntry
}

try {
    Write-Log "Starting scheduled database backup..."

    Set-Location $projectRoot

    $env:NODE_ENV = "production"
    $result = node $backupScript 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Log "Backup completed successfully"
        Write-Log $result
    } else {
        Write-Log "Backup failed with exit code $LASTEXITCODE"
        Write-Log $result
        exit 1
    }
}
catch {
    Write-Log "Backup script error: $($_.Exception.Message)"
    exit 1
}
