# Shellvyn Host Agent Installer for Windows (PowerShell)
# Repository: https://github.com/reck98/Shellvyn
# Usage: irm https://raw.githubusercontent.com/reck98/Shellvyn/main/scripts/install-windows.ps1 | iex

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ErrorActionPreference = "Stop"

$Repo = "reck98/Shellvyn"
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\Shellvyn"
$BinName = "shellvyn.exe"
$TargetPath = Join-Path $InstallDir $BinName

Write-Host "==> Installing Shellvyn Host Agent for Windows..." -ForegroundColor Cyan

# 1. Ensure Target Directory Exists
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$AssetFile = "shellvyn-windows-x86_64.zip"
$DownloadUrl = "https://github.com/$Repo/releases/latest/download/$AssetFile"
$ZipPath = Join-Path $env:TEMP $AssetFile

Write-Host "==> Downloading $AssetFile from GitHub Releases..." -ForegroundColor Cyan

$DownloadSuccess = $false
try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipPath -UseBasicParsing
    $DownloadSuccess = $true
} catch {
    Write-Host "Notice: Release asset download not available yet." -ForegroundColor Yellow
}

if ($DownloadSuccess) {
    Write-Host "==> Extracting $BinName to $InstallDir..." -ForegroundColor Cyan
    $TempExtract = Join-Path $env:TEMP "shellvyn_extracted"
    if (Test-Path $TempExtract) { Remove-Item -Recurse -Force $TempExtract }
    Expand-Archive -Path $ZipPath -DestinationPath $TempExtract -Force

    $FoundExe = Get-ChildItem -Path $TempExtract -Filter $BinName -Recurse | Select-Object -First 1
    if ($FoundExe) {
        Copy-Item -Path $FoundExe.FullName -Destination $TargetPath -Force
    } else {
        # Check if binary was named shellvyn-agent.exe
        $FoundAgent = Get-ChildItem -Path $TempExtract -Filter "shellvyn*.exe" -Recurse | Select-Object -First 1
        if ($FoundAgent) {
            Copy-Item -Path $FoundAgent.FullName -Destination $TargetPath -Force
        } else {
            throw "Executable not found in extracted archive."
        }
    }
    Remove-Item -Recurse -Force $TempExtract
    Remove-Item -Force $ZipPath
} else {
    # Fallback to local release build or cargo build if in source repo
    $LocalRelease = Join-Path $PSScriptRoot "..\target\release\shellvyn-agent.exe"
    if (Test-Path $LocalRelease) {
        Write-Host "==> Installing from local cargo target build..." -ForegroundColor Cyan
        Copy-Item -Path $LocalRelease -Destination $TargetPath -Force
    } elseif (Get-Command cargo -ErrorAction SilentlyContinue) {
        Write-Host "==> Building shellvyn-agent via Cargo..." -ForegroundColor Cyan
        cargo install --git "https://github.com/$Repo.git" shellvyn-agent --root (Join-Path $env:LOCALAPPDATA "Programs\Shellvyn")
    } else {
        Write-Host "Error: Unable to download binary and Cargo is not installed." -ForegroundColor Red
        Write-Host "Please visit https://github.com/$Repo/releases to download manually." -ForegroundColor Red
        exit 1
    }
}

# 2. Add InstallDir to User Environment PATH if not present
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    Write-Host "==> Adding $InstallDir to User PATH..." -ForegroundColor Cyan
    $NewPath = "$UserPath;$InstallDir"
    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    $env:Path = "$env:Path;$InstallDir"
}

Write-Host "`n✓ Shellvyn installed successfully to $TargetPath" -ForegroundColor Green
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor DarkGreen
Write-Host "║             SHELLVYN HOST AGENT READY                      ║" -ForegroundColor DarkGreen
Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor DarkGreen
Write-Host "║  Run command: shellvyn share                               ║" -ForegroundColor White
Write-Host "║  Help:        shellvyn --help                              ║" -ForegroundColor White
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor DarkGreen
Write-Host ""
