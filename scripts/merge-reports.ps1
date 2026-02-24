#!/usr/bin/env pwsh
# Merge Playwright test reports from blob-report/ and blob-report_full/
# PowerShell version for Windows environments.
# Usage: .\merge-reports.ps1 -OutputFolder "blob-report_merge" -Open

param(
    [string]$SourceFolder1 = "blob-report",
    [string]$SourceFolder2 = "blob-report_full",
    [string]$OutputFolder = "blob-report_merge",
    [string]$ConfigPath = "playq/config/playwright/merge.config.js",
    [switch]$Open = $false,
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

$cwd = Get-Location
Write-Host "🔄 Starting report merge process..." -ForegroundColor Cyan
Write-Host "   Working directory: $cwd" -ForegroundColor Gray

# Validate source folders exist
$source1Path = Join-Path $cwd $SourceFolder1
$source2Path = Join-Path $cwd $SourceFolder2

$source1Exists = Test-Path $source1Path
$source2Exists = Test-Path $source2Path

if (-not $source1Exists -and -not $source2Exists) {
    Write-Host "❌ No blob report folders found!" -ForegroundColor Red
    Write-Host "   Expected: $source1Path or $source2Path" -ForegroundColor Yellow
    exit 1
}

# Create output folder
$outputPath = Join-Path $cwd $OutputFolder
if (Test-Path $outputPath) {
    Write-Host "🗑️  Removing existing output folder: $outputPath" -ForegroundColor Yellow
    Remove-Item $outputPath -Recurse -Force
}

New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
Write-Host "✅ Created output folder: $outputPath" -ForegroundColor Green

# Copy blob reports from source folders
$filesCopied = 0

if ($source1Exists) {
    Write-Host "📋 Scanning: $SourceFolder1" -ForegroundColor Cyan
    $files = Get-ChildItem -Path $source1Path -Filter "report-*" -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        Copy-Item -Path $file.FullName -Destination $outputPath -Force
        Write-Host "   ✅ Copied: $($file.Name)"
        $filesCopied++
    }
}

if ($source2Exists) {
    Write-Host "📋 Scanning: $SourceFolder2" -ForegroundColor Cyan
    $files = Get-ChildItem -Path $source2Path -Filter "report-*" -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        Copy-Item -Path $file.FullName -Destination $outputPath -Force
        Write-Host "   ✅ Copied: $($file.Name)"
        $filesCopied++
    }
}

if ($filesCopied -eq 0) {
    Write-Host "⚠️  No report files found to merge" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Total files collected: $filesCopied" -ForegroundColor Green

# Check if config file exists
$configExists = Test-Path (Join-Path $cwd $ConfigPath)
if (-not $configExists) {
    Write-Host "⚠️  Config file not found: $ConfigPath" -ForegroundColor Yellow
    Write-Host "   Will proceed without config." -ForegroundColor Gray
}

# Build merge command
$mergeCmd = @("playwright", "merge-reports")
if ($configExists) {
    $mergeCmd += "-c", $ConfigPath
}
$mergeCmd += "--reporter", "html"
$mergeCmd += $outputPath

$cmdDisplay = "npx $($mergeCmd -join ' ')"
Write-Host "⚙️  Command: $cmdDisplay" -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "🧪 Dry run: not executing merge." -ForegroundColor Yellow
    exit 0
}

# Execute merge
Write-Host "🚀 Executing merge..." -ForegroundColor Cyan
try {
    & npx @mergeCmd
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host "✅ Merge completed successfully!" -ForegroundColor Green
        
        # Check if HTML report was generated
        $reportPath = Join-Path $cwd "playwright-report"
        if (Test-Path $reportPath) {
            Write-Host "📊 Report generated at: playwright-report/" -ForegroundColor Green
            
            if ($Open) {
                Write-Host "🌐 Opening report in browser..." -ForegroundColor Cyan
                & npx playwright show-report
            } else {
                Write-Host "💡 Tip: Run 'npx playwright show-report' to view the report" -ForegroundColor Cyan
            }
        }
    } else {
        Write-Host "❌ Merge failed with exit code: $exitCode" -ForegroundColor Red
        exit $exitCode
    }
} catch {
    Write-Host "❌ Error during merge: $_" -ForegroundColor Red
    exit 1
}

exit 0
