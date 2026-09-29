$ErrorActionPreference = "Stop"

$id = "1fd739a1-eb8e-4680-8394-a80d76056dbf"

$login = Invoke-RestMethod `
  -Uri "http://localhost:4000/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"authtest@adescare-demo.com","password":"Test@12345"}'

$token = $login.accessToken
if (-not $token) { $token = $login.access_token }
if (-not $token) { throw "LOGIN FAILED" }

$r = Invoke-RestMethod `
  -Uri "http://localhost:4000/compliance/invoice/$id/readiness" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $token" }

Write-Host "=== ACTUAL READINESS ==="
Write-Host "readinessStatus =" $r.readinessStatus
Write-Host "ublGenerated    =" $r.ublGenerated
Write-Host "officialPassed  =" $r.official.passed
Write-Host "officialFailures=" $r.official.totalFailures

Write-Host ""
Write-Host "=== INTERNAL SUMMARY RAW ==="
$r.internal.summary | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "=== INTERNAL FAILURES ==="

$failed = @($r.internal.results | Where-Object { $_.status -eq "FAIL" })

if ($failed.Count -eq 0) {
    Write-Host "NO_INTERNAL_FAILURES"
}
else {
    $failed |
      Select-Object ruleCode,ruleName,severity,field,message,actualValue |
      Format-List
}

Write-Host ""
Write-Host "INTERNAL_FAILURE_COUNT =" $failed.Count

Write-Host ""
Write-Host "=== INTERNAL SKIPPED ==="

$skipped = @($r.internal.results | Where-Object { $_.status -eq "SKIPPED" })

Write-Host "INTERNAL_SKIPPED_COUNT =" $skipped.Count

$skipped |
  Select-Object ruleCode,ruleName,severity,field,message,actualValue |
  Format-List

Write-Host ""
Write-Host "=== DECISION INPUTS ==="
Write-Host "Status           =" $r.readinessStatus
Write-Host "Internal failures=" $failed.Count
Write-Host "Official failures=" $r.official.totalFailures
Write-Host "UBL generated    =" $r.ublGenerated
