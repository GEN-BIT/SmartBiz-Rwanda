$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# PATHS
# ------------------------------------------------------------

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$portable = Join-Path $root "portable"
$node = Join-Path $portable "node\node.exe"
$mysqlExe = Join-Path $portable "mysql-8.0.45-winx64\bin\mysqld.exe"
$config = Join-Path $portable "my.ini"
$run = Join-Path $portable "run"
$logs = Join-Path $portable "logs"

$backendDir = Join-Path $root "backend"
$frontendScript = Join-Path $root "deployment\frontend-server.js"

New-Item -ItemType Directory -Force -Path $run, $logs | Out-Null

# ------------------------------------------------------------
# PROCESS AND PORT HELPERS
# ------------------------------------------------------------

function Get-PortOwnerProcess([int]$port) {

    $netstatPath = Join-Path $env:SystemRoot "System32\netstat.exe"
    $netstatLines = & $netstatPath -ano -p tcp 2>$null

    foreach ($line in $netstatLines) {
        $parts = ([string]$line).Trim() -split '\s+'

        if ($parts.Count -lt 5) { continue }
        if ($parts[0] -ne "TCP") { continue }
        if ($parts[3] -ne "LISTENING") { continue }
        if ($parts[1] -notmatch ":$port$") { continue }
        if ($parts[4] -notmatch '^\d+$') { continue }

        $ownerId = [int]$parts[4]

        $owner = Get-CimInstance Win32_Process `
            -Filter "ProcessId = $ownerId" `
            -ErrorAction SilentlyContinue

        if ($owner) {
            return $owner
        }
    }

    # Fallback to Windows TCP listener information.
    $connections = @(
        Get-NetTCPConnection -State Listen -LocalPort $port `
            -ErrorAction SilentlyContinue
    )

    foreach ($connection in $connections) {
        $ownerId = [int]$connection.OwningProcess

        $owner = Get-CimInstance Win32_Process `
            -Filter "ProcessId = $ownerId" `
            -ErrorAction SilentlyContinue

        if ($owner) {
            return $owner
        }
    }

    return $null
}
function Test-TcpPort([int]$port) {

    $client = New-Object System.Net.Sockets.TcpClient
    $async = $null

    try {
        $async = $client.BeginConnect("127.0.0.1", $port, $null, $null)

        if (!$async.AsyncWaitHandle.WaitOne(1000, $false)) {
            return $false
        }

        $client.EndConnect($async)
        return $true
    }
    catch {
        return $false
    }
    finally {
        if ($async -and $async.AsyncWaitHandle) {
            $async.AsyncWaitHandle.Close()
        }

        $client.Close()
    }
}

function Wait-Port([int]$port, [int]$seconds) {

    $deadline = (Get-Date).AddSeconds($seconds)

    while ((Get-Date) -lt $deadline) {

        if (Test-TcpPort $port) {
            return $true
        }

        Start-Sleep -Milliseconds 500
    }

    return $false
}

function Test-PortableNode($process, [string]$scriptName) {

    if (!$process) { return $false }

    return (
        $process.ExecutablePath -ieq $node -and
        $process.CommandLine -like "*$scriptName*"
    )
}

function Test-PortableMySQL($process) {

    if (!$process -or !$process.ProcessId) {
        return $false
    }

    # Verify the listener process and its parent chain.
    # This supports portable MySQL launcher/child process arrangements.
    $currentId = [int]$process.ProcessId
    $expectedPath = [System.IO.Path]::GetFullPath($mysqlExe).TrimEnd("\")

    for ($i = 0; $i -lt 4 -and $currentId -gt 0; $i++) {

        $candidate = Get-CimInstance Win32_Process `
            -Filter "ProcessId = $currentId" `
            -ErrorAction SilentlyContinue

        if (!$candidate) {
            return $false
        }

        if ($candidate.ExecutablePath) {
            try {
                $actualPath = [System.IO.Path]::GetFullPath(
                    $candidate.ExecutablePath
                ).TrimEnd("\")

                if ([string]::Equals(
                    $actualPath,
                    $expectedPath,
                    [System.StringComparison]::OrdinalIgnoreCase
                )) {
                    return $true
                }
            }
            catch {
                return $false
            }
        }

        $currentId = [int]$candidate.ParentProcessId
    }

    return $false
}
function Get-MySQLShutdownPid($listener) {

    if (!$listener) { return $null }

    # MySQL may have a launcher parent and a listener child.
    $parent = Get-CimInstance Win32_Process -Filter `
        "ProcessId = $($listener.ParentProcessId)" `
        -ErrorAction SilentlyContinue

    if (Test-PortableMySQL $parent) {
        return $parent.ProcessId
    }

    return $listener.ProcessId
}

function Save-ServicePid([string]$name, [int]$processId) {

    Set-Content -Path (Join-Path $run "$name.pid") `
        -Value $processId -Encoding ASCII
}

# ------------------------------------------------------------
# PRE-FLIGHT
# ------------------------------------------------------------

if (!(Test-Path $node)) {
    throw "Portable Node.js is missing: $node"
}

if (!(Test-Path $mysqlExe)) {
    throw "Portable MySQL is missing: $mysqlExe"
}

if (!(Test-Path (Join-Path $backendDir ".env"))) {
    throw "backend\.env is missing."
}

if (!(Test-Path (Join-Path $backendDir "server.js"))) {
    throw "backend\server.js is missing."
}

if (!(Test-Path $frontendScript)) {
    throw "deployment\frontend-server.js is missing."
}

Write-Host "`n========================================"
Write-Host "         SMARTBIZ-RWANDA STARTUP"
Write-Host "             MASTON DESIGN"
Write-Host '              $20 MILLION'
Write-Host "                =>COST"
Write-Host "========================================"

# ------------------------------------------------------------
# PORTABLE MYSQL CONFIGURATION
# ------------------------------------------------------------

# Only port 3307 is used by this portable instance.
# No system MySQL configuration is changed.

$r = $root.Replace("\", "/")

$configText = @"
[mysqld]
basedir=$r/portable/mysql-8.0.45-winx64
datadir=$r/portable/data
port=3307
bind-address=127.0.0.1
mysqlx=0
character-set-server=utf8mb4
collation-server=utf8mb4_0900_ai_ci
log-error=$r/portable/logs/mysql-error.log

[client]
host=127.0.0.1
port=3307
default-character-set=utf8mb4
"@

Set-Content -Path $config -Value $configText -Encoding ASCII

# ------------------------------------------------------------
# MYSQL START / REUSE
# ------------------------------------------------------------

Write-Host "`n[1/3] Checking MySQL Server..." -ForegroundColor Cyan

function Get-PortableMySQLProcess {

    $expectedExe = [System.IO.Path]::GetFullPath($mysqlExe)
    $expectedConfig = [System.IO.Path]::GetFullPath($config)

    $candidates = @(
        Get-CimInstance Win32_Process -Filter "Name = 'mysqld.exe'" `
            -ErrorAction SilentlyContinue |
        Where-Object {
            if (!$_.ExecutablePath -or !$_.CommandLine) {
                return $false
            }

            try {
                $actualExe = [System.IO.Path]::GetFullPath($_.ExecutablePath)

                return (
                    [string]::Equals(
                        $actualExe,
                        $expectedExe,
                        [System.StringComparison]::OrdinalIgnoreCase
                    ) -and
                    $_.CommandLine.IndexOf(
                        $expectedConfig,
                        [System.StringComparison]::OrdinalIgnoreCase
                    ) -ge 0
                )
            }
            catch {
                return $false
            }
        } |
        Sort-Object CreationDate -Descending
    )

    if ($candidates.Count -gt 0) {
        return $candidates[0]
    }

    return $null
}

Write-Host "`n[1/3] Checking MySQL Server..." -ForegroundColor Cyan

$mysqlCandidate = Get-PortableMySQLProcess

if ($mysqlCandidate) {

    if (!(Test-TcpPort 3307)) {
        throw "The portable MySQL process exists but port 3307 is not responding. No process was stopped."
    }

    $mysqlPid = Get-MySQLShutdownPid $mysqlCandidate

    Write-Host "Portable MySQL Server already running. Reusing it." -ForegroundColor Green
}
elseif (Test-TcpPort 3307) {

    throw "Port 3307 is responding, but its process is not verified as this project's portable MySQL. Nothing was stopped."
}
else {

    Write-Host "Starting portable MySQL Server..."

    Start-Process -FilePath $mysqlExe `
        -ArgumentList "--defaults-file=`"$config`"" `
        -WorkingDirectory $portable `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logs "mysql.log") `
        -RedirectStandardError (Join-Path $logs "mysql-error.log")

    if (!(Wait-Port 3307 90)) {
        throw "MySQL Server did not become ready. Check portable\logs\mysql-error.log."
    }

    $mysqlCandidate = $null

    for ($attempt = 0; $attempt -lt 20; $attempt++) {

        $mysqlCandidate = Get-PortableMySQLProcess

        if ($mysqlCandidate) {
            break
        }

        Start-Sleep -Milliseconds 500
    }

    if (!$mysqlCandidate) {
        throw "MySQL responds, but its portable process could not be verified. No process was stopped."
    }

    if (!(Test-TcpPort 3307)) {
        throw "The portable MySQL process was found, but port 3307 is not responding."
    }

    $mysqlPid = Get-MySQLShutdownPid $mysqlCandidate

    Write-Host "Portable MySQL Server started and verified." -ForegroundColor Green
}

Save-ServicePid "mysql" ([int]$mysqlPid)

# ------------------------------------------------------------
# BACKEND START / REUSE
# ------------------------------------------------------------

Write-Host "`n[2/3] Checking SmartBiz backend..." -ForegroundColor Cyan

$backendListener = Get-PortOwnerProcess 5000

if ($backendListener) {

    if (!(Test-PortableNode $backendListener "server.js")) {
        throw "Port 5000 is occupied by an unverified process. Nothing was stopped."
    }

    $backendPid = $backendListener.ProcessId

    Write-Host "SmartBiz backend already running. Reusing it." -ForegroundColor Green
}
elseif (Test-TcpPort 5000) {

    throw "Port 5000 accepts connections but its owner could not be verified. No duplicate backend was started."
}
else {

    Write-Host "Starting SmartBiz backend..."

    Start-Process -FilePath $node `
        -ArgumentList "server.js" `
        -WorkingDirectory $backendDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logs "backend.log") `
        -RedirectStandardError (Join-Path $logs "backend-error.log") |
        Out-Null

    if (!(Wait-Port 5000 45)) {
        throw "Backend did not become ready. Check portable\logs\backend-error.log."
    }

    # Verify the portable backend process directly after the port becomes reachable.
    # The port was confirmed free before this script launched the backend.
    $backendProcess = Get-CimInstance Win32_Process |
        Where-Object {
            $_.Name -ieq "node.exe" -and
            $_.ExecutablePath -ieq $node -and
            $_.CommandLine -like "*server.js*"
        } |
        Sort-Object CreationDate -Descending |
        Select-Object -First 1

    if (!$backendProcess -or !(Test-TcpPort 5000)) {
        throw "Backend process started, but verification failed. Check portable\logs\backend-error.log."
    }

    $backendPid = [int]$backendProcess.ProcessId

    Write-Host "SmartBiz backend started." -ForegroundColor Green
}

Save-ServicePid "backend" ([int]$backendPid)

# ------------------------------------------------------------
# FRONTEND START / REUSE
# ------------------------------------------------------------

Write-Host "`n[3/3] Checking SmartBiz frontend..." -ForegroundColor Cyan

$frontendListener = Get-PortOwnerProcess 5500

if ($frontendListener) {

    if (!(Test-PortableNode $frontendListener "frontend-server.js")) {
        throw "Port 5500 is occupied by an unverified process. Nothing was stopped."
    }

    $frontendPid = $frontendListener.ProcessId

    Write-Host "SmartBiz frontend already running. Reusing it." -ForegroundColor Green
}
elseif (Test-TcpPort 5500) {

    throw "Port 5500 accepts connections but its owner could not be verified. No duplicate frontend was started."
}
else {

    Write-Host "Starting SmartBiz frontend..."

    Start-Process -FilePath $node `
        -ArgumentList "frontend-server.js" `
        -WorkingDirectory (Join-Path $root "deployment") `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logs "frontend.log") `
        -RedirectStandardError (Join-Path $logs "frontend-error.log") |
        Out-Null

    if (!(Wait-Port 5500 30)) {
        throw "Frontend did not become ready. Check portable\logs\frontend-error.log."
    }

    # Verify the exact portable frontend process after the port becomes reachable.
    $frontendProcess = Get-CimInstance Win32_Process |
        Where-Object {
            $_.Name -ieq "node.exe" -and
            $_.ExecutablePath -ieq $node -and
            $_.CommandLine -like "*frontend-server.js*"
        } |
        Sort-Object CreationDate -Descending |
        Select-Object -First 1

    if (!$frontendProcess -or !(Test-TcpPort 5500)) {
        throw "Frontend process started, but verification failed. Check portable\logs\frontend-error.log."
    }

    $frontendPid = [int]$frontendProcess.ProcessId

    Write-Host "SmartBiz frontend started." -ForegroundColor Green
}

Save-ServicePid "frontend" ([int]$frontendPid)

# ------------------------------------------------------------
# FINAL HTTP HEALTH CHECKS
# ------------------------------------------------------------

Write-Host "`nChecking application health..." -ForegroundColor Cyan

$checks = @(
    "http://127.0.0.1:5000/",
    "http://127.0.0.1:5500/health",
    "http://127.0.0.1:5500/login.html"
)

foreach ($url in $checks) {

    try {

        $response = Invoke-WebRequest -Uri $url `
            -UseBasicParsing -TimeoutSec 10

        if ([int]$response.StatusCode -ne 200) {
            throw "Unexpected HTTP status: $($response.StatusCode)"
        }

        Write-Host "OK - $url" -ForegroundColor Green
    }
    catch {

        throw "Application health check failed for $url : $($_.Exception.Message)"
    }
}

# ------------------------------------------------------------
# SUCCESS
# ------------------------------------------------------------

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "          SMARTBIZ IS READY" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "Frontend : http://localhost:5500"
Write-Host "Backend  : http://localhost:5000"
Write-Host "MySQL    : localhost:3307"

Write-Host "`nPortable service PIDs:"
Write-Host "MySQL    : $mysqlPid"
Write-Host "Backend  : $backendPid"
Write-Host "Frontend : $frontendPid"

Write-Host "`nAll startup and HTTP checks passed." -ForegroundColor Green

Start-Process "http://localhost:5500"




