$ErrorActionPreference = "Stop"

$id = "1fd739a1-eb8e-4680-8394-a80d76056dbf"

Write-Host "=== JUVERIA INGESTION -> UAE READINESS E2E ==="

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

$headers = @{
    Authorization = "Bearer $token"
}

Write-Host "LOGIN = PASS"
Write-Host "INVOICE_ID = $id"

$readiness = Invoke-RestMethod `
    -Uri "http://localhost:4000/compliance/invoice/$id/readiness" `
    -Method POST `
    -Headers $headers

Write-Host ""
Write-Host "=== READINESS RESPONSE ==="

$readiness | ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "=== ASSERTIONS ==="

Write-Host "Readiness =" $readiness.readinessStatus
Write-Host "Internal total =" $readiness.internal.summary.totalRules
Write-Host "Internal passed =" $readiness.internal.summary.passedRules
Write-Host "Internal failed =" $readiness.internal.summary.failedRules
Write-Host "Official failures =" $readiness.official.totalFailures
Write-Host "UBL generated =" $readiness.ubl.generated

if ($readiness.readinessStatus -ne "READY") {
    throw "ASSERT FAILED: readiness is not READY"
}

if ($readiness.internal.summary.failedRules -ne 0) {
    throw "ASSERT FAILED: internal rules contain failures"
}

if ($readiness.official.totalFailures -ne 0) {
    throw "ASSERT FAILED: official PINT-AE contains failures"
}

if (-not $readiness.ubl.generated) {
    throw "ASSERT FAILED: UBL was not generated"
}

Write-Host ""
Write-Host "JUVERIA_FULL_INGESTION_TO_READINESS_E2E = PASS"
