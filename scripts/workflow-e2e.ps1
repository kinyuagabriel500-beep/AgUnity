$ErrorActionPreference = 'Stop'

$base = 'http://localhost:4000/api'
$ts = [int][double]::Parse((Get-Date -UFormat %s))

function Post-Json($url, $body, $token) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  $json = $body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -ContentType 'application/json' -Body $json
}

function Get-Json($url, $token) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  return Invoke-RestMethod -Method Get -Uri $url -Headers $headers
}

function Register-User($name, $email, $phone, $password) {
  return Post-Json "$base/auth/register" @{ fullName=$name; email=$email; phone=$phone; password=$password } $null
}

$password = 'Password123!'
$farmerEmail = "farmer$ts@ufip.test"
$transporterEmail = "transporter$ts@ufip.test"
$warehouseEmail = "warehouse$ts@ufip.test"
$retailerEmail = "retailer$ts@ufip.test"
$consumerEmail = "consumer$ts@ufip.test"

$farmer = Register-User 'Flow Farmer' $farmerEmail '0701001001' $password
$transporter = Register-User 'Flow Transporter' $transporterEmail '0701001002' $password
$warehouse = Register-User 'Flow Warehouse' $warehouseEmail '0701001003' $password
$retailer = Register-User 'Flow Retailer' $retailerEmail '0701001004' $password
$consumer = Register-User 'Flow Consumer' $consumerEmail '0701001005' $password

$updateSql = @"
update users set role = 'transporter' where email = '$transporterEmail';
update users set role = 'warehouse' where email = '$warehouseEmail';
update users set role = 'retailer' where email = '$retailerEmail';
update users set role = 'consumer' where email = '$consumerEmail';
"@
$updateB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($updateSql))
docker compose -f "d:\ufid\docker-compose.yml" exec -T postgres sh -lc "echo $updateB64 | base64 -d | psql -U postgres -d ufip" | Out-Null

$farmerLogin = Post-Json "$base/auth/login" @{ email=$farmerEmail; password=$password } $null
$transporterLogin = Post-Json "$base/auth/login" @{ email=$transporterEmail; password=$password } $null
$warehouseLogin = Post-Json "$base/auth/login" @{ email=$warehouseEmail; password=$password } $null
$retailerLogin = Post-Json "$base/auth/login" @{ email=$retailerEmail; password=$password } $null
$consumerLogin = Post-Json "$base/auth/login" @{ email=$consumerEmail; password=$password } $null

$farm = Post-Json "$base/farms" @{ name='Workflow Demo Farm'; location='Nyeri'; county='Nyeri'; acreageHectares=4 } $farmerLogin.token
$harvest = Post-Json "$base/harvests" @{ farmId=$farm.id; crop='maize'; quantityKg=1200; unitPriceKes=55; harvestDate=(Get-Date).ToString('yyyy-MM-dd') } $farmerLogin.token

$batch = Post-Json "$base/traceability/batches" @{
  farmId = $farm.id
  harvestId = $harvest.id
  crop = 'maize'
  quantityKg = 1200
  producedAt = (Get-Date).ToString('yyyy-MM-dd')
  transporterName = 'Flow Logistics'
  warehouseName = 'Flow Storage Hub'
  retailerName = 'Flow Retail Market'
  consumerNote = 'Workflow demo batch'
  metadata = @{ lot='A1'; grade='Premium'; moisture='12%'; storage='dry' }
} $farmerLogin.token

$handoff = Post-Json "$base/traceability/batches/$($batch.batchCode)/workflow" @{ eventType='handoff'; note='Collected from farm gate' } $transporterLogin.token
$received = Post-Json "$base/traceability/batches/$($batch.batchCode)/workflow" @{ eventType='received'; note='Received at warehouse' } $warehouseLogin.token
$listed = Post-Json "$base/traceability/batches/$($batch.batchCode)/workflow" @{ eventType='listed'; note='Listed for sale by retailer' } $retailerLogin.token
$verified = Post-Json "$base/traceability/batches/$($batch.batchCode)/workflow" @{ eventType='verified'; note='Consumer verified QR and origin' } $consumerLogin.token
$settled = Post-Json "$base/traceability/batches/$($batch.batchCode)/workflow" @{ eventType='settled'; note='Retail settlement completed'; settlementReference="SET-$ts"; paymentReference="PAY-$ts"; settlementPriceKes=62; buyerName='Retail Settlement Buyer' } $retailerLogin.token

$journey = Get-Json "$base/traceability/journey/$($batch.batchCode)" $consumerLogin.token

Write-Output "BATCH_CODE=$($batch.batchCode)"
Write-Output "ROLES=farmer:$($farmerLogin.user.role),transporter:$($transporterLogin.user.role),warehouse:$($warehouseLogin.user.role),retailer:$($retailerLogin.user.role),consumer:$($consumerLogin.user.role)"
Write-Output "STEPS_OK=handoff:$($handoff.event.eventType),received:$($received.event.eventType),listed:$($listed.event.eventType),verified:$($verified.event.eventType),settled:$($settled.event.eventType)"
Write-Output "JOURNEY_STAGE=$($journey.currentStage)"
Write-Output "SETTLEMENT_STATUS=$($journey.settlementStatus)"
Write-Output "NEXT_ALLOWED_STAGE=$($journey.workflow.nextAllowedStage)"
Write-Output "TIMELINE_COUNT=$($journey.timeline.Count)"
Write-Output "LATEST_PAYMENT_STATUS=$($journey.commerce.latestSale.paymentStatus)"
Write-Output "LATEST_PAYMENT_REF=$($journey.commerce.latestSale.paymentReference)"
Write-Output "LATEST_SETTLEMENT_TX=$($journey.commerce.latestSale.settlementTxHash)"

if (-not $batch.batchCode) { throw "Expected batch code to be created" }
if ($handoff.event.eventType -ne 'handoff') { throw "Handoff step failed" }
if ($received.event.eventType -ne 'received') { throw "Received step failed" }
if ($listed.event.eventType -ne 'listed') { throw "Listed step failed" }
if ($verified.event.eventType -ne 'verified') { throw "Verified step failed" }
if ($settled.event.eventType -ne 'settled') { throw "Settled step failed" }
if ($journey.currentStage -ne 'settled') { throw "Journey stage expected settled" }
if ($journey.settlementStatus -ne 'settled') { throw "Settlement status expected settled" }
if ($journey.workflow.nextAllowedStage) { throw "Expected no next stage after settlement" }
if (($journey.timeline.Count) -lt 6) { throw "Expected at least 6 timeline events" }
if ($journey.commerce.latestSale.paymentStatus -ne 'paid') { throw "Expected paid status on latest sale" }
if (-not $journey.commerce.latestSale.paymentReference) { throw "Expected payment reference" }
if (-not $journey.commerce.latestSale.settlementTxHash) { throw "Expected settlement tx hash" }
