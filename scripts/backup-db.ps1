# Daily backup for the IT Asset Management PostgreSQL database (itam-db-1 container).
# Runs via a Windows Scheduled Task at 10:00 AM. Keeps the last 30 daily backups
# locally, and mirrors the same retention window into OneDrive (if signed in on
# this machine) so a local disk/machine failure doesn't also mean losing backups.

$ErrorActionPreference = "Stop"

$projectRoot = "C:\Gitlab\VAM"
$backupDir = Join-Path $projectRoot "backups"
$logFile = Join-Path $backupDir "backup.log"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$containerFile = "/tmp/itam_backup_$timestamp.dump"
$localFile = Join-Path $backupDir "itam_backup_$timestamp.dump"
$retentionCount = 30
$containerName = "itam-db-1"

# OneDrive mirror: $env:OneDrive points at the signed-in account's local sync
# folder (set by the OneDrive client); copying into it is enough, OneDrive
# uploads automatically. Skipped entirely if OneDrive isn't signed in.
$oneDriveRoot = $env:OneDrive
$oneDriveBackupDir = if ($oneDriveRoot) { Join-Path $oneDriveRoot "ITAM-Backups" } else { $null }

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

function Write-Log($message) {
    $line = "$(Get-Date -Format o) - $message"
    Add-Content -Path $logFile -Value $line
}

# Read POSTGRES_USER / POSTGRES_DB from .env so this keeps working regardless of
# what those are named for a given deployment.
$envFile = Join-Path $projectRoot ".env"
$pgUser = "itam"
$pgDb = "itam"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*POSTGRES_USER\s*=\s*(.+)$') { $pgUser = $Matches[1].Trim() }
        if ($_ -match '^\s*POSTGRES_DB\s*=\s*(.+)$') { $pgDb = $Matches[1].Trim() }
    }
}

try {
    docker exec $containerName pg_dump -U $pgUser -d $pgDb -F c -f $containerFile
    if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }

    docker cp "${containerName}:$containerFile" $localFile
    if ($LASTEXITCODE -ne 0) { throw "docker cp failed with exit code $LASTEXITCODE" }

    docker exec $containerName rm -f $containerFile

    $size = (Get-Item $localFile).Length
    Write-Log "Backup succeeded: $localFile ($size bytes)"

    # Retention: keep only the most recent $retentionCount backups.
    Get-ChildItem -Path $backupDir -Filter "itam_backup_*.dump" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip $retentionCount |
        ForEach-Object {
            Remove-Item $_.FullName -Force
            Write-Log "Removed old backup: $($_.Name)"
        }

    # Mirror into OneDrive so a local machine/disk failure doesn't also wipe backups.
    if ($oneDriveBackupDir) {
        try {
            if (-not (Test-Path $oneDriveBackupDir)) {
                New-Item -ItemType Directory -Path $oneDriveBackupDir -Force | Out-Null
            }
            Copy-Item -Path $localFile -Destination $oneDriveBackupDir -Force

            Get-ChildItem -Path $oneDriveBackupDir -Filter "itam_backup_*.dump" |
                Sort-Object LastWriteTime -Descending |
                Select-Object -Skip $retentionCount |
                ForEach-Object {
                    Remove-Item $_.FullName -Force
                    Write-Log "Removed old OneDrive backup: $($_.Name)"
                }

            Write-Log "Mirrored to OneDrive: $oneDriveBackupDir"
        }
        catch {
            # OneDrive mirror failing should not fail the whole backup job.
            Write-Log "OneDrive mirror FAILED (local backup still succeeded): $_"
        }
    }
    else {
        Write-Log "OneDrive not detected (`$env:OneDrive unset) - skipped mirror"
    }
}
catch {
    Write-Log "Backup FAILED: $_"
    exit 1
}
