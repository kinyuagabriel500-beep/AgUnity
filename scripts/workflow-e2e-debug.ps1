$ErrorActionPreference = 'Stop'
$logFile = 'd:\ufid\scripts\workflow-e2e-debug.log'
if (Test-Path $logFile) { Remove-Item $logFile -Force }

$base = 'http://localhost:4000/api'
$ts = [int][double]::Parse((Get-Date -UFormat %s))

function Log($text) {
  Add-Content -Path $logFile -Value $text
}

function Invoke-JsonPost($url, $body, $token) {
  Log("POST $url")
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  $json = $body | ConvertTo-Json -Depth 10
  Log("BODY $json")
  try {
    $result = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -ContentType 'application/json' -Body $json
    Log("OK $url")
    return $result
  } catch {
    Log("FAILED_URL=$url")
    if ($_.ErrorDetails.Message) { Log("FAILED_ERROR=$($_.ErrorDetails.Message)") }
    throw
  }
}

function Register-User($name, $email, $phone) {
  return Invoke-JsonPost -url "$base/auth/register" -body @{ fullName=$name; email=$email; phone=$phone; password=$authSecret } -token $null
}

$authSecret = 'Password123!'
$farmerEmail = "farmer$ts@ufip.test"
$transporterEmail = "transporter$ts@ufip.test"
$warehouseEmail = "warehouse$ts@ufip.test"
$retailerEmail = "retailer$ts@ufip.test"
$consumerEmail = "consumer$ts@ufip.test"

[void](Register-User -name 'Flow Farmer' -email $farmerEmail -phone '0701001001')
[void](Register-User -name 'Flow Transporter' -email $transporterEmail -phone '0701001002')
[void](Register-User -name 'Flow Warehouse' -email $warehouseEmail -phone '0701001003')
[void](Register-User -name 'Flow Retailer' -email $retailerEmail -phone '0701001004')
[void](Register-User -name 'Flow Consumer' -email $consumerEmail -phone '0701001005')

$updateSql = @"
update users set role = 'transporter' where email = '$transporterEmail';
update users set role = 'warehouse' where email = '$warehouseEmail';
update users set role = 'retailer' where email = '$retailerEmail';
update users set role = 'consumer' where email = '$consumerEmail';
"@
$updateB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($updateSql))
docker compose -f "d:\ufid\docker-compose.yml" exec -T postgres sh -lc "echo $updateB64 | base64 -d | psql -U postgres -d ufip" | Out-Null
Log('ROLES UPDATED')

$farmerLogin = Invoke-JsonPost -url "$base/auth/login" -body @{ email=$farmerEmail; password=$authSecret } -token $null
[void](Invoke-JsonPost -url "$base/auth/login" -body @{ email=$transporterEmail; password=$authSecret } -token $null)
[void](Invoke-JsonPost -url "$base/auth/login" -body @{ email=$warehouseEmail; password=$authSecret } -token $null)
[void](Invoke-JsonPost -url "$base/auth/login" -body @{ email=$retailerEmail; password=$authSecret } -token $null)
[void](Invoke-JsonPost -url "$base/auth/login" -body @{ email=$consumerEmail; password=$authSecret } -token $null)

$farm = Invoke-JsonPost -url "$base/farms" -body @{ name='Workflow Demo Farm'; location='Nyeri'; county='Nyeri'; acreageHectares=4 } -token $farmerLogin.token
$harvest = Invoke-JsonPost -url "$base/harvests" -body @{ farmId=$farm.id; crop='maize'; quantityKg=1200; unitPriceKes=55; harvestDate=(Get-Date).ToString('yyyy-MM-dd') } -token $farmerLogin.token

$batchBody = @{
  farmId = $farm.id
  harvestId = $harvest.id
  crop = 'maize'
  quantityKg = 1200
  producedAt = (Get-Date).ToString('yyyy-MM-dd')
  transporterName = 'Flow Logistics'
  warehouseName = 'Flow Storage Hub'
  retailerName = 'Flow Retail Market'
  consumerNote = 'Workflow demo batch'
  metadata = @{ lot='A1'; grade='Premium' }
}
$batch = Invoke-JsonPost -url "$base/traceability/batches" -body $batchBody -token $farmerLogin.token
Log("BATCH=$($batch.batchCode)")

Write-Output "LOG_FILE=$logFile"
