$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$run = Join-Path $root "portable\run"
$node = Join-Path $root "portable\node\node.exe"
$mysqlExe = Join-Path $root "portable\mysql-8.0.45-winx64\bin\mysqld.exe"
$config = Join-Path $root "portable\my.ini"

function Get-ProcessById($id) {
    return Get-CimInstance Win32_Process -Filter "ProcessId = $id" `
        -ErrorAction SilentlyContinue
}

foreach ($name in @("frontend", "backend")) {
    $file = Join-Path $run "$name.pid"

    if (!(Test-Path $file)) {
        Write-Host "$name PID file not found; nothing to stop."
        continue
    }

    $rawId = (Get-Content $file -Raw).Trim()
    $processId = 0

    if (![int]::TryParse($rawId, [ref]$processId)) {
        Write-Warning "Invalid $name PID file. Leaving it for inspection."
        continue
    }

    $process = Get-ProcessById $processId

    if (!$process) {
        Write-Host "$name process is already stopped."
        Remove-Item $file -Force
        continue
    }

    $expectedScript = if ($name -eq "frontend") {
        "frontend-server.js"
    } else {
        "server.js"
    }

    if (
        $process.ExecutablePath -ieq $node -and
        $process.CommandLine -like "*$expectedScript*"
    ) {
        Stop-Process -Id $processId -Force
        Write-Host "Stopped SmartBiz $name."
        Remove-Item $file -Force
    }
    else {
        Write-Warning "$name PID does not match the portable SmartBiz process. It was NOT stopped."
    }
}

# Gracefully shut down only the verified MySQL Server instance.
$mysqlPidFile = Join-Path $run "mysql.pid"

if (Test-Path $mysqlPidFile) {
    $rawId = (Get-Content $mysqlPidFile -Raw).Trim()
    $mysqlPid = 0

    if (![int]::TryParse($rawId, [ref]$mysqlPid)) {
        throw "Invalid MySQL PID file. MySQL was not touched."
    }

    $mysqlProcess = Get-ProcessById $mysqlPid

    if (!$mysqlProcess) {
        Write-Host "Recorded MySQL Server process is already stopped."
        Remove-Item $mysqlPidFile -Force
    }
    elseif (
        $mysqlProcess.ExecutablePath -ieq $mysqlExe -and
        $mysqlProcess.CommandLine -like "*$config*"
    ) {
        Write-Host "Requesting graceful shutdown of verified MySQL Server ..."

        $helper = Join-Path $PSScriptRoot "shutdown-mysql.js"
        & $node $helper

        if ($LASTEXITCODE -ne 0) {
            throw "MySQL shutdown helper failed. PID file retained; check MySQL status."
        }

        $stopped = $false
        for ($i = 0; $i -lt 30; $i++) {
            if (!(Get-ProcessById $mysqlPid)) {
                $stopped = $true
                break
            }
            Start-Sleep -Seconds 1
        }

        if ($stopped) {
            Remove-Item $mysqlPidFile -Force
            Write-Host "MySQL Server stopped."
        }
        else {
            throw "MySQL has not exited yet. PID file retained; do not unplug the drive."
        }
    }
    else {
        Write-Warning "MySQL PID does not match this portable installation. MySQL Server was NOT stopped."
    }
}
else {
    Write-Host "No MySQL Server PID file found; MySQL was not touched."
}

Write-Host "`n========================================"
Write-Host "        WE HOPE TO SEE YOU SOON"
Write-Host "           MASTON A-K-A VAREK"
Write-Host "                   😎      "
Write-Host "========================================"
Write-Host "SmartBiz shutdown routine finished." -ForegroundColor Green
