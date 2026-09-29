$ErrorActionPreference = "Stop"

$file = ".\juveria-ingestion-e2e.json"

if (-not (Test-Path $file)) {
    throw "Test JSON file missing"
}

Write-Host "=== FILE DIAGNOSTIC ==="

$bytes = [System.IO.File]::ReadAllBytes(
    (Resolve-Path $file)
)

Write-Host "File size =" $bytes.Length

if ($bytes.Length -ge 3) {
    Write-Host "First bytes =" $bytes[0] $bytes[1] $bytes[2]
}

$text = [System.IO.File]::ReadAllText(
    (Resolve-Path $file)
)

try {
    $null = $text | ConvertFrom-Json
    Write-Host "POWERSHELL_JSON_PARSE = PASS"
}
catch {
    Write-Host "POWERSHELL_JSON_PARSE = FAIL"
    throw
}

# Rewrite explicitly as UTF-8 WITHOUT BOM.
[System.IO.File]::WriteAllText(
    (Resolve-Path $file),
    $text.TrimStart([char]0xFEFF),
    [System.Text.UTF8Encoding]::new($false)
)

$after = [System.IO.File]::ReadAllBytes(
    (Resolve-Path $file)
)

Write-Host "Rewritten first bytes =" $after[0] $after[1] $after[2]

# Verify with Node, the same runtime family as Nest.
node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('juveria-ingestion-e2e.json','utf8')); console.log('NODE_JSON_PARSE = PASS')"

if ($LASTEXITCODE -ne 0) {
    throw "NODE JSON PARSE FAILED"
}

Write-Host ""
Write-Host "JSON_FILE_NORMALIZED = PASS"

# Run existing E2E again.
powershell -ExecutionPolicy Bypass -File ".\run-json-ingestion-e2e.ps1"

exit $LASTEXITCODE
