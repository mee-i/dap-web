$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$webDir = Split-Path -Parent $scriptDir
$rootDir = Split-Path -Parent $webDir
$publicDir = Join-Path $webDir "public"

if (-not (Test-Path $publicDir)) {
    New-Item -ItemType Directory -Path $publicDir | Out-Null
}

Write-Host "Building DAP WebAssembly binary..." -ForegroundColor Cyan
Push-Location $rootDir
try {
    $env:GOOS = "js"
    $env:GOARCH = "wasm"
    go build -ldflags="-s -w" -o (Join-Path $publicDir "dap.wasm") ./cmd/dap-wasm
} finally {
    Remove-Item Env:GOOS -ErrorAction SilentlyContinue
    Remove-Item Env:GOARCH -ErrorAction SilentlyContinue
    Pop-Location
}

$goroot = (go env GOROOT).Trim()
$wasmExecCandidates = @(
    (Join-Path $goroot "lib\wasm\wasm_exec.js"),
    (Join-Path $goroot "misc\wasm\wasm_exec.js")
)

$wasmExecSrc = $null
foreach ($candidate in $wasmExecCandidates) {
    if (Test-Path $candidate) {
        $wasmExecSrc = $candidate
        break
    }
}

if (-not $wasmExecSrc) {
    throw "Could not find wasm_exec.js under GOROOT ($goroot)"
}

Copy-Item -Force $wasmExecSrc (Join-Path $publicDir "wasm_exec.js")

$sizeKB = [math]::Round((Get-Item (Join-Path $publicDir "dap.wasm")).Length / 1KB, 1)
Write-Host "Done! Generated public/dap.wasm ($sizeKB KB) and copied wasm_exec.js." -ForegroundColor Green
