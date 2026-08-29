param(
  [string]$WorkerUrl = "http://localhost:3000/api/blockinfo-post",
  [switch]$DryRun,
  [string]$CronSecret,
  [ValidateSet("telegram", "x", "both")]
  [string]$Destination = "telegram",
  [ValidateSet("openai", "deterministic")]
  [string]$RenderMode = "openai"
)

$ErrorActionPreference = "Stop"

if (-not $CronSecret -and $env:CRON_SECRET) {
  $CronSecret = $env:CRON_SECRET
}

$uri = $WorkerUrl
if ($uri.Contains("?")) {
  $uri = "$uri&destination=$Destination&renderMode=$RenderMode"
}
else {
  $uri = "$uri?destination=$Destination&renderMode=$RenderMode"
}
if ($DryRun) {
  if ($uri.Contains("?")) {
    $uri = "$uri&dryRun=1"
  }
  else {
    $uri = "$uri?dryRun=1"
  }
}

$headers = @{}
if ($CronSecret) {
  $headers["Authorization"] = "Bearer $CronSecret"
}

Write-Host "Calling $uri"
$result = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers
$json = $result | ConvertTo-Json -Depth 8
Write-Host $json

if (-not $result.ok) {
  exit 1
}
