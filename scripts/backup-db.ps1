# Daily backup for the VSOL Asset Management PostgreSQL database (vam-db-1 container).
# Runs via a Windows Scheduled Task at 10:00 AM. Keeps the last 30 daily backups.

$ErrorActionPreference = "Stop"

$backupDir = "C:\Gitlab\VAM\backups"
$logFile = Join-Path $backupDir "backup.log"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$containerFile = "/tmp/vam_backup_$timestamp.dump"
$localFile = Join-Path $backupDir "vam_backup_$timestamp.dump"
$retentionCount = 30

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

function Write-Log($message) {
    $line = "$(Get-Date -Format o) - $message"
    Add-Content -Path $logFile -Value $line
}

try {
    docker exec vam-db-1 pg_dump -U vam -d vam -F c -f $containerFile
    if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }

    docker cp "vam-db-1:$containerFile" $localFile
    if ($LASTEXITCODE -ne 0) { throw "docker cp failed with exit code $LASTEXITCODE" }

    docker exec vam-db-1 rm -f $containerFile

    $size = (Get-Item $localFile).Length
    Write-Log "Backup succeeded: $localFile ($size bytes)"

    # Retention: keep only the most recent $retentionCount backups.
    Get-ChildItem -Path $backupDir -Filter "vam_backup_*.dump" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip $retentionCount |
        ForEach-Object {
            Remove-Item $_.FullName -Force
            Write-Log "Removed old backup: $($_.Name)"
        }
}
catch {
    Write-Log "Backup FAILED: $_"
    exit 1
}
