$ErrorActionPreference = "Stop"

Write-Host "=== JUVERIA JSON UPLOAD VIA CURL ==="

# Login
$login = Invoke-RestMethod `
    -Uri "http://localhost:4000/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"authtest@adescare-demo.com","password":"Test@12345"}'

$token = $login.accessToken
if (-not $token) { $token = $login.access_token }

if (-not $token) {
    throw "LOGIN FAILED - no token"
}

Write-Host "LOGIN = PASS"

$jsonPath = Join-Path $PWD "juveria-ingestion-e2e.json"

if (-not (Test-Path $jsonPath)) {
    throw "JSON test file missing: $jsonPath"
}

# Upload with real curl.exe multipart/form-data
$outputFile = Join-Path $PWD "juveria-upload-response.json"

& curl.exe `
    --silent `
    --show-error `
    --fail-with-body `
    -X POST `
    "http://localhost:4000/invoice-document/upload" `
    -H "Authorization: Bearer $token" `
    -F "file=@$jsonPath;type=application/json" `
    -o $outputFile

$curlExit = $LASTEXITCODE

Write-Host ""
Write-Host "=== SERVER RESPONSE ==="

if (Test-Path $outputFile) {
    Get-Content $outputFile -Raw
}

if ($curlExit -ne 0) {
    throw "UPLOAD HTTP REQUEST FAILED - curl exit $curlExit"
}

$response = Get-Content $outputFile -Raw | ConvertFrom-Json

if (-not $response.invoice) {
    throw "UPLOAD FAILED - invoice object missing"
}

if (-not $response.invoice.id) {
    throw "UPLOAD FAILED - invoice ID missing"
}

$id = $response.invoice.id

Write-Host ""
Write-Host "HTTP_UPLOAD = PASS"
Write-Host "INVOICE_ID = $id"

# Retrieve persisted invoice
$persisted = Invoke-RestMethod `
    -Uri "http://localhost:4000/invoice/$id" `
    -Method GET `
    -Headers @{ Authorization = "Bearer $token" }

Write-Host ""
Write-Host "=== DATABASE/API VERIFICATION ==="
Write-Host "Invoice Number =" $persisted.invoiceNumber
Write-Host "Currency       =" $persisted.currency
Write-Host "Total          =" $persisted.totalAmount
Write-Host "Parties        =" @($persisted.parties).Count
Write-Host "Tax Breakdowns =" @($persisted.taxBreakdowns).Count
Write-Host "Lines          =" @($persisted.lines).Count
Write-Host "Documents      =" @($persisted.documents).Count

if ($persisted.invoiceNumber -ne "JUVERIA-INGEST-E2E-001") {
    throw "ASSERT FAILED: invoiceNumber"
}

if (@($persisted.parties).Count -ne 2) {
    throw "ASSERT FAILED: parties"
}

if (@($persisted.taxBreakdowns).Count -ne 1) {
    throw "ASSERT FAILED: taxBreakdowns"
}

if (@($persisted.lines).Count -ne 1) {
    throw "ASSERT FAILED: lines"
}

if (@($persisted.documents).Count -ne 1) {
    throw "ASSERT FAILED: documents"
}

Write-Host ""
Write-Host "JUVERIA_JSON_INGESTION_E2E = PASS"
Write-Host "VERIFIED_INVOICE_ID = $id"
