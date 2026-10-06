<#
.SYNOPSIS
    Restores the Daily Work PostgreSQL database from a dump made by backup-db.ps1.

.DESCRIPTION
    Copies the dump into the running Aspire Postgres container, drops and
    recreates the target database, then runs pg_restore.

    THIS IS DESTRUCTIVE: the current contents of the target database are
    dropped. You are prompted for confirmation unless -Force is passed.

    Stop the API before restoring (or the drop will fail on open connections);
    the script terminates leftover backends automatically, but a running API
    will immediately reconnect and can race the restore.

.PARAMETER DumpPath
    Path to a .dump file produced by backup-db.ps1. Defaults to the newest
    .dump in <repo>/backups.

.PARAMETER Database
    Database name to restore into. Defaults to 'dailywork'.

.PARAMETER Volume
    Docker volume the Postgres container mounts. Defaults to
    'dailywork-postgres-18-data'.

.PARAMETER Force
    Skip the confirmation prompt.

.EXAMPLE
    ./scripts/restore-db.ps1

.EXAMPLE
    ./scripts/restore-db.ps1 -DumpPath backups/dailywork-20260820-101500.dump -Force
#>
[CmdletBinding()]
param(
	[string]$DumpPath,
	[string]$Database = 'dailywork',
	[string]$Volume = 'dailywork-postgres-18-data',
	[switch]$Force
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

if (-not $DumpPath) {
	$backupDir = Join-Path $repoRoot 'backups'
	$latest = Get-ChildItem -Path $backupDir -Filter '*.dump' -ErrorAction SilentlyContinue |
		Sort-Object LastWriteTime -Descending | Select-Object -First 1
	if (-not $latest) { throw "No .dump files found in $backupDir. Pass -DumpPath explicitly." }
	$DumpPath = $latest.FullName
}

if (-not (Test-Path $DumpPath)) { throw "Dump file not found: $DumpPath" }
$DumpPath = (Resolve-Path $DumpPath).Path

# --- locate the running Postgres container -------------------------------
$containers = @(docker ps --filter "volume=$Volume" --format '{{.Names}}' | Where-Object { $_ })

if ($containers.Count -eq 0) {
	throw "No running container mounts volume '$Volume'. Start the app first: dotnet run --project aspire/DailyWork.AppHost"
}
if ($containers.Count -gt 1) {
	throw "Multiple running containers mount volume '$Volume': $($containers -join ', '). Resolve the ambiguity before restoring."
}

$container = $containers[0]

Write-Host "container : $container"
Write-Host "database  : $Database"
Write-Host "dump      : $DumpPath"
Write-Host ''

if (-not $Force) {
	Write-Host "This DROPS the '$Database' database and replaces it with the dump above." -ForegroundColor Yellow
	$answer = Read-Host "Type the database name ('$Database') to continue"
	if ($answer -ne $Database) {
		Write-Host 'Aborted.'
		return
	}
}

$remoteDump = "/tmp/restore-$([System.IO.Path]::GetFileName($DumpPath))"

function Invoke-Psql([string]$sql, [string]$onDb = 'postgres') {
	& docker exec $container sh -c "PGPASSWORD=`$POSTGRES_PASSWORD psql -U postgres -d $onDb -v ON_ERROR_STOP=1 -c ""$sql"""
	if ($LASTEXITCODE -ne 0) { throw "psql failed (exit $LASTEXITCODE): $sql" }
}

Write-Host 'copying dump into container...'
& docker cp $DumpPath "${container}:$remoteDump"
if ($LASTEXITCODE -ne 0) { throw "docker cp failed with exit code $LASTEXITCODE" }

try {
	Write-Host 'terminating open connections...'
	Invoke-Psql "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$Database' AND pid <> pg_backend_pid();"

	Write-Host 'dropping and recreating database...'
	Invoke-Psql "DROP DATABASE IF EXISTS ""$Database"";"
	Invoke-Psql "CREATE DATABASE ""$Database"";"

	Write-Host 'restoring...'
	& docker exec $container sh -c "PGPASSWORD=`$POSTGRES_PASSWORD pg_restore -U postgres -d $Database --no-owner --no-privileges --exit-on-error $remoteDump"
	if ($LASTEXITCODE -ne 0) { throw "pg_restore failed with exit code $LASTEXITCODE" }
}
finally {
	& docker exec $container sh -c "rm -f $remoteDump" 2>&1 | Out-Null
}

Write-Host ''
Write-Host "OK  restored '$Database' from $DumpPath"
Write-Host 'Restart the API so EF Core reconnects.'
