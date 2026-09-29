$ErrorActionPreference = "Stop"

try {
    Write-Host "=== LOGIN ==="

    $login = Invoke-RestMethod `
        -Uri "http://localhost:4000/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"email":"authtest@adescare-demo.com","password":"Test@12345"}'

    Write-Host "LOGIN RESPONSE:"
    $login | ConvertTo-Json -Depth 10

    $token = $login.access_token
    if (-not $token) { $token = $login.accessToken }

    if (-not $token) {
        throw "No access token returned"
    }

    Write-Host "LOGIN_TOKEN = PRESENT"

    $jsonPath = Join-Path $PWD "juveria-ingestion-e2e.json"

    if (-not (Test-Path $jsonPath)) {
        throw "Test JSON file does not exist: $jsonPath"
    }

    Write-Host ""
    Write-Host "=== UPLOAD ==="

    $response = Invoke-RestMethod `
        -Uri "http://localhost:4000/invoice-document/upload" `
        -Method POST `
        -Headers @{ Authorization = "Bearer $token" } `
        -Form @{ file = Get-Item $jsonPath }

    Write-Host "UPLOAD RESPONSE:"
    $response | ConvertTo-Json -Depth 15

    if (-not $response.invoice) {
        throw "Upload response contains no invoice object"
    }

    if (-not $response.invoice.id) {
        throw "Upload response contains no invoice ID"
    }

    Write-Host ""
    Write-Host "UPLOAD_INVOICE_ID =" $response.invoice.id
}
catch {
    Write-Host ""
    Write-Host "=== REAL FAILURE ==="
    Write-Host $_.Exception.Message

    if ($_.ErrorDetails.Message) {
        Write-Host "SERVER RESPONSE:"
        Write-Host $_.ErrorDetails.Message
    }

    exit 1
}
