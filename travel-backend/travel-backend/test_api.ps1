$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3000"

function Test-Endpoint {
    param (
        [string]$Name,
        [scriptblock]$ScriptBlock
    )
    Write-Host "Testing $Name..." -NoNewline
    try {
        & $ScriptBlock
        Write-Host " OK" -ForegroundColor Green
    } catch {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host $_.Exception.Message
        exit 1
    }
}

# 1. Register User
$userEmail = "test_user_$(Get-Random)@example.com"
$userPassword = "password123"

Test-Endpoint "Register User" {
    $body = @{
        name = "Test User"
        email = $userEmail
        password = $userPassword
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $body -ContentType "application/json"
    if (-not $response.success) { throw "Registration failed" }
}

# 2. Login User
$userToken = ""
Test-Endpoint "Login User" {
    $body = @{
        email = $userEmail
        password = $userPassword
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    if (-not $response.success) { throw "Login failed" }
    $global:userToken = $response.token
}

# 3. Submit Trip
$tripId = ""
Test-Endpoint "Submit Trip" {
    $body = @{
        fullName = "Test User"
        email = $userEmail
        phone = "1234567890"
        destination = "Paris"
        departureCity = "New York"
        takeOffDay = (Get-Date).AddDays(10).ToString("yyyy-MM-dd")
        returnDate = (Get-Date).AddDays(20).ToString("yyyy-MM-dd")
        people = 2
        visaType = "Tourist"
        preferences = "None"
    } | ConvertTo-Json

    # We use Invoke-WebRequest here to capture headers if needed, but RestMethod is easier for JSON
    $response = Invoke-RestMethod -Uri "$baseUrl/api/plan-trip" -Method Post -Body $body -ContentType "application/json"
    # Note: Trip submission is public, doesn't strictly require token, but let's check response
    if (-not $response.success) { throw "Trip submission failed" }
    $global:tripId = $response.requestId
}

# 4. Get User Trips
Test-Endpoint "Get User Trips" {
    $headers = @{ "Authorization" = "Bearer $userToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/api/trips/my" -Method Get -Headers $headers
    if (-not $response.success) { throw "Get User Trips failed" }
    $trip = $response.trips | Where-Object { $_._id -eq $tripId }
    if (-not $trip) { throw "Submitted trip not found in user trips" }
}

# 5. Login Admin
$adminToken = ""
Test-Endpoint "Login Admin" {
    $body = @{
        email = "admin@greaterandbetter.com"
        password = "Admin@123456"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    if (-not $response.success) { throw "Admin Login failed" }
    $global:adminToken = $response.token
}

# 6. Admin Get All Trips
Test-Endpoint "Admin Get All Trips" {
    $headers = @{ "Authorization" = "Bearer $adminToken" }
    $response = Invoke-RestMethod -Uri "$baseUrl/api/trips" -Method Get -Headers $headers
    if (-not $response.success) { throw "Admin Get Trips failed" }
    $trip = $response.trips | Where-Object { $_._id -eq $tripId }
    if (-not $trip) { throw "Submitted trip not found in admin trips" }
}

# 7. Admin Update Trip Status
Test-Endpoint "Admin Update Trip Status" {
    $headers = @{ "Authorization" = "Bearer $adminToken" }
    $body = @{ status = "contacted" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$baseUrl/api/trips/$tripId" -Method Put -Headers $headers -Body $body -ContentType "application/json"
    if (-not $response.success) { throw "Update Trip Status failed" }
    if ($response.trip.status -ne "contacted") { throw "Trip status not updated" }
}

Write-Host "`n✅ All Backend Tests Passed Successfully!" -ForegroundColor Green
