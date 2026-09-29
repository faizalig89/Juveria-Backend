$ErrorActionPreference = "Stop"

$file = ".\juveria-ingestion-e2e.json"

if (-not (Test-Path $file)) {
    throw "Test JSON file missing"
}

# Load existing proven fixture.
$json = Get-Content $file -Raw | ConvertFrom-Json

# Fresh invoice number so we preserve the previous test record.
$json.invoiceNumber = "JUVERIA-INGEST-E2E-002"

# Fix the one proven internal-rule failure.
$seller = $json.parties | Where-Object { $_.role -eq "SELLER" }

if (-not $seller) {
    throw "SELLER party missing from fixture"
}

$seller.electronicIdentifier = "0235"

# Write UTF-8 WITHOUT BOM.
$normalized = $json | ConvertTo-Json -Depth 20

[System.IO.File]::WriteAllText(
    (Resolve-Path $file),
    $normalized,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host "FIXTURE_UPDATED = PASS"

# Login.
$login = Invoke-RestMethod `
    -Uri "http://localhost:4000/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"authtest@adescare-demo.com","password":"Test@12345"}'

$token = $login.accessToken
if (-not $token) { $token = $login.access_token }
if (-not $token) { throw "LOGIN FAILED" }

Write-Host "LOGIN = PASS"

# Upload.
$responseFile = ".\juveria-upload-response-002.json"

& curl.exe `
    --silent `
    --show-error `
    --fail-with-body `
    -X POST `
    "http://localhost:4000/invoice-document/upload" `
    -H "Authorization: Bearer $token" `
    -F "file=@$file;type=application/json" `
    -o $responseFile

if ($LASTEXITCODE -ne 0) {
    if (Test-Path $responseFile) {
        Get-Content $responseFile -Raw
    }
    throw "UPLOAD FAILED"
}

$upload = Get-Content $responseFile -Raw | ConvertFrom-Json
$id = $upload.invoice.id

if (-not $id) {
    throw "UPLOAD FAILED - invoice ID missing"
}

Write-Host "UPLOAD = PASS"
Write-Host "NEW_INVOICE_ID =" $id

# Run full readiness pipeline.
$r = Invoke-RestMethod `
    -Uri "http://localhost:4000/compliance/invoice/$id/readiness" `
    -Method POST `
    -Headers @{ Authorization = "Bearer $token" }

$failed = @(
    $r.internal.results |
    Where-Object { $_.status -eq "FAIL" }
)

$skipped = @(
    $r.internal.results |
    Where-Object { $_.status -eq "SKIPPED" }
)

$passed = @(
    $r.internal.results |
    Where-Object { $_.status -eq "PASS" }
)

Write-Host ""
Write-Host "=== FINAL PIPELINE RESULT ==="
Write-Host "Invoice ID        =" $id
Write-Host "Invoice Number    =" $upload.invoice.invoiceNumber
Write-Host "Readiness         =" $r.readinessStatus
Write-Host "Internal total    =" @($r.internal.results).Count
Write-Host "Internal passed   =" $passed.Count
Write-Host "Internal failed   =" $failed.Count
Write-Host "Internal skipped  =" $skipped.Count
Write-Host "Official passed   =" $r.official.passed
Write-Host "Official failures =" $r.official.totalFailures
Write-Host "UBL generated     =" $r.ublGenerated

if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "=== INTERNAL FAILURES ==="
    $failed |
        Select-Object ruleCode,ruleName,field,message,actualValue |
        Format-List
}

if ($r.readinessStatus -ne "READY") {
    throw "FINAL ASSERT FAILED: invoice is NOT_READY"
}

if ($failed.Count -ne 0) {
    throw "FINAL ASSERT FAILED: internal failures exist"
}

if ($r.official.totalFailures -ne 0) {
    throw "FINAL ASSERT FAILED: official failures exist"
}

if (-not $r.official.passed) {
    throw "FINAL ASSERT FAILED: official validation did not pass"
}

if (-not $r.ublGenerated) {
    throw "FINAL ASSERT FAILED: UBL not generated"
}

Write-Host ""
Write-Host "=============================================="
Write-Host "JUVERIA JSON -> DATABASE -> UAE RULES"
Write-Host "-> UBL -> OFFICIAL PINT-AE = E2E PASS"
Write-Host "=============================================="
