<#
.SYNOPSIS
    Backs up the Daily Work PostgreSQL database to a local dump file.

.DESCRIPTION
    Finds the Aspire-managed Postgres container by the data volume it mounts,
    runs pg_dump inside it, and writes a compressed custom-format dump plus a
    plain-text .sql copy to the backups/ directory.

    The custom-format dump (.dump) is what restore-db.ps1 consumes. The .sql
    file is there so you can eyeball or grep the contents without a restore.

.PARAMETER OutputDirectory
    Where to write the dump. Defaults to <repo>/backups.

.PARAMETER Database
    Database name to dump. Defaults to 'dailywork'.

.PARAMETER Volume
    Docker volume the Postgres container mounts. Defaults to
    'dailywork-postgres-18-data' (see aspire/DailyWork.AppHost/Program.cs).
    The older 'dailywork-postgres-data' volume holds the pre-upgrade PG17 cluster.

.EXAMPLE
    ./scripts/backup-db.ps1

.EXAMPLE
    ./scripts/backup-db.ps1 -OutputDirectory D:\backups\pre-aspire-upgrade
#>
[CmdletBinding()]
param(
	[string]$OutputDirectory,
	[string]$Database = 'dailywork',
	[string]$Volume = 'dailywork-postgres-18-data'
)

$ErrorActionPreference = 'Stop'

if (-not $OutputDirectory) {
	$repoRoot = Split-Path -Parent $PSScriptRoot
	$OutputDirectory = Join-Path $repoRoot 'backups'
}

# --- locate the running Postgres container -------------------------------
$containers = @(docker ps --filter "volume=$Volume" --format '{{.Names}}' | Where-Object { $_ })

if ($containers.Count -eq 0) {
	throw "No running container mounts volume '$Volume'. Start the app first: dotnet run --project aspire/DailyWork.AppHost"
}
if ($containers.Count -gt 1) {
	throw "Multiple running containers mount volume '$Volume': $($containers -join ', '). Resolve the ambiguity before backing up."
}

$container = $containers[0]
$image = docker inspect --format '{{.Config.Image}}' $container
Write-Host "container : $container ($image)"

# --- run the dumps -------------------------------------------------------
if (-not (Test-Path $OutputDirectory)) {
	New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dumpPath = Join-Path $OutputDirectory "$Database-$stamp.dump"
$sqlPath = Join-Path $OutputDirectory "$Database-$stamp.sql"

# PGPASSWORD is read from the container's own environment, so the generated
# Aspire password never has to leave the container or land in this script.
$dumpCmd = "PGPASSWORD=`$POSTGRES_PASSWORD pg_dump -U postgres -d $Database -Fc"
$sqlCmd = "PGPASSWORD=`$POSTGRES_PASSWORD pg_dump -U postgres -d $Database --clean --if-exists"

Write-Host "dumping   : $Database -> $dumpPath"
# Binary-safe: cmd.exe redirection keeps PowerShell's text pipeline from
# corrupting the custom-format stream.
& cmd.exe /c "docker exec $container sh -c ""$dumpCmd"" > ""$dumpPath"""
if ($LASTEXITCODE -ne 0) { throw "pg_dump (custom format) failed with exit code $LASTEXITCODE" }

Write-Host "dumping   : $Database -> $sqlPath"
& cmd.exe /c "docker exec $container sh -c ""$sqlCmd"" > ""$sqlPath"""
if ($LASTEXITCODE -ne 0) { throw "pg_dump (plain SQL) failed with exit code $LASTEXITCODE" }

$dumpSize = (Get-Item $dumpPath).Length
if ($dumpSize -eq 0) { throw "Dump file is empty: $dumpPath" }

Write-Host ''
Write-Host "OK  $dumpPath  ($([math]::Round($dumpSize / 1KB, 1)) KB)"
Write-Host "OK  $sqlPath   ($([math]::Round((Get-Item $sqlPath).Length / 1KB, 1)) KB)"
Write-Host ''
Write-Host "restore with: ./scripts/restore-db.ps1 -DumpPath ""$dumpPath"""
