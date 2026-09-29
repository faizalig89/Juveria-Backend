$ErrorActionPreference = "Stop"

$source = ".\juveria-ingestion-e2e.json"
$bomFile = ".\juveria-bom-http-e2e.json"

if (-not (Test-Path $source)) {
    throw "SOURCE FIXTURE MISSING"
}

# Load our previously verified READY fixture.
$json = Get-Content $source -Raw | ConvertFrom-Json
$json.invoiceNumber = "JUVERIA-BOM-E2E-001"

$body = $json | ConvertTo-Json -Depth 20

# Deliberately create actual UTF-8 BOM bytes: EF BB BF.
$utf8 = [System.Text.Encoding]::UTF8.GetBytes($body)

$bytes = New-Object byte[] ($utf8.Length + 3)
$bytes[0] = 0xEF
$bytes[1] = 0xBB
$bytes[2] = 0xBF

[Array]::Copy(
    $utf8,
    0,
    $bytes,
    3,
    $utf8.Length
)

[System.IO.File]::WriteAllBytes(
    (Join-Path $PWD "juveria-bom-http-e2e.json"),
    $bytes
)

# Prove BOM really exists.
$check = [System.IO.File]::ReadAllBytes(
    (Resolve-Path $bomFile)
)

Write-Host "=== BOM FILE ==="
Write-Host "First bytes =" $check[0] $check[1] $check[2]

if (
    $check[0] -ne 239 -or
    $check[1] -ne 187 -or
    $check[2] -ne 191
) {
    throw "BOM CREATION FAILED"
}

Write-Host "REAL_UTF8_BOM = CONFIRMED"

# Login.
$login = Invoke-RestMethod `
    -Uri "http://localhost:4000/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"authtest@adescare-demo.com","password":"Test@12345"}'

$token = $login.accessToken
if (-not $token) { $token = $login.access_token }

if (-not $token) {
    throw "LOGIN FAILED"
}

Write-Host "LOGIN = PASS"

# Real multipart HTTP upload.
$responseFile = ".\juveria-bom-http-response.json"

& curl.exe `
    --silent `
    --show-error `
    --fail-with-body `
    -X POST `
    "http://localhost:4000/invoice-document/upload" `
    -H "Authorization: Bearer $token" `
    -F "file=@$bomFile;type=application/json" `
    -o $responseFile

if ($LASTEXITCODE -ne 0) {
    if (Test-Path $responseFile) {
        Get-Content $responseFile -Raw
    }

    throw "HTTP BOM UPLOAD FAILED"
}

$upload = Get-Content $responseFile -Raw | ConvertFrom-Json
$id = $upload.invoice.id

if (-not $id) {
    throw "UPLOAD RETURNED NO INVOICE ID"
}

Write-Host "BOM_HTTP_UPLOAD = PASS"
Write-Host "INVOICE_ID =" $id

# Verify persistence.
$persisted = Invoke-RestMethod `
    -Uri "http://localhost:4000/invoice/$id" `
    -Method GET `
    -Headers @{ Authorization = "Bearer $token" }

if ($persisted.invoiceNumber -ne "JUVERIA-BOM-E2E-001") {
    throw "PERSISTENCE FAILED"
}

if (@($persisted.parties).Count -ne 2) {
    throw "PARTY PERSISTENCE FAILED"
}

if (@($persisted.lines).Count -ne 1) {
    throw "LINE PERSISTENCE FAILED"
}

if (@($persisted.taxBreakdowns).Count -ne 1) {
    throw "TAX BREAKDOWN PERSISTENCE FAILED"
}

if (@($persisted.documents).Count -ne 1) {
    throw "DOCUMENT PERSISTENCE FAILED"
}

Write-Host "DATABASE_PERSISTENCE = PASS"

# Full UAE readiness.
$r = Invoke-RestMethod `
    -Uri "http://localhost:4000/compliance/invoice/$id/readiness" `
    -Method POST `
    -Headers @{ Authorization = "Bearer $token" }

$results = @($r.internal.results)
$passed  = @($results | Where-Object { $_.status -eq "PASS" })
$failed  = @($results | Where-Object { $_.status -eq "FAIL" })
$skipped = @($results | Where-Object { $_.status -eq "SKIPPED" })

Write-Host ""
Write-Host "=== FULL BOM E2E RESULT ==="
Write-Host "Invoice           =" $persisted.invoiceNumber
Write-Host "Readiness         =" $r.readinessStatus
Write-Host "Internal total    =" $results.Count
Write-Host "Internal passed   =" $passed.Count
Write-Host "Internal failed   =" $failed.Count
Write-Host "Internal skipped  =" $skipped.Count
Write-Host "Official passed   =" $r.official.passed
Write-Host "Official failures =" $r.official.totalFailures
Write-Host "UBL generated     =" $r.ublGenerated

if ($r.readinessStatus -ne "READY") {
    throw "READINESS FAILED"
}

if ($failed.Count -ne 0) {
    throw "INTERNAL VALIDATION FAILED"
}

if ($r.official.totalFailures -ne 0) {
    throw "OFFICIAL VALIDATION FAILED"
}

if (-not $r.official.passed) {
    throw "OFFICIAL VALIDATION DID NOT PASS"
}

if (-not $r.ublGenerated) {
    throw "UBL GENERATION FAILED"
}

Write-Host ""
Write-Host "============================================"
Write-Host "JUVERIA REAL BOM HTTP E2E = PASS"
Write-Host "JSON -> DB -> 77 RULES -> UBL -> PINT-AE"
Write-Host "============================================"
